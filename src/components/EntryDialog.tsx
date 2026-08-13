import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, shadow, spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';
import type { IconName } from '../types/models';

interface EntryDialogOption {
  label: string;
  icon?: IconName;
  active?: boolean;
  onPress: () => void;
}

interface EntryDialogProps {
  visible: boolean;
  title?: string;
  description?: string;
  options?: EntryDialogOption[];
  accentColor?: string;
  onClose: () => void;
  children?: ReactNode;
  footer?: ReactNode;
}

// A centered dialog for entering or picking a single value (a goal number, a
// time, a short form) — deliberately NOT a bottom sheet. A sheet anchors
// flush to the screen edge, so keeping it above the keyboard depends on
// exactly how much the OS resizes the window — which, under Android's
// mandatory edge-to-edge mode (Expo SDK 54), varies by device and is not
// reliably measurable. A centered card already has margin above and below,
// so KeyboardAvoidingView's ordinary "shrink and re-center" behavior is
// enough: if its keyboard-height estimate is slightly off, the card just
// isn't perfectly centered — it never ends up hidden behind the keyboard or
// floating with a gap below it, the two failure modes a bottom sheet has.
//
// `options` items: { label, icon?, active?, onPress }, laid out as a wrapping
// icon grid (same shape QuickAddSheet uses) for picker-style entries.
// `footer` renders pinned below the scrollable content (e.g. a Save button),
// so it never scrolls out of reach on longer forms.
export default function EntryDialog({ visible, title, description, options, accentColor, onClose, children, footer }: EntryDialogProps) {
  const colors = useThemeColors();
  const accent = accentColor || colors.primary;
  const styles = useMemo(() => makeStyles(colors, accent), [colors, accent]);
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.avoidWrap}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.inkSoft} />
            </TouchableOpacity>
          </View>
          {description ? <Text style={styles.description}>{description}</Text> : null}
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {children}
            {options?.length ? (
              <View style={styles.grid}>
                {options.map((opt) => (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.gridItem, opt.active && styles.gridItemActive]}
                    onPress={() => {
                      opt.onPress();
                      onClose();
                    }}
                  >
                    {opt.icon ? (
                      <View style={[styles.gridIconWrap, opt.active && styles.gridIconWrapActive]}>
                        <Ionicons name={opt.icon} size={18} color={opt.active ? colors.onAccent : accent} />
                      </View>
                    ) : null}
                    <Text style={[styles.gridLabel, opt.active && styles.gridLabelActive]} numberOfLines={2}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = (colors: any, accent: string) =>
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
    // `maxHeight: '100%'` only means something once every ancestor up to a
    // real pixel height (overlay, absolutely filled to the screen) also
    // declares it — otherwise each View just sizes to its content and the
    // cap is a no-op. Without this, a dialog whose content happens to be
    // taller than the screen (e.g. Add Reminder's 48-slot time grid) renders
    // past the bottom edge with its pinned footer (the Save button)
    // unreachable, since the inner ScrollView never gets a bounded box to
    // clip/scroll within either.
    avoidWrap: { width: '100%', maxHeight: '100%', alignItems: 'center', justifyContent: 'center' },
    card: {
      width: '100%',
      maxWidth: 420,
      maxHeight: '100%',
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
      marginBottom: spacing.sm,
    },
    title: { fontSize: 16, fontWeight: '700', color: colors.ink, flexShrink: 1, marginRight: spacing.md },
    description: { fontSize: 12.5, color: colors.inkSoft, fontWeight: '500', lineHeight: 18, marginBottom: spacing.md },
    // `flexShrink: 1` is what actually lets the ScrollView compress to fit
    // the now-bounded card instead of overflowing it — flexGrow alone
    // (on scrollContent, its contentContainerStyle) only affects the inner
    // content when it's shorter than the box, not the box's own sizing.
    scrollView: { flexShrink: 1, width: '100%' },
    scrollContent: { flexGrow: 1, width: '100%' },
    footer: { marginTop: spacing.md },

    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    gridItem: {
      flexBasis: '31%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      paddingHorizontal: 6,
      alignItems: 'center',
    },
    gridItemActive: {
      backgroundColor: `${accent}1A`,
      borderWidth: 1.5,
      borderColor: accent,
    },
    gridIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: `${accent}1A`,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    gridIconWrapActive: { backgroundColor: accent },
    gridLabel: { fontSize: 12.5, fontWeight: '600', color: colors.ink, textAlign: 'center' },
    gridLabelActive: { color: accent, fontWeight: '700' },
  });
