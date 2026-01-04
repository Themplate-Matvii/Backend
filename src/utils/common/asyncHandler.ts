import { Request, Response, NextFunction, RequestHandler } from "express";

// Overload: basic call without custom request/response types
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
): RequestHandler;

// Overload: allows passing custom request/response types (e.g., RequestWithUser)
export function asyncHandler<
  TReq extends Request = Request,
  TRes extends Response = Response,
>(
  fn: (req: TReq, res: TRes, next: NextFunction) => Promise<any>,
): RequestHandler;

// Implementation
export function asyncHandler<
  TReq extends Request = Request,
  TRes extends Response = Response,
>(
  fn: (req: TReq, res: TRes, next: NextFunction) => Promise<any>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as TReq, res as TRes, next)).catch(next);
  };
}
