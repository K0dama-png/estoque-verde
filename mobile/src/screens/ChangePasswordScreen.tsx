import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radius } from '../theme';

interface Props {
  userName: string;
  onConfirm: (password: string) => Promise<boolean> | boolean;
  onLogout: () => void;
}

export function ChangePasswordScreen({ userName, onConfirm, onLogout }: Props) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const matches = password === confirmation;
  const valid = password.length >= 6 && matches;

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.icon}><Text style={styles.iconText}>✓</Text></View>
      <Text style={styles.eyebrow}>PRIMEIRO ACESSO</Text>
      <Text style={styles.title}>Crie sua senha pessoal</Text>
      <Text style={styles.subtitle}>Olá, {userName.split(' ')[0]}. A senha fornecida pelo gerente é temporária. Escolha uma nova senha para continuar.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Nova senha</Text>
        <View style={styles.passwordRow}>
          <TextInput
            accessibilityLabel="Nova senha"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="Mínimo de 6 caracteres"
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity accessibilityRole="button" onPress={() => setShowPassword((current) => !current)}>
            <Text style={styles.show}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirmar nova senha</Text>
        <TextInput
          accessibilityLabel="Confirmar nova senha"
          style={styles.confirmation}
          value={confirmation}
          onChangeText={setConfirmation}
          secureTextEntry={!showPassword}
          placeholder="Digite a senha novamente"
          placeholderTextColor={colors.textMuted}
        />

        {confirmation && !matches ? <Text style={styles.error}>As senhas não coincidem.</Text> : null}
        {password && password.length < 6 ? <Text style={styles.hint}>Use pelo menos 6 caracteres.</Text> : null}

        <View style={styles.securityBox}>
          <Text style={styles.securityTitle}>Sua senha é pessoal</Text>
          <Text style={styles.securityCopy}>Não compartilhe com o gerente ou outros funcionários. Em produção, ela será armazenada de forma criptografada pela API.</Text>
        </View>

        <PrimaryButton label="Salvar senha e continuar" onPress={() => onConfirm(password)} disabled={!valid} style={styles.submit} />
      </View>

      <TouchableOpacity accessibilityRole="button" style={styles.logout} onPress={onLogout}>
        <Text style={styles.logoutText}>Sair e voltar ao login</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', padding: 20 },
  icon: { width: 62, height: 62, borderRadius: 21, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  iconText: { color: colors.white, fontSize: 25, fontWeight: '900' },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, textAlign: 'center', marginTop: 17 },
  title: { color: colors.text, fontSize: 25, fontWeight: '900', textAlign: 'center', marginTop: 5 },
  subtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7, marginHorizontal: 12 },
  card: { padding: 20, borderRadius: radius.large, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, marginTop: 20 },
  label: { color: colors.text, fontSize: 11, fontWeight: '800', marginBottom: 7, marginTop: 8 },
  passwordRow: { minHeight: 49, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, backgroundColor: colors.background },
  input: { flex: 1, color: colors.text, fontSize: 13 },
  show: { color: colors.primary, fontSize: 10, fontWeight: '900', paddingLeft: 8 },
  confirmation: { minHeight: 49, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, backgroundColor: colors.background, color: colors.text, fontSize: 13 },
  error: { color: colors.danger, fontSize: 10, fontWeight: '700', marginTop: 7 },
  hint: { color: colors.textMuted, fontSize: 10, marginTop: 7 },
  securityBox: { padding: 12, borderRadius: radius.medium, backgroundColor: colors.primarySoft, marginTop: 15 },
  securityTitle: { color: colors.primaryDark, fontSize: 10, fontWeight: '900' },
  securityCopy: { color: colors.textMuted, fontSize: 9, lineHeight: 15, marginTop: 4 },
  submit: { marginTop: 15 },
  logout: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 7 },
  logoutText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
});
