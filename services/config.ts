import Constants from "expo-constants";

const extra = (Constants.expoConfig as { extra?: { webBaseUrl?: string } } | null)?.extra;

const rawWebBaseUrl =
  process.env.EXPO_PUBLIC_WEB_BASE_URL ?? extra?.webBaseUrl ?? "https://syrian-bay.com";

export const WEB_BASE_URL = rawWebBaseUrl.replace(/\/+$/, "");
