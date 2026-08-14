import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { registerPushToken } from '@/features/notifications/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Runs once per authenticated session — requests permission, resolves the
// Expo push token, and registers it with the backend so this device can
// receive tenant alerts (new booking, proof submitted, booking expired).
export function usePushNotificationRegistration(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    if (!Device.isDevice) return; // push tokens aren't available on simulators/emulators

    (async () => {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        console.warn('[push] no EAS projectId configured — skipping push token registration');
        return;
      }

      const { status: existing } = await Notifications.getPermissionsAsync();
      let status = existing;
      if (status !== 'granted') {
        const requested = await Notifications.requestPermissionsAsync();
        status = requested.status;
      }
      if (status !== 'granted') return;

      const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      await registerPushToken(token, platform).catch((err) => {
        console.warn('[push] failed to register token with backend', err);
      });
    })();
  }, [enabled]);
}
