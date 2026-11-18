import { StyleSheet, Text, View } from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { colors, radius } from '../theme';
import { Market, User } from '../types';

interface Props {
  user: User;
  market?: Market;
  onBack: () => void;
  onLogout: () => void;
}

export function ProfileScreen({ user, market, onBack, onLogout }: Props) {
  return (
    <View style={styles.page}>
      <View style={styles.card}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user.name.split(' ').slice(0, 2).map((part) => part[0]).join('')}</Text></View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.role}>{user.role === 'ADMIN' ? 'Gerente / Administrador' : 'Funcionário'}</Text>
        <View style={styles.divider} />
        <Info label="Usuário" value={user.username} />
        <Info label="Mercado" value={market?.name ?? 'Não identificado'} />
        <Info label="Localização" value={market?.city ?? 'Não informada'} />
        <Info label="Nível de acesso" value={user.role === 'ADMIN' ? 'Acesso completo' : 'Acesso operacional'} />
      </View>
      <View style={styles.buttons}>
        <PrimaryButton label="Voltar ao painel" onPress={onBack} variant="outline" />
        <PrimaryButton label="Sair da conta" onPress={onLogout} variant="danger" />
      </View>
      <Text style={styles.version}>LoteCerto · versão acadêmica 1.0.0</Text>
    </View>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background, padding: 18 },
  card: { alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.large, borderWidth: 1, borderColor: colors.border, padding: 22 },
  avatar: { width: 82, height: 82, borderRadius: 41, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.white, fontSize: 24, fontWeight: '900' },
  name: { color: colors.text, fontSize: 21, fontWeight: '900', marginTop: 13 },
  role: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 4 },
  divider: { width: '100%', height: 1, backgroundColor: colors.border, marginVertical: 20 },
  info: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  infoLabel: { color: colors.textMuted, fontSize: 12 },
  infoValue: { color: colors.text, fontSize: 12, fontWeight: '800' },
  buttons: { gap: 10, marginTop: 18 },
  version: { textAlign: 'center', color: colors.textMuted, fontSize: 10, marginTop: 24 },
});
