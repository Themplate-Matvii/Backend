import { PAGINATION } from "@constants/pagination";
import { paginate } from "@utils/common/pagination";
import { FeedbackModel, FeedbackDocument } from "@modules/communication/feedback/feedback.model";
import { GetAllFeedbackDTO } from "@modules/communication/feedback/feedback.validation";

class FeedbackService {
  async create(data: {
    name?: string;
    email?: string;
    phone: string;
    comment?: string;
  }): Promise<FeedbackDocument> {
    return FeedbackModel.create(data);
  }

  async findAll(filters: GetAllFeedbackDTO) {
    const {
      s,
      page = PAGINATION?.DEFAULT_PAGE ?? 1,
      limit = PAGINATION?.DEFAULT_LIMIT ?? 20,
      sort,
    } = filters;

    return paginate(FeedbackModel, {
      page,
      limit,
      search: s,
      // Use appropriate fields for text search
      searchFields: ["title", "message"],
      filters: {
        // Add additional filters here if needed (status, type, etc.)
        // Example: ...(status ? { status } : {}),
        // For now we do not filter by currentUserId; pass it later if needed.
      },
      sort,
    });
  }
}

export const feedbackService = new FeedbackService();
