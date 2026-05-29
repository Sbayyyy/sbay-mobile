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
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
  });

  it("removes stale refresh tokens when storing an access-token-only session", async () => {
    await storeAuthTokens("access-token", null);

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("sbay.auth.token", "access-token");
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("sbay.auth.refreshToken");
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
});
