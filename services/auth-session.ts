let currentToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;
let refreshHandler: (() => Promise<string | null>) | null = null;

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

export function setTokenRefreshHandler(handler: (() => Promise<string | null>) | null) {
  refreshHandler = handler;
}

export async function refreshAuthToken() {
  return refreshHandler ? refreshHandler() : null;
}
