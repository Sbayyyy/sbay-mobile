import AsyncStorage from "@react-native-async-storage/async-storage";
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
  const [requiresLanguageChoice, setRequiresLanguageChoice] = useState(false);
  const [isSavingLanguage, setIsSavingLanguage] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      let resolvedLanguage: SupportedLanguage | null = null;
      let hasStoredLanguage = false;

      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (stored && stored in supportedLanguages) {
          resolvedLanguage = stored as SupportedLanguage;
          hasStoredLanguage = true;
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
        setRequiresLanguageChoice(!hasStoredLanguage);
        setIsReady(true);
      }
    };

    initialize().catch(() => {
      setIsReady(true);
    });
  }, []);

  const persistLanguageChoice = useCallback(
    async (nextLanguage: SupportedLanguage) => {
      try {
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
      } catch {
        // Keep the current session unblocked even if local persistence fails.
      }
      setRequiresLanguageChoice(false);
    },
    [],
  );

  const handleChangeLanguage = useCallback(
    async (nextLanguage: SupportedLanguage) => {
      if (nextLanguage !== language) {
        await updateAppLanguage(nextLanguage);
        setLanguage(nextLanguage);
      }
      await persistLanguageChoice(nextLanguage);
    },
    [language, persistLanguageChoice],
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

  const handleInitialLanguageChoice = useCallback(
    async (nextLanguage: SupportedLanguage) => {
      if (isSavingLanguage) return;
      setIsSavingLanguage(true);
      try {
        await handleChangeLanguage(nextLanguage);
      } finally {
        setIsSavingLanguage(false);
      }
    },
    [handleChangeLanguage, isSavingLanguage],
  );

  const content = !isReady ? (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" />
    </View>
  ) : requiresLanguageChoice ? (
    <LanguageChoiceScreen
      currentLanguage={language}
      isSaving={isSavingLanguage}
      onSelectLanguage={handleInitialLanguageChoice}
    />
  ) : (
    children
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

type LanguageChoiceScreenProps = {
  currentLanguage: SupportedLanguage;
  isSaving: boolean;
  onSelectLanguage: (language: SupportedLanguage) => void;
};

function LanguageChoiceScreen({
  currentLanguage,
  isSaving,
  onSelectLanguage,
}: LanguageChoiceScreenProps) {
  const languages = useMemo(() => Object.values(supportedLanguages), []);

  return (
    <View style={styles.choiceRoot}>
      <View style={styles.choiceCard}>
        <View style={styles.brandBadge}>
          <Text style={styles.brandText}>SBay</Text>
        </View>

        <View style={styles.choiceCopy}>
          <Text style={styles.choiceTitle}>Choose your language</Text>
          <Text style={styles.choiceTitleArabic}>اختر اللغة</Text>
          <Text style={styles.choiceSubtitle}>
            You can change this later from Settings.
          </Text>
          <Text style={styles.choiceSubtitleArabic}>
            يمكنك تغيير اللغة لاحقا من الإعدادات.
          </Text>
        </View>

        <View style={styles.languageList}>
          {languages.map((entry) => {
            const isActive = entry.code === currentLanguage;
            return (
              <TouchableOpacity
                key={entry.code}
                activeOpacity={0.88}
                style={[styles.languageButton, isActive && styles.languageButtonActive]}
                onPress={() => onSelectLanguage(entry.code)}
                disabled={isSaving}
                accessibilityRole="button"
              >
                <View>
                  <Text style={styles.languageName}>{entry.label}</Text>
                  <Text style={styles.languageNativeName}>{entry.nativeName}</Text>
                </View>
                {isActive && isSaving ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <Text style={[styles.languageAction, isActive && styles.languageActionActive]}>
                    {entry.code === "ar" ? "اختيار" : "Select"}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceRoot: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#f8fafc",
  },
  choiceCard: {
    gap: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#dbe4ef",
    backgroundColor: "#ffffff",
    padding: 24,
    shadowColor: "rgba(15, 23, 42, 0.16)",
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  brandBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  brandText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  choiceCopy: {
    gap: 6,
  },
  choiceTitle: {
    color: "#0f172a",
    fontSize: 25,
    fontWeight: "800",
  },
  choiceTitleArabic: {
    color: "#0f172a",
    fontSize: 25,
    fontWeight: "800",
    textAlign: "right",
  },
  choiceSubtitle: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
  },
  choiceSubtitleArabic: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "right",
  },
  languageList: {
    gap: 10,
  },
  languageButton: {
    minHeight: 68,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbe4ef",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  languageButtonActive: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  languageName: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "800",
  },
  languageNativeName: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 3,
  },
  languageAction: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "800",
  },
  languageActionActive: {
    color: "#2563eb",
  },
});
