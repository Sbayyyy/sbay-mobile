import { ApiError } from "@/services/api";
import {
  getAccountStatusErrorMessage,
  getActionErrorMessage,
  getFriendlyErrorMessage,
} from "../account-status-errors";

describe("Account status error helpers", () => {
  it("maps blocked chat errors to friendly copy", () => {
    const error = new ApiError("Blocked", 403);

    expect(getAccountStatusErrorMessage(error)).toBe(
      "This action is not available because one of the accounts is blocked.",
    );
  });

  it("maps inactive account payload codes to friendly copy", () => {
    const error = new ApiError("This account is inactive.", 403, {
      code: "account_inactive",
    });

    expect(getActionErrorMessage(error, "Fallback")).toBe(
      "This action is not available because one of the accounts is inactive.",
    );
  });

  it("keeps normal errors unchanged", () => {
    expect(getActionErrorMessage(new Error("Network down"), "Fallback")).toBe(
      "Network down",
    );
    expect(getAccountStatusErrorMessage(new ApiError("Forbidden", 403))).toBeNull();
  });

  it("maps generic HTTP status errors to user-friendly copy", () => {
    expect(getFriendlyErrorMessage(new ApiError("Forbidden.", 403), "Fallback")).toBe(
      "You do not have permission to do that.",
    );
    expect(getFriendlyErrorMessage(new ApiError("Request failed (404)", 404), "Fallback")).toBe(
      "We could not find that item. It may have been removed or is no longer available.",
    );
    expect(getFriendlyErrorMessage(new ApiError("An unexpected error occurred.", 500), "Fallback")).toBe(
      "Something went wrong on our side. Please try again in a moment.",
    );
  });

  it("keeps session refresh network failures retryable instead of asking for login", () => {
    expect(
      getFriendlyErrorMessage(
        new ApiError("We could not refresh your session.", 503, {
          code: "session_refresh_unavailable",
        }),
        "Fallback",
      ),
    ).toBe(
      "You are still signed in, but we could not refresh your session. Check your connection and try again.",
    );
  });
});
