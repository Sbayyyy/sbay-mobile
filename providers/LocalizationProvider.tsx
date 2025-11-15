import AsyncStorage from "@react-native-async-storage/async-storage";
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { I18nextProvider } from "react-i18next";

import i18n, {
  SupportedLanguage,
  fallbackLanguage,
  getBestLanguage,
  supportedLanguages,
  updateAppLanguage,
} from "@/localization/i18n";

type LocalizationContextValue = {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
  availableLanguages: typeof supportedLanguages;
  isRTL: boolean;
  isReady: boolean;
};

const LocalizationContext = createContext<LocalizationContextValue | undefined>(undefined);
const LANGUAGE_STORAGE_KEY = "sbay.language";

export function LocalizationProvider({ children }: PropsWithChildren) {
  const [language, setLanguage] = useState<SupportedLanguage>(
    (i18n.language as SupportedLanguage) ?? fallbackLanguage,
  );
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      let resolvedLanguage: SupportedLanguage | null = null;

      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored && stored in supportedLanguages) {
          resolvedLanguage = stored as SupportedLanguage;
        }
      } catch {
        resolvedLanguage = null;
      }

      const preferred = resolvedLanguage ?? getBestLanguage();

      try {
        await updateAppLanguage(preferred);
        setLanguage(preferred);
      } catch {
        await updateAppLanguage(fallbackLanguage);
        setLanguage(fallbackLanguage);
      } finally {
        setIsReady(true);
      }
    };

    initialize().catch(() => {
      setIsReady(true);
    });
  }, []);

  const handleChangeLanguage = useCallback(
    async (nextLanguage: SupportedLanguage) => {
      if (nextLanguage === language) return;
      await updateAppLanguage(nextLanguage);
      setLanguage(nextLanguage);
      try {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
      } catch {
        // ignore persistence failures
      }
    },
    [language],
  );

  const value = useMemo<LocalizationContextValue>(
    () => ({
      language,
      setLanguage: handleChangeLanguage,
      availableLanguages: supportedLanguages,
      isRTL: supportedLanguages[language].isRTL,
      isReady,
    }),
    [handleChangeLanguage, isReady, language],
  );

  const content = isReady ? (
    children
  ) : (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" />
    </View>
  );

  return (
    <LocalizationContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>{content}</I18nextProvider>
    </LocalizationContext.Provider>
  );
}

export const useLocalizationContext = () => {
  const context = useContext(LocalizationContext);

  if (!context) {
    throw new Error("useLocalizationContext must be used within LocalizationProvider");
  }

  return context;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
