import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { StatusBadge } from '@/components/status-badge';
import { Brand, Spacing } from '@/constants/theme';
import { formatSlot } from '@/features/bookings/format-slot';
import { Booking } from '@/features/bookings/types';
import { formatAmount } from '@/lib/format';

interface BookingRowProps {
  booking: Booking;
  onPress: () => void;
}

export function BookingRow({ booking, onPress }: BookingRowProps) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.main}>
        <View style={styles.topLine}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
            {booking.customer.full_name}
          </ThemedText>
          <StatusBadge status={booking.status} />
        </View>
        <ThemedText type="small" style={styles.meta}>
          {booking.service?.name ?? 'Service'} · {formatSlot(booking.slot_start)}
        </ThemedText>
        <View style={styles.bottomLine}>
          <ThemedText type="small" style={styles.amount}>
            {formatAmount(booking.required_amount, booking.required_currency)}
          </ThemedText>
          <ThemedText type="small" style={styles.ref}>{booking.reference_code}</ThemedText>
        </View>
      </View>
      <Feather name="chevron-right" size={18} color={Brand.text3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  main: {
    flex: 1,
    gap: 4,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
    color: Brand.text1,
  },
  meta: {
    color: Brand.text2,
  },
  bottomLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  amount: {
    color: Brand.text1,
    fontWeight: '600',
  },
  ref: {
    color: Brand.text3,
  },
});
