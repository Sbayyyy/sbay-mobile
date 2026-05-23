import AsyncStorage from "@react-native-async-storage/async-storage";
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { CoffeeTheme, DarkTheme, LightTheme, type ThemeColors } from "@/constants/theme";

export type ThemeMode = "light" | "dark" | "coffee";

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const STORAGE_KEY = "sbay.theme.mode";
const THEME_MODES: readonly ThemeMode[] = ["light", "dark", "coffee"];
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isThemeMode(value: string | null): value is ThemeMode {
  return THEME_MODES.includes(value as ThemeMode);
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (isThemeMode(stored)) {
          setModeState(stored);
        } else if (stored) {
          await AsyncStorage.setItem(STORAGE_KEY, "light");
        }
      } catch {
        // ignore persistence failures
      }
    };
    void load();
  }, []);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextMode);
    } catch {
      // ignore persistence failures
    }
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const isDark = mode === "dark";
    const resolvedTheme =
      mode === "dark"
        ? DarkTheme
        : mode === "coffee"
          ? CoffeeTheme
          : LightTheme;
    return {
      mode,
      isDark,
      colors: resolvedTheme.colors,
      setMode,
    };
  }, [mode, setMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return context;
};
