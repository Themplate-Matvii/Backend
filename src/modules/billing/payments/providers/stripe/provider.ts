import Stripe from "stripe";
import { ENV } from "@config/env";
import { BasePaymentProvider } from "@modules/billing/payments/providers/base/provider";
import { PlanKey, PlanDefinition, plans } from "@constants/payments/plans";
import {
  oneTimeProducts,
  OneTimeProductKey,
  OneTimeProductDefinition,
} from "@constants/payments/oneTimeProducts";
import {
  BillingProductModel,
  BillingProductDocument,
} from "@modules/billing/pricing/pricing.model";
import {
  PaymentDocument,
  PaymentModel,
} from "@modules/billing/payments/payment.model";
import { subscriptionService } from "@modules/billing/subscriptions/subscription.service";
import { logger } from "@utils/common/logger";
import { StripeEventType } from "./types";
import {
  PaymentStatus,
  ProviderWebhookEventType,
  BonusSourceType,
  PaymentMode,
} from "@modules/billing/types";
import { bonusService } from "@modules/bonus/bonus.service";
import { messages } from "@constants/messages";
import { AppError } from "@utils/common/appError";
import mongoose, { ModifyResult } from "mongoose";
import { BonusTransactionModel } from "@modules/bonus/bonus.model";
import { EmailService } from "@modules/communication/email/email.service";

const stripe = new Stripe(ENV.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20" as any,
});

const formatCurrency = (amount: number, currency?: string) => ({
  amount: (amount / 100).toFixed(2),
  currency: (currency || "usd").toUpperCase(),
});

const formatDate = (date?: Date) =>
  date ? date.toISOString().split("T")[0] : undefined;

const billingPortalUrl = `${ENV.FRONT_URL}/dashboard/billing`;
const subscriptionSettingsUrl = `${ENV.FRONT_URL}/dashboard/subscription`;

class StripeProvider extends BasePaymentProvider {
  public name = "stripe";

  private extractSubscriptionTiming(subscription: Stripe.Subscription) {
    const raw = subscription as Stripe.Subscription & {
      current_period_start?: number;
      current_period_end?: number;
      cancel_at?: number | null;
      trial_start?: number | null;
      trial_end?: number | null;
    };

    const startUnix = raw.current_period_start;
    const endUnix = raw.current_period_end;
    const cancelAtUnix = raw.cancel_at ?? undefined;
    const trialStartUnix = raw.trial_start ?? undefined;
    const trialEndUnix = raw.trial_end ?? undefined;

    const trialDays =
      trialStartUnix && trialEndUnix
        ? Math.round((trialEndUnix - trialStartUnix) / (60 * 60 * 24))
        : undefined;

    return {
      currentPeriodStart: startUnix ? new Date(startUnix * 1000) : undefined,
      currentPeriodEnd: endUnix ? new Date(endUnix * 1000) : undefined,
      cancelAt: cancelAtUnix ? new Date(cancelAtUnix * 1000) : undefined,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
      rawStatus: subscription.status,
      trialEnd: trialEndUnix ? new Date(trialEndUnix * 1000) : undefined,
      trialDays,
    };
  }

  mapToProviderEventType(eventType: string): ProviderWebhookEventType {
    switch (eventType) {
      case StripeEventType.CheckoutSessionCompleted:
      case StripeEventType.InvoicePaid:
      case StripeEventType.InvoicePaymentPaid:
      case StripeEventType.PaymentIntentSucceeded:
        return ProviderWebhookEventType.PAYMENT_SUCCEEDED;
      case StripeEventType.InvoicePaymentFailed:
        return ProviderWebhookEventType.PAYMENT_FAILED;
      case StripeEventType.SubscriptionCanceled:
        return ProviderWebhookEventType.SUBSCRIPTION_CANCELED;
      case StripeEventType.SubscriptionUpdated:
        return ProviderWebhookEventType.SUBSCRIPTION_ACTIVATED;
      default:
        return ProviderWebhookEventType.UNKNOWN;
    }
  }

