const blockedMessages = [
  "blocked",
  "you are blocked",
  "user is blocked",
  "participant is blocked",
];

const inactiveMessages = [
  "inactive account",
  "account is inactive",
  "account_inactive",
  "deactivated",
  "account deactivated",
  "user is inactive",
];

function getErrorStatus(error: unknown): number | undefined {
  return typeof error === "object" && error != null && "status" in error
    ? (error as { status?: number }).status
    : undefined;
}

function getErrorPayloadCode(error: unknown): string {
  if (typeof error !== "object" || error == null || !("payload" in error)) {
    return "";
  }
  const payload = (error as { payload?: { code?: unknown } }).payload;
  return typeof payload?.code === "string" ? payload.code.toLowerCase() : "";
}

function getErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const payloadCode = getErrorPayloadCode(error);
  return `${payloadCode} ${message}`.toLowerCase();
}

export function getAccountStatusErrorMessage(error: unknown): string | null {
  const status = getErrorStatus(error);
  if (status != null && status !== 403) return null;

  const message = getErrorMessage(error);
  if (blockedMessages.some((text) => message.includes(text))) {
    return "This action is not available because one of the accounts is blocked.";
  }
  if (inactiveMessages.some((text) => message.includes(text))) {
    return "This action is not available because one of the accounts is inactive.";
  }
  return null;
}

export function getActionErrorMessage(error: unknown, fallback: string): string {
  return getAccountStatusErrorMessage(error) ?? getFriendlyErrorMessage(error, fallback);
}

function isGenericApiMessage(message: string): boolean {
  const lower = message.trim().toLowerCase();
  return (
    lower === "" ||
    lower === "forbidden" ||
    lower === "forbidden." ||
    lower === "not found" ||
    lower === "not found." ||
    /^request failed \(\d{3}\)$/.test(lower) ||
    lower === "an unexpected error occurred."
  );
}

export function getFriendlyErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const message = error.message?.trim() ?? "";
    const code = getErrorPayloadCode(error);

    if (error.status === 400 && message && !isGenericApiMessage(message)) {
      return message;
    }
    if (error.status === 401) {
      return "Your session has expired. Please sign in again.";
    }
    if (error.status === 403) {
      if (code.includes("email") || message.toLowerCase().includes("email")) {
        return "Please verify your email before using this feature.";
      }
      return "You do not have permission to do that.";
    }
    if (error.status === 404) {
      return "We could not find that item. It may have been removed or is no longer available.";
    }
    if (error.status === 409) {
      return "This changed while you were working. Refresh and try again.";
    }
    if (error.status === 429) {
      return "You are doing that too quickly. Please wait a moment and try again.";
    }
    if (error.status >= 500) {
      return "Something went wrong on our side. Please try again in a moment.";
    }
    if (message && !isGenericApiMessage(message)) {
      return message;
    }
  }

  if (error instanceof TypeError && error.message.toLowerCase().includes("network")) {
    return "Unable to connect. Check your internet connection and try again.";
  }

  if (error instanceof Error && error.message && !isGenericApiMessage(error.message)) {
    return error.message;
  }

  return fallback || "Something went wrong. Please try again.";
}
import { ApiError } from "@/services/api";
