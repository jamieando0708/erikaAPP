import { Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { brand, fonts } from "../lib/theme";

/** The Sift pulse mark: a signal line that settles into clarity. */
export const PULSE_PATH = "M4 34 H17 C23 34 23 7 30 7 C37 7 36 53 44 53 C51 53 51 30 57 30 H72";

export function PulseMark({ size = 40, color }: { size?: number; color?: string }) {
  const width = (size * 76) / 60;
  return (
    <Svg width={width} height={size} viewBox="0 0 76 60">
      <Defs>
        <LinearGradient id="pulse" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={brand.teal} />
          <Stop offset="1" stopColor={brand.sage} />
        </LinearGradient>
      </Defs>
      <Path
        d={PULSE_PATH}
        stroke={color ?? "url(#pulse)"}
        strokeWidth={6.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Mark + "Sift" wordmark. */
export function Logo({ size = 40, color = brand.sand }: { size?: number; color?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: size * 0.3 }}>
      <PulseMark size={size} />
      <Text
        style={{
          fontFamily: fonts.heading,
          fontSize: size * 1.05,
          color,
          letterSpacing: -0.5,
          includeFontPadding: false,
        }}
      >
        Sift
      </Text>
    </View>
  );
}
