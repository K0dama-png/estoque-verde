import { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { colors, radius } from '../theme';
import { Batch, Category, MovementType, Product, Role, StockExitItemInput, StockExitReason, Supplier } from '../types';
import { formatCurrency, formatDate } from '../utils';

interface ModalShellProps {
  visible: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
}

function ModalShell({ visible, title, subtitle, onClose, children }: ModalShellProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerCopy}><Text style={styles.title}>{title}</Text><Text style={styles.subtitle}>{subtitle}</Text></View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fechar" style={styles.close} onPress={onClose}><Text style={styles.closeText}>×</Text></TouchableOpacity>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}

interface ProductFormModalProps {
  visible: boolean;
  suppliers: Supplier[];
  categories: Category[];
  onClose: () => void;
  onSave: (product: Omit<Product, 'id' | 'marketId' | 'active'>, initialBatchCode?: string, supplierId?: number, purchasePrice?: number) => Promise<boolean> | boolean;
}

export function ProductFormModal({ visible, suppliers, categories, onClose, onSave }: ProductFormModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? 0);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [minimum, setMinimum] = useState('');
  const [expiry, setExpiry] = useState('2027-12-31');
  const [batchCode, setBatchCode] = useState('');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? 0);
  const [purchasePrice, setPurchasePrice] = useState('');
  useEffect(() => {
    if (visible) {
      setSupplierId(suppliers[0]?.id ?? 0);
      setCategoryId(categories[0]?.id ?? 0);
    }
  }, [categories, suppliers, visible]);

  const reset = () => {
    setName(''); setCode(''); setCategoryId(categories[0]?.id ?? 0); setPrice(''); setQuantity(''); setMinimum(''); setExpiry('2027-12-31'); setBatchCode(''); setPurchasePrice('');
  };

  const save = async () => {
    const selectedCategory = categories.find((item) => item.id === categoryId);
    if (!selectedCategory) return;
    const saved = await onSave({
      name,
      code,
      description: '',
      categoryId: selectedCategory.id,
      category: selectedCategory.name,
      price: Number(price.replace(',', '.')),
      quantity: Number(quantity),
      minimumStock: Number(minimum),
      maximumStock: Math.max(Number(quantity) * 2, Number(minimum) * 3, 1),
      expiryDate: expiry,
      unit: 'un',
    }, batchCode.trim() || undefined, supplierId || undefined, Number(purchasePrice.replace(',', '.')) || undefined);
    if (saved) {
      reset();
      onClose();
    }
  };

  const initialQuantity = Number(quantity);
  const valid = name.trim() && code.trim() && categoryId > 0 && Number(price.replace(',', '.')) > 0 && initialQuantity >= 0
    && Number(minimum) >= 0 && (initialQuantity === 0 || Boolean(batchCode.trim() && expiry && supplierId && Number(purchasePrice.replace(',', '.')) > 0));

  return (
    <ModalShell visible={visible} title="Cadastrar produto" subtitle="Inclua um novo item no estoque" onClose={onClose}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Field label="Nome do produto" value={name} onChangeText={setName} placeholder="Ex.: Açúcar refinado" />
        <Field label="Código / código de barras" value={code} onChangeText={setCode} placeholder="Ex.: 7890000000000" keyboardType="numeric" />
        <Text style={styles.label}>Categoria</Text>
        <View style={styles.chipRow}>
          {categories.map((item) => (
            <TouchableOpacity key={item.id} style={[styles.chip, categoryId === item.id && styles.chipActive]} onPress={() => setCategoryId(item.id)}>
              <Text style={[styles.chipText, categoryId === item.id && styles.chipTextActive]}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.twoColumns}>
          <View style={styles.column}><Field label="Preço (R$)" value={price} onChangeText={setPrice} placeholder="0,00" keyboardType="decimal-pad" /></View>
          <View style={styles.column}><Field label="Quantidade" value={quantity} onChangeText={setQuantity} placeholder="0" keyboardType="numeric" /></View>
        </View>
        <View style={styles.twoColumns}>
          <View style={styles.column}><Field label="Estoque mínimo" value={minimum} onChangeText={setMinimum} placeholder="0" keyboardType="numeric" /></View>
          <View style={styles.column}><Field label="Validade" value={expiry} onChangeText={setExpiry} placeholder="AAAA-MM-DD" /></View>
        </View>
        <Field label="Código do lote inicial" value={batchCode} onChangeText={setBatchCode} placeholder={initialQuantity > 0 ? 'Obrigatório quando há estoque' : 'Opcional sem estoque'} />
        {initialQuantity > 0 ? (
          <>
            <Text style={styles.label}>Fornecedor do lote inicial</Text>
            <View style={styles.chipRow}>{suppliers.map((supplier) => <TouchableOpacity key={supplier.id} style={[styles.chip, supplierId === supplier.id && styles.chipActive]} onPress={() => setSupplierId(supplier.id)}><Text style={[styles.chipText, supplierId === supplier.id && styles.chipTextActive]}>{supplier.name}</Text></TouchableOpacity>)}</View>
            <Field label="Preço unitário de compra" value={purchasePrice} onChangeText={setPurchasePrice} placeholder="0,00" keyboardType="decimal-pad" />
          </>
        ) : null}
        <PrimaryButton label="Salvar produto" onPress={save} disabled={!valid} style={styles.submit} />
      </ScrollView>
    </ModalShell>
  );
}

interface MovementModalProps {
  visible: boolean;
  type: MovementType;
  products: Product[];
  suppliers: Supplier[];
  onClose: () => void;
  onConfirm: (productId: number, quantity: number, batchCode?: string, expiryDate?: string, supplierId?: number, purchasePrice?: number) => Promise<boolean> | boolean;
}

export function MovementModal({ visible, type, products, suppliers, onClose, onConfirm }: MovementModalProps) {
  const [productId, setProductId] = useState(products[0]?.id ?? 0);
  const [quantity, setQuantity] = useState('1');
  const [batchCode, setBatchCode] = useState('');
  const [expiryDate, setExpiryDate] = useState('2027-12-31');
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? 0);
  const [purchasePrice, setPurchasePrice] = useState('');
  useEffect(() => {
    if (visible) {
      setProductId(products[0]?.id ?? 0);
      setQuantity('1');
      setBatchCode('');
      setExpiryDate('2027-12-31');
      setSupplierId(suppliers[0]?.id ?? 0);
      setPurchasePrice('');
    }
  }, [products, suppliers, visible]);
  const selected = products.find((product) => product.id === productId);
  const amount = Number(quantity);
  const valid = Boolean(selected) && amount > 0
    && (type === 'ENTRY' ? Boolean(batchCode.trim() && expiryDate && supplierId && Number(purchasePrice.replace(',', '.')) > 0) : amount <= (selected?.quantity ?? 0));

  return (
    <ModalShell
      visible={visible}
      title={type === 'ENTRY' ? 'Registrar entrada' : 'Registrar saída'}
      subtitle={type === 'ENTRY' ? 'Adicione mercadorias recebidas' : 'Retire produtos do estoque'}
      onClose={onClose}
    >
      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.label}>Selecione o produto</Text>
        <View style={styles.productList}>
          {products.map((product) => {
            const active = product.id === productId;
            return (
              <TouchableOpacity key={product.id} style={[styles.productOption, active && styles.productOptionActive]} onPress={() => setProductId(product.id)}>
                <View style={styles.optionMain}><Text style={[styles.optionName, active && styles.optionNameActive]}>{product.name}</Text><Text style={[styles.optionMeta, active && styles.optionMetaActive]}>{product.quantity} {product.unit} disponíveis</Text></View>
                <View style={[styles.radio, active && styles.radioActive]}>{active ? <View style={styles.radioDot} /> : null}</View>
              </TouchableOpacity>
            );
          })}
        </View>
        <Field label="Quantidade" value={quantity} onChangeText={setQuantity} placeholder="1" keyboardType="numeric" />
        {type === 'ENTRY' ? (
          <>
            <View style={styles.twoColumns}>
              <View style={styles.column}><Field label="Código do lote" value={batchCode} onChangeText={setBatchCode} placeholder="Ex.: LOT-2608-A" /></View>
              <View style={styles.column}><Field label="Validade" value={expiryDate} onChangeText={setExpiryDate} placeholder="AAAA-MM-DD" /></View>
            </View>
            <Text style={styles.label}>Fornecedor</Text>
            <View style={styles.chipRow}>{suppliers.map((supplier) => <TouchableOpacity key={supplier.id} style={[styles.chip, supplierId === supplier.id && styles.chipActive]} onPress={() => setSupplierId(supplier.id)}><Text style={[styles.chipText, supplierId === supplier.id && styles.chipTextActive]}>{supplier.name}</Text></TouchableOpacity>)}</View>
            {!suppliers.length ? <Text style={styles.validation}>Cadastre um fornecedor antes de registrar a entrada.</Text> : null}
            <Field label="Preço unitário de compra" value={purchasePrice} onChangeText={setPurchasePrice} placeholder="0,00" keyboardType="decimal-pad" />
          </>
        ) : null}
        {!valid && type === 'EXIT' && amount > (selected?.quantity ?? 0) ? <Text style={styles.validation}>Estoque insuficiente para esta saída.</Text> : null}
        <PrimaryButton label={type === 'ENTRY' ? 'Confirmar entrada' : 'Confirmar saída'} onPress={() => onConfirm(productId, amount, batchCode.trim() || undefined, expiryDate, supplierId || undefined, Number(purchasePrice.replace(',', '.')) || undefined)} disabled={!valid} style={styles.submit} />
      </ScrollView>
    </ModalShell>
  );
}

