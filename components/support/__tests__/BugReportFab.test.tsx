import { Alert } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { BugReportFab } from "../BugReportFab";
import { createBugReport } from "@/services/bug-reports";
import { useAuth } from "@/providers/AuthProvider";

jest.mock("@/services/bug-reports", () => ({
  createBugReport: jest.fn(),
}));

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/hooks/use-app-theme", () => ({
  useAppTheme: () => ({
    text: "#111111",
    textSecondary: "#555555",
    textMuted: "#777777",
    background: "#ffffff",
    surface: "#ffffff",
    surfaceMuted: "#eeeeee",
    border: "#dddddd",
    hairline: "#eeeeee",
    primary: "#2563eb",
    primaryForeground: "#ffffff",
    inputBackground: "#f3f4f6",
    inputPlaceholder: "#888888",
    danger: "#dc2626",
    overlay: "rgba(0,0,0,0.4)",
    shadow: "rgba(0,0,0,0.2)",
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string; reference?: string }) =>
      (options?.defaultValue ?? _key).replace("{{reference}}", options?.reference ?? ""),
  }),
}));

jest.mock("expo-router", () => ({
  usePathname: () => "/listings/123",
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@expo/vector-icons", () => {
  return {
    Ionicons: () => null,
  };
});

describe("BugReportFab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ status: "authenticated" });
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  it("does not render for unauthenticated users", () => {
    (useAuth as jest.Mock).mockReturnValue({ status: "unauthenticated" });

    render(<BugReportFab />);

    expect(screen.queryByTestId("bug-report-fab")).toBeNull();
  });

  it("shows a validation error when required fields are missing", () => {
    render(<BugReportFab />);

    fireEvent.press(screen.getByTestId("bug-report-fab"));
    fireEvent.press(screen.getByText("Submit bug report"));

    expect(screen.getByText("Add a bug title and description.")).toBeTruthy();
    expect(createBugReport).not.toHaveBeenCalled();
  });

  it("submits a bug report with page and reproduction details", async () => {
    (createBugReport as jest.Mock).mockResolvedValue({
      id: "12345678-aaaa-bbbb-cccc-123456789abc",
      createdAt: "2026-05-23T12:00:00Z",
    });

    render(<BugReportFab />);

    fireEvent.press(screen.getByTestId("bug-report-fab"));
    fireEvent.changeText(screen.getByPlaceholderText("Short bug summary"), "Offer failed");
    fireEvent.changeText(screen.getByPlaceholderText("What happened?"), "The app showed an error.");
    fireEvent.changeText(screen.getByPlaceholderText("1. Open... 2. Tap..."), "1. Open chat\n2. Send offer");
    fireEvent.changeText(screen.getByPlaceholderText("What should happen?"), "Offer sends quietly");
    fireEvent.changeText(screen.getByPlaceholderText("What happened instead?"), "Unexpected error popup");
    fireEvent.press(screen.getByText("Submit bug report"));

    await waitFor(() => {
      expect(createBugReport).toHaveBeenCalledWith({
        title: "Offer failed",
        description: "The app showed an error.",
        steps: "1. Open chat\n2. Send offer",
        expected: "Offer sends quietly",
        actual: "Unexpected error popup",
        severity: "medium",
        pageUrl: "sbay://listings/123",
      });
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      "Bug report sent",
      "Thank you. Reference: 12345678",
    );
  });
});
