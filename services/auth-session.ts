let currentToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export type AuthRefreshResult =
  | { status: "refreshed"; token: string }
  | { status: "rejected" }
  | { status: "unavailable" };

let refreshHandler: (() => Promise<AuthRefreshResult>) | null = null;

export function setAuthToken(token: string | null) {
  currentToken = token;
}

export function getAuthToken() {
  return currentToken;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized() {
  unauthorizedHandler?.();
}

export function setTokenRefreshHandler(handler: (() => Promise<AuthRefreshResult>) | null) {
  refreshHandler = handler;
}

export async function refreshAuthToken() {
  return refreshHandler ? refreshHandler() : { status: "unavailable" as const };
}
