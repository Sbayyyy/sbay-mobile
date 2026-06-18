import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  clearOnboardingCompletion,
  hasCompletedOnboarding,
  markOnboardingCompleted,
} from "../onboarding";

describe("onboarding service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns false when onboarding has not been completed", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await expect(hasCompletedOnboarding()).resolves.toBe(false);
  });

  it("returns true when onboarding has been completed", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("1");

    await expect(hasCompletedOnboarding()).resolves.toBe(true);
  });

  it("persists onboarding completion", async () => {
    await markOnboardingCompleted();

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "sbay.onboarding.completed.v1",
      "1",
    );
  });

  it("clears onboarding completion", async () => {
    await clearOnboardingCompletion();

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      "sbay.onboarding.completed.v1",
    );
  });
});