interface StockExitModalProps {
  visible: boolean;
  products: Product[];
  onClose: () => void;
  onConfirm: (items: StockExitItemInput[], reason: StockExitReason) => Promise<boolean> | boolean;
}

export function StockExitModal({ visible, products, onClose, onConfirm }: StockExitModalProps) {
  const [cart, setCart] = useState<Record<number, number>>({});
  const [search, setSearch] = useState('');
  const [reason, setReason] = useState<StockExitReason>('SALE');
  useEffect(() => {
    if (visible) {
      setCart({});
      setSearch('');
      setReason('SALE');
    }
  }, [visible]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => product.quantity > 0 && (!term || product.name.toLowerCase().includes(term) || product.code.includes(term)));
  }, [products, search]);
  const items = Object.entries(cart)
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ productId: Number(productId), quantity }));
  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  const changeQuantity = (product: Product, change: number) => {
    setCart((current) => {
      const nextQuantity = Math.max(0, Math.min((current[product.id] ?? 0) + change, product.quantity));
      return { ...current, [product.id]: nextQuantity };
    });
  };

  const finish = async () => {
    if (await onConfirm(items, reason)) setCart({});
  };

  return (
    <ModalShell visible={visible} title="Registrar saída" subtitle="Selecione os produtos que sairão do estoque" onClose={onClose}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.saleSearch}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar produto por nome ou código"
          placeholderTextColor={colors.textMuted}
        />
        <View style={styles.saleProductList}>
          {filteredProducts.map((product) => {
            const quantity = cart[product.id] ?? 0;
            return (
              <View key={product.id} style={[styles.saleProduct, quantity > 0 && styles.saleProductSelected]}>
                <View style={styles.saleProductMain}>
                  <Text style={styles.saleProductName}>{product.name}</Text>
                  <Text style={styles.saleProductMeta}>{product.quantity} {product.unit} disponíveis</Text>
                </View>
                <View style={styles.stepper}>
                  <TouchableOpacity style={styles.stepButton} onPress={() => changeQuantity(product, -1)}><Text style={styles.stepText}>−</Text></TouchableOpacity>
                  <Text style={styles.stepQuantity}>{quantity}</Text>
                  <TouchableOpacity style={[styles.stepButton, styles.stepButtonAdd]} onPress={() => changeQuantity(product, 1)}><Text style={[styles.stepText, styles.stepTextAdd]}>＋</Text></TouchableOpacity>
                </View>
              </View>
            );
          })}
          {!filteredProducts.length ? <Text style={styles.noProducts}>Nenhum produto com estoque disponível.</Text> : null}
        </View>

        <View style={styles.cartSummary}>
          <View><Text style={styles.cartLabel}>ITENS DA SAÍDA</Text><Text style={styles.cartUnits}>{totalUnits} unidade{totalUnits === 1 ? '' : 's'} em {items.length} produto{items.length === 1 ? '' : 's'}</Text></View>
        </View>
        <Text style={styles.reasonTitle}>Motivo da saída</Text>
        <View style={styles.reasonMethods}>
          {([
            ['SALE', 'Venda'],
            ['LOSS', 'Perda'],
            ['EXPIRY', 'Vencimento'],
            ['DAMAGE', 'Avaria'],
            ['INTERNAL_USE', 'Consumo interno'],
            ['ADJUSTMENT', 'Ajuste'],
          ] as [StockExitReason, string][]).map(([exitReason, label]) => {
            const selected = reason === exitReason;
            return (
              <TouchableOpacity key={exitReason} style={[styles.reasonMethod, selected && styles.reasonMethodSelected]} onPress={() => setReason(exitReason)}>
                <Text style={[styles.reasonMethodText, selected && styles.reasonMethodTextSelected]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.fefoHint}>Os lotes serão baixados automaticamente pela validade mais próxima.</Text>
        <PrimaryButton label="Confirmar saída" onPress={finish} disabled={!items.length} style={styles.submit} />
      </ScrollView>
    </ModalShell>
  );
}

interface ProductDetailModalProps {
  product?: Product;
  batches: Batch[];
  suppliers: Supplier[];
  role: Role;
  onClose: () => void;
  onDeactivate: (productId: number) => void;
}

export function ProductDetailModal({ product, batches, suppliers, role, onClose, onDeactivate }: ProductDetailModalProps) {
  if (!product) return null;
  return (
    <ModalShell visible={Boolean(product)} title={product.name} subtitle={product.code} onClose={onClose}>
      <ScrollView contentContainerStyle={styles.detail}>
        <View style={styles.stockHero}><Text style={styles.stockLabel}>SALDO ATUAL</Text><Text style={styles.stockValue}>{product.quantity} {product.unit}</Text><Text style={styles.stockHint}>Mínimo recomendado: {product.minimumStock}</Text></View>
        <View style={styles.detailGrid}>
          <Detail label="Categoria" value={product.category} />
          <Detail label="Preço de venda" value={formatCurrency(product.price)} />
          <Detail label="Validade" value={formatDate(product.expiryDate)} />
          <Detail label="Estoque máximo" value={String(product.maximumStock)} />
        </View>
        <Text style={styles.batchSectionTitle}>Lotes disponíveis</Text>
        {batches.length ? [...batches].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)).map((batch) => (
          <View key={batch.id} style={styles.batchCard}>
            <View style={styles.batchMain}><Text style={styles.batchCode}>{batch.code}</Text><Text style={styles.batchExpiry}>Validade: {formatDate(batch.expiryDate)}</Text><Text style={styles.batchSupplier}>{suppliers.find((supplier) => supplier.id === batch.supplierId)?.name ?? 'Fornecedor não informado'} · Compra: {formatCurrency(batch.purchasePrice)}</Text></View>
            <Text style={styles.batchQuantity}>{batch.quantity} {product.unit}</Text>
          </View>
        )) : <Text style={styles.noBatches}>Produto sem lote com saldo disponível.</Text>}
        {role === 'ADMIN' ? <PrimaryButton label="Inativar produto" variant="danger" onPress={() => onDeactivate(product.id)} style={styles.submit} /> : null}
      </ScrollView>
    </ModalShell>
  );
}

