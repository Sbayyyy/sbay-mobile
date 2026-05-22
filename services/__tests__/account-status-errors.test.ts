import { ApiError } from "@/services/api";
import {
  getAccountStatusErrorMessage,
  getActionErrorMessage,
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
});
