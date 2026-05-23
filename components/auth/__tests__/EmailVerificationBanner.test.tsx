import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { EmailVerificationBanner } from "../EmailVerificationBanner";
import { requestEmailVerification } from "@/services/auth";
import { LightTheme } from "@/constants/theme";

const mockThemeColors = LightTheme.colors;

jest.setTimeout(15000);

jest.mock("@expo/vector-icons/Ionicons", () => {
  return function MockIonicons() {
    return null;
  };
});

jest.mock("@/hooks/use-app-theme", () => ({
  useAppTheme: () => mockThemeColors,
}));

jest.mock("@/services/auth", () => ({
  requestEmailVerification: jest.fn(),
}));

describe("EmailVerificationBanner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requests one verification email per tap and shows success", async () => {
    (requestEmailVerification as jest.Mock).mockResolvedValue(undefined);
    const onSent = jest.fn();

    const { getByText } = render(<EmailVerificationBanner onSent={onSent} />);

    fireEvent.press(getByText("Send"));

    await waitFor(() => {
      expect(requestEmailVerification).toHaveBeenCalledTimes(1);
      expect(onSent).toHaveBeenCalledTimes(1);
      expect(getByText("Verification email sent. Open the link in your inbox to finish.")).toBeTruthy();
    });
  });
});
