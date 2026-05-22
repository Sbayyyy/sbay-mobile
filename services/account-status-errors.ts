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
  return getAccountStatusErrorMessage(error) ?? (error instanceof Error ? error.message : fallback);
}
