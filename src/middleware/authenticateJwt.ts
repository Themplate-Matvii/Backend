// middlewares/authenticateJwt.ts
import { Response, NextFunction } from "express";
import { verifyAccessToken } from "@utils/auth/token";
import { RequestWithUser } from "@modules/core/types/auth";
import { messages } from "@constants/messages";
import { AppError } from "@utils/common/appError";

/**
 * JWT authentication middleware
 *
 * @param required - If true, request must include a valid JWT.
 *                   If false, JWT is optional (guest mode).
 */
function authenticateJwt(required = true) {
  return (req: RequestWithUser, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      if (required) {
        return next(new AppError(messages.auth.missingToken, 401));
      }
      return next();
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return next(new AppError(messages.auth.missingToken, 401));
    }

    try {
      const decoded = verifyAccessToken(token);
      if (!decoded) {
        return next(new AppError(messages.auth.invalidToken, 401));
      }
      req.user = decoded as RequestWithUser["user"];
      return next();
    } catch {
      if (required) {
        return next(new AppError(messages.auth.invalidToken, 401));
      }
      req.user = undefined;
      return next();
    }
  };
}

export const requireJwt = authenticateJwt(true);
export const optionalJwt = authenticateJwt(false);
