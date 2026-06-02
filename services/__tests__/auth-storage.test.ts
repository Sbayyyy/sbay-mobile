import * as SecureStore from "expo-secure-store";

import { clearStoredToken, refreshStoredToken, storeAuthTokens } from "../auth";
import { setAuthToken } from "@/services/auth-session";

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock("expo-secure-store", () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

jest.mock("@/services/api", () => ({
  API_BASE_URL: "https://api.example.test",
  apiRequest: jest.fn(),
}));

jest.mock("@/services/auth-session", () => ({
  getAuthToken: jest.fn(),
  setAuthToken: jest.fn(),
}));

describe("auth token storage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
  });

  it("removes stale refresh tokens when storing an access-token-only session", async () => {
    await storeAuthTokens("access-token", null);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("sbay.auth.token", "access-token");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("sbay.auth.refreshToken");
  });

  it("stores access and refresh tokens together", async () => {
    await storeAuthTokens("access-token", "refresh-token");

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("sbay.auth.token", "access-token");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("sbay.auth.refreshToken", "refresh-token");
  });

  it("attempts to remove both stored tokens before reporting clear failure", async () => {
    (SecureStore.deleteItemAsync as jest.Mock)
      .mockRejectedValueOnce(new Error("access delete failed"))
      .mockResolvedValueOnce(undefined);

    await expect(clearStoredToken()).rejects.toThrow("Unable to clear stored auth tokens.");

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("sbay.auth.token");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("sbay.auth.refreshToken");
    expect(setAuthToken).not.toHaveBeenCalled();
  });

  it("preserves stored tokens when refresh is temporarily unavailable", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("refresh-token");
    mockFetch.mockRejectedValueOnce(new Error("Network unavailable"));

    await expect(refreshStoredToken()).resolves.toEqual({ status: "unavailable" });

    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it("clears stored tokens only when the refresh token is rejected", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("refresh-token");
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    await expect(refreshStoredToken()).resolves.toEqual({ status: "rejected" });

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("sbay.auth.token");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("sbay.auth.refreshToken");
  });

  it("stores the rotated token pair after a successful refresh", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("old-refresh-token");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        token: "new-access-token",
        refreshToken: "new-refresh-token",
      }),
    });

    await expect(refreshStoredToken()).resolves.toEqual({
      status: "refreshed",
      token: "new-access-token",
    });

    expect(mockFetch).toHaveBeenCalledWith("https://api.example.test/api/auth/refresh", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ refreshToken: "old-refresh-token" }),
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("sbay.auth.token", "new-access-token");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("sbay.auth.refreshToken", "new-refresh-token");
  });

  it("shares one in-flight refresh request across concurrent callers", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("old-refresh-token");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        token: "new-access-token",
        refreshToken: "new-refresh-token",
      }),
    });

    const [first, second] = await Promise.all([
      refreshStoredToken(),
      refreshStoredToken(),
    ]);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(first).toEqual({ status: "refreshed", token: "new-access-token" });
    expect(second).toEqual(first);
  });
});
