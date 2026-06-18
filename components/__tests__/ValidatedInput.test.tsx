import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import { ValidatedInput } from "@/components/ValidatedInput";

jest.mock("@expo/vector-icons/Ionicons", () => {
  const React = require("react");
  const { Text } = require("react-native");

  return function MockIonicons({ name }: { name: string }) {
    return <Text>{name}</Text>;
  };
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? _key,
  }),
}));

jest.mock("@/hooks/use-app-theme", () => ({
  useAppTheme: () => ({
    border: "#ccc",
    danger: "#f00",
    inputPlaceholder: "#999",
    surface: "#fff",
    text: "#000",
    textMuted: "#666",
  }),
}));

describe("ValidatedInput", () => {
  it("toggles secure text visibility", () => {
    const { getByDisplayValue, getByLabelText } = render(
      <ValidatedInput
        value="Password123"
        onChangeText={jest.fn()}
        secureTextEntry
      />,
    );

    expect(getByDisplayValue("Password123").props.secureTextEntry).toBe(true);

    fireEvent.press(getByLabelText("Show password"));
    expect(getByDisplayValue("Password123").props.secureTextEntry).toBe(false);

    fireEvent.press(getByLabelText("Hide password"));
    expect(getByDisplayValue("Password123").props.secureTextEntry).toBe(true);
  });
});
