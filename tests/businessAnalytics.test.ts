import { businessService } from "@modules/analytics/business/business.service";
import { PaymentModel } from "@modules/billing/payments/payment.model";
import { SubscriptionModel } from "@modules/billing/subscriptions/subscription.model";
import { UserModel } from "@modules/user/user.model";
import { FeedbackModel } from "@modules/communication/feedback/feedback.model";
import { PaymentStatus } from "@modules/billing/types";

describe("businessService.getAnalytics", () => {
  const dateFrom = "2024-01-01T00:00:00.000Z";
  const dateTo = "2024-01-02T00:00:00.000Z";
  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("builds normalized analytics with revenue breakdown and subscription dynamics", async () => {
    const paymentAggregate = jest
      .spyOn(PaymentModel as any, "aggregate")
      .mockImplementationOnce(async (pipeline: any) => {
        expect(pipeline[0]).toEqual({
          $match: {
            createdAt: { $gte: from, $lte: to },
            status: PaymentStatus.SUCCEEDED,
          },
        });

        return [
          {
            date: "2024-01-01",
            totalAmount: 1500,
            subscriptionAmount: 1000,
            oneTimeAmount: 500,
          },
        ];
      })
      .mockImplementationOnce(async (pipeline: any) => {
        expect(pipeline[0]).toEqual({
          $match: {
            createdAt: { $gte: from, $lte: to },
            status: PaymentStatus.SUCCEEDED,
          },
        });

        return [
          {
            totalAmount: 1500,
            subscriptionAmount: 1000,
            oneTimeAmount: 500,
          },
        ];
      });

    jest
      .spyOn(SubscriptionModel as any, "aggregate")
      .mockImplementationOnce(async () => [{ date: "2024-01-01", count: 2 }])
      .mockImplementationOnce(async () => [{ date: "2024-01-02", count: 1 }])
      .mockImplementationOnce(async () => [{ averageDays: 10 }]);

    jest.spyOn(SubscriptionModel as any, "countDocuments").mockResolvedValueOnce(5);

    jest
      .spyOn(UserModel as any, "aggregate")
      .mockResolvedValueOnce([{ date: "2024-01-01", count: 3 }]);
    jest
      .spyOn(FeedbackModel as any, "aggregate")
      .mockResolvedValueOnce([{ date: "2024-01-02", count: 1 }]);
    jest.spyOn(UserModel as any, "countDocuments").mockResolvedValueOnce(6);

    const analytics = await businessService.getAnalytics({
      dateFrom,
      dateTo,
    });

    expect(paymentAggregate).toHaveBeenCalledTimes(2);
    expect(analytics.dailyRevenue).toEqual([
      {
        date: "2024-01-01",
        totalAmount: 1500,
        subscriptionAmount: 1000,
        oneTimeAmount: 500,
      },
      {
        date: "2024-01-02",
        totalAmount: 0,
        subscriptionAmount: 0,
        oneTimeAmount: 0,
      },
    ]);

    expect(analytics.dailySubscriptions).toEqual([
      { date: "2024-01-01", new: 2, canceled: 0, active: 7 },
      { date: "2024-01-02", new: 0, canceled: 1, active: 6 },
    ]);

    expect(analytics.dailyRegistrations).toEqual([
      { date: "2024-01-01", count: 3 },
      { date: "2024-01-02", count: 0 },
    ]);

    expect(analytics.dailyFeedbacks).toEqual([
      { date: "2024-01-01", count: 0 },
      { date: "2024-01-02", count: 1 },
    ]);

    expect(analytics.kpi).toEqual({
      totalRevenue: 1500,
      subscriptionRevenue: 1000,
      oneTimeRevenue: 500,
      churnRate: (1 / 5) * 100,
      arpu: 1500 / 6,
      averageSubscriptionLifetimeDays: 10,
    });
  });
});
