import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { getBillingStatus } from '@/features/billing/api';
import { usePushNotificationRegistration } from '@/features/notifications/register';
import { useNotificationRouter } from '@/features/notifications/use-notification-router';

export default function AppLayout() {
  const { data, isLoading } = useQuery({
    queryKey: ['billing-status'],
    queryFn: getBillingStatus,
  });

  usePushNotificationRegistration(!isLoading);
  useNotificationRouter();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  // Matches DashboardShell's redirect-to-billing guard on web — a tenant
  // that needs payment cannot reach any other tab until it's resolved.
  // Billing is the only unprotected sibling, so Stack.Protected redirects
  // there automatically instead of us managing the redirect by hand.
  const canEnterApp = !data?.needs_payment;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={canEnterApp}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="bookings/[id]" options={{ headerShown: true, title: 'Booking' }} />
        <Stack.Screen name="more/customers" options={{ headerShown: true, title: 'Customers' }} />
        <Stack.Screen name="more/analytics" options={{ headerShown: true, title: 'Analytics' }} />
        <Stack.Screen name="more/settings" options={{ headerShown: true, title: 'Settings' }} />
      </Stack.Protected>
      <Stack.Screen name="more/billing" options={{ headerShown: true, title: 'Billing' }} />
    </Stack>
  );
}
