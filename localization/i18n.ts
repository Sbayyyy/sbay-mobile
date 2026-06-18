import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { I18nManager } from "react-native";
import * as Localization from "expo-localization";

import en from "@/locales/en.json";
import ar from "@/locales/ar.json";

export const resources = {
  en: { translation: en },
  ar: { translation: ar },
} as const;

export const supportedLanguages = {
  en: {
    code: "en",
    label: "English",
    nativeName: "English",
    isRTL: false,
  },
  ar: {
    code: "ar",
    label: "Arabic",
    nativeName: "العربية",
    isRTL: true,
  },
} as const;

export type SupportedLanguage = keyof typeof supportedLanguages;

export const fallbackLanguage: SupportedLanguage = "en";

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: fallbackLanguage,
    fallbackLng: fallbackLanguage,
    compatibilityJSON: "v4",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    returnNull: false,
  });
}

export const getBestLanguage = (): SupportedLanguage => {
  const locales = Localization.getLocales();
  const languageCode = locales?.[0]?.languageCode?.toLowerCase();

  if (languageCode && languageCode in supportedLanguages) {
    return languageCode as SupportedLanguage;
  }

  return fallbackLanguage;
};

export const syncLanguageDirection = (language: SupportedLanguage) => {
  const shouldUseRTL = supportedLanguages[language]?.isRTL ?? false;

  if (I18nManager.isRTL !== shouldUseRTL) {
    I18nManager.allowRTL(shouldUseRTL);
    I18nManager.forceRTL(shouldUseRTL);
  }
};

export const updateAppLanguage = async (language: SupportedLanguage) => {
  await i18n.changeLanguage(language);
  syncLanguageDirection(language);
};

syncLanguageDirection((i18n.language as SupportedLanguage) ?? fallbackLanguage);

export default i18n;
