import { fireEvent, render } from "@testing-library/react-native";

import { GoogleAuthButton } from "../GoogleAuthButton";
import { loginWithGoogle } from "@/services/auth";

const mockSignIn = jest.fn();

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
  }),
}));

jest.mock("@/hooks/use-app-theme", () => ({
  useAppTheme: () => ({
    border: "#ccc",
    danger: "#f00",
    shadow: "#000",
    surface: "#fff",
    surfaceMuted: "#f5f5f5",
    text: "#000",
    textMuted: "#666",
  }),
}));

jest.mock("@/providers/AuthProvider", () => ({
  useAuth: () => ({
    signIn: mockSignIn,
  }),
}));

jest.mock("@/services/config", () => ({
  GOOGLE_AUTH_ENABLED: false,
}));

jest.mock("@/services/auth", () => ({
  GOOGLE_AUTH_CANCELLED_ERROR: "google_auth_cancelled",
  loginWithGoogle: jest.fn(),
}));

describe("GoogleAuthButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("locks Google auth behind the coming soon flag", () => {
    const { getByLabelText, getByText } = render(<GoogleAuthButton mode="signIn" />);

    const button = getByLabelText("Continue with Google. Coming soon");

    expect(getByText("Coming soon")).toBeTruthy();
    expect(button.props.accessibilityState).toMatchObject({ disabled: true });

    fireEvent.press(button);

    expect(loginWithGoogle).not.toHaveBeenCalled();
    expect(mockSignIn).not.toHaveBeenCalled();
  });
});
