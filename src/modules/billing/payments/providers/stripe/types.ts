export enum StripeEventType {
  CheckoutSessionCompleted = "checkout.session.completed",
  InvoicePaid = "invoice.paid",
  InvoicePaymentPaid = "invoice_payment.paid",
  InvoicePaymentFailed = "invoice.payment_failed",
  PaymentIntentSucceeded = "payment_intent.succeeded",
  SubscriptionCanceled = "customer.subscription.deleted",
  SubscriptionUpdated = "customer.subscription.updated",
}
