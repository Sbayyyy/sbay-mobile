import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";

import { apiRequest } from "@/services/api";
import { getStoredToken } from "@/services/auth";

export type BugReportSeverity = "low" | "medium" | "high" | "critical";

export type BugReportPayload = {
  title: string;
  description: string;
  pageUrl?: string;
  steps?: string;
  expected?: string;
  actual?: string;
  severity?: BugReportSeverity;
  browser?: string;
  userAgent?: string;
};

export type BugReportResponse = {
  id: string;
  createdAt: string;
};

async function authHeader(): Promise<Record<string, string>> {
  const token = await getStoredToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export function getBugReportDeviceInfo() {
  const appVersion =
    Constants.expoConfig?.version ??
    Constants.nativeAppVersion ??
    "unknown";
  const osVersion = Device.osVersion ?? "unknown";
  const model = [Device.manufacturer, Device.modelName].filter(Boolean).join(" ");

  return {
    browser: `sbay-mobile ${appVersion}`,
    userAgent: [
      `platform=${Platform.OS}`,
      `os=${Device.osName ?? Platform.OS} ${osVersion}`,
      `device=${model || "unknown"}`,
      `app=${appVersion}`,
    ].join("; "),
  };
}

export async function createBugReport(
  payload: BugReportPayload,
): Promise<BugReportResponse> {
  const deviceInfo = getBugReportDeviceInfo();
  return apiRequest<BugReportResponse>("/api/bug-reports", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify({
      ...deviceInfo,
      ...payload,
      severity: payload.severity ?? "medium",
    }),
  });
}
