import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radius } from '../theme';

interface Props {
  onLogin: (username: string, password: string) => Promise<void> | void;
  onRegisterPress: () => void;
  error?: string;
  busy?: boolean;
}

export function LoginScreen({ onLogin, onRegisterPress, error, busy }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.hero}>
        <View style={styles.logo}><Text style={styles.logoMark}>LC</Text></View>
        <Text style={styles.brand}>LoteCerto</Text>
        <Text style={styles.tagline}>Controle simples. Mercado organizado.</Text>
        <View style={styles.decorOne} />
        <View style={styles.decorTwo} />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Bem-vindo</Text>
        <Text style={styles.subtitle}>Entre para gerenciar produtos e movimentações.</Text>

        <Text style={styles.label}>Usuário</Text>
        <TextInput
          accessibilityLabel="Usuário"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Digite seu usuário"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Senha</Text>
        <View style={styles.passwordRow}>
          <TextInput
            accessibilityLabel="Senha"
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            placeholder="Digite sua senha"
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity accessibilityRole="button" onPress={() => setShowPassword((current) => !current)}>
            <Text style={styles.show}>{showPassword ? 'Ocultar' : 'Mostrar'}</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={busy ? 'Entrando...' : 'Entrar'} onPress={() => onLogin(username.trim().toLowerCase(), password)} disabled={busy || !username.trim() || !password} style={styles.button} />
        <TouchableOpacity accessibilityRole="button" style={styles.registerButton} onPress={onRegisterPress}>
          <Text style={styles.registerText}>Cadastrar meu mercado</Text>
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, justifyContent: 'center' },
  hero: { minHeight: 245, backgroundColor: colors.primaryDark, paddingTop: 54, alignItems: 'center', overflow: 'hidden' },
  logo: { width: 68, height: 68, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  logoMark: { color: colors.primaryDark, fontSize: 22, fontWeight: '900', letterSpacing: -1 },
  brand: { color: colors.white, fontSize: 28, fontWeight: '900', marginTop: 13, zIndex: 2 },
  tagline: { color: '#CDE8D9', fontSize: 13, marginTop: 5, zIndex: 2 },
  decorOne: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: '#1C8353', right: -80, top: -45 },
  decorTwo: { position: 'absolute', width: 145, height: 145, borderRadius: 73, borderWidth: 28, borderColor: '#20794F', left: -75, bottom: -55 },
  card: { marginTop: -22, marginHorizontal: 20, padding: 22, borderRadius: radius.large, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.text, fontSize: 25, fontWeight: '900' },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 20 },
  label: { color: colors.text, fontSize: 12, fontWeight: '800', marginBottom: 7, marginTop: 10 },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, paddingHorizontal: 14, color: colors.text, backgroundColor: colors.background },
  passwordRow: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.medium, paddingHorizontal: 14, backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, color: colors.text },
  show: { color: colors.primary, fontSize: 12, fontWeight: '800', paddingLeft: 10 },
  error: { color: colors.danger, fontSize: 12, marginTop: 10, fontWeight: '700' },
  button: { marginTop: 18 },
  registerButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  registerText: { color: colors.primaryDark, fontSize: 12, fontWeight: '900' },
});
