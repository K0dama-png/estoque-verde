import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow } from '../theme';

interface Props {
  label: string;
  value: string;
  detail: string;
  tone?: 'green' | 'yellow' | 'red';
}

const toneMap = {
  green: { background: colors.primaryLight, foreground: colors.primaryDark },
  yellow: { background: colors.warningSoft, foreground: '#9A6500' },
  red: { background: colors.dangerSoft, foreground: colors.danger },
};

export function MetricCard({ label, value, detail, tone = 'green' }: Props) {
  const toneColors = toneMap[tone];
  return (
    <View style={[styles.card, shadow]}>
      <View style={[styles.dot, { backgroundColor: toneColors.background }]}>
        <View style={[styles.dotInner, { backgroundColor: toneColors.foreground }]} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={[styles.detail, { color: toneColors.foreground }]}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 145,
    backgroundColor: colors.white,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 15,
  },
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  dotInner: { width: 9, height: 9, borderRadius: 5 },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  value: { color: colors.text, fontSize: 25, fontWeight: '800', marginTop: 4 },
  detail: { fontSize: 11, fontWeight: '700', marginTop: 5 },
});
