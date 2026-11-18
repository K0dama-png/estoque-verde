import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ProductCard } from '../components/ProductCard';
import { colors, radius } from '../theme';
import { Category, Product, Role } from '../types';

interface Props {
  products: Product[];
  categories: Category[];
  role: Role;
  onAdd: () => void;
  onCategories: () => void;
  onSuppliers: () => void;
  onProductPress: (product: Product) => void;
}

export function ProductsScreen({ products, categories, role, onAdd, onCategories, onSuppliers, onProductPress }: Props) {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState(0);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = categoryId === 0 || product.categoryId === categoryId;
      const matchesTerm = !term || product.name.toLowerCase().includes(term) || product.code.includes(term);
      return matchesCategory && matchesTerm;
    });
  }, [categoryId, products, search]);
  const filterCategories = useMemo(() => [{ id: 0, name: 'Todos' }, ...categories.filter((category) => category.active)], [categories]);

  return (
    <View style={styles.page}>
      <View style={styles.searchRow}>
        <Text style={styles.searchIcon}>⌕</Text>
        <TextInput
          accessibilityLabel="Buscar produto"
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nome ou código"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ProductCard product={item} onPress={() => onProductPress(item)} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <FlatList
              horizontal
              data={filterCategories}
              keyExtractor={(item) => String(item.id)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categories}
              renderItem={({ item }) => {
                const selected = item.id === categoryId;
                return (
                  <TouchableOpacity style={[styles.chip, selected && styles.chipSelected]} onPress={() => setCategoryId(item.id)}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item.name}</Text>
                  </TouchableOpacity>
                );
              }}
            />
            <View style={styles.resultRow}>
              <Text style={styles.resultText}>{filtered.length} produto{filtered.length === 1 ? '' : 's'}</Text>
              {role === 'ADMIN' ? (
                <View style={styles.managementLinks}>
                  <TouchableOpacity onPress={onCategories}><Text style={styles.managementLink}>Categorias</Text></TouchableOpacity>
                  <Text style={styles.linkSeparator}>•</Text>
                  <TouchableOpacity onPress={onSuppliers}><Text style={styles.managementLink}>Fornecedores</Text></TouchableOpacity>
                </View>
              ) : <Text style={styles.resultHint}>Toque para ver detalhes</Text>}
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nenhum produto encontrado</Text>
            <Text style={styles.emptyCopy}>Tente buscar por outro nome, código ou categoria.</Text>
          </View>
        }
      />

      {role === 'ADMIN' ? (
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cadastrar produto" style={styles.fab} onPress={onAdd}>
          <Text style={styles.fabText}>＋</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  searchRow: { margin: 18, marginBottom: 4, minHeight: 50, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, backgroundColor: colors.white },
  searchIcon: { color: colors.primary, fontSize: 23, marginRight: 8 },
  search: { flex: 1, color: colors.text, fontSize: 13 },
  list: { paddingHorizontal: 18, paddingBottom: 90 },
  categories: { gap: 8, paddingVertical: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  chipTextSelected: { color: colors.white },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 11 },
  resultText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  resultHint: { color: colors.textMuted, fontSize: 10 },
  managementLinks: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  managementLink: { color: colors.primary, fontSize: 10, fontWeight: '900' },
  linkSeparator: { color: colors.border, fontSize: 10 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 28 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  emptyCopy: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 7, lineHeight: 18 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText: { color: colors.white, fontSize: 27, fontWeight: '500', lineHeight: 31 },
});
