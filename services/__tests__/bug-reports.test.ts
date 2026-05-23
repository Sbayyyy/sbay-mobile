import { createBugReport, getBugReportDeviceInfo } from "../bug-reports";
import { apiRequest } from "@/services/api";
import { getStoredToken } from "@/services/auth";

jest.mock("@/services/api", () => ({
  apiRequest: jest.fn(),
}));

jest.mock("@/services/auth", () => ({
  getStoredToken: jest.fn(),
}));

jest.mock("expo-device", () => ({
  manufacturer: "Sbay",
  modelName: "Test Phone",
  osName: "Android",
  osVersion: "14",
}));

jest.mock("expo-constants", () => ({
  expoConfig: {
    version: "1.0.0",
  },
  nativeAppVersion: "1.0.0",
}));

describe("bug reports service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getStoredToken as jest.Mock).mockResolvedValue("token");
  });

  it("adds mobile device metadata and auth headers", async () => {
    (apiRequest as jest.Mock).mockResolvedValue({
      id: "bug-1",
      createdAt: "2026-05-23T12:00:00Z",
    });

    await createBugReport({
      title: "Broken offer",
      description: "Offer sends but shows an error.",
      steps: "Open chat and send offer",
      expected: "Offer sends without an error",
      actual: "Unexpected error appears",
      pageUrl: "sbay://chats/thread/1",
      severity: "high",
    });

    expect(apiRequest).toHaveBeenCalledWith("/api/bug-reports", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: "Bearer token",
      },
      body: JSON.stringify({
        ...getBugReportDeviceInfo(),
        title: "Broken offer",
        description: "Offer sends but shows an error.",
        steps: "Open chat and send offer",
        expected: "Offer sends without an error",
        actual: "Unexpected error appears",
        pageUrl: "sbay://chats/thread/1",
        severity: "high",
      }),
    });
  });

  it("defaults severity and works without a stored token", async () => {
    (getStoredToken as jest.Mock).mockResolvedValue(null);
    (apiRequest as jest.Mock).mockResolvedValue({
      id: "bug-2",
      createdAt: "2026-05-23T12:00:00Z",
    });

    await createBugReport({
      title: "Small glitch",
      description: "Something looked wrong.",
    });

    const [, options] = (apiRequest as jest.Mock).mock.calls[0];
    expect(options.headers).toEqual({
      Accept: "application/json",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(options.body).severity).toBe("medium");
  });
});
