import * as WebBrowser from "expo-web-browser";

import {
  completeGoogleAuthFromParams,
  GOOGLE_AUTH_UNAVAILABLE_ERROR,
  loginWithGoogle,
} from "../auth";
import { apiRequest } from "@/services/api";

jest.mock("expo-secure-store", () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

jest.mock("expo-linking", () => ({
  createURL: jest.fn(() => "sbay://auth/google"),
  parse: jest.fn(),
}));

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock("@/services/api", () => ({
  API_BASE_URL: "https://api.example.test",
  apiRequest: jest.fn(),
}));

jest.mock("@/services/auth-session", () => ({
  getAuthToken: jest.fn(),
  setAuthToken: jest.fn(),
}));

jest.mock("@/services/config", () => ({
  GOOGLE_AUTH_ENABLED: false,
}));

describe("Google auth feature flag", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects callback params while Google auth is unavailable", async () => {
    await expect(completeGoogleAuthFromParams({ token: "token" })).rejects.toThrow(
      GOOGLE_AUTH_UNAVAILABLE_ERROR,
    );

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it("does not open the browser while Google auth is unavailable", async () => {
    await expect(loginWithGoogle()).rejects.toThrow(GOOGLE_AUTH_UNAVAILABLE_ERROR);

    expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
  });
});
