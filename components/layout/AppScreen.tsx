import { ReactNode } from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";

type AppScreenProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  edges?: Edge[];
  backgroundColor?: string;
};

export function AppScreen({
  children,
  style,
  edges = ["top", "left", "right", "bottom"],
  backgroundColor = "#f9fafb",
}: AppScreenProps) {
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor }, style]}
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