function Field(props: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'numeric' | 'decimal-pad' }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.textMuted} {...props} />
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailItem}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(8, 35, 22, 0.42)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '91%', minHeight: '50%', backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10 },
  header: { padding: 19, paddingTop: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  headerCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 20, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.textMuted, fontSize: 25, lineHeight: 27 },
  form: { padding: 19, paddingBottom: 35 },
  field: { flex: 1, marginBottom: 13 },
  label: { color: colors.text, fontSize: 11, fontWeight: '800', marginBottom: 7 },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, paddingHorizontal: 13, color: colors.text, backgroundColor: colors.background, fontSize: 13 },
  twoColumns: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 15 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  chipTextActive: { color: colors.white },
  submit: { marginTop: 9 },
  productList: { gap: 8, marginBottom: 15 },
  productOption: { minHeight: 57, padding: 12, flexDirection: 'row', alignItems: 'center', borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  productOptionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionMain: { flex: 1 },
  optionName: { color: colors.text, fontSize: 12, fontWeight: '800' },
  optionNameActive: { color: colors.primaryDark },
  optionMeta: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  optionMetaActive: { color: colors.primary },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  validation: { color: colors.danger, fontSize: 11, fontWeight: '700', marginTop: 8 },
  saleSearch: { minHeight: 48, paddingHorizontal: 13, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, fontSize: 12, marginBottom: 12 },
  saleProductList: { gap: 8 },
  saleProduct: { minHeight: 65, padding: 12, flexDirection: 'row', alignItems: 'center', borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  saleProductSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  saleProductMain: { flex: 1, paddingRight: 8 },
  saleProductName: { color: colors.text, fontSize: 12, fontWeight: '900' },
  saleProductMeta: { color: colors.textMuted, fontSize: 9, marginTop: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  stepButton: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.dangerSoft },
  stepButtonAdd: { backgroundColor: colors.primaryLight },
  stepText: { color: colors.danger, fontSize: 17, fontWeight: '900', lineHeight: 20 },
  stepTextAdd: { color: colors.primaryDark },
  stepQuantity: { width: 22, color: colors.text, fontSize: 13, fontWeight: '900', textAlign: 'center' },
  noProducts: { color: colors.textMuted, fontSize: 11, textAlign: 'center', paddingVertical: 30 },
  cartSummary: { marginTop: 16, padding: 15, borderRadius: radius.medium, backgroundColor: colors.primaryDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cartLabel: { color: '#BFE4D0', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  cartUnits: { color: colors.white, fontSize: 10, marginTop: 4 },
  reasonTitle: { color: colors.text, fontSize: 11, fontWeight: '900', marginTop: 15, marginBottom: 8 },
  reasonMethods: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  reasonMethod: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  reasonMethodSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  reasonMethodText: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  reasonMethodTextSelected: { color: colors.white },
  fefoHint: { color: colors.textMuted, fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 9 },
  detail: { padding: 19, paddingBottom: 35 },
  stockHero: { padding: 20, borderRadius: radius.large, backgroundColor: colors.primaryDark, alignItems: 'center' },
  stockLabel: { color: '#BFE4D0', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  stockValue: { color: colors.white, fontSize: 31, fontWeight: '900', marginTop: 5 },
  stockHint: { color: '#CDE8D9', fontSize: 10, marginTop: 4 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 14 },
  detailItem: { width: '48%', padding: 14, borderRadius: radius.medium, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  detailLabel: { color: colors.textMuted, fontSize: 10 },
  detailValue: { color: colors.text, fontSize: 13, fontWeight: '800', marginTop: 5 },
  batchSectionTitle: { color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 20, marginBottom: 9 },
  batchCard: { padding: 12, marginBottom: 7, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  batchMain: { flex: 1, paddingRight: 8 },
  batchCode: { color: colors.text, fontSize: 12, fontWeight: '900' },
  batchExpiry: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  batchSupplier: { color: colors.textMuted, fontSize: 9, marginTop: 3 },
  batchQuantity: { color: colors.primaryDark, fontSize: 14, fontWeight: '900' },
  noBatches: { color: colors.textMuted, fontSize: 11, paddingVertical: 8 },
});
