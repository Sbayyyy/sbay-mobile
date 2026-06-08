import { useEffect, useRef } from "react";
import { Animated, ImageBackground, Text, View } from "react-native";

import splashImage from "@/assets/images/splash-icon-fixed.png";
import { type ThemeColors } from "@/constants/theme";
import { styles } from "./StartupLoadingScreen.styles";

type Props = {
  colors: ThemeColors;
};

export function StartupLoadingScreen({ colors }: Props) {
  return (
    <ImageBackground
      source={splashImage}
      style={styles.container}
      imageStyle={styles.backgroundImage}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
    >
      <View style={styles.loading}>
        <CustomLoadingSpinner color={colors.primaryForeground} />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    </ImageBackground>
  );
}

function CustomLoadingSpinner({ color }: { color: string }) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 950,
        useNativeDriver: true,
      }),
    );

    animation.start();
    return () => {
      animation.stop();
    };
  }, [rotation]);

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.spinner}>
      <View style={styles.spinnerTrack} />
      <Animated.View
        style={[
          styles.spinnerArc,
          {
            borderTopColor: color,
            borderLeftColor: color,
            transform: [{ rotate }],
          },
        ]}
      />
    </View>
  );
}
