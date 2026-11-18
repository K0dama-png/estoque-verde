import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMemo, useState } from 'react';
import { PrimaryButton } from '../components/PrimaryButton';
import { generateMovementPdf, generateStockPdf } from '../services/pdfReports';
import { colors, radius } from '../theme';
import { Batch, Market, Movement, Product } from '../types';
import { formatCurrency, isLowStock } from '../utils';

type PeriodKey = 'today' | 'sevenDays' | 'currentMonth' | 'custom';

const formatInputDate = (date: Date) => `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

const parseInputDate = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return undefined;
  const date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  if (date.getFullYear() !== Number(match[3]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[1])) return undefined;
  return date;
};

interface Props {
  products: Product[];
  batches: Batch[];
  movements: Movement[];
  market: Market;
}

export function ReportsScreen({ products, batches, movements, market }: Props) {
  const [generating, setGenerating] = useState<'stock' | 'movements'>();
  const [period, setPeriod] = useState<PeriodKey>('currentMonth');
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [customStart, setCustomStart] = useState(formatInputDate(monthStart));
  const [customEnd, setCustomEnd] = useState(formatInputDate(today));
  const periodRange = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    let start: Date | undefined;
    let label = '';
    let error = '';
    if (period === 'today') {
      start = new Date();
      start.setHours(0, 0, 0, 0);
      label = `Hoje (${formatInputDate(start)})`;
    } else if (period === 'sevenDays') {
      start = new Date();
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      label = `Últimos 7 dias (${formatInputDate(start)} a ${formatInputDate(end)})`;
    } else if (period === 'currentMonth') {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
      label = `Mês atual (${formatInputDate(start)} a ${formatInputDate(end)})`;
    } else {
      start = parseInputDate(customStart);
      const customEndDate = parseInputDate(customEnd);
      if (!start || !customEndDate) {
        error = 'Informe as datas no formato DD/MM/AAAA.';
      } else {
        customEndDate.setHours(23, 59, 59, 999);
        end.setTime(customEndDate.getTime());
        if (start.getTime() > end.getTime()) error = 'A data inicial não pode ser posterior à data final.';
        label = `Período personalizado (${customStart} a ${customEnd})`;
      }
    }
    return { start, end, label, error };
  }, [customEnd, customStart, period]);
  const filteredMovements = useMemo(() => {
    if (!periodRange.start || periodRange.error) return [];
    return movements.filter((movement) => {
      const date = new Date(movement.createdAt).getTime();
      return date >= periodRange.start!.getTime() && date <= periodRange.end.getTime();
    });
  }, [movements, periodRange]);
  const stockValue = products.reduce((total, product) => total + product.price * product.quantity, 0);
  const entries = filteredMovements.filter((item) => item.type === 'ENTRY').reduce((total, item) => total + item.quantity, 0);
  const exits = filteredMovements.filter((item) => item.type === 'EXIT').reduce((total, item) => total + item.quantity, 0);
  const maximum = Math.max(...products.map((item) => item.quantity), 1);

  const shareStockPdf = async () => {
    try {
      setGenerating('stock');
      await generateStockPdf(market, products, batches);
    } catch (error) {
      Alert.alert('Não foi possível gerar o PDF', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setGenerating(undefined);
    }
  };

  const shareMovementPdf = async () => {
    if (periodRange.error || !periodRange.start) {
      Alert.alert('Período inválido', periodRange.error || 'Confira as datas informadas.');
      return;
    }
    try {
      setGenerating('movements');
      await generateMovementPdf(market, filteredMovements, periodRange.label);
    } catch (error) {
      Alert.alert('Não foi possível gerar o PDF', error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setGenerating(undefined);
    }
  };

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>VALOR TOTAL ESTIMADO</Text>
        <Text style={styles.heroValue}>{formatCurrency(stockValue)}</Text>
        <Text style={styles.heroCopy}>{products.reduce((sum, product) => sum + product.quantity, 0)} unidades em {products.length} produtos ativos</Text>
      </View>

      <Text style={styles.sectionTitle}>Resumo de movimentações</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodFilters}>
        {([
          ['today', 'Hoje'],
          ['sevenDays', '7 dias'],
          ['currentMonth', 'Mês atual'],
          ['custom', 'Personalizado'],
        ] as [PeriodKey, string][]).map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.periodChip, period === key && styles.periodChipActive]} onPress={() => setPeriod(key)}>
            <Text style={[styles.periodChipText, period === key && styles.periodChipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {period === 'custom' ? (
        <View style={styles.customDates}>
          <View style={styles.dateField}><Text style={styles.dateLabel}>Data inicial</Text><TextInput style={styles.dateInput} value={customStart} onChangeText={setCustomStart} placeholder="DD/MM/AAAA" keyboardType="numeric" /></View>
          <View style={styles.dateField}><Text style={styles.dateLabel}>Data final</Text><TextInput style={styles.dateInput} value={customEnd} onChangeText={setCustomEnd} placeholder="DD/MM/AAAA" keyboardType="numeric" /></View>
        </View>
      ) : null}
      <Text style={[styles.periodLabel, periodRange.error && styles.periodError]}>{periodRange.error || `${periodRange.label} · ${filteredMovements.length} registro${filteredMovements.length === 1 ? '' : 's'}`}</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Entradas</Text><Text style={styles.entryValue}>+{entries}</Text><Text style={styles.summaryCopy}>unidades</Text></View>
        <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Saídas</Text><Text style={styles.exitValue}>−{exits}</Text><Text style={styles.summaryCopy}>unidades</Text></View>
        <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Registros</Text><Text style={styles.warningValue}>{filteredMovements.length}</Text><Text style={styles.summaryCopy}>no período</Text></View>
      </View>

      <Text style={styles.sectionTitle}>Quantidade por produto</Text>
      <View style={styles.chart}>
        {products.map((product) => (
          <View key={product.id} style={styles.barRow}>
            <Text numberOfLines={1} style={styles.barLabel}>{product.name}</Text>
            <View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.max((product.quantity / maximum) * 100, 5)}%` }, isLowStock(product) && styles.barLow]} /></View>
            <Text style={styles.barValue}>{product.quantity}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Exportar e compartilhar</Text>
      <View style={styles.exportCard}>
        <Text style={styles.exportTitle}>Relatório de estoque</Text>
        <Text style={styles.exportCopy}>Produtos, saldos, valor estimado, lotes, validades e alertas.</Text>
        <PrimaryButton label={generating === 'stock' ? 'Gerando PDF...' : 'Gerar PDF de estoque'} onPress={shareStockPdf} disabled={Boolean(generating)} style={styles.exportButton} />
      </View>
      <View style={styles.exportCard}>
        <Text style={styles.exportTitle}>Relatório de movimentações</Text>
        <Text style={styles.exportCopy}>Histórico de entradas e saídas, lotes e responsáveis no período selecionado.</Text>
        <PrimaryButton label={generating === 'movements' ? 'Gerando PDF...' : 'Gerar PDF de movimentações'} onPress={shareMovementPdf} disabled={Boolean(generating) || Boolean(periodRange.error)} variant="outline" style={styles.exportButton} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, paddingBottom: 30 },
  hero: { backgroundColor: colors.primaryDark, padding: 21, borderRadius: radius.large },
  heroLabel: { color: '#BFE4D0', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  heroValue: { color: colors.white, fontSize: 29, fontWeight: '900', marginTop: 7 },
  heroCopy: { color: '#CDE8D9', fontSize: 11, marginTop: 6 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 23, marginBottom: 12 },
  periodFilters: { gap: 8, paddingBottom: 11 },
  periodChip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  periodChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  periodChipText: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  periodChipTextActive: { color: colors.white },
  customDates: { flexDirection: 'row', gap: 9, marginBottom: 8 },
  dateField: { flex: 1 },
  dateLabel: { color: colors.text, fontSize: 9, fontWeight: '800', marginBottom: 5 },
  dateInput: { minHeight: 44, paddingHorizontal: 11, borderRadius: radius.small, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, color: colors.text, fontSize: 11 },
  periodLabel: { color: colors.textMuted, fontSize: 10, marginBottom: 11 },
  periodError: { color: colors.danger, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: { flex: 1, minHeight: 105, padding: 12, borderRadius: radius.medium, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  summaryLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  entryValue: { color: colors.success, fontSize: 22, fontWeight: '900', marginTop: 7 },
  exitValue: { color: colors.danger, fontSize: 22, fontWeight: '900', marginTop: 7 },
  warningValue: { color: '#986500', fontSize: 22, fontWeight: '900', marginTop: 7 },
  summaryCopy: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  chart: { backgroundColor: colors.white, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, padding: 14 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  barLabel: { width: 85, color: colors.text, fontSize: 10, fontWeight: '700' },
  barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.primarySoft, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5, backgroundColor: colors.primary },
  barLow: { backgroundColor: colors.danger },
  barValue: { width: 28, textAlign: 'right', color: colors.text, fontSize: 10, fontWeight: '800' },
  exportCard: { marginBottom: 10, padding: 15, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  exportTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  exportCopy: { color: colors.textMuted, fontSize: 10, lineHeight: 16, marginTop: 4 },
  exportButton: { marginTop: 12 },
});
