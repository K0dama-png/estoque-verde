import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radius } from '../theme';
import { Category, Product } from '../types';

interface Props {
  categories: Category[];
  products: Product[];
  onAdd: (name: string) => Promise<boolean> | boolean;
  onEdit: (categoryId: number, name: string) => Promise<boolean> | boolean;
  onToggleStatus: (categoryId: number) => void;
}

export function CategoriesScreen({ categories, products, onAdd, onEdit, onToggleStatus }: Props) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category>();
  const usageByCategory = useMemo(() => {
    const counts = new Map<number, number>();
    products.forEach((product) => counts.set(product.categoryId, (counts.get(product.categoryId) ?? 0) + 1));
    return counts;
  }, [products]);

  const openNew = () => { setEditingCategory(undefined); setFormOpen(true); };
  const openEdit = (category: Category) => { setEditingCategory(category); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditingCategory(undefined); };

  const confirmStatus = (category: Category) => {
    const productCount = usageByCategory.get(category.id) ?? 0;
    if (category.active && productCount > 0) {
      Alert.alert(
        'Categoria em uso',
        `${productCount} produto${productCount === 1 ? ' ativo está' : 's ativos estão'} vinculado${productCount === 1 ? '' : 's'} a ${category.name}. Inative ou altere esses produtos primeiro.`,
      );
      return;
    }
    Alert.alert(
      category.active ? 'Inativar categoria?' : 'Reativar categoria?',
      category.active
        ? 'Ela deixará de aparecer no cadastro de produtos, mas continuará no histórico.'
        : 'Ela voltará a aparecer no cadastro e nos filtros de produtos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: category.active ? 'Inativar' : 'Reativar', onPress: () => onToggleStatus(category.id) },
      ],
    );
  };

  return (
    <View style={styles.page}>
      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryLabel}>CATEGORIAS DO MERCADO</Text>
          <Text style={styles.summaryValue}>{categories.filter((category) => category.active).length} ativas</Text>
        </View>
        <Text style={styles.summaryCopy}>Organize produtos, buscas e relatórios</Text>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const productCount = usageByCategory.get(item.id) ?? 0;
          return (
            <View style={[styles.card, !item.active && styles.inactive]}>
              <View style={styles.icon}><Text style={styles.iconText}>{item.name.slice(0, 1).toUpperCase()}</Text></View>
              <View style={styles.main}>
                <View style={styles.nameRow}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.isDefault ? <Text style={styles.defaultBadge}>PADRÃO</Text> : null}
                </View>
                <Text style={styles.meta}>{productCount} produto{productCount === 1 ? '' : 's'} ativo{productCount === 1 ? '' : 's'}</Text>
                <Text style={[styles.status, item.active ? styles.statusActive : styles.statusInactive]}>{item.active ? 'Ativa' : 'Inativa'}</Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.editButton} onPress={() => openEdit(item)}><Text style={styles.editText}>Editar</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.statusButton, item.active ? styles.deactivateButton : styles.activateButton]} onPress={() => confirmStatus(item)}>
                  <Text style={[styles.statusButtonText, item.active ? styles.deactivateText : styles.activateText]}>{item.active ? 'Inativar' : 'Reativar'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>Nenhuma categoria cadastrada</Text><Text style={styles.emptyCopy}>Crie a primeira categoria para cadastrar produtos.</Text></View>}
      />

      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cadastrar categoria" style={styles.fab} onPress={openNew}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
      <CategoryFormModal category={editingCategory} visible={formOpen} onClose={closeForm} onSave={(name) => editingCategory ? onEdit(editingCategory.id, name) : onAdd(name)} />
    </View>
  );
}

function CategoryFormModal({ category, visible, onClose, onSave }: {
  category?: Category;
  visible: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<boolean> | boolean;
}) {
  const [name, setName] = useState('');
  useEffect(() => { if (visible) setName(category?.name ?? ''); }, [category, visible]);
  const closeAndReset = () => { setName(''); onClose(); };
  const save = async () => { if (await onSave(name.trim())) closeAndReset(); };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={closeAndReset}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderCopy}>
              <Text style={styles.modalTitle}>{category ? 'Editar categoria' : 'Cadastrar categoria'}</Text>
              <Text style={styles.modalSubtitle}>Nome usado no cadastro e nos filtros de produtos</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" style={styles.close} onPress={closeAndReset}><Text style={styles.closeText}>×</Text></TouchableOpacity>
          </View>
          <View style={styles.form}>
            <Text style={styles.label}>Nome da categoria</Text>
            <TextInput
              autoFocus
              maxLength={80}
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ex.: Padaria"
              placeholderTextColor={colors.textMuted}
            />
            <PrimaryButton label={category ? 'Salvar alteração' : 'Salvar categoria'} onPress={save} disabled={name.trim().length < 2} style={styles.submit} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  summary: { margin: 18, padding: 18, borderRadius: radius.large, backgroundColor: colors.primaryDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { color: '#BFE4D0', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  summaryValue: { color: colors.white, fontSize: 23, fontWeight: '900', marginTop: 5 },
  summaryCopy: { width: 120, color: '#CDE8D9', fontSize: 9, lineHeight: 14, textAlign: 'right' },
  list: { paddingHorizontal: 18, paddingBottom: 90 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 13, marginBottom: 9, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  inactive: { opacity: 0.65 },
  icon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: colors.primaryDark, fontSize: 16, fontWeight: '900' },
  main: { flex: 1, paddingHorizontal: 11 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.text, fontSize: 13, fontWeight: '900', flexShrink: 1 },
  defaultBadge: { color: colors.primaryDark, backgroundColor: colors.primaryLight, fontSize: 7, fontWeight: '900', paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' },
  meta: { color: colors.textMuted, fontSize: 9, marginTop: 3 },
  status: { alignSelf: 'flex-start', fontSize: 8, fontWeight: '800', marginTop: 5 },
  statusActive: { color: colors.primary },
  statusInactive: { color: colors.textMuted },
  actions: { gap: 6, alignItems: 'stretch' },
  editButton: { minWidth: 68, paddingHorizontal: 9, paddingVertical: 7, borderRadius: radius.small, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  editText: { color: colors.primaryDark, fontSize: 9, fontWeight: '900' },
  statusButton: { minWidth: 68, paddingHorizontal: 9, paddingVertical: 7, borderRadius: radius.small, borderWidth: 1, alignItems: 'center' },
  deactivateButton: { borderColor: '#F3BABA', backgroundColor: colors.dangerSoft },
  activateButton: { borderColor: '#BFE7D2', backgroundColor: colors.primaryLight },
  statusButtonText: { fontSize: 9, fontWeight: '900' },
  deactivateText: { color: colors.danger },
  activateText: { color: colors.primaryDark },
  empty: { alignItems: 'center', padding: 45, backgroundColor: colors.white, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  emptyCopy: { color: colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText: { color: colors.white, fontSize: 27, lineHeight: 31 },
  overlay: { flex: 1, backgroundColor: 'rgba(8, 35, 22, 0.42)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10 },
  modalHeader: { padding: 19, paddingTop: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  modalHeaderCopy: { flex: 1 },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  modalSubtitle: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.textMuted, fontSize: 25, lineHeight: 27 },
  form: { padding: 19, paddingBottom: 30 },
  label: { color: colors.text, fontSize: 11, fontWeight: '800', marginBottom: 7 },
  input: { minHeight: 48, paddingHorizontal: 13, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, fontSize: 13 },
  submit: { marginTop: 16 },
});
