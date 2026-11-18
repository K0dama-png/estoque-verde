import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius } from '../theme';
import { Product } from '../types';
import { formatCurrency, formatDate, isLowStock, isNearExpiry } from '../utils';

interface Props {
  product: Product;
  onPress: () => void;
}

export function ProductCard({ product, onPress }: Props) {
  const lowStock = isLowStock(product);
  const nearExpiry = isNearExpiry(product);
  return (
    <TouchableOpacity accessibilityRole="button" style={styles.card} onPress={onPress}>
      <View style={styles.topRow}>
        <View style={styles.productIcon}><Text style={styles.productIconText}>{product.name[0]}</Text></View>
        <View style={styles.main}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.meta}>{product.category} · {product.code}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.caption}>Em estoque</Text>
          <Text style={[styles.stock, lowStock && styles.dangerText]}>{product.quantity} {product.unit}</Text>
        </View>
        <View>
          <Text style={styles.caption}>Preço</Text>
          <Text style={styles.value}>{formatCurrency(product.price)}</Text>
        </View>
        <View>
          <Text style={styles.caption}>Validade</Text>
          <Text style={[styles.value, nearExpiry && styles.warningText]}>{formatDate(product.expiryDate)}</Text>
        </View>
      </View>
      {(lowStock || nearExpiry) && (
        <View style={styles.badges}>
          {lowStock ? <Text style={[styles.badge, styles.badgeDanger]}>Estoque baixo</Text> : null}
          {nearExpiry ? <Text style={[styles.badge, styles.badgeWarning]}>Validade próxima</Text> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, padding: 14, marginBottom: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  productIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  productIconText: { color: colors.primaryDark, fontSize: 17, fontWeight: '800' },
  main: { flex: 1, paddingHorizontal: 12 },
  name: { color: colors.text, fontSize: 15, fontWeight: '800' },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  chevron: { color: colors.textMuted, fontSize: 27, fontWeight: '300' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 12 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between' },
  caption: { color: colors.textMuted, fontSize: 10, marginBottom: 3 },
  stock: { color: colors.primaryDark, fontSize: 14, fontWeight: '800' },
  value: { color: colors.text, fontSize: 12, fontWeight: '700' },
  dangerText: { color: colors.danger },
  warningText: { color: '#9A6500' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 },
  badge: { fontSize: 10, fontWeight: '800', paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill, overflow: 'hidden' },
  badgeDanger: { color: colors.danger, backgroundColor: colors.dangerSoft },
  badgeWarning: { color: '#8A5B00', backgroundColor: colors.warningSoft },
});
