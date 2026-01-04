import { PaymentModel } from "@modules/billing/payments/payment.model";
import { SubscriptionModel } from "@modules/billing/subscriptions/subscription.model";
import { UserModel } from "@modules/user/user.model";
import { GetBusinessAnalyticsDTO } from "@modules/analytics/business/business.validation";
import { SubscriptionStatus } from "@modules/billing/subscriptions/types";
import { PaymentStatus, PaymentMode } from "@modules/billing/types";
import { plans } from "@constants/payments/plans";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Assumption: Payment.amount and plan prices are stored in cents (minor units) for USD.
// We return values in dollars (major units).
const MONEY_DIVISOR = 100;

const ALL_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.CANCEL_AT_PERIOD_END,
  SubscriptionStatus.CANCELED,
  SubscriptionStatus.EXPIRED,
];

const ACTIVE_LIKE_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
  SubscriptionStatus.CANCEL_AT_PERIOD_END,
];

const formatDayKey = (date: Date) => date.toISOString().slice(0, 10); // YYYY-MM-DD

const normalizeRange = (dateFrom: string, dateTo: string) => {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid date range");
  }
  if (from > to) {
    throw new Error("dateFrom must be <= dateTo");
  }

  const fromUtc = new Date(
    Date.UTC(
      from.getUTCFullYear(),
      from.getUTCMonth(),
      from.getUTCDate(),
      0,
      0,
      0,
      0,
    ),
  );
  const toUtc = new Date(
    Date.UTC(
      to.getUTCFullYear(),
      to.getUTCMonth(),
      to.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );

  return { from: fromUtc, to: toUtc };
};

