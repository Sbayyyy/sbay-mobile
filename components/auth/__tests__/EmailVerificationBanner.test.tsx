import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { EmailVerificationBanner } from "../EmailVerificationBanner";
import { requestEmailVerification } from "@/services/auth";
import { LightTheme } from "@/constants/theme";

jest.mock("@expo/vector-icons/Ionicons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockIonicons(props: { name: string }) {
    return React.createElement(Text, null, props.name);
  };
});

jest.mock("@/hooks/use-app-theme", () => ({
  useAppTheme: () => LightTheme.colors,
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
