import {
  TrafficEventModel,
  TrafficEventDocument,
  TrafficEventEnum,
} from "@modules/analytics/traffic/trafficEvent.model";
import { TrackEventDTO } from "@modules/analytics/traffic/traffic.validation";
import { FeedbackModel } from "@modules/communication/feedback/feedback.model";

type TrafficTotals = Record<
  TrafficEventEnum,
  {
    total: number;
    unique: number;
  }
>;

interface TrafficEventsSummary {
  events: TrafficEventDocument[];
  stats: {
    totals: TrafficTotals;
    feedbackByDate: { date: string; count: number }[];
  };
}

class TrafficService {
  /**
   * Track a new traffic event
   */
  async trackEvent(data: TrackEventDTO): Promise<TrafficEventDocument> {
    const uniqueFilter = {
      sessionId: data.sessionId,
      eventType: data.eventType,
      ...(data.landingId ? { landingId: data.landingId } : {}),
      ...(data.url ? { url: data.url } : {}),
      ...(data.eventName ? { eventName: data.eventName } : {}),
    };

    const existingUnique = await TrafficEventModel.exists(uniqueFilter);
    const isUnique = !existingUnique;

    return TrafficEventModel.create({ ...data, isUnique });
  }

  /**
   * Get traffic events by date range with optional filters
   */
  async getEvents(
    dateFrom: Date,
    dateTo: Date,
    filters: { landingId?: string; userId?: string } = {},
  ): Promise<TrafficEventsSummary> {
    const events = await TrafficEventModel.find({
      createdAt: { $gte: dateFrom, $lte: dateTo },
      ...(filters.landingId ? { landingId: filters.landingId } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
    })
      .sort({ createdAt: -1 })
      .lean();

    const baseTotals = Object.values(TrafficEventEnum).reduce((acc, eventType) => {
      acc[eventType] = { total: 0, unique: 0 };
      return acc;
    }, {} as TrafficTotals);

    const totals = events.reduce((acc, event) => {
      const current = acc[event.eventType];
      current.total += 1;
      if (event.isUnique) {
        current.unique += 1;
      }
      return acc;
    }, baseTotals);

    const feedbackAggregation = await FeedbackModel.aggregate([
      { $match: { createdAt: { $gte: dateFrom, $lte: dateTo } } },
      {
        $group: {
          _id: { date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } } },
          count: { $sum: 1 },
        },
      },
      { $project: { _id: 0, date: "$_id.date", count: 1 } },
      { $sort: { date: 1 } },
    ]);

    return {
      events,
      stats: {
        totals,
        feedbackByDate: feedbackAggregation,
      },
    };
  }
}

export const trafficService = new TrafficService();
