import type { NextFunction, Request, Response } from "express";
import { AppError } from "@utils/common/appError";
import { errorResponse } from "@utils/common/response";

function normalizeError(err: any) {
  if (err?.name === "ZodError") {
    return {
      status: 400,
      message: "validation.zod",
      details: err.issues?.map((i: any) => ({
        path: Array.isArray(i.path) ? i.path.join(".") : i.path,
        message: i.message,
      })),
    };
  }

  if (err?.name === "ValidationError") {
    const details = Object.values(err.errors || {}).map((e: any) => ({
      path: e.path,
      message: e.message,
    }));
    return {
      status: 400,
      message: "validation.mongoose",
      details,
    };
  }

  if (err?.name === "CastError") {
    return {
      status: 400,
      message: "validation.cast",
      details: { value: err?.value, path: err?.path },
    };
  }

  if (err?.code === 11000) {
    return {
      status: 409,
      message: "crud.conflict",
      details: err?.keyValue,
    };
  }

  if (err instanceof AppError) {
    return {
      status: err.status || 500,
      message: err.message || "internal.error",
      details: err.details ?? null,
    };
  }

  return {
    status: err?.status || err?.statusCode || 500,
    message:
      process.env.NODE_ENV === "production" &&
      (err?.status === 500 || !err?.status)
        ? "internal.error"
        : err?.message || "internal.error",
    details:
      process.env.NODE_ENV === "production"
        ? null
        : { stack: err?.stack || String(err) },
  };
}

export function errorMiddleware(
  err: any,
  req: Request & { t?: (key: string, params?: any) => string },
  res: Response,
  next: NextFunction,
) {
  const { status, message, details } = normalizeError(err);
  
  const translator = typeof req.t === "function" ? req.t.bind(req) : null;
  let localizedMessage = message;
  
  if (translator) {
    try {
      localizedMessage = translator(message, details || {});
    } catch {
      localizedMessage =
        typeof message === "string" ? translator(message) : "Internal Server Error";
    }
  }

  return errorResponse(res, status, localizedMessage);
}