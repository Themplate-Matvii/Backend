import i18n from "i18next";
import Backend from "i18next-fs-backend";
import { join } from "path";
import { ENV } from "@config/env";

let initialized = false;

export enum LangEnum {
  ru = "ru",
  en = "en",
}

export async function initI18n() {
  if (initialized) return i18n;

  await i18n.use(Backend).init({
    lng: ENV.DEFAULT_LANGUAGE,
    fallbackLng: ENV.DEFAULT_LANGUAGE,
    preload: ["ru", "en"],
    backend: {
      loadPath: join(__dirname, "../", "locales", "{{lng}}.json"),
    },
    interpolation: {
      escapeValue: false,
    },
    returnObjects: true,
    keySeparator: ".",
  });

  initialized = true;
  return i18n;
}

export { i18n };
