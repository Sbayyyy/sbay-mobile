import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_COMPLETED_KEY = "sbay.onboarding.completed.v1";

export async function hasCompletedOnboarding(): Promise<boolean> {
  return (await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY)) === "1";
}

export async function markOnboardingCompleted(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_COMPLETED_KEY, "1");
}

export async function clearOnboardingCompletion(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_COMPLETED_KEY);
}