  private extractInvoiceMetadata(invoice: Stripe.Invoice) {
    const lineItem = invoice.lines?.data?.[0];

    const invoiceWithSubscriptionDetails = invoice as Stripe.Invoice & {
      subscription_details?: { metadata?: Stripe.Metadata | null };
    };

    const meta = {
      userId:
        (invoice.metadata?.userId as string | undefined) ??
        (invoiceWithSubscriptionDetails.subscription_details?.metadata
          ?.userId as string | undefined) ??
        (lineItem?.metadata?.userId as string | undefined),
      planKey:
        (invoice.metadata?.planKey as PlanKey | undefined) ??
        (invoiceWithSubscriptionDetails.subscription_details?.metadata
          ?.planKey as PlanKey | undefined) ??
        (lineItem?.metadata?.planKey as PlanKey | undefined),
      productKey:
        (invoice.metadata?.productKey as OneTimeProductKey | undefined) ??
        (invoiceWithSubscriptionDetails.subscription_details?.metadata
          ?.productKey as OneTimeProductKey | undefined) ??
        (lineItem?.metadata?.productKey as OneTimeProductKey | undefined),
    };

    return meta;
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const invoiceId = invoice.id;
    const duplicateFilter = {
      $or: [{ providerPaymentId: invoiceId }, { invoiceId }],
    };
    const invoiceUrl = invoice.hosted_invoice_url || undefined;
    const invoicePdfUrl = invoice.invoice_pdf || undefined;
    const amount = invoice.amount_paid ?? 0;
    const currency = invoice.currency ?? "usd";

    const sub = (invoice as any).subscription;
    const hasSubscription =
      typeof sub === "string" || (sub && typeof sub === "object");

    if (!invoiceId) {
      logger.warn(
        { object: (invoice as any)?.object },
        "Stripe invoice.paid/Invoice retrieved without id, skipping",
      );
      return;
    }

    const meta = this.extractInvoiceMetadata(invoice);
    const userId = meta.userId || "";

    if (meta.userId && !mongoose.Types.ObjectId.isValid(meta.userId)) {
      logger.warn(
        { userId: meta.userId, invoiceId },
        "Invalid userId in invoice metadata, skipping",
      );
      return;
    }

    // SUBSCRIPTION
    if (hasSubscription) {
      const subscriptionId =
        typeof sub === "string" ? sub : (sub as Stripe.Subscription).id;

      const paidAtUnix = invoice.status_transitions?.paid_at;
      const lastPaymentAt = paidAtUnix
        ? new Date(paidAtUnix * 1000)
        : invoice.created
        ? new Date(invoice.created * 1000)
        : new Date();

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      let timing = this.extractSubscriptionTiming(subscription);

      if (amount > 0) {
        timing = { ...timing, trialEnd: undefined, trialDays: undefined };
      }

      const planKey = meta.planKey;
      if (!planKey) {
        logger.warn(
          { invoiceId, userId },
          "Stripe invoice.paid (subscription) missing planKey metadata, skipping",
        );
        return;
      }

      const payment = await PaymentModel.findOneAndUpdate(
        duplicateFilter,
        {
          $setOnInsert: {
            userId,
            planKey,
            provider: this.name,
            providerPaymentId: invoice.id,
            status: PaymentStatus.SUCCEEDED,
            sourceType: PaymentMode.SUBSCRIPTION,
          },
          $set: {
            amount,
            currency,
            invoiceId,
            invoiceUrl,
            invoicePdfUrl,
          },
        },
        { new: true, upsert: true },
      ).exec();

      console.log("is payment subscriptionService ", !!payment);
      if (!payment) return;

      const isNewPayment =
        payment.createdAt.getTime() === payment.updatedAt.getTime();
      const formattedAmount = formatCurrency(amount, currency);
      const planName = plans[planKey]?.name ?? planKey;

      const activationOptions: Parameters<
        typeof subscriptionService.activate
      >[2] = {
        provider: this.name,
        providerSubscriptionId: subscriptionId,
        ...timing,
        currentPeriodStart:
          timing.currentPeriodStart ??
          ((invoice as any).period_start
            ? new Date((invoice as any).period_start * 1000)
            : undefined),
        currentPeriodEnd:
          timing.currentPeriodEnd ??
          ((invoice as any).period_end
            ? new Date((invoice as any).period_end * 1000)
            : undefined),
        lastPaymentAt,
        metadata: { invoiceId },
      };

      await subscriptionService.activate(userId, planKey, activationOptions);

      if (isNewPayment) {
        const templateKey =
          invoice.billing_reason === "subscription_create"
            ? "paymentSucceededSubscription"
            : "subscriptionRenewed";

        await EmailService.sendBillingTemplate(userId, templateKey, {
          planName,
          amount: formattedAmount.amount,
          currency: formattedAmount.currency,
          periodEnd: formatDate(timing.currentPeriodEnd),
          invoiceUrl: invoiceUrl || invoicePdfUrl,
          manageUrl: subscriptionSettingsUrl,
        });
      }

      const alreadyApplied = await BonusTransactionModel.exists({
        userId,
        sourceType: BonusSourceType.SUBSCRIPTION,
        sourceId: payment.id,
      });

      console.log("is alreadyApplied subscriptionService ", alreadyApplied);

      if (!alreadyApplied) {
        await bonusService.applyBonusOnPayment({
          userId,
          sourceType: BonusSourceType.SUBSCRIPTION,
          planKey,
          isFirstPayment:
            invoice.billing_reason === "subscription_create" ? true : undefined,
          paymentId: payment.id,
        });
      }

      return;
    }

    // ONE-TIME
    const productKey = meta.productKey;

    if (!userId || !productKey) {
      logger.warn(
        "Stripe invoice.paid (one-time) without metadata.userId/productKey, skipping payment record and bonus",
      );
      return;
    }

    const payment = await PaymentModel.findOneAndUpdate(
      duplicateFilter,
      {
        $setOnInsert: {
          userId,
          productKey,
          provider: this.name,
          providerPaymentId: invoice.id,
          status: PaymentStatus.SUCCEEDED,
          sourceType: PaymentMode.ONE_TIME,
        },
        $set: {
          amount,
          currency,
          invoiceId,
          invoiceUrl,
          invoicePdfUrl,
        },
      },
      { new: true, upsert: true },
    ).exec();

    console.log("is payment handleInvoicePaid ", !!payment);
    if (!payment) return;

    const isNewPayment =
      payment.createdAt.getTime() === payment.updatedAt.getTime();
    const formattedAmount = formatCurrency(amount, currency);
    const productName = oneTimeProducts[productKey]?.name ?? productKey;

    const alreadyApplied = await BonusTransactionModel.exists({
      userId,
      sourceType: BonusSourceType.ONE_TIME,
      sourceId: payment.id,
    });
    console.log("is payment alreadyApplied ", alreadyApplied);

    if (!alreadyApplied) {
      await bonusService.applyBonusOnPayment({
        userId,
        sourceType: BonusSourceType.ONE_TIME,
        productKey,
        isFirstPayment: true,
        paymentId: payment.id,
      });
    }

    if (isNewPayment) {
      await EmailService.sendBillingTemplate(userId, "paymentSucceededOneTime", {
        productName,
        amount: formattedAmount.amount,
        currency: formattedAmount.currency,
        invoiceUrl,
        receiptUrl: invoicePdfUrl,
        accessDescription: (oneTimeProducts[productKey] as any)?.description,
      });
    }
  }

