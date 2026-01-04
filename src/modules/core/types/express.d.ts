import "express-serve-static-core";
import type { TFunction } from "i18next";

declare module "express-serve-static-core" {
  interface Request {
    lang?: string;
    t?: TFunction;
  }
}