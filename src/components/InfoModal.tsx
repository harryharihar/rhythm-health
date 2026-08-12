import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, shadow, spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';

interface InfoModalProps {
  visible: boolean;
  title?: string;
  onClose: () => void;
  children?: ReactNode;
}

// A centered, fading/scaling popover — deliberately NOT another bottom sheet,
// so opening it from inside a QuickAddSheet doesn't stack two sheets and feel
// like the same UI pattern fighting itself.
export default function InfoModal({ visible, title, onClose, children }: InfoModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [rendered, setRendered] = useState(visible);
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      scale.setValue(0.92);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 140, useNativeDriver: true }).start(({ finished }) => finished && setRendered(false));
    }
  }, [visible]);

  if (!rendered) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={20} color={colors.inkSoft} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const makeStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 60,
      elevation: 60,
      padding: spacing.xl,
    },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
    card: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '80%',
      backgroundColor: colors.bgElevated,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xl,
      ...shadow.card,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    title: { fontSize: 16, fontWeight: '700', color: colors.ink, flexShrink: 1, marginRight: spacing.md },
    scrollContent: { flexGrow: 1, width: '100%' },
  });
