import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Switch } from "react-native";

import SettingsDetail from "../index";
import { LightTheme } from "@/constants/theme";
import {
  getNotificationPreferences,
  setNotificationPreferences,
  type NotificationPreferences,
} from "@/services/notification-preferences";
import { syncPushToken } from "@/services/push-notifications";

const mockThemeColors = LightTheme.colors;

jest.setTimeout(15000);

const preferences: NotificationPreferences = {
  emailNewBids: true,
  emailOutbidAlerts: true,
  emailWonAuctions: true,
  emailMessages: true,
  emailPriceDrops: true,
  emailPromotions: false,
  pushNewBids: true,
  pushOutbidAlerts: true,
  pushWonAuctions: true,
  pushMessages: false,
};

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ section: "notifications" }),
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
  }),
}));

jest.mock("@/hooks/use-app-theme", () => ({
  useAppTheme: () => mockThemeColors,
}));

jest.mock("@/hooks/use-localization", () => ({
  useLocalization: () => ({ isRTL: false }),
}));

jest.mock("@/providers/ThemeProvider", () => ({
  useThemeContext: () => ({ mode: "light", setMode: jest.fn() }),
}));

jest.mock("@/services/notification-preferences", () => ({
  getNotificationPreferences: jest.fn(),
  setNotificationPreferences: jest.fn(),
}));

jest.mock("@/services/push-notifications", () => ({
  syncPushToken: jest.fn(),
}));

jest.mock("@/services/error-reporter", () => ({
  ErrorReporter: { captureException: jest.fn() },
}));

jest.mock("@/services/user", () => ({
  getMyProfile: jest.fn(),
  requestAccountDeletion: jest.fn(),
  updateMyProfile: jest.fn(),
}));

jest.mock("@/services/auth", () => ({
  changePassword: jest.fn(),
}));

jest.mock("@/services/uploads", () => ({
  uploadImageAsync: jest.fn(),
}));

jest.mock("@/services/bug-reports", () => ({
  createBugReport: jest.fn(),
  getBugReportDeviceInfo: jest.fn(() => ({ platform: "test" })),
}));

jest.mock("@/services/contact", () => ({
  sendContactMessage: jest.fn(),
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: "Images" },
}));

describe("notification preferences screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getNotificationPreferences as jest.Mock).mockResolvedValue(preferences);
    (setNotificationPreferences as jest.Mock).mockImplementation(async (next) => next);
    (syncPushToken as jest.Mock).mockResolvedValue(undefined);
  });

  it("loads preferences and saves an optimistic toggle", async () => {
    const screen = render(<SettingsDetail />);

    await waitFor(() => {
      expect(screen.getByText("Notification settings")).toBeTruthy();
      expect(screen.getByText("Email new bids")).toBeTruthy();
    });

    const switches = screen.UNSAFE_getAllByType(Switch);
    fireEvent(switches[0], "valueChange", false);

    await waitFor(() => {
      expect(setNotificationPreferences).toHaveBeenCalledWith({
        ...preferences,
        emailMessages: false,
      });
    });
    expect(syncPushToken).not.toHaveBeenCalled();
  });

  it("syncs the push token when enabling a push preference", async () => {
    const screen = render(<SettingsDetail />);

    await waitFor(() => {
      expect(screen.getByText("Push messages")).toBeTruthy();
    });

    const switches = screen.UNSAFE_getAllByType(Switch);
    fireEvent(switches[6], "valueChange", true);

    await waitFor(() => {
      expect(setNotificationPreferences).toHaveBeenCalledWith({
        ...preferences,
        pushMessages: true,
      });
    });
    await waitFor(() => {
      expect(syncPushToken).toHaveBeenCalledTimes(1);
    });
  });
});
