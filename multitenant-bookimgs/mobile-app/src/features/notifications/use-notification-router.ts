import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

// Tapping a tenant push (new booking / proof submitted / expired) should
// land directly on that booking, not just open the app.
export function useNotificationRouter(): void {
  const router = useRouter();

  useEffect(() => {
    const openBookingFromData = (data: Record<string, unknown> | undefined) => {
      const bookingId = data?.['bookingId'];
      if (typeof bookingId === 'string') {
        router.push(`/bookings/${bookingId}`);
      }
    };

    // Cold start — app was launched by tapping a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openBookingFromData(response.notification.request.content.data);
    });

    // Warm/background — app was already running
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openBookingFromData(response.notification.request.content.data);
    });

    return () => subscription.remove();
  }, [router]);
}
