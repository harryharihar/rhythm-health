import { StyleSheet } from 'react-native';
import { spacing } from '../../theme/theme';

export const makeStyles = (colors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.bg },
    ambient: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
    container: { padding: spacing.lg, paddingTop: 60, paddingBottom: 40 },
    glassRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.lg },
    glassSeg: {
      flex: 1,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    glassSegFilled: {
      backgroundColor: colors.water,
      borderColor: colors.water,
      shadowColor: colors.water,
      shadowOpacity: 0.6,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
    },
    pillRow: { flexDirection: 'row', marginBottom: spacing.sm, marginHorizontal: -spacing.xs / 2 },
    cardTitle: { fontSize: 12, fontWeight: '700', color: colors.inkSoft, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing.sm },
    empty: { fontSize: 13, color: colors.inkSoft },
    logRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line },
    logLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    logDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.water },
    logText: { fontSize: 13.5, fontWeight: '600', color: colors.ink },
    logTime: { fontSize: 12, color: colors.inkSoft },
    input: {
      backgroundColor: colors.bgElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      fontSize: 15,
      color: colors.ink,
      marginBottom: spacing.md,
    },
    submitBtn: { backgroundColor: colors.water, borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
    submitLabel: { color: colors.onAccent, fontWeight: '800', fontSize: 14 },
  });
