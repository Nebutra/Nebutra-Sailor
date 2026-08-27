import type en from "../../messages/en.json";
import type { routing } from "../i18n/routing";

// next-intl v4 scoped type augmentation.
// Provides compile-time key validation for translation keys
// and strict locale typing across the app.
declare module "next-intl" {
  interface AppConfig {
    Messages: typeof en;
    Locale: (typeof routing.locales)[number];
  }
}
