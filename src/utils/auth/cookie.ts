import type { Response } from "express";
import { IS_PROD } from "@config/env";
import { REFRESH_COOKIE } from "@modules/user/auth/auth.service";


// Set HttpOnly refresh cookie
export function setRefreshCookie(
  res: Response,
  token: string,
  maxAgeMs?: number,
) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
  });
}

// Clear refresh cookie
export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, {
    path: "/",
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
  });
}
