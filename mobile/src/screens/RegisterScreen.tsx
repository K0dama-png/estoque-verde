import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radius } from '../theme';
import { RegistrationInput } from '../types';

interface Props {
  error?: string;
  busy?: boolean;
  onBack: () => void;
  onRegister: (input: RegistrationInput) => Promise<void> | void;
}

export function RegisterScreen({ error, busy, onBack, onRegister }: Props) {
  const [managerName, setManagerName] = useState('');
  const [marketName, setMarketName] = useState('');
  const [document, setDocument] = useState('');
  const [city, setCity] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const passwordsMatch = password === confirmation;
  const valid = managerName.trim().length >= 3
    && marketName.trim().length >= 3
    && document.replace(/\D/g, '').length >= 11
    && city.trim().length >= 3
    && username.trim().length >= 4
    && password.length >= 6
    && passwordsMatch;

  const submit = () => onRegister({
    managerName: managerName.trim(),
    marketName: marketName.trim(),
    document: document.trim(),
    city: city.trim(),
    username: username.trim().toLowerCase(),
    password,
  });

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity accessibilityRole="button" style={styles.back} onPress={onBack}>
          <Text style={styles.backText}>‹ Voltar ao login</Text>
        </TouchableOpacity>

        <View style={styles.brandRow}>
          <View style={styles.logo}><Text style={styles.logoText}>LC</Text></View>
          <View><Text style={styles.brand}>LoteCerto</Text><Text style={styles.brandCopy}>Cadastro de novo mercado</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Crie sua conta</Text>
          <Text style={styles.subtitle}>Você será o gerente administrador do mercado cadastrado.</Text>

          <Text style={styles.section}>DADOS DO RESPONSÁVEL</Text>
          <Field label="Nome completo" value={managerName} onChangeText={setManagerName} placeholder="Ex.: Lucas Kodama" />
          <Field label="Nome de usuário" value={username} onChangeText={setUsername} placeholder="Mínimo de 4 caracteres" autoCapitalize="none" />

          <Text style={styles.section}>DADOS DO MERCADO</Text>
          <Field label="Nome do mercado" value={marketName} onChangeText={setMarketName} placeholder="Ex.: Mercado Central" />
          <Field label="CPF ou CNPJ" value={document} onChangeText={setDocument} placeholder="Somente o responsável poderá ver" keyboardType="numeric" />
          <Field label="Cidade / Estado" value={city} onChangeText={setCity} placeholder="Ex.: Assis/SP" />

          <Text style={styles.section}>SEGURANÇA</Text>
          <Field label="Senha" value={password} onChangeText={setPassword} placeholder="Mínimo de 6 caracteres" secureTextEntry />
          <Field label="Confirmar senha" value={confirmation} onChangeText={setConfirmation} placeholder="Digite a senha novamente" secureTextEntry />
          {!passwordsMatch && confirmation ? <Text style={styles.validation}>As senhas não coincidem.</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Dados separados por mercado</Text>
            <Text style={styles.noticeCopy}>Funcionários, produtos e movimentações cadastrados aqui não serão exibidos para outros mercados.</Text>
          </View>

          <PrimaryButton label={busy ? 'Cadastrando...' : 'Cadastrar mercado e entrar'} onPress={submit} disabled={!valid || busy} style={styles.submit} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  secureTextEntry?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.textMuted} {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 18, paddingTop: 26, paddingBottom: 40 },
  back: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 12 },
  backText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  logo: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  logoText: { color: colors.white, fontSize: 18, fontWeight: '900' },
  brand: { color: colors.text, fontSize: 20, fontWeight: '900' },
  brandCopy: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  card: { padding: 20, borderRadius: radius.large, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 6 },
  section: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginTop: 20, marginBottom: 11 },
  field: { marginBottom: 12 },
  label: { color: colors.text, fontSize: 11, fontWeight: '800', marginBottom: 7 },
  input: { minHeight: 48, paddingHorizontal: 13, borderRadius: radius.medium, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.text, fontSize: 13 },
  validation: { color: colors.danger, fontSize: 10, fontWeight: '700', marginTop: -5, marginBottom: 8 },
  error: { color: colors.danger, fontSize: 11, fontWeight: '700', marginTop: 4 },
  notice: { padding: 13, borderRadius: radius.medium, backgroundColor: colors.primarySoft, marginTop: 10 },
  noticeTitle: { color: colors.primaryDark, fontSize: 11, fontWeight: '900' },
  noticeCopy: { color: colors.textMuted, fontSize: 10, lineHeight: 16, marginTop: 4 },
  submit: { marginTop: 16 },
});
