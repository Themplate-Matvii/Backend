import { Request, Response, NextFunction } from "express";
import { i18n } from "@config/i18n";

export function i18nPerRequest(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const userLang =
    (req as any).user?.language ||
    (typeof req.query.lang === "string" ? req.query.lang : undefined) ||
    req.headers["accept-language"] ||
    process.env.DEFAULT_LANGUAGE ||
    "ru";

  // Do NOT mutate global i18n; get a fixed translator for this request
  (req as any).lang = userLang;
  (req as any).t = i18n.getFixedT(userLang);
  next();
}