const buildDateKeys = (from: Date, to: Date): string[] => {
  const result: string[] = [];
  for (
    let cursor = new Date(
      Date.UTC(
        from.getUTCFullYear(),
        from.getUTCMonth(),
        from.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    cursor <= to;
    cursor = new Date(cursor.getTime() + ONE_DAY_MS)
  ) {
    result.push(formatDayKey(cursor));
  }
  return result;
};

type DailyRevenueItem = {
  date: string;
  totalAmount: number; // dollars
  subscriptionAmount: number; // dollars
  oneTimeAmount: number; // dollars
};

type DailyCountItem = {
  date: string;
  count: number;
};

type DailySubscriptionsItem = {
  date: string;
  new: number;
  canceled: number;
  activeLike: number;
};

type SubscriptionStatusTotals = Record<SubscriptionStatus, number>;

type DailySubscriptionsByStatusItem = {
  date: string;
} & Record<SubscriptionStatus, number>;

class BusinessService {
  async getAnalytics({ dateFrom, dateTo }: GetBusinessAnalyticsDTO) {
    const { from, to } = normalizeRange(dateFrom, dateTo);
    const dateKeys = buildDateKeys(from, to);

    // -------------------------
    // Revenue (by PaymentMode) -> dollars
    // -------------------------
    const dailyRevenueAggregation = await PaymentModel.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
          status: PaymentStatus.SUCCEEDED,
        },
      },
      {
        $project: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          amountDollars: { $divide: ["$amount", MONEY_DIVISOR] },
          sourceType: "$sourceType",
        },
      },
      {
        $group: {
          _id: "$date",
          totalAmount: { $sum: "$amountDollars" },
          subscriptionAmount: {
            $sum: {
              $cond: [
                { $eq: ["$sourceType", PaymentMode.SUBSCRIPTION] },
                "$amountDollars",
                0,
              ],
            },
          },
          oneTimeAmount: {
            $sum: {
              $cond: [
                { $eq: ["$sourceType", PaymentMode.ONE_TIME] },
                "$amountDollars",
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          totalAmount: 1,
          subscriptionAmount: 1,
          oneTimeAmount: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    const [revenueTotals] = await PaymentModel.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
          status: PaymentStatus.SUCCEEDED,
        },
      },
      {
        $project: {
          amountDollars: { $divide: ["$amount", MONEY_DIVISOR] },
          sourceType: "$sourceType",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amountDollars" },
          subscriptionAmount: {
            $sum: {
              $cond: [
                { $eq: ["$sourceType", PaymentMode.SUBSCRIPTION] },
                "$amountDollars",
                0,
              ],
            },
          },
          oneTimeAmount: {
            $sum: {
              $cond: [
                { $eq: ["$sourceType", PaymentMode.ONE_TIME] },
                "$amountDollars",
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalAmount: 1,
          subscriptionAmount: 1,
          oneTimeAmount: 1,
        },
      },
    ]);

    const revenueByDate = new Map<string, DailyRevenueItem>(
      dailyRevenueAggregation.map((item: DailyRevenueItem) => [
        item.date,
        item,
      ]),
    );

    const dailyRevenue: DailyRevenueItem[] = dateKeys.map((date) => {
      const entry = revenueByDate.get(date);
      return {
        date,
        totalAmount: entry?.totalAmount ?? 0,
        subscriptionAmount: entry?.subscriptionAmount ?? 0,
        oneTimeAmount: entry?.oneTimeAmount ?? 0,
      };
    });

    // -------------------------
    // Users: registrations
    // -------------------------
    const dailyRegistrationsAggregation = await UserModel.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, date: "$_id.date", count: 1 } },
      { $sort: { date: 1 } },
    ]);

    const registrationsByDate = new Map<string, number>(
      dailyRegistrationsAggregation.map((item: DailyCountItem) => [
        item.date,
        item.count,
      ]),
    );

    const dailyRegistrations = dateKeys.map((date) => ({
      date,
      count: registrationsByDate.get(date) ?? 0,
    }));

    const totalUsersAtEnd = await UserModel.countDocuments({
      createdAt: { $lte: to },
    });
    const newUsersInRange = await UserModel.countDocuments({
      createdAt: { $gte: from, $lte: to },
    });

    // -------------------------
    // Paying users (at least one succeeded payment in range)
    // -------------------------
    const payingUsersAggregation = await PaymentModel.aggregate([
      {
        $match: {
          createdAt: { $gte: from, $lte: to },
          status: PaymentStatus.SUCCEEDED,
        },
      },
      { $group: { _id: "$userId" } },
      { $count: "count" },
    ]);
    const payingUsersInRange = payingUsersAggregation?.[0]?.count ?? 0;

    // -------------------------
    // Subscriptions: daily new/canceled + activeLike (running)
    // -------------------------
    const newSubscriptions = await SubscriptionModel.aggregate([
      { $match: { createdAt: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, date: "$_id.date", count: 1 } },
      { $sort: { date: 1 } },
    ]);

    const canceledSubscriptions = await SubscriptionModel.aggregate([
      {
        $match: {
          status: {
            $in: [SubscriptionStatus.CANCELED, SubscriptionStatus.EXPIRED],
          },
          canceledAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: {
            date: {
              $dateToString: { format: "%Y-%m-%d", date: "$canceledAt" },
            },
          },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, date: "$_id.date", count: 1 } },
      { $sort: { date: 1 } },
    ]);

    const activeLikeAtStart = await SubscriptionModel.countDocuments({
      status: { $in: ACTIVE_LIKE_STATUSES },
      createdAt: { $lt: from },
      $or: [
        { canceledAt: { $exists: false } },
        { canceledAt: null },
        { canceledAt: { $gt: from } },
      ],
    });

    const newByDate = new Map<string, number>(
      newSubscriptions.map((i: DailyCountItem) => [i.date, i.count]),
    );
    const canceledByDate = new Map<string, number>(
      canceledSubscriptions.map((i: DailyCountItem) => [i.date, i.count]),
    );

    let runningActiveLike = activeLikeAtStart;

    const dailySubscriptions: DailySubscriptionsItem[] = dateKeys.map(
      (date) => {
        const newCount = newByDate.get(date) ?? 0;
        const canceledCount = canceledByDate.get(date) ?? 0;

        runningActiveLike += newCount - canceledCount;

        return {
          date,
          new: newCount,
          canceled: canceledCount,
          activeLike: runningActiveLike,
        };
      },
    );

    // -------------------------
    // Subscription status totals at end (dateTo)
    // -------------------------
    const subscriptionStatusTotalsAtEndRaw = await SubscriptionModel.aggregate([
      { $match: { createdAt: { $lte: to } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const subscriptionStatusTotals: SubscriptionStatusTotals = {
      [SubscriptionStatus.ACTIVE]: 0,
      [SubscriptionStatus.TRIALING]: 0,
      [SubscriptionStatus.CANCEL_AT_PERIOD_END]: 0,
      [SubscriptionStatus.CANCELED]: 0,
      [SubscriptionStatus.EXPIRED]: 0,
    };

    for (const row of subscriptionStatusTotalsAtEndRaw) {
      const status = row._id as SubscriptionStatus;
      if (ALL_SUBSCRIPTION_STATUSES.includes(status)) {
        subscriptionStatusTotals[status] = row.count;
      }
    }

    // -------------------------
    // Daily subscriptions by status (snapshot) — heavier, but OK for now
    // -------------------------
    const dailySubscriptionsByStatus: DailySubscriptionsByStatusItem[] = [];

    for (const dateKey of dateKeys) {
      const dayEnd = new Date(`${dateKey}T23:59:59.999Z`);

      const rows = await SubscriptionModel.aggregate([
        {
          $match: {
            createdAt: { $lte: dayEnd },
            $or: [
              { canceledAt: { $exists: false } },
              { canceledAt: null },
              { canceledAt: { $gt: dayEnd } },
            ],
          },
        },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      const entry: DailySubscriptionsByStatusItem = {
        date: dateKey,
        [SubscriptionStatus.ACTIVE]: 0,
        [SubscriptionStatus.TRIALING]: 0,
        [SubscriptionStatus.CANCEL_AT_PERIOD_END]: 0,
        [SubscriptionStatus.CANCELED]: 0,
        [SubscriptionStatus.EXPIRED]: 0,
      };

      for (const row of rows) {
        const status = row._id as SubscriptionStatus;
        if (ALL_SUBSCRIPTION_STATUSES.includes(status)) {
          entry[status] = row.count;
        }
      }

      dailySubscriptionsByStatus.push(entry);
    }

    // -------------------------
    // MRR / ARR (plan prices assumed cents -> dollars)
    // -------------------------
    const activeLikeSubsAtEnd = await SubscriptionModel.find(
      { status: { $in: ACTIVE_LIKE_STATUSES }, createdAt: { $lte: to } },
      { planKey: 1 },
    ).lean();

    let mrrCents = 0;

    for (const sub of activeLikeSubsAtEnd) {
      const planKey = sub.planKey as keyof typeof plans;
      const plan = (plans as any)[planKey];

      const monthlyCents =
        plan?.priceMonthly ??
        plan?.monthlyPrice ??
        plan?.price?.monthly ??
        plan?.price ??
        0;

      if (typeof monthlyCents === "number" && Number.isFinite(monthlyCents)) {
        mrrCents += monthlyCents;
      }
    }

    const mrr = mrrCents / MONEY_DIVISOR;
    const arr = (mrrCents * 12) / MONEY_DIVISOR;

    // -------------------------
    // KPI
    // -------------------------
    const totalAmount = revenueTotals?.totalAmount ?? 0;
    const subscriptionAmount = revenueTotals?.subscriptionAmount ?? 0;
    const oneTimeAmount = revenueTotals?.oneTimeAmount ?? 0;

    const canceledTotal = Array.from(canceledByDate.values()).reduce(
      (t, v) => t + v,
      0,
    );

    const avgActiveLike =
      dailySubscriptions.length > 0
        ? dailySubscriptions.reduce((t, d) => t + d.activeLike, 0) /
          dailySubscriptions.length
        : 0;

    const churnRate =
      avgActiveLike > 0 ? (canceledTotal / avgActiveLike) * 100 : 0;

    const [lifetimeAggregation] = await SubscriptionModel.aggregate([
      {
        $match: {
          status: {
            $in: [SubscriptionStatus.CANCELED, SubscriptionStatus.EXPIRED],
          },
          canceledAt: { $ne: null },
          createdAt: { $lte: to },
        },
      },
      {
        $project: {
          lifetimeDays: {
            $divide: [{ $subtract: ["$canceledAt", "$createdAt"] }, ONE_DAY_MS],
          },
        },
      },
      { $group: { _id: null, averageDays: { $avg: "$lifetimeDays" } } },
    ]);

    const arpu = totalUsersAtEnd > 0 ? totalAmount / totalUsersAtEnd : 0;
    const arppu = payingUsersInRange > 0 ? totalAmount / payingUsersInRange : 0;
    const conversionToPaid =
      newUsersInRange > 0 ? (payingUsersInRange / newUsersInRange) * 100 : 0;

    return {
      kpi: {
        currency: "USD",

        totalRevenue: totalAmount,
        subscriptionRevenue: subscriptionAmount,
        oneTimeRevenue: oneTimeAmount,

        mrr,
        arr,

        churnRate,
        arpu,
        arppu,
        conversionToPaid,

        averageSubscriptionLifetimeDays: lifetimeAggregation?.averageDays ?? 0,

        totalUsersAtEnd,
        newUsersInRange,
        payingUsersInRange,

        activeLikeSubscriptionsAtStart: activeLikeAtStart,
        activeLikeSubscriptionsAtEnd:
          dailySubscriptions[dailySubscriptions.length - 1]?.activeLike ??
          activeLikeAtStart,
      },

      dailyRevenue,
      dailySubscriptions,
      dailySubscriptionsByStatus,
      subscriptionStatusTotals,
      dailyRegistrations,
    };
  }
}

export const businessService = new BusinessService();
