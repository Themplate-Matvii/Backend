import type { Response } from "express";
import { IS_PROD } from "@config/env";

const REFRESH_COOKIE_NAME = "rt";

// Set HttpOnly refresh cookie
export function setRefreshCookie(
  res: Response,
  token: string,
  maxAgeMs?: number,
) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
    path: "/",
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
  });
}

// Clear refresh cookie
export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    path: "/",
    httpOnly: true,
    secure: IS_PROD,
    sameSite: "lax",
  });
}
