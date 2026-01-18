import { ReactNode } from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";

import { useAppTheme } from "@/hooks/use-app-theme";

type AppScreenProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
  backgroundColor?: string;
};

export function AppScreen({
  children,
  style,
  edges = ["top", "left", "right"],
  backgroundColor,
}: AppScreenProps) {
  const theme = useAppTheme();
  const resolvedBackground = backgroundColor ?? theme.background;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: resolvedBackground }, style]}
      edges={edges}
    >
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
});