  private async findOrCreateProductByName(
    name: string,
  ): Promise<Stripe.Product> {
    const existingProducts = await stripe.products.list({ limit: 100 });
    let product = existingProducts.data.find(
      (p) => p.name === name && !p.deleted,
    );

    if (!product) {
      product = await stripe.products.create({ name });
      logger.info(`Created Stripe product "${name}"`);
    }

    return product;
  }

  private async findOrCreatePrice(params: {
    productId: string;
    unitAmount: number;
    currency: string;
    recurringInterval?: "day" | "week" | "month" | "year" | null;
  }): Promise<Stripe.Price> {
    const prices = await stripe.prices.list({
      product: params.productId,
      limit: 100,
    });

    const existingPrice = prices.data.find((p) => {
      const isAmountMatch = p.unit_amount === params.unitAmount;
      const isCurrencyMatch = p.currency === params.currency;
      const isRecurringMatch = params.recurringInterval
        ? p.recurring?.interval === params.recurringInterval
        : !p.recurring;

      return isAmountMatch && isCurrencyMatch && isRecurringMatch;
    });

    if (existingPrice) {
      return existingPrice;
    }

    const created = await stripe.prices.create({
      unit_amount: params.unitAmount,
      currency: params.currency,
      product: params.productId,
      recurring: params.recurringInterval
        ? { interval: params.recurringInterval }
        : undefined,
    });

    return created;
  }

