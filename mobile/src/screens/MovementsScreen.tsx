import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius } from '../theme';
import { Movement, MovementType } from '../types';
import { formatCurrency, formatDateTime } from '../utils';

interface Props {
  movements: Movement[];
  onNewMovement: (type: MovementType) => void;
}

type Filter = 'ALL' | MovementType;

export function MovementsScreen({ movements, onNewMovement }: Props) {
  const [filter, setFilter] = useState<Filter>('ALL');
  const filtered = useMemo(() => movements.filter((item) => filter === 'ALL' || item.type === filter), [filter, movements]);

  return (
    <View style={styles.page}>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.action, styles.entryAction]} onPress={() => onNewMovement('ENTRY')}>
          <Text style={styles.actionIcon}>＋</Text>
          <View><Text style={styles.actionTitle}>Nova entrada</Text><Text style={styles.actionCopy}>Adicionar ao estoque</Text></View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.action, styles.exitAction]} onPress={() => onNewMovement('EXIT')}>
          <Text style={[styles.actionIcon, styles.exitIcon]}>−</Text>
          <View><Text style={styles.actionTitle}>Registrar saída</Text><Text style={styles.actionCopy}>Venda, perda, avaria ou ajuste</Text></View>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {([['ALL', 'Todos'], ['ENTRY', 'Entradas'], ['EXIT', 'Saídas']] as [Filter, string][]).map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.filter, filter === key && styles.filterActive]} onPress={() => setFilter(key)}>
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.listTitle}>Histórico recente</Text>}
        renderItem={({ item }) => {
          const entry = item.type === 'ENTRY';
          return (
            <View style={styles.movement}>
              <View style={[styles.movementIcon, { backgroundColor: entry ? colors.primaryLight : colors.dangerSoft }]}>
                <Text style={{ color: entry ? colors.primaryDark : colors.danger, fontSize: 19, fontWeight: '900' }}>{entry ? '↓' : '↑'}</Text>
              </View>
              <View style={styles.movementMain}>
                <Text style={styles.productName}>{item.productName}</Text>
                <Text style={styles.movementMeta}>{formatDateTime(item.createdAt)} · {item.userName}{item.batchCode ? ` · Lote ${item.batchCode}` : ''}{item.supplierName ? ` · ${item.supplierName}` : ''}{item.purchasePrice ? ` · Compra ${formatCurrency(item.purchasePrice)}` : ''}{item.type === 'EXIT' ? ` · ${({ SALE: 'Venda', LOSS: 'Perda', EXPIRY: 'Vencimento', DAMAGE: 'Avaria', INTERNAL_USE: 'Consumo interno', ADJUSTMENT: 'Ajuste' } as const)[item.exitReason ?? 'SALE']}` : ''}</Text>
              </View>
              <View style={styles.quantityWrap}>
                <Text style={[styles.quantity, { color: entry ? colors.success : colors.danger }]}>{entry ? '+' : '−'}{item.quantity}</Text>
                <Text style={styles.type}>{entry ? 'Entrada' : 'Saída'}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma movimentação encontrada.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  actions: { padding: 18, paddingBottom: 12, gap: 9 },
  action: { minHeight: 68, borderRadius: radius.medium, padding: 13, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  entryAction: { backgroundColor: colors.primaryLight, borderColor: '#BFE7D2' },
  exitAction: { backgroundColor: colors.white, borderColor: colors.border },
  actionIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: colors.white, color: colors.primaryDark, textAlign: 'center', lineHeight: 38, fontSize: 22, fontWeight: '800', marginRight: 12, overflow: 'hidden' },
  exitIcon: { backgroundColor: colors.dangerSoft, color: colors.danger },
  actionTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  actionCopy: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  filters: { flexDirection: 'row', paddingHorizontal: 18, gap: 8 },
  filter: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  filterTextActive: { color: colors.white },
  list: { padding: 18, paddingBottom: 30 },
  listTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 12 },
  movement: { flexDirection: 'row', alignItems: 'center', padding: 13, marginBottom: 9, backgroundColor: colors.white, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border },
  movementIcon: { width: 41, height: 41, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  movementMain: { flex: 1, paddingHorizontal: 11 },
  productName: { color: colors.text, fontSize: 13, fontWeight: '800' },
  movementMeta: { color: colors.textMuted, fontSize: 9, marginTop: 4 },
  quantityWrap: { alignItems: 'flex-end' },
  quantity: { fontSize: 16, fontWeight: '900' },
  type: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  empty: { color: colors.textMuted, textAlign: 'center', paddingTop: 50 },
});
