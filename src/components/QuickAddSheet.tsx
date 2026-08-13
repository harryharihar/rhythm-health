import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, Dimensions, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { radius, shadow, spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';
import { LABELS } from '../constants/labels';
import type { IconName } from '../types/models';

interface QuickAddOption {
  label: string;
  icon?: IconName;
  active?: boolean;
  onPress: () => void;
}

interface QuickAddSheetProps {
  visible: boolean;
  title?: string;
  options?: QuickAddOption[];
  accentColor?: string;
  onClose: () => void;
  children?: ReactNode;
}

// Expo SDK 54's mandatory Android edge-to-edge mode makes how much
// windowSoftInputMode="adjustResize" actually shrinks the window inconsistent
// — sometimes it accounts for the keyboard fully, sometimes partially,
// sometimes not at all, depending on the device. Padding the sheet by the
// OS-reported keyboard height unconditionally either leaves it hidden behind
// the keyboard (if the window already resized) or floating with a gap above
// it (if padding stacks on top of a resize that already happened) — both
// were observed on this device. So instead of trusting either mechanism
// blindly, we measure the window's height right before the keyboard opens
// and compare it to the height once it's up: the difference is exactly how
// much the OS already compensated, and only the shortfall (if any) gets
// added as extra padding, however this device's adjustResize behaves.
const SheetScroll = Platform.OS === 'android' ? ScrollView : KeyboardAwareScrollView;

// Deliberately NOT using RN's <Modal>: on Android in particular, Modal opens a
// separate native window, and the first tap after the soft keyboard is up gets
// spent handing touch/window focus back rather than reaching the button — the
// classic "tap dismisses keyboard, tap again to actually press Save" bug.
// Rendering the sheet as a plain absolutely-positioned overlay in the same
// window sidesteps that entirely.
//
// The content is wrapped in KeyboardAwareScrollView (not just a
// KeyboardAvoidingView) because a plain View has no scroll fallback: a longer
// form (e.g. Log Meal's 6 fields) plus the keyboard can add up to more height
// than the screen has, with no way to reach the lower fields otherwise.
//
// `options` items: { label, icon?, active?, onPress }. With 3+ options they
// lay out as a wrapping icon grid instead of a stacked list; `accentColor`
// (defaults to the app's primary) colors the icon chips and the active state.
export default function QuickAddSheet({ visible, title, options, accentColor, onClose, children }: QuickAddSheetProps) {
  const colors = useThemeColors();
  const accent = accentColor || colors.primary;
  const styles = useMemo(() => makeStyles(colors, accent), [colors, accent]);
  const [rendered, setRendered] = useState(visible);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const translateY = useRef(new Animated.Value(40)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const restWindowHeight = useRef(Dimensions.get('window').height);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      const reportedHeight = e.endCoordinates?.height || 0;
      const currentWindowHeight = Dimensions.get('window').height;
      const alreadyShrunk = Math.max(0, restWindowHeight.current - currentWindowHeight);
      // endCoordinates.height measures ~91dp taller than the keyboard's real
      // visible top edge on this device (measured empirically), leaving a gap
      // of dimmed backdrop between the sheet and the keyboard without this.
      const measuredOvershoot = 91;
      const applied = Math.max(0, reportedHeight - alreadyShrunk - measuredOvershoot);
      setKeyboardHeight(applied);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      restWindowHeight.current = Dimensions.get('window').height;
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      translateY.setValue(40);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 40, duration: 160, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start(({ finished }) => finished && setRendered(false));
    }
  }, [visible]);

  if (!rendered) return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <View style={[styles.sheetWrap, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <SheetScroll
            style={styles.sheetScroll}
            contentContainerStyle={StyleSheet.flatten(styles.sheetContent)}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            {...(Platform.OS === 'ios' ? { extraScrollHeight: 24, keyboardOpeningTime: 0 } : {})}
          >
            <View style={styles.handle} />
            <Text style={styles.title}>{title}</Text>
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
            <TouchableOpacity style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelLabel}>{LABELS.common.cancel}</Text>
            </TouchableOpacity>
          </SheetScroll>
        </Animated.View>
      </View>
    </View>
  );
}

const makeStyles = (colors: any, accent: string) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      zIndex: 50,
      elevation: 50,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheetWrap: {
      justifyContent: 'flex-end',
      maxHeight: '88%',
    },
    sheet: {
      backgroundColor: colors.bgElevated,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      borderBottomWidth: 0,
      maxHeight: '100%',
      ...shadow.card,
    },
    // `sheet`'s maxHeight only caps the box — without flexShrink here, the
    // ScrollView child renders at its full content height regardless and
    // just spills past that cap instead of clipping and scrolling within
    // it. Same underlying bug as EntryDialog had (see its scrollView style
    // comment) — this component just didn't have a form tall enough to
    // expose it before the Add/Edit Reminder sheet.
    sheetScroll: { flexShrink: 1 },
    sheetContent: {
      padding: spacing.xl,
      paddingBottom: spacing.xxl,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.borderStrong,
      alignSelf: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.ink,
      marginBottom: spacing.lg,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.sm,
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
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.14,
      shadowRadius: 6,
      elevation: 3,
    },
    gridItemActive: {
      backgroundColor: `${accent}1A`,
      borderWidth: 1.5,
      borderColor: accent,
      shadowColor: accent,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      // Elevation forced to 0 here: Android renders a visible white box under
      // any View with `elevation` when its own backgroundColor has alpha, and
      // this card's active background is a translucent accent tint. The
      // border + tint already communicate "selected" on Android; the colored
      // shadow above still applies on iOS, which doesn't have this bug.
      elevation: 0,
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
    gridIconWrapActive: {
      backgroundColor: accent,
    },
    gridLabel: { fontSize: 12.5, fontWeight: '600', color: colors.ink, textAlign: 'center' },
    gridLabelActive: { color: accent, fontWeight: '700' },
    cancel: { paddingVertical: 12, alignItems: 'center', marginTop: spacing.xs },
    cancelLabel: { fontSize: 14, fontWeight: '600', color: colors.inkSoft },
  });
