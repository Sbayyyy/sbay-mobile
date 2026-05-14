import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "@/hooks/use-app-theme";
import { type ThemeColors } from "@/constants/theme";

type PopupTone = "error" | "success" | "info";

type PopupOptions = {
  title?: string;
  message: string;
  tone?: PopupTone;
  actionLabel?: string;
  onAction?: () => void;
};

type AppPopupContextValue = {
  showPopup: (options: PopupOptions) => void;
  showError: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  hidePopup: () => void;
};

const AppPopupContext = createContext<AppPopupContextValue | null>(null);

export function AppPopupProvider({ children }: { children: ReactNode }) {
  const [popup, setPopup] = useState<PopupOptions | null>(null);
  const theme = useAppTheme();
  const { t } = useTranslation();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const hidePopup = useCallback(() => setPopup(null), []);

  const showPopup = useCallback((options: PopupOptions) => {
    setPopup({ tone: "info", ...options });
  }, []);

  const showError = useCallback(
    (message: string, title?: string) => {
      setPopup({
        tone: "error",
        title: title ?? t("popup.errorTitle", { defaultValue: "Something went wrong" }),
        message,
      });
    },
    [t],
  );

  const showSuccess = useCallback(
    (message: string, title?: string) => {
      setPopup({
        tone: "success",
        title: title ?? t("popup.successTitle", { defaultValue: "Done" }),
        message,
      });
    },
    [t],
  );

  const value = useMemo(
    () => ({ showPopup, showError, showSuccess, hidePopup }),
    [hidePopup, showError, showPopup, showSuccess],
  );

  const tone = popup?.tone ?? "info";
  const toneStyle =
    tone === "error"
      ? styles.error
      : tone === "success"
        ? styles.success
        : styles.info;

  const iconLabel = tone === "error" ? "!" : tone === "success" ? "✓" : "i";
  const actionLabel = popup?.actionLabel ?? t("popup.dismiss", { defaultValue: "OK" });

  return (
    <AppPopupContext.Provider value={value}>
      {children}
      <Modal visible={popup !== null} transparent animationType="fade" onRequestClose={hidePopup}>
        <Pressable style={styles.backdrop} onPress={hidePopup}>
          <Pressable style={styles.card} onPress={() => {}}>
            <View style={[styles.icon, toneStyle]}>
              <Text style={styles.iconText}>{iconLabel}</Text>
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>{popup?.title}</Text>
              <Text style={styles.message}>{popup?.message}</Text>
            </View>
            <TouchableOpacity
              style={[styles.button, toneStyle]}
              activeOpacity={0.86}
              onPress={() => {
                const action = popup?.onAction;
                hidePopup();
                action?.();
              }}
            >
              <Text style={styles.buttonText}>{actionLabel}</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </AppPopupContext.Provider>
  );
}

export function useAppPopup() {
  const context = useContext(AppPopupContext);
  if (!context) {
    throw new Error("useAppPopup must be used within AppPopupProvider");
  }
  return context;
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      backgroundColor: "rgba(15, 23, 42, 0.42)",
    },
    card: {
      width: "100%",
      maxWidth: 420,
      borderRadius: 24,
      padding: 22,
      gap: 16,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      shadowOpacity: 0.28,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
    },
    icon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: "center",
      justifyContent: "center",
    },
    iconText: {
      color: theme.primaryForeground,
      fontSize: 23,
      fontWeight: "900",
    },
    error: {
      backgroundColor: theme.danger,
    },
    success: {
      backgroundColor: theme.success,
    },
    info: {
      backgroundColor: theme.primary,
    },
    copy: {
      gap: 7,
    },
    title: {
      color: theme.text,
      fontSize: 19,
      fontWeight: "800",
    },
    message: {
      color: theme.textMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    button: {
      borderRadius: 15,
      paddingVertical: 14,
      alignItems: "center",
    },
    buttonText: {
      color: theme.primaryForeground,
      fontSize: 15,
      fontWeight: "800",
    },
  });
