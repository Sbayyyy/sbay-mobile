/**
 * Central error reporting service.
 *
 * To wire up Sentry:
 *   1. npm install @sentry/react-native
 *   2. In app.json plugins: ["@sentry/react-native/expo"]
 *   3. Replace the stubs below with Sentry.init(...) and Sentry calls.
 *
 * All error capture in the app goes through this module so the swap is isolated.
 */

type Extras = Record<string, unknown>;

function isDev() {
  return process.env.NODE_ENV === "development" || __DEV__;
}

export const ErrorReporter = {
  init(): void {
    // Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, ... });
  },

  captureException(error: unknown, extras?: Extras): void {
    if (isDev()) {
      console.error("[ErrorReporter]", error, extras);
    }
    // Sentry.withScope((scope) => {
    //   if (extras) scope.setExtras(extras);
    //   Sentry.captureException(error);
    // });
  },

  captureMessage(message: string, extras?: Extras): void {
    if (isDev()) {
      console.warn("[ErrorReporter]", message, extras);
    }
    // Sentry.captureMessage(message, { extra: extras });
  },

  setUser(user: { id: string; email?: string } | null): void {
    // Sentry.setUser(user);
  },
};
