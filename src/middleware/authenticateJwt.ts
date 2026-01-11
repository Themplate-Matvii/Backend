// middlewares/authenticateJwt.ts
import { Response, NextFunction } from "express";
import { verifyAccessToken } from "@utils/auth/token";
import { RequestWithUser } from "@modules/core/types/auth";
import { messages } from "@constants/messages";
import { AppError } from "@utils/common/appError";
import { ACCESS_COOKIE } from "@modules/user/auth/auth.service";

function authenticateJwt(required = true) {
  return (req: RequestWithUser, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    // 1) Try Bearer
    let token: string | undefined;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice("Bearer ".length).trim() || undefined;
    }

    // 2) Try cookie
    if (!token) {
      token = (req as any).cookies?.[ACCESS_COOKIE];
    }

    // 3) No token
    if (!token) {
      if (required) return next(new AppError(messages.auth.missingToken, 401));
      req.user = undefined;
      return next();
    }

    // 4) Verify
    try {
      const decoded = verifyAccessToken(token);
      if (!decoded) {
        if (required)
          return next(new AppError(messages.auth.invalidToken, 401));
        req.user = undefined;
        return next();
      }

      req.user = decoded as RequestWithUser["user"];
      return next();
    } catch {
      if (required) return next(new AppError(messages.auth.invalidToken, 401));
      req.user = undefined;
      return next();
    }
  };
}

export const requireJwt = authenticateJwt(true);
export const optionalJwt = authenticateJwt(false);
