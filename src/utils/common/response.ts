import { Response } from "express";

function serializeResponseValue(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== "object") {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeResponseValue(item));
  }

  if (typeof value.toJSON === "function") {
    return serializeResponseValue(value.toJSON());
  }

  const serialized: Record<string, any> = {};

  for (const [key, val] of Object.entries(value)) {
    if (key === "_id") {
      serialized.id = String(val);
      continue;
    }

    serialized[key] = serializeResponseValue(val);
  }

  return serialized;
}

export function successResponse(res: Response, data: any, message?: string) {
  return res.json({
    success: true,
    message: message || null,
    data: serializeResponseValue(data),
  });
}

export function errorResponse(
  res: Response,
  statusCode: number,
  message: string,
  errors?: any,
) {
  return res.status(statusCode).json({
    success: false,
    message: message,
    errors: errors || null,
  });
}
