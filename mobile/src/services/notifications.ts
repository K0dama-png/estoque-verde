import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

interface StockAlertInput {
  marketName: string;
  lowStockCount: number;
  expiringBatchCount: number;
}

export async function notifyStockAlerts({ marketName, lowStockCount, expiringBatchCount }: StockAlertInput) {
  if (Platform.OS === 'web' || (lowStockCount === 0 && expiringBatchCount === 0)) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('estoque-alertas', {
      name: 'Alertas de estoque e validade',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#16794A',
    });
  }

  const currentPermission = await Notifications.getPermissionsAsync();
  const permission = currentPermission.granted
    ? currentPermission
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted) return false;

  const parts: string[] = [];
  if (lowStockCount > 0) parts.push(`${lowStockCount} produto${lowStockCount === 1 ? '' : 's'} com estoque baixo`);
  if (expiringBatchCount > 0) parts.push(`${expiringBatchCount} lote${expiringBatchCount === 1 ? '' : 's'} vencendo em até 30 dias`);

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Atenção ao estoque - ${marketName}`,
      body: parts.join(' e '),
      data: { destination: 'dashboard' },
      sound: 'default',
    },
    trigger: null,
  });
  return true;
}
