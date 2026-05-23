import { Alert } from "react-native";

import { requestEmailVerification } from "@/services/auth";

export type EmailVerificationStatus = {
  verified?: boolean | null;
  emailVerified?: boolean | null;
  isEmailVerified?: boolean | null;
  emailConfirmed?: boolean | null;
  isVerified?: boolean | null;
  emailVerifiedAt?: string | null;
  emailConfirmedAt?: string | null;
};

const unverifiedMessages = [
  "email is not verified",
  "email not verified",
  "email verification required",
  "verify your email",
  "unverified email",
  "email must be verified",
];

export function isEmailVerified(value?: EmailVerificationStatus | null): boolean {
  if (!value) return false;
  if (typeof value.verified === "boolean") return value.verified;
  if (typeof value.emailVerified === "boolean") return value.emailVerified;
  if (typeof value.isEmailVerified === "boolean") return value.isEmailVerified;
  if (typeof value.emailConfirmed === "boolean") return value.emailConfirmed;
  if (typeof value.isVerified === "boolean") return value.isVerified;
  if (value.emailVerifiedAt) return true;
  if (value.emailConfirmedAt) return true;
  return false;
}

export function isUnverifiedEmailError(error: unknown): boolean {
  const status = typeof error === "object" && error != null && "status" in error
    ? (error as { status?: number }).status
    : undefined;
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    status === 403 &&
    (message === "request failed (403)" ||
      message === "forbidden." ||
      message === "forbidden" ||
      unverifiedMessages.some((text) => message.includes(text)))
  );
}

export async function sendVerificationEmailWithAlert(options?: {
  successTitle?: string;
  successMessage?: string;
  errorTitle?: string;
}): Promise<void> {
  try {
    await requestEmailVerification();
    Alert.alert(
      options?.successTitle ?? "Verification email sent",
      options?.successMessage ?? "Check your inbox and open the verification link to continue.",
    );
  } catch (error) {
    Alert.alert(
      options?.errorTitle ?? "Unable to send email",
      error instanceof Error ? error.message : "Please try again later.",
    );
  }
}

export function showEmailVerificationRequiredAlert(): void {
  Alert.alert(
    "Verify your email",
    "Please verify your email before using this feature.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send email",
        onPress: () => {
          void sendVerificationEmailWithAlert();
        },
      },
    ],
  );
}
