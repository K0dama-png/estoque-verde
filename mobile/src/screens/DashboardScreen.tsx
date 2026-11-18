import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MetricCard } from '../components/MetricCard';
import { colors, radius } from '../theme';
import { Movement, Product, User } from '../types';
import { formatCurrency, formatDate, isLowStock, isNearExpiry } from '../utils';

interface Props {
  user: User;
  products: Product[];
  movements: Movement[];
  onProducts: () => void;
  onEntry: () => void;
  onExit: () => void;
  onReports: () => void;
}

export function DashboardScreen({ user, products, movements, onProducts, onEntry, onExit, onReports }: Props) {
  const lowStock = products.filter(isLowStock);
  const nearExpiry = products.filter(isNearExpiry);
  const inventoryValue = products.reduce((total, product) => total + product.price * product.quantity, 0);
  const today = new Date().toISOString().slice(0, 10);
  const todayMovements = movements.filter((movement) => movement.createdAt.startsWith(today));

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.welcome}>
        <Text style={styles.welcomeOverline}>{user.role === 'ADMIN' ? 'PAINEL DO GERENTE' : 'PAINEL DO FUNCIONÁRIO'}</Text>
        <Text style={styles.welcomeTitle}>Olá, {user.name.split(' ')[0]}!</Text>
        <Text style={styles.welcomeCopy}>Veja o que precisa da sua atenção hoje.</Text>
      </View>

      <View style={styles.metrics}>
        <MetricCard label="Produtos ativos" value={String(products.length)} detail="Cadastrados" />
        <MetricCard label="Estoque baixo" value={String(lowStock.length)} detail="Precisam de reposição" tone={lowStock.length ? 'red' : 'green'} />
        <MetricCard label="Próx. da validade" value={String(nearExpiry.length)} detail="Até 30 dias" tone={nearExpiry.length ? 'yellow' : 'green'} />
        <MetricCard label="Movimentos hoje" value={String(todayMovements.length)} detail="Entradas e saídas" />
      </View>

      {user.role === 'ADMIN' ? (
        <View style={styles.valueCard}>
          <View>
            <Text style={styles.valueLabel}>Valor estimado do estoque</Text>
            <Text style={styles.valueAmount}>{formatCurrency(inventoryValue)}</Text>
          </View>
          <TouchableOpacity style={styles.valueButton} onPress={onReports}><Text style={styles.valueButtonText}>Ver relatório</Text></TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Ações rápidas</Text>
      <View style={styles.actions}>
        <QuickAction label="Nova entrada" icon="+" onPress={onEntry} />
        <QuickAction label="Registrar saída" icon="−" onPress={onExit} />
        <QuickAction label="Ver produtos" icon="□" onPress={onProducts} />
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Alertas</Text>
        <Text style={styles.sectionCount}>{lowStock.length + nearExpiry.length} itens</Text>
      </View>
      {[...lowStock.slice(0, 2), ...nearExpiry.filter((item) => !lowStock.some((low) => low.id === item.id)).slice(0, 2)].map((product) => {
        const low = isLowStock(product);
        return (
          <TouchableOpacity key={`${product.id}-${low ? 'low' : 'expiry'}`} style={styles.alert} onPress={onProducts}>
            <View style={[styles.alertMark, { backgroundColor: low ? colors.dangerSoft : colors.warningSoft }]}>
              <Text style={{ color: low ? colors.danger : '#986500', fontWeight: '900' }}>{low ? '!' : '◷'}</Text>
            </View>
            <View style={styles.alertCopy}>
              <Text style={styles.alertTitle}>{product.name}</Text>
              <Text style={styles.alertDescription}>{low ? `Restam ${product.quantity} ${product.unit} (mínimo: ${product.minimumStock})` : `Validade em ${formatDate(product.expiryDate)}`}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function QuickAction({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button" style={styles.action} onPress={onPress}>
      <View style={styles.actionIcon}><Text style={styles.actionIconText}>{icon}</Text></View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, paddingBottom: 28 },
  welcome: { backgroundColor: colors.primaryDark, borderRadius: radius.large, padding: 20, marginBottom: 16 },
  welcomeOverline: { color: '#BFE4D0', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  welcomeTitle: { color: colors.white, fontSize: 24, fontWeight: '900', marginTop: 7 },
  welcomeCopy: { color: '#CDE8D9', fontSize: 13, marginTop: 4 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  valueCard: { marginTop: 14, padding: 17, borderRadius: radius.medium, backgroundColor: colors.primaryLight, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  valueLabel: { color: colors.primaryDark, fontSize: 11, fontWeight: '700' },
  valueAmount: { color: colors.primaryDark, fontSize: 22, fontWeight: '900', marginTop: 4 },
  valueButton: { paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.white, borderRadius: radius.small },
  valueButtonText: { color: colors.primaryDark, fontSize: 11, fontWeight: '800' },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 24, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, alignItems: 'center', padding: 12, backgroundColor: colors.white, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border },
  actionIcon: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionIconText: { color: colors.primaryDark, fontSize: 22, fontWeight: '800' },
  actionLabel: { color: colors.text, fontSize: 11, fontWeight: '800', textAlign: 'center' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionCount: { color: colors.textMuted, fontSize: 11 },
  alert: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, padding: 13, marginBottom: 9 },
  alertMark: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  alertCopy: { flex: 1, paddingHorizontal: 11 },
  alertTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  alertDescription: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  chevron: { color: colors.textMuted, fontSize: 24 },
});
