import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEffect, useRef } from "react";
import { Animated, Image, Text, View } from "react-native";

import brandIcon from "@/assets/images/playstore-icon.png";
import { type ThemeColors } from "@/constants/theme";
import { styles } from "./StartupLoadingScreen.styles";

type Props = {
  colors: ThemeColors;
};

export function StartupLoadingScreen({ colors }: Props) {
  return (
    <View style={styles.container}>
      <DecorativeIcon name="phone-iphone" size={64} top="11%" left="14%" rotation="-12deg" />
      <DecorativeIcon name="headphones" size={70} top="13%" right="10%" />
      <DecorativeIcon name="weekend" size={68} top="28%" right="12%" rotation="10deg" />
      <DecorativeIcon name="checkroom" size={62} top="39%" left="8%" rotation="-8deg" />
      <DecorativeIcon name="photo-camera" size={66} top="52%" right="8%" rotation="-8deg" />
      <DecorativeIcon name="directions-car" size={72} top="68%" left="7%" rotation="-5deg" />
      <DecorativeIcon name="home" size={72} top="73%" right="10%" rotation="8deg" />
      <DecorativeIcon name="sports-esports" size={68} bottom="4%" left="10%" rotation="-6deg" />
      <DecorativeIcon name="backpack" size={70} bottom="4%" right="10%" />

      <DotGrid top="10%" />
      <DotGrid bottom="5%" />
      <AccentMark top="27%" left="12%" />
      <AccentMark top="46%" right="13%" />
      <AccentMark top="66%" left="47%" />
      <AccentMark bottom="17%" right="15%" />
      <AccentMark bottom="13%" left="19%" variant="x" />

      <View style={styles.brand}>
        <Image
          source={brandIcon}
          style={styles.logo}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        />
        <Text style={styles.title}>SBay</Text>
        <View style={styles.taglineRow}>
          <View style={styles.taglineLine} />
          <Text style={styles.tagline}>سوقك السوري</Text>
          <View style={styles.taglineLine} />
        </View>
      </View>

      <View style={styles.loading}>
        <CustomLoadingSpinner color={colors.primaryForeground} />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    </View>
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

type DecorativeIconProps = {
  name: keyof typeof MaterialIcons.glyphMap;
  size: number;
  top?: `${number}%`;
  bottom?: `${number}%`;
  left?: `${number}%`;
  right?: `${number}%`;
  rotation?: `${number}deg`;
};

function DecorativeIcon({ name, size, top, bottom, left, right, rotation = "0deg" }: DecorativeIconProps) {
  return (
    <MaterialIcons
      name={name}
      size={size}
      color="rgba(255, 255, 255, 0.18)"
      style={[
        styles.decorativeIcon,
        {
          top,
          bottom,
          left,
          right,
          transform: [{ rotate: rotation }],
        },
      ]}
    />
  );
}

function DotGrid({ top, bottom }: { top?: `${number}%`; bottom?: `${number}%` }) {
  return (
    <View style={[styles.dotGrid, { top, bottom }]}>
      {Array.from({ length: 8 }).map((_, index) => (
        <View key={index} style={styles.dot} />
      ))}
    </View>
  );
}

type AccentMarkProps = {
  top?: `${number}%`;
  bottom?: `${number}%`;
  left?: `${number}%`;
  right?: `${number}%`;
  variant?: "plus" | "circle" | "x";
};

function AccentMark({ top, bottom, left, right, variant = "plus" }: AccentMarkProps) {
  if (variant === "circle") {
    return <View style={[styles.circleMark, { top, bottom, left, right }]} />;
  }

  return (
    <Text style={[styles.accentMark, { top, bottom, left, right }]}>
      {variant === "x" ? "x" : "+"}
    </Text>
  );
}
