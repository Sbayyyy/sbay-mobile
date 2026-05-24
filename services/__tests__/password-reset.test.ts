import {
  forgotPassword,
  resetPassword,
} from "../auth";
import * as api from "@/services/api";

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("@/services/api", () => ({
  API_BASE_URL: "https://api.example.test",
  apiRequest: jest.fn(),
}));

jest.mock("@/services/auth-session", () => ({
  getAuthToken: jest.fn(),
  setAuthToken: jest.fn(),
}));

describe("Password reset auth methods", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requests a forgot-password email", async () => {
    (api.apiRequest as jest.Mock).mockResolvedValue(undefined);

    await forgotPassword({ email: "user@example.com" });

    expect(api.apiRequest).toHaveBeenCalledWith("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com" }),
      skipAuthRefresh: true,
    });
  });

  it("resets password with token and new password", async () => {
    (api.apiRequest as jest.Mock).mockResolvedValue(undefined);

    await resetPassword({ token: "reset-token", newPassword: "Password123" });

    expect(api.apiRequest).toHaveBeenCalledWith("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: "reset-token", newPassword: "Password123" }),
      skipAuthRefresh: true,
    });
  });
});
