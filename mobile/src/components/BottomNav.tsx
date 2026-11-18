import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme';
import { Role, ScreenKey } from '../types';

interface Props {
  active: ScreenKey;
  role: Role;
  onChange: (screen: ScreenKey) => void;
}

const items: { key: ScreenKey; label: string; icon: string; adminOnly?: boolean }[] = [
  { key: 'dashboard', label: 'Início', icon: '⌂' },
  { key: 'products', label: 'Produtos', icon: '□' },
  { key: 'movements', label: 'Movimentos', icon: '↕' },
  { key: 'users', label: 'Equipe', icon: '♙', adminOnly: true },
  { key: 'reports', label: 'Relatórios', icon: '▥', adminOnly: true },
];

export function BottomNav({ active, role, onChange }: Props) {
  return (
    <View style={styles.bar}>
      {items
        .filter((item) => !item.adminOnly || role === 'ADMIN')
        .map((item) => {
          const selected = active === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={styles.item}
              onPress={() => onChange(item.key)}
            >
              <View style={[styles.iconWrap, selected && styles.iconWrapActive]}>
                <Text style={[styles.icon, selected && styles.activeText]}>{item.icon}</Text>
              </View>
              <Text style={[styles.label, selected && styles.activeText]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 72,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 7,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  iconWrap: { width: 38, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconWrapActive: { backgroundColor: colors.primaryLight },
  icon: { color: colors.textMuted, fontSize: 20, fontWeight: '700', lineHeight: 22 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  activeText: { color: colors.primaryDark },
});
