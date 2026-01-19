import AsyncStorage from "@react-native-async-storage/async-storage";
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { DarkTheme, LightTheme, NeonTheme, CoffeeTheme, TestTheme, type ThemeColors } from "@/constants/theme";

export type ThemeMode = "light" | "dark" | "neon" | "coffee" | "test";

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const STORAGE_KEY = "sbay.theme.mode";
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    const load = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "light" || stored === "dark") {
          setModeState(stored);
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
        : mode === "neon"
          ? NeonTheme
        : mode === "coffee"
          ? CoffeeTheme
          : mode === "test"
            ? TestTheme
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
