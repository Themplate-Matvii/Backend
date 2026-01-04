import { Document, Model } from "mongoose";
import { PaginatedResult, PaginationParams, sortEnum } from "@modules/core/types/pagination";


/**
 * Generic pagination utility for Mongoose models.
 * Sort direction is applied to createdAt field when provided.
 */
export async function paginate<T extends Document>(
  model: Model<T>,
  params: PaginationParams,
): Promise<PaginatedResult<T>> {
  const {
    page = 1,
    limit = 20,
    search,
    searchFields = [],
    filters = {},
    sort,
  } = params;

  const query: Record<string, any> = { ...filters };

  if (search && searchFields.length > 0) {
    query.$or = searchFields.map((field) => ({
      [field]: { $regex: search, $options: "i" },
    }));
  }

  const skip = (page - 1) * limit;

  const mongoQuery = model.find(query);

  // Map sortEnum to Mongo sort by createdAt
  if (sort) {
    const direction = sort === sortEnum.asc ? 1 : -1;
    mongoQuery.sort({ createdAt: direction });
  }

  const [items, total] = await Promise.all([
    mongoQuery.skip(skip).limit(limit).exec(),
    model.countDocuments(query),
  ]);

  return {
    items,
    total,
    page,
    limit,
    sort,
    totalPages: Math.ceil(total / limit),
  };
}
