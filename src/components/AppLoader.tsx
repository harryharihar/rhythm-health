import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import { glow } from '../theme/theme';
import { LABELS } from '../constants/labels';

const AnimatedG = Animated.createAnimatedComponent(G);

// Icon geometry (viewBox units) — a pocket outline with a seam line, matching
// the app icon, and a monitor "window" inside it where the pulse loops.
const ICON_W = 160;
const ICON_H = 180;
const POCKET = { x: 20, y: 22, w: 120, h: 128, r: 16 };
const SEAM_Y = POCKET.y + 26;
const WINDOW = { x: POCKET.x + 12, y: SEAM_Y + 16, w: POCKET.w - 24, h: 56 };

// The pulse is one repeating "unit" (flat - spike up - spike down - flat)
// tiled several times into a strip wider than the window, then scrolled by
// exactly one unit's width in a seamless loop — the identical tiling means
// the loop point is invisible, giving a continuous forward-scanning motion.
const UNIT_W = 70;
const REPEATS = 5;
const BASE_Y = WINDOW.h / 2;
const AMP = WINDOW.h * 0.32;

// Coordinates are baked in absolute icon-viewBox space (offset by the
// window's position) so the animated strip only ever needs one dynamic prop
// — its own `x` — rather than composing a static translate with an animated
// one, which react-native-svg doesn't handle cleanly via style transforms.
function buildPulseStrip() {
  const baseY = WINDOW.y + BASE_Y;
  let d = `M ${WINDOW.x} ${baseY}`;
  const dots: { x: number; y: number }[] = [];
  for (let i = 0; i < REPEATS; i++) {
    const x0 = WINDOW.x + i * UNIT_W;
    const p1 = { x: x0 + UNIT_W * 0.3, y: baseY };
    const p2 = { x: x0 + UNIT_W * 0.42, y: baseY - AMP * 1.5 };
    const p3 = { x: x0 + UNIT_W * 0.54, y: baseY + AMP * 1.1 };
    const p4 = { x: x0 + UNIT_W * 0.66, y: baseY };
    const p5 = { x: x0 + UNIT_W, y: baseY };
    d += ` L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} L ${p5.x} ${p5.y}`;
    dots.push(p2, p3);
  }
  return { d, dots, totalWidth: REPEATS * UNIT_W };
}

interface AppLoaderProps {
  colors: any;
}

export default function AppLoader({ colors }: AppLoaderProps) {
  const { d, dots } = useMemo(buildPulseStrip, []);
  const scrollX = useRef(new Animated.Value(0)).current;
  const heartbeat = useRef(new Animated.Value(1)).current;
  const wordmarkAnim = useRef(new Animated.Value(0)).current;
  const taglineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const scrollLoop = Animated.loop(
      Animated.timing(scrollX, {
        toValue: -UNIT_W,
        duration: 850,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    scrollLoop.start();

    const heartbeatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(heartbeat, { toValue: 1.1, duration: 170, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(heartbeat, { toValue: 1, duration: 170, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(heartbeat, { toValue: 1.05, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(heartbeat, { toValue: 1, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(550),
      ])
    );
    heartbeatLoop.start();

    Animated.sequence([
      Animated.timing(wordmarkAnim, { toValue: 1, duration: 480, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(taglineAnim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    return () => {
      scrollLoop.stop();
      heartbeatLoop.stop();
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <LinearGradient
        colors={[colors.primarySoft, colors.bg, colors.bg]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.iconGlow, glow(colors.primary, 40, 0.45), { transform: [{ scale: heartbeat }] }]}>
        <Svg width={ICON_W} height={ICON_H} viewBox={`0 0 ${ICON_W} ${ICON_H}`}>
          <Defs>
            <ClipPath id="pulseWindow">
              <Rect x={WINDOW.x} y={WINDOW.y} width={WINDOW.w} height={WINDOW.h} />
            </ClipPath>
          </Defs>

          <Path
            d={`M ${POCKET.x + POCKET.r} ${POCKET.y}
                H ${POCKET.x + POCKET.w - POCKET.r}
                A ${POCKET.r} ${POCKET.r} 0 0 1 ${POCKET.x + POCKET.w} ${POCKET.y + POCKET.r}
                V ${POCKET.y + POCKET.h - POCKET.r}
                A ${POCKET.r} ${POCKET.r} 0 0 1 ${POCKET.x + POCKET.w - POCKET.r} ${POCKET.y + POCKET.h}
                H ${POCKET.x + POCKET.r}
                A ${POCKET.r} ${POCKET.r} 0 0 1 ${POCKET.x} ${POCKET.y + POCKET.h - POCKET.r}
                V ${POCKET.y + POCKET.r}
                A ${POCKET.r} ${POCKET.r} 0 0 1 ${POCKET.x + POCKET.r} ${POCKET.y} Z`}
            stroke={colors.primary}
            strokeWidth={4.5}
            fill="none"
          />
          <Path
            d={`M ${POCKET.x + 16} ${SEAM_Y} H ${POCKET.x + POCKET.w - 16}`}
            stroke={colors.primary}
            strokeWidth={4.5}
            strokeLinecap="round"
          />

          <AnimatedG clipPath="url(#pulseWindow)" x={scrollX}>
            <Path d={d} stroke={colors.primary} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {dots.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={3} fill={colors.primary} />
            ))}
          </AnimatedG>
        </Svg>
      </Animated.View>

      <Animated.Text
        style={[
          styles.wordmark,
          { color: colors.ink, opacity: wordmarkAnim, transform: [{ translateY: wordmarkAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
        ]}
      >
        {LABELS.loading.appName}
      </Animated.Text>
      <Animated.Text style={[styles.tagline, { color: colors.inkSoft, opacity: taglineAnim }]}>{LABELS.loading.tagline}</Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    borderRadius: 28,
    marginBottom: 8,
  },
  wordmark: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginTop: 4,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
  },
});
