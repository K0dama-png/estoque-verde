import { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radius } from '../theme';
import { Supplier, SupplierRegistrationInput } from '../types';

interface Props {
  suppliers: Supplier[];
  onAdd: (input: SupplierRegistrationInput) => Promise<boolean> | boolean;
  onToggleStatus: (supplierId: number) => void;
}

export function SuppliersScreen({ suppliers, onAdd, onToggleStatus }: Props) {
  const [formOpen, setFormOpen] = useState(false);

  const confirmStatus = (supplier: Supplier) => {
    Alert.alert(
      supplier.active ? 'Inativar fornecedor?' : 'Reativar fornecedor?',
      supplier.active
        ? 'O fornecedor não poderá ser selecionado em novas entradas, mas os lotes antigos serão preservados.'
        : 'O fornecedor voltará a aparecer nas novas entradas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: supplier.active ? 'Inativar' : 'Reativar', onPress: () => onToggleStatus(supplier.id) },
      ],
    );
  };

  return (
    <View style={styles.page}>
      <View style={styles.summary}>
        <View><Text style={styles.summaryLabel}>FORNECEDORES</Text><Text style={styles.summaryValue}>{suppliers.filter((supplier) => supplier.active).length} ativos</Text></View>
        <Text style={styles.summaryCopy}>Vinculados somente a este mercado</Text>
      </View>
      <FlatList
        data={suppliers}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.active && styles.inactive]}>
            <View style={styles.icon}><Text style={styles.iconText}>{item.name[0]}</Text></View>
            <View style={styles.main}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.document}</Text>
              <Text style={styles.meta}>{item.phone}</Text>
            </View>
            <TouchableOpacity style={[styles.statusButton, item.active ? styles.deactivateButton : styles.activateButton]} onPress={() => confirmStatus(item)}>
              <Text style={[styles.statusText, item.active ? styles.deactivateText : styles.activateText]}>{item.active ? 'Inativar' : 'Reativar'}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>Nenhum fornecedor cadastrado</Text><Text style={styles.emptyCopy}>Cadastre um fornecedor antes de registrar uma entrada de mercadorias.</Text></View>}
      />
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cadastrar fornecedor" style={styles.fab} onPress={() => setFormOpen(true)}><Text style={styles.fabText}>＋</Text></TouchableOpacity>
      <SupplierFormModal visible={formOpen} onClose={() => setFormOpen(false)} onSave={onAdd} />
    </View>
  );
}

function SupplierFormModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (input: SupplierRegistrationInput) => Promise<boolean> | boolean }) {
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [phone, setPhone] = useState('');
  const valid = name.trim().length >= 3 && document.replace(/\D/g, '').length >= 11 && phone.replace(/\D/g, '').length >= 8;
  const resetAndClose = () => { setName(''); setDocument(''); setPhone(''); onClose(); };
  const save = async () => {
    if (await onSave({ name: name.trim(), document: document.trim(), phone: phone.trim() })) resetAndClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={resetAndClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.modalHeader}><View><Text style={styles.modalTitle}>Cadastrar fornecedor</Text><Text style={styles.modalSubtitle}>Dados para rastrear a origem das mercadorias</Text></View><TouchableOpacity style={styles.close} onPress={resetAndClose}><Text style={styles.closeText}>×</Text></TouchableOpacity></View>
          <View style={styles.form}>
            <Field label="Nome ou razão social" value={name} onChangeText={setName} placeholder="Ex.: Distribuidora Central" />
            <Field label="CPF ou CNPJ" value={document} onChangeText={setDocument} placeholder="Documento do fornecedor" keyboardType="numeric" />
            <Field label="Telefone" value={phone} onChangeText={setPhone} placeholder="Ex.: (18) 99999-9999" keyboardType="phone-pad" />
            <PrimaryButton label="Salvar fornecedor" onPress={save} disabled={!valid} style={styles.submit} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Field(props: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'numeric' | 'phone-pad' }) {
  return <View style={styles.field}><Text style={styles.label}>{props.label}</Text><TextInput style={styles.input} placeholderTextColor={colors.textMuted} {...props} /></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  summary: { margin: 18, padding: 18, borderRadius: radius.large, backgroundColor: colors.primaryDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { color: '#BFE4D0', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  summaryValue: { color: colors.white, fontSize: 23, fontWeight: '900', marginTop: 5 },
  summaryCopy: { width: 115, color: '#CDE8D9', fontSize: 9, lineHeight: 14, textAlign: 'right' },
  list: { paddingHorizontal: 18, paddingBottom: 90 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 13, marginBottom: 9, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  inactive: { opacity: 0.62 },
  icon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  iconText: { color: colors.primaryDark, fontSize: 15, fontWeight: '900' },
  main: { flex: 1, paddingHorizontal: 11 },
  name: { color: colors.text, fontSize: 13, fontWeight: '900' },
  meta: { color: colors.textMuted, fontSize: 9, marginTop: 3 },
  statusButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.small, borderWidth: 1 },
  deactivateButton: { borderColor: '#F3BABA', backgroundColor: colors.dangerSoft },
  activateButton: { borderColor: '#BFE7D2', backgroundColor: colors.primaryLight },
  statusText: { fontSize: 9, fontWeight: '900' },
  deactivateText: { color: colors.danger },
  activateText: { color: colors.primaryDark },
  empty: { alignItems: 'center', padding: 45, backgroundColor: colors.white, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  emptyCopy: { color: colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText: { color: colors.white, fontSize: 27, lineHeight: 31 },
  overlay: { flex: 1, backgroundColor: 'rgba(8, 35, 22, 0.42)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10 },
  modalHeader: { padding: 19, paddingTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  modalSubtitle: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.textMuted, fontSize: 25, lineHeight: 27 },
  form: { padding: 19, paddingBottom: 30 },
  field: { marginBottom: 12 },
  label: { color: colors.text, fontSize: 11, fontWeight: '800', marginBottom: 7 },
  input: { minHeight: 48, paddingHorizontal: 13, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, fontSize: 13 },
  submit: { marginTop: 7 },
});
