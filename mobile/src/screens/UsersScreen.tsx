import { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radius } from '../theme';
import { EmployeeRegistrationInput, User } from '../types';

interface Props {
  employees: User[];
  onAdd: (input: EmployeeRegistrationInput) => Promise<boolean> | boolean;
  onToggleStatus: (employeeId: number) => void;
}

export function UsersScreen({ employees, onAdd, onToggleStatus }: Props) {
  const [formOpen, setFormOpen] = useState(false);

  const confirmStatusChange = (employee: User) => {
    const action = employee.active ? 'inativar' : 'reativar';
    Alert.alert(
      `${action === 'inativar' ? 'Inativar' : 'Reativar'} funcionário?`,
      employee.active
        ? `${employee.name} não conseguirá mais entrar no aplicativo.`
        : `${employee.name} voltará a acessar o aplicativo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: action === 'inativar' ? 'Inativar' : 'Reativar', onPress: () => onToggleStatus(employee.id) },
      ],
    );
  };

  return (
    <View style={styles.page}>
      <View style={styles.summary}>
        <View><Text style={styles.summaryLabel}>EQUIPE DO MERCADO</Text><Text style={styles.summaryValue}>{employees.filter((employee) => employee.active).length} ativos</Text></View>
        <View style={styles.summaryBadge}><Text style={styles.summaryBadgeText}>{employees.length} cadastrados</Text></View>
      </View>

      <FlatList
        data={employees}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<Text style={styles.listTitle}>Funcionários</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.active && styles.cardInactive]}>
            <View style={[styles.avatar, !item.active && styles.avatarInactive]}>
              <Text style={[styles.avatarText, !item.active && styles.avatarTextInactive]}>{item.name.split(' ').slice(0, 2).map((part) => part[0]).join('')}</Text>
            </View>
            <View style={styles.main}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.username}>@{item.username}</Text>
              <Text style={[styles.status, item.active ? styles.statusActive : styles.statusInactive]}>{item.active ? 'Ativo' : 'Inativo'}</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.statusButton, item.active ? styles.deactivateButton : styles.activateButton]}
              onPress={() => confirmStatusChange(item)}
            >
              <Text style={[styles.statusButtonText, item.active ? styles.deactivateText : styles.activateText]}>{item.active ? 'Inativar' : 'Reativar'}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Nenhum funcionário cadastrado</Text>
            <Text style={styles.emptyCopy}>Cadastre a equipe que poderá registrar entradas, saídas e consultar produtos.</Text>
          </View>
        }
      />

      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Cadastrar funcionário" style={styles.fab} onPress={() => setFormOpen(true)}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      <EmployeeFormModal visible={formOpen} onClose={() => setFormOpen(false)} onSave={onAdd} />
    </View>
  );
}

function EmployeeFormModal({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (input: EmployeeRegistrationInput) => Promise<boolean> | boolean }) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const valid = name.trim().length >= 3 && username.trim().length >= 4 && password.length >= 6 && password === confirmation;

  const closeAndReset = () => {
    setName(''); setUsername(''); setPassword(''); setConfirmation(''); onClose();
  };

  const save = async () => {
    if (await onSave({ name: name.trim(), username: username.trim().toLowerCase(), password })) closeAndReset();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={closeAndReset}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderCopy}><Text style={styles.modalTitle}>Cadastrar funcionário</Text><Text style={styles.modalSubtitle}>Crie o acesso inicial de um membro da equipe</Text></View>
            <TouchableOpacity accessibilityRole="button" style={styles.close} onPress={closeAndReset}><Text style={styles.closeText}>×</Text></TouchableOpacity>
          </View>
          <View style={styles.form}>
            <Field label="Nome completo" value={name} onChangeText={setName} placeholder="Ex.: Ana Souza" />
            <Field label="Nome de usuário" value={username} onChangeText={setUsername} placeholder="Mínimo de 4 caracteres" autoCapitalize="none" />
            <Field label="Senha inicial" value={password} onChangeText={setPassword} placeholder="Mínimo de 6 caracteres" secureTextEntry />
            <Field label="Confirmar senha" value={confirmation} onChangeText={setConfirmation} placeholder="Digite a senha novamente" secureTextEntry />
            {confirmation && password !== confirmation ? <Text style={styles.validation}>As senhas não coincidem.</Text> : null}
            <View style={styles.permissionBox}>
              <Text style={styles.permissionTitle}>Permissões do funcionário</Text>
              <Text style={styles.permissionCopy}>Consultar produtos, registrar entradas e saídas e consultar as próprias movimentações. A senha informada será temporária e deverá ser trocada no primeiro acesso.</Text>
            </View>
            <PrimaryButton label="Cadastrar funcionário" onPress={save} disabled={!valid} style={styles.submit} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  secureTextEntry?: boolean;
}) {
  return <View style={styles.field}><Text style={styles.label}>{props.label}</Text><TextInput style={styles.input} placeholderTextColor={colors.textMuted} {...props} /></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  summary: { margin: 18, padding: 18, borderRadius: radius.large, backgroundColor: colors.primaryDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { color: '#BFE4D0', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  summaryValue: { color: colors.white, fontSize: 23, fontWeight: '900', marginTop: 5 },
  summaryBadge: { backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 11, paddingVertical: 8, borderRadius: radius.pill },
  summaryBadgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  list: { paddingHorizontal: 18, paddingBottom: 90 },
  listTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 12 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 13, marginBottom: 9, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  cardInactive: { opacity: 0.68 },
  avatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarInactive: { backgroundColor: colors.background },
  avatarText: { color: colors.primaryDark, fontSize: 14, fontWeight: '900' },
  avatarTextInactive: { color: colors.textMuted },
  main: { flex: 1, paddingHorizontal: 11 },
  name: { color: colors.text, fontSize: 13, fontWeight: '900' },
  username: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  status: { alignSelf: 'flex-start', fontSize: 9, fontWeight: '800', marginTop: 5, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' },
  statusActive: { color: colors.primaryDark, backgroundColor: colors.primaryLight },
  statusInactive: { color: colors.textMuted, backgroundColor: colors.background },
  statusButton: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.small, borderWidth: 1 },
  deactivateButton: { borderColor: '#F3BABA', backgroundColor: colors.dangerSoft },
  activateButton: { borderColor: '#BFE7D2', backgroundColor: colors.primaryLight },
  statusButtonText: { fontSize: 9, fontWeight: '900' },
  deactivateText: { color: colors.danger },
  activateText: { color: colors.primaryDark },
  empty: { alignItems: 'center', padding: 45, backgroundColor: colors.white, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  emptyCopy: { color: colors.textMuted, fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 6 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 6 },
  fabText: { color: colors.white, fontSize: 27, fontWeight: '500', lineHeight: 31 },
  overlay: { flex: 1, backgroundColor: 'rgba(8, 35, 22, 0.42)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginTop: 10 },
  modalHeader: { padding: 19, paddingTop: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  modalHeaderCopy: { flex: 1 },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '900' },
  modalSubtitle: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  close: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.textMuted, fontSize: 25, lineHeight: 27 },
  form: { padding: 19, paddingBottom: 30 },
  field: { marginBottom: 12 },
  label: { color: colors.text, fontSize: 11, fontWeight: '800', marginBottom: 7 },
  input: { minHeight: 48, paddingHorizontal: 13, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, fontSize: 13 },
  validation: { color: colors.danger, fontSize: 10, fontWeight: '700', marginTop: -5, marginBottom: 8 },
  permissionBox: { padding: 13, borderRadius: radius.medium, backgroundColor: colors.primarySoft, marginTop: 2 },
  permissionTitle: { color: colors.primaryDark, fontSize: 11, fontWeight: '900' },
  permissionCopy: { color: colors.textMuted, fontSize: 10, lineHeight: 16, marginTop: 4 },
  submit: { marginTop: 15 },
});
