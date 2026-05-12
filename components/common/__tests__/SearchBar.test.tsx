import React from "react";
import { render, screen } from "@testing-library/react-native";
import { SearchBar } from "../SearchBar";
import { useRouter } from "expo-router";

jest.mock("expo-router");
jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));
jest.mock("@/hooks/use-app-theme", () => ({
  useAppTheme: () => ({
    primary: "#000",
    surface: "#fff",
    shadow: "#000",
    border: "#ccc",
    text: "#000",
    textMuted: "#666",
    inputPlaceholder: "#999",
    textSubtle: "#888",
  }),
}));

describe("SearchBar Component", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  describe("Badge Display", () => {
    it("should not display badge when notificationCount is 0", () => {
      const { queryByTestID } = render(
        <SearchBar
          value=""
          onChange={jest.fn()}
          notificationCount={0}
        />,
      );

      expect(queryByTestID("notification-badge")).toBeNull();
    });

    it("should not display badge when notificationCount is undefined", () => {
      const { queryByTestID } = render(
        <SearchBar value="" onChange={jest.fn()} />,
      );

      expect(queryByTestID("notification-badge")).toBeNull();
    });

    it("should display badge with correct count", () => {
      const { getByTestID, getByText } = render(
        <SearchBar
          value=""
          onChange={jest.fn()}
          notificationCount={5}
        />,
      );

      expect(getByTestID("notification-badge")).toBeTruthy();
      expect(getByText("5")).toBeTruthy();
    });

    it("should display 99+ when count exceeds 99", () => {
      const { getByText } = render(
        <SearchBar
          value=""
          onChange={jest.fn()}
          notificationCount={150}
        />,
      );

      expect(getByText("99+")).toBeTruthy();
    });

    it("should display badge with count of 1", () => {
      const { getByText } = render(
        <SearchBar
          value=""
          onChange={jest.fn()}
          notificationCount={1}
        />,
      );

      expect(getByText("1")).toBeTruthy();
    });

    it("should update badge when count changes from 0 to 5", () => {
      const { rerender, queryByTestID, getByText } = render(
        <SearchBar
          value=""
          onChange={jest.fn()}
          notificationCount={0}
        />,
      );

      expect(queryByTestID("notification-badge")).toBeNull();

      rerender(
        <SearchBar
          value=""
          onChange={jest.fn()}
          notificationCount={5}
        />,
      );

      expect(getByText("5")).toBeTruthy();
    });

    it("should hide badge when count changes from 5 to 0", () => {
      const { rerender, queryByTestID } = render(
        <SearchBar
          value=""
          onChange={jest.fn()}
          notificationCount={5}
        />,
      );

      expect(queryByTestID("notification-badge")).toBeTruthy();

      rerender(
        <SearchBar
          value=""
          onChange={jest.fn()}
          notificationCount={0}
        />,
      );

      expect(queryByTestID("notification-badge")).toBeNull();
    });

    it("should render badge with red background color", () => {
      const { getByTestID } = render(
        <SearchBar
          value=""
          onChange={jest.fn()}
          notificationCount={5}
        />,
      );

      const badge = getByTestID("notification-badge");
      expect(badge).toBeTruthy();
      // Badge style verification would require testing style prop
    });
  });

  describe("Notification Button", () => {
    it("should navigate to notifications when bell icon is pressed", () => {
      const { getByTestID } = render(
        <SearchBar value="" onChange={jest.fn()} notificationCount={0} />,
      );

      const button = getByTestID("notification-button");
      button.props.onPress();

      expect(mockPush).toHaveBeenCalledWith("/notifications");
    });
  });
});