  private async handlePaymentIntentWithoutInvoice(
    paymentIntent: Stripe.PaymentIntent,
  ) {
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntent.id,
      limit: 1,
    });

    const session = sessions.data?.[0];

    if (!session) {
      logger.info(
        "Stripe payment_intent.succeeded without invoice or checkout session, skipping",
      );
      return;
    }

    if (session.invoice_creation?.enabled && session.mode === "payment") {
      logger.info(
        {
          checkoutSessionId: session.id,
          paymentIntentId: paymentIntent.id,
        },
        "Stripe payment_intent.succeeded waiting for invoice.paid to record payment",
      );
      return;
    }

    if (session.invoice) {
      try {
        const invoice = await stripe.invoices.retrieve(
          session.invoice as string,
        );
        await this.handleInvoicePaid(invoice);
      } catch (error) {
        logger.warn(
          {
            err: error,
            paymentIntentId: paymentIntent.id,
            invoiceId: session.invoice,
          },
          "Stripe payment_intent.succeeded expected invoice but could not retrieve, skipping payment creation",
        );
      }
      return;
    }

    const userId = session.metadata?.userId;
    const productKey = session.metadata?.productKey as
      | OneTimeProductKey
      | undefined;

    if (!userId || session.mode !== "payment") {
      logger.info(
        "Stripe payment_intent.succeeded without invoice for unsupported session mode/metadata, skipping",
      );
      return;
    }

    if (!productKey) {
      logger.warn(
        "Stripe payment_intent.succeeded without invoice and missing productKey metadata, skipping",
      );
      return;
    }

    let paymentIntentWithCharges = paymentIntent as Stripe.PaymentIntent & {
      charges?: Stripe.ApiList<Stripe.Charge>;
    };

    if (!paymentIntentWithCharges.charges?.data?.length) {
      paymentIntentWithCharges = (await stripe.paymentIntents.retrieve(
        paymentIntent.id,
        { expand: ["charges"] },
      )) as Stripe.PaymentIntent & {
        charges?: Stripe.ApiList<Stripe.Charge>;
      };
    }

    const receiptUrl = paymentIntentWithCharges.charges?.data?.[0]?.receipt_url;
    const amount =
      paymentIntent.amount_received ??
      paymentIntent.amount ??
      session.amount_total ??
      0;
    const currency = paymentIntent.currency ?? session.currency ?? "usd";

    const payment = await PaymentModel.findOneAndUpdate(
      {
        $or: [
          { providerPaymentId: paymentIntent.id },
          { checkoutSessionId: session.id },
        ],
      },
      {
        $setOnInsert: {
          userId,
          productKey,
          provider: this.name,
          providerPaymentId: paymentIntent.id,
          amount,
          currency,
          status: PaymentStatus.SUCCEEDED,
          sourceType: PaymentMode.ONE_TIME,
          checkoutSessionId: session.id,
          receiptUrl,
        },
      },
      { new: true, upsert: true },
    ).exec();

    console.log("is Payment handlePaymentIntentWithoutInvoice ", !!payment);
    if (!payment) return;

    const alreadyApplied = await BonusTransactionModel.exists({
      userId,
      sourceType: BonusSourceType.ONE_TIME,
      sourceId: payment.id,
    });
    console.log(
      "is alreadyApplied handlePaymentIntentWithoutInvoice ",
      alreadyApplied,
    );

    if (!alreadyApplied) {
      await bonusService.applyBonusOnPayment({
        userId,
        sourceType: BonusSourceType.ONE_TIME,
        productKey,
        paymentId: payment.id,
      });
    }

    const isNewPayment =
      payment.createdAt.getTime() === payment.updatedAt.getTime();

    if (isNewPayment) {
      const formattedAmount = formatCurrency(amount, currency);
      const productName = oneTimeProducts[productKey]?.name ?? productKey;

      await EmailService.sendBillingTemplate(userId, "paymentSucceededOneTime", {
        productName,
        amount: formattedAmount.amount,
        currency: formattedAmount.currency,
        receiptUrl,
        accessDescription: (oneTimeProducts[productKey] as any)?.description,
      });
    }
  }

  async syncPlans(allPlans: Record<PlanKey, PlanDefinition>): Promise<void> {
    for (const planKey of Object.keys(allPlans) as PlanKey[]) {
      const plan = allPlans[planKey];

      let product: Stripe.Product | undefined;
      let action: "created" | "updated" | "unchanged" = "created";

      const dbProduct = await BillingProductModel.findOne({
        key: plan.key,
        mode: PaymentMode.SUBSCRIPTION,
        provider: this.name,
        currency: plan.currency,
      }).lean<BillingProductDocument | null>();

      const priceDollars = plan.priceCents / 100;

      if (dbProduct?.providerProductId) {
        try {
          const retrieved = await stripe.products.retrieve(
            dbProduct.providerProductId,
          );
          if (retrieved && !retrieved.deleted) {
            product = retrieved as Stripe.Product;

            const needRename = product.name !== plan.name;

            if (needRename) {
              await stripe.products.update(product.id, { name: plan.name });
              action = "updated";
            } else {
              action = "unchanged";
            }
          }
        } catch {}
      }

      if (!product) {
        product = await this.findOrCreateProductByName(plan.name);
        action = dbProduct ? "updated" : "created";
      }

      const price = await this.findOrCreatePrice({
        productId: product.id,
        unitAmount: plan.priceCents,
        currency: plan.currency,
        recurringInterval: plan.interval,
      });

      const isUnchanged =
        dbProduct &&
        dbProduct.amount === plan.priceCents &&
        dbProduct.currency === plan.currency &&
        dbProduct.interval === plan.interval &&
        (dbProduct as any).trialDays === plan.trialDays &&
        dbProduct.providerProductId === product.id &&
        dbProduct.providerPriceId === price.id;

      if (isUnchanged) action = "unchanged";
      else if (dbProduct) action = "updated";

      await BillingProductModel.findOneAndUpdate(
        {
          key: plan.key,
          mode: PaymentMode.SUBSCRIPTION,
          provider: this.name,
          currency: plan.currency,
        },
        {
          key: plan.key,
          mode: PaymentMode.SUBSCRIPTION,
          provider: this.name,
          providerProductId: product.id,
          providerPriceId: price.id,
          currency: plan.currency,
          amount: plan.priceCents,
          interval: plan.interval,
          trialDays: plan.trialDays,
        },
        { upsert: true, new: true },
      );

      const icon =
        action === "created" ? "🆕" : action === "updated" ? "🛠️" : "✅";

      logger.info(
        `${icon} Plan "${plan.key}" — ${action}. Price: $${priceDollars}/${plan.interval}, Trial: ${plan.trialDays}d`,
      );
    }
  }

  async syncOneTimeProducts(
    allProducts: Record<OneTimeProductKey, OneTimeProductDefinition>,
  ): Promise<void> {
    for (const productKey of Object.keys(allProducts) as OneTimeProductKey[]) {
      const config = allProducts[productKey];

      let product: Stripe.Product | undefined;
      let action: "created" | "updated" | "unchanged" = "created";

      const dbProduct = await BillingProductModel.findOne({
        key: config.key,
        mode: PaymentMode.ONE_TIME,
        provider: this.name,
        currency: config.currency,
      }).lean<BillingProductDocument | null>();

      const priceDollars = config.priceCents / 100;

      if (dbProduct?.providerProductId) {
        try {
          const retrieved = await stripe.products.retrieve(
            dbProduct.providerProductId,
          );
          if (retrieved && !retrieved.deleted) {
            product = retrieved as Stripe.Product;

            const needRename = product.name !== config.name;

            if (needRename) {
              await stripe.products.update(product.id, { name: config.name });
              action = "updated";
            } else {
              action = "unchanged";
            }
          }
        } catch {}
      }

      if (!product) {
        product = await this.findOrCreateProductByName(config.name);
        action = dbProduct ? "updated" : "created";
      }

      const price = await this.findOrCreatePrice({
        productId: product.id,
        unitAmount: config.priceCents,
        currency: config.currency,
        recurringInterval: null,
      });

      const isUnchanged =
        dbProduct &&
        dbProduct.amount === config.priceCents &&
        dbProduct.currency === config.currency &&
        dbProduct.providerProductId === product.id &&
        dbProduct.providerPriceId === price.id;

      if (isUnchanged) action = "unchanged";
      else if (dbProduct) action = "updated";

      await BillingProductModel.findOneAndUpdate(
        {
          key: config.key,
          mode: PaymentMode.ONE_TIME,
          provider: this.name,
          currency: config.currency,
        },
        {
          key: config.key,
          mode: PaymentMode.ONE_TIME,
          provider: this.name,
          providerProductId: product.id,
          providerPriceId: price.id,
          currency: config.currency,
          amount: config.priceCents,
        },
        { upsert: true, new: true },
      );

      const icon =
        action === "created" ? "🆕" : action === "updated" ? "🛠️" : "✅";

      logger.info(
        `${icon} One-time product "${config.key}" — ${action}. Price: $${priceDollars}`,
      );
    }
  }

  async createCheckoutSession(
    planKey: PlanKey,
    userId: string,
  ): Promise<string> {
    const config = plans[planKey];

    if (!config) {
      throw new AppError(messages.payments.planNotFound, 404);
    }

    const activeSub = await subscriptionService.getUserSubscription(userId);

    if (activeSub) {
      throw new AppError(messages.payments.subscriptionAlreadyActive, 400);
    }

    let storedProduct = await BillingProductModel.findOne({
      key: config.key,
      mode: PaymentMode.SUBSCRIPTION,
      provider: this.name,
      currency: config.currency,
    }).lean<BillingProductDocument | null>();

    if (!storedProduct) {
      await this.syncPlans({ [planKey]: config });

      storedProduct = await BillingProductModel.findOne({
        key: config.key,
        mode: PaymentMode.SUBSCRIPTION,
        provider: this.name,
        currency: config.currency,
      }).lean<BillingProductDocument | null>();

      if (!storedProduct) {
        throw new Error(`Plan "${config.key}" is not synced with provider`);
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: storedProduct.providerPriceId, quantity: 1 }],
      success_url: `${ENV.FRONT_URL}/dashboard/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${ENV.FRONT_URL}/cancel`,
      metadata: { userId, planKey: config.key },
      subscription_data: {
        metadata: {
          userId,
          planKey: config.key,
        },
        trial_period_days: config.trialDays > 0 ? config.trialDays : undefined,
      },
    });

    return session.url as string;
  }

  async createOneTimeCheckoutSession(
    productKey: OneTimeProductKey,
    userId: string,
  ): Promise<string> {
    const config = oneTimeProducts[productKey];

    if (!config) {
      throw new AppError(messages.payments.planNotFound, 404);
    }

    let storedProduct = await BillingProductModel.findOne({
      key: config.key,
      mode: PaymentMode.ONE_TIME,
      provider: this.name,
      currency: config.currency,
    }).lean<BillingProductDocument | null>();

    if (!storedProduct) {
      await this.syncOneTimeProducts({ [productKey]: config });

      storedProduct = await BillingProductModel.findOne({
        key: config.key,
        mode: PaymentMode.ONE_TIME,
        provider: this.name,
        currency: config.currency,
      }).lean<BillingProductDocument | null>();

      if (!storedProduct) {
        throw new Error(
          `One-time product "${config.key}" is not synced with provider`,
        );
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: storedProduct.providerPriceId,
          quantity: 1,
        },
      ],
      success_url: `${ENV.FRONT_URL}/dashboard/subscription/success?session_id={CHECKOUT_SESSION_ID}&type=one_time`,
      cancel_url: `${ENV.FRONT_URL}/cancel`,
      metadata: {
        userId,
        productKey: config.key,
      },
      invoice_creation: {
        enabled: true,
        invoice_data: {
          metadata: {
            userId,
            productKey: config.key,
          },
        },
      },
    });

    return session.url as string;
  }

  async cancelSubscriptionAtPeriodEnd(
    providerSubscriptionId: string,
  ): Promise<void> {
    await stripe.subscriptions.update(providerSubscriptionId, {
      cancel_at_period_end: true,
    });
  }

  async resumeSubscription(providerSubscriptionId: string): Promise<void> {
    await stripe.subscriptions.update(providerSubscriptionId, {
      cancel_at_period_end: false,
    });
  }

  verifyWebhook(payload: Buffer, signature: string | string[] | undefined) {
    if (!ENV.STRIPE_WEBHOOK_SECRET) {
      throw new Error("Stripe webhook secret not configured");
    }

    return stripe.webhooks.constructEvent(
      payload,
      signature as string,
      ENV.STRIPE_WEBHOOK_SECRET,
    );
  }

  async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      const normalizedType = this.mapToProviderEventType(event.type);

      switch (normalizedType) {
        case ProviderWebhookEventType.PAYMENT_SUCCEEDED: {
          if (event.type === StripeEventType.CheckoutSessionCompleted) {
            const session = event.data.object as Stripe.Checkout.Session;

            const userId = session.metadata?.userId;
            const planKey = session.metadata?.planKey as PlanKey | undefined;

            if (!userId) return;

            const isSubscription = session.mode === "subscription";

            if (isSubscription && planKey) {
              let timing:
                | ReturnType<typeof this.extractSubscriptionTiming>
                | undefined;

              if (session.subscription) {
                const stripeSubscription = await stripe.subscriptions.retrieve(
                  session.subscription as string,
                );
                timing = this.extractSubscriptionTiming(stripeSubscription);
              }

              await subscriptionService.activate(userId, planKey, {
                provider: this.name,
                providerSubscriptionId: session.subscription as string,
                ...(timing ?? {}),
                metadata: { checkoutSessionId: session.id },
              });
            }
          }

          if (event.type === StripeEventType.InvoicePaid) {
            const invoice = event.data.object as Stripe.Invoice;
            await this.handleInvoicePaid(invoice);
          }

          if (event.type === StripeEventType.InvoicePaymentPaid) {
            const invoicePayment = event.data.object as any;
            const invoiceId =
              typeof invoicePayment.invoice === "string"
                ? invoicePayment.invoice
                : invoicePayment.invoice?.id;

            if (!invoiceId) {
              logger.warn(
                "Stripe invoice_payment.paid without invoice id, skipping",
              );
              return;
            }

            const invoice = await stripe.invoices.retrieve(invoiceId);
            await this.handleInvoicePaid(invoice as Stripe.Invoice);
          }

          if (event.type === StripeEventType.PaymentIntentSucceeded) {
            const paymentIntent = event.data.object as Stripe.PaymentIntent & {
              invoice?: string | null;
            };

            const invoiceId = paymentIntent.invoice;

            if (!invoiceId) {
              await this.handlePaymentIntentWithoutInvoice(paymentIntent);
              return;
            }

            const invoice = await stripe.invoices.retrieve(invoiceId as string);
            await this.handleInvoicePaid(invoice);
          }

          break;
        }

        case ProviderWebhookEventType.PAYMENT_FAILED: {
          if (event.type === StripeEventType.InvoicePaymentFailed) {
            const invoice = event.data.object as Stripe.Invoice;

            const invoiceId = invoice.id;
            const invoiceUrl = invoice.hosted_invoice_url || undefined;
            const invoicePdfUrl = invoice.invoice_pdf || undefined;
            const userId = invoice.metadata?.userId || "";

            if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
              logger.warn(
                { userId },
                "Invalid userId in invoice metadata, skipping",
              );
              return;
            }

            await PaymentModel.create({
              userId: (userId as string) ?? "unknown",
              planKey: (invoice.metadata?.planKey as PlanKey) ?? "basic",
              provider: this.name,
              providerPaymentId: invoice.id,
              amount: invoice.amount_due ?? 0,
              currency: invoice.currency ?? "usd",
              status: PaymentStatus.FAILED,
              sourceType: PaymentMode.SUBSCRIPTION,
              invoiceId,
              invoiceUrl,
              invoicePdfUrl,
            });

            if (userId) {
              const formatted = formatCurrency(
                invoice.amount_due ?? 0,
                invoice.currency ?? "usd",
              );
              const planKey = invoice.metadata?.planKey as PlanKey | undefined;
              const planName = planKey
                ? plans[planKey]?.name ?? planKey
                : "Subscription";
              const retryDate = invoice.next_payment_attempt
                ? formatDate(new Date((invoice.next_payment_attempt as number) * 1000))
                : undefined;

              await EmailService.sendBillingTemplate(userId, "paymentFailed", {
                planName,
                amount: formatted.amount,
                currency: formatted.currency,
                retryDate,
                updatePaymentUrl: billingPortalUrl,
                invoiceUrl,
              });
            }
          }

          break;
        }

        case ProviderWebhookEventType.SUBSCRIPTION_CANCELED: {
          if (event.type === StripeEventType.SubscriptionCanceled) {
            const subscription = event.data.object as Stripe.Subscription;
            const userId = subscription.metadata?.userId as string | undefined;
            const planKey = subscription.metadata?.planKey as
              | PlanKey
              | undefined;

            if (userId && planKey) {
              const raw = subscription as Stripe.Subscription & {
                current_period_end?: number;
              };

              const canceledAtUnix =
                subscription.canceled_at ??
                raw.current_period_end ??
                Math.floor(Date.now() / 1000);

              const canceledAt = new Date(canceledAtUnix * 1000);

              await subscriptionService.markCanceledImmediately(
                userId,
                this.name,
                subscription.id,
                canceledAt,
              );

              if (userId && planKey) {
                await EmailService.sendBillingTemplate(userId, "subscriptionCanceled", {
                  planName: plans[planKey]?.name ?? planKey,
                  renewUrl: subscriptionSettingsUrl,
                });
              }
            }
          }
          break;
        }

        case ProviderWebhookEventType.SUBSCRIPTION_ACTIVATED: {
          if (event.type === StripeEventType.SubscriptionUpdated) {
            const subscription = event.data.object as Stripe.Subscription;
            const userId = subscription.metadata?.userId as string | undefined;
            const planKey = subscription.metadata?.planKey as
              | PlanKey
              | undefined;
            const timing = this.extractSubscriptionTiming(subscription);

            if (userId && planKey) {
              await subscriptionService.activate(userId, planKey, {
                provider: this.name,
                providerSubscriptionId: subscription.id,
                ...timing,
                metadata: { subscriptionId: subscription.id },
              });
            }
          }
          break;
        }

        case ProviderWebhookEventType.UNKNOWN:
        default: {
          logger.info(`Unhandled Stripe event type: ${event.type}`);
          break;
        }
      }
    } catch (err) {
      logger.error(
        { err, eventType: event.type, eventId: event.id },
        "Stripe webhook handling failed",
      );
      throw err;
    }
  }
}

export const stripeProvider = new StripeProvider();
