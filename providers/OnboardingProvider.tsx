import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  hasCompletedOnboarding,
  markOnboardingCompleted,
} from "@/services/onboarding";

type OnboardingStatus = "loading" | "pending" | "completed";

type OnboardingContextValue = {
  status: OnboardingStatus;
  completeOnboarding: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<OnboardingStatus>("loading");

  useEffect(() => {
    let isMounted = true;

    const hydrate = async () => {
      try {
        const completed = await hasCompletedOnboarding();
        if (!isMounted) return;
        setStatus(completed ? "completed" : "pending");
      } catch {
        if (isMounted) setStatus("pending");
      }
    };

    void hydrate();
    return () => {
      isMounted = false;
    };
  }, []);

  const completeOnboarding = useCallback(async () => {
    setStatus("completed");
    try {
      await markOnboardingCompleted();
    } catch {
      // Keep the current session unblocked even if local persistence fails.
    }
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({ status, completeOnboarding }),
    [completeOnboarding, status],
  );

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
}
