import { StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { brand } from "../lib/theme";

/** The soft teal glow and flowing signal line from the brand cover. Sits behind content. */
export function WaveBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <RadialGradient id="glow" cx="100%" cy="30%" r="75%">
            <Stop offset="0" stopColor={brand.teal} stopOpacity="0.35" />
            <Stop offset="0.5" stopColor="#0B3B37" stopOpacity="0.35" />
            <Stop offset="1" stopColor={brand.midnight} stopOpacity="0" />
          </RadialGradient>
          <LinearGradient id="line" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={brand.teal} stopOpacity="0.1" />
            <Stop offset="0.6" stopColor={brand.teal} stopOpacity="0.9" />
            <Stop offset="1" stopColor={brand.sage} stopOpacity="0.6" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="400" height="800" fill={brand.midnight} />
        <Rect x="0" y="0" width="400" height="800" fill="url(#glow)" />
        <Path d="M-20 520 C 90 520, 150 430, 240 380 S 380 290, 440 200" stroke="url(#line)" strokeWidth="6" fill="none" opacity="0.25" />
        <Path d="M-20 520 C 90 520, 150 430, 240 380 S 380 290, 440 200" stroke="url(#line)" strokeWidth="1.6" fill="none" />
      </Svg>
    </View>
  );
}
