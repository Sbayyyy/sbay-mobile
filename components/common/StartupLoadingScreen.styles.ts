import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    backgroundColor: "#0f448f",
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },
  loading: {
    alignItems: "center",
    marginBottom: "11%",
  },
  spinner: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerTrack: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 7,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  spinnerArc: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 7,
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
  },
  loadingText: {
    marginTop: 18,
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "500",
    letterSpacing: 0,
  },
});
