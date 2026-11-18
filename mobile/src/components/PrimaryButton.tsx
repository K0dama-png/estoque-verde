import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'solid' | 'outline' | 'danger';
  style?: ViewStyle;
  disabled?: boolean;
}

export function PrimaryButton({ label, onPress, variant = 'solid', style, disabled }: Props) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      disabled={disabled}
      style={[styles.base, styles[variant], disabled && styles.disabled, style]}
      onPress={onPress}
    >
      <Text style={[styles.label, variant !== 'solid' && styles.labelOutline, variant === 'danger' && styles.labelDanger]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 50, borderRadius: radius.medium, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  solid: { backgroundColor: colors.primary },
  outline: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.primary },
  danger: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.danger },
  disabled: { opacity: 0.45 },
  label: { color: colors.white, fontSize: 14, fontWeight: '800' },
  labelOutline: { color: colors.primaryDark },
  labelDanger: { color: colors.danger },
});
