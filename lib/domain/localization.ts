export type SupportedLocale =
  | "en"
  | "es"
  | "fr"
  | "de"
  | "pt"
  | "ja"
  | "ko"
  | "zh"
  | "ar";

export const SUPPORTED_LOCALES: readonly SupportedLocale[] = [
  "en", "es", "fr", "de", "pt", "ja", "ko", "zh", "ar",
] as const;

export const DEFAULT_LOCALE: SupportedLocale = "en";

export type TranslationKey = {
  key: string;
  locale: SupportedLocale;
  value: string;
  lastUpdatedAt: string;
};

export type LocaleDetectionSource = "browser" | "account_setting" | "url" | "ip_geolocation";

export function detectLocale(
  sources: { source: LocaleDetectionSource; locale: string }[]
): SupportedLocale {
  for (const s of sources) {
    const match = SUPPORTED_LOCALES.find((l) => s.locale.startsWith(l));
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

export type RtlLocale = "ar";

export function isRtlLocale(locale: SupportedLocale): boolean {
  return locale === "ar";
}

export type ContentTranslation = {
  contentId: string;
  contentType: "drop_description" | "world_description" | "studio_bio";
  sourceLocale: SupportedLocale;
  targetLocale: SupportedLocale;
  translatedText: string;
  translatedAt: string;
  source: "creator" | "auto";
};

export type CurrencyFormat = {
  locale: SupportedLocale;
  currency: string;
  symbolPosition: "before" | "after";
  decimalSeparator: "." | ",";
};
