import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../theme/theme';
import { useThemeColors } from '../theme/useTheme';

// A full-screen in-app reader for long-form text (Privacy Policy, Terms of
// Service) — a plain native ScrollView styled as a document, not a WebView.
// There's no remote content to render here (no server, nothing hosted), so a
// WebView would only add a native dependency and a rebuild for no real
// benefit; this gives the same reading experience with zero extra risk.
//
// `sections`: [{ heading, paragraphs?: string[], bullets?: string[] }]
export default function DocumentScreen({ visible, title, updatedLabel, sections, onClose }) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [rendered, setRendered] = useState(visible);
  const translateY = useRef(new Animated.Value(24)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setRendered(true);
      translateY.setValue(24);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(({ finished }) => finished && setRendered(false));
    }
  }, [visible]);

  if (!rendered) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <Animated.View style={[styles.flex, { transform: [{ translateY }] }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <View style={styles.backBtn} />
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.docTitle}>{title}</Text>
          {updatedLabel ? <Text style={styles.updatedLabel}>{updatedLabel}</Text> : null}
          {sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text style={styles.heading}>{section.heading}</Text>
              {section.paragraphs?.map((p, i) => (
                <Text key={i} style={styles.paragraph}>{p}</Text>
              ))}
              {section.bullets?.map((b, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const makeStyles = (colors) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.bg,
      zIndex: 70,
      elevation: 70,
    },
    flex: { flex: 1 },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 56,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.line,
    },
    backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: colors.ink },
    content: { padding: spacing.lg, paddingBottom: 60 },
    docTitle: { fontSize: 22, fontWeight: '800', color: colors.ink, marginBottom: 4 },
    updatedLabel: { fontSize: 11.5, color: colors.inkFaint, fontWeight: '600', marginBottom: spacing.lg },
    section: { marginBottom: spacing.lg },
    heading: { fontSize: 14.5, fontWeight: '800', color: colors.ink, marginBottom: spacing.sm },
    paragraph: { fontSize: 13, color: colors.inkSoft, lineHeight: 20, marginBottom: spacing.sm },
    bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6, paddingRight: spacing.sm },
    bulletDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.inkFaint, marginTop: 7, marginRight: 10 },
    bulletText: { flex: 1, fontSize: 13, color: colors.inkSoft, lineHeight: 20 },
  });
