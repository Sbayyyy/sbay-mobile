import Constants from "expo-constants";

type AppExtra = {
  googleAuthEnabled?: boolean | string;
  webBaseUrl?: string;
};

const extra = (Constants.expoConfig as { extra?: AppExtra } | null)?.extra;

const rawWebBaseUrl =
  process.env.EXPO_PUBLIC_WEB_BASE_URL ?? extra?.webBaseUrl ?? "https://syrian-bay.com";

export const WEB_BASE_URL = rawWebBaseUrl.replace(/\/+$/, "");

function parseBooleanFlag(value?: boolean | string | null): boolean {
  if (typeof value === "boolean") return value;
  if (!value) return false;

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

export const GOOGLE_AUTH_ENABLED = parseBooleanFlag(
  process.env.EXPO_PUBLIC_GOOGLE_AUTH_ENABLED ?? extra?.googleAuthEnabled,
);
