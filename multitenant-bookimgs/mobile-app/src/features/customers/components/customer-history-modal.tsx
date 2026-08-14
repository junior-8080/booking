import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { formatSlot } from '@/features/bookings/format-slot';
import { getCustomerHistory } from '@/features/customers/api';
import { Customer } from '@/features/customers/types';
import { formatAmount } from '@/lib/format';

interface CustomerHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  customer: Customer | null;
  tenantTimezone?: string;
}

export function CustomerHistoryModal({ visible, onClose, customer, tenantTimezone }: CustomerHistoryModalProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['customer-history', customer?.id],
    queryFn: () => getCustomerHistory(customer!.id),
    enabled: visible && !!customer,
  });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText type="subtitle" style={styles.name}>{customer?.full_name}</ThemedText>
            <ThemedText type="small" style={styles.contact}>
              {customer?.phone}{customer?.email ? ` · ${customer.email}` : ''}
            </ThemedText>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={18} color={Brand.text2} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={Brand.brand} />
          </View>
        ) : !history || history.length === 0 ? (
          <View style={styles.loading}>
            <ThemedText type="small" style={styles.empty}>No bookings yet.</ThemedText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {history.map((booking) => (
              <View key={booking.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <ThemedText type="smallBold" style={styles.service}>{booking.service?.name ?? 'Service'}</ThemedText>
                  <StatusBadge status={booking.status} />
                </View>
                <ThemedText type="small" style={styles.slot}>{formatSlot(booking.slot_start, tenantTimezone)}</ThemedText>
                <View style={styles.cardBottom}>
                  <ThemedText type="small" style={styles.ref}>{booking.reference_code}</ThemedText>
                  <ThemedText type="smallBold" style={styles.amount}>
                    {formatAmount(booking.required_amount, booking.required_currency)}
                  </ThemedText>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 18,
    color: Brand.text1,
  },
  contact: {
    color: Brand.text3,
  },
  closeButton: {
    backgroundColor: '#F0F0F3',
    padding: 8,
    borderRadius: 8,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    color: Brand.text3,
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.three,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: '#FAFAF9',
    gap: 4,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  service: {
    color: Brand.text1,
  },
  slot: {
    color: Brand.text2,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  ref: {
    color: Brand.text3,
    fontFamily: 'monospace',
  },
  amount: {
    color: Brand.text1,
  },
});
