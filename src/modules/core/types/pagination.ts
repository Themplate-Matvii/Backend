export enum sortEnum {
  asc = "asc",
  desc = "desc"
}


export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  searchFields?: string[]; // fields to apply search on
  filters?: Record<string, any>; // additional filters
  sort?: sortEnum; // asc | desc for createdAt
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  sort?: sortEnum;
}