import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBadge } from '@/components/status-badge';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast-provider';
import { ZoomableImage } from '@/components/zoomable-image';
import { Brand, Spacing } from '@/constants/theme';
import { confirmBooking, getBooking, rejectBooking } from '@/features/bookings/api';
import { formatSlot } from '@/features/bookings/format-slot';
import { formatAmount } from '@/lib/format';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [rejectionReason, setRejectionReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => getBooking(id),
    enabled: !!id,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['booking', id] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  };

  const confirmMutation = useMutation({
    mutationFn: (paymentId: string) => confirmBooking(id, paymentId),
    onSuccess: () => {
      showToast('Booking confirmed');
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to confirm', 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: (paymentId: string) => rejectBooking(id, paymentId, rejectionReason.trim()),
    onSuccess: () => {
      showToast('Booking rejected');
      setShowReject(false);
      setRejectionReason('');
      invalidate();
    },
    onError: (err) => showToast(err instanceof Error ? err.message : 'Failed to reject', 'error'),
  });

  if (isLoading || !booking) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Brand.brand} />
      </View>
    );
  }

  const pendingPayment = booking.payments.find((p) => p.status === 'AWAITING_REVIEW');
  const canAct = booking.status === 'PENDING' && !!pendingPayment;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <ThemedText type="subtitle" style={styles.customerName}>{booking.customer.full_name}</ThemedText>
          <StatusBadge status={booking.status} />
        </View>
        <ThemedText type="small" style={styles.ref}>{booking.reference_code}</ThemedText>

        <Section title="Details">
          <Row label="Service" value={booking.service?.name ?? '—'} />
          <Row label="Time slot" value={formatSlot(booking.slot_start)} />
          <Row label="Deposit due" value={formatAmount(booking.required_amount, booking.required_currency)} />
          <Row label="Phone" value={booking.customer.phone} />
          {booking.customer.email && <Row label="Email" value={booking.customer.email} />}
        </Section>

        {booking.client_notes && (
          <Section title="Client notes">
            <ThemedText style={styles.notes}>{booking.client_notes}</ThemedText>
          </Section>
        )}

        {booking.status === 'REJECTED' && booking.rejection_reason && (
          <Section title="Rejection reason">
            <ThemedText style={styles.notes}>{booking.rejection_reason}</ThemedText>
          </Section>
        )}

        {booking.payments.length > 0 && (
          <Section title="Payment proof">
            {booking.payments.map((payment) => (
              <View key={payment.id} style={styles.paymentCard}>
                <Row label="Amount" value={formatAmount(payment.amount, payment.currency)} />
                <Row label="Method" value={payment.payment_source?.label ?? '—'} />
                {payment.client_reference && <Row label="Client reference" value={payment.client_reference} />}
                <Row label="Status" value={payment.status.replace('_', ' ')} />
                {payment.proof_url && (
                  <Pressable onPress={() => setProofPreviewUrl(payment.proof_url)}>
                    <Image source={{ uri: payment.proof_url }} style={styles.proofThumb} contentFit="cover" />
                  </Pressable>
                )}
              </View>
            ))}
          </Section>
        )}

        {canAct && pendingPayment && (
          <Section title="Review">
            {!showReject ? (
              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.actionButton, styles.confirmButton]}
                  onPress={() => confirmMutation.mutate(pendingPayment.id)}
                  disabled={confirmMutation.isPending}
                >
                  <ThemedText type="smallBold" style={styles.actionLabel}>
                    {confirmMutation.isPending ? 'Confirming…' : 'Confirm'}
                  </ThemedText>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.rejectButton]} onPress={() => setShowReject(true)}>
                  <ThemedText type="smallBold" style={styles.rejectLabel}>Reject</ThemedText>
                </Pressable>
              </View>
            ) : (
              <View style={styles.rejectForm}>
                <TextInput
                  style={styles.reasonInput}
                  placeholder="Reason for rejection (required)"
                  placeholderTextColor={Brand.text3}
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                />
                <View style={styles.actionRow}>
                  <Pressable style={[styles.actionButton, styles.cancelButton]} onPress={() => setShowReject(false)}>
                    <ThemedText type="smallBold">Cancel</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.actionButton, styles.rejectButton, !rejectionReason.trim() && styles.actionDisabled]}
                    disabled={!rejectionReason.trim() || rejectMutation.isPending}
                    onPress={() => rejectMutation.mutate(pendingPayment.id)}
                  >
                    <ThemedText type="smallBold" style={styles.rejectLabel}>
                      {rejectMutation.isPending ? 'Rejecting…' : 'Confirm reject'}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
          </Section>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!proofPreviewUrl} transparent animationType="fade" onRequestClose={() => setProofPreviewUrl(null)}>
        <View style={styles.previewBackdrop}>
          {proofPreviewUrl && (
            <View style={styles.previewImageWrap}>
              <ZoomableImage uri={proofPreviewUrl} />
            </View>
          )}
          <Pressable style={styles.previewClose} onPress={() => setProofPreviewUrl(null)} hitSlop={12}>
            <ThemedText type="smallBold" style={styles.previewCloseLabel}>Close</ThemedText>
          </Pressable>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" style={styles.sectionTitle}>{title}</ThemedText>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <ThemedText type="small" style={styles.rowLabel}>{label}</ThemedText>
      <ThemedText type="small" style={styles.rowValue}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  flex: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customerName: {
    fontSize: 22,
    color: Brand.text1,
  },
  ref: {
    color: Brand.text3,
    marginBottom: Spacing.two,
  },
  section: {
    marginTop: Spacing.three,
    gap: 6,
  },
  sectionTitle: {
    color: Brand.text2,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  notes: {
    color: Brand.text1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rowLabel: {
    color: Brand.text3,
  },
  rowValue: {
    color: Brand.text1,
  },
  paymentCard: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 12,
    padding: Spacing.three,
    gap: 6,
  },
  proofThumb: {
    width: '100%',
    height: 160,
    borderRadius: 8,
    marginTop: Spacing.one,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionDisabled: {
    opacity: 0.5,
  },
  confirmButton: {
    backgroundColor: Brand.brand,
  },
  rejectButton: {
    backgroundColor: Brand.dangerBg,
    borderWidth: 1,
    borderColor: Brand.dangerFg,
  },
  cancelButton: {
    backgroundColor: '#F0F0F3',
  },
  actionLabel: {
    color: '#ffffff',
  },
  rejectLabel: {
    color: Brand.dangerFg,
  },
  rejectForm: {
    gap: Spacing.two,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 10,
    padding: Spacing.two,
    minHeight: 80,
    textAlignVertical: 'top',
    color: Brand.text1,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  previewImageWrap: {
    flex: 1,
    width: '100%',
    height: '80%',
    marginTop: '10%',
  },
  previewClose: {
    position: 'absolute',
    top: 56,
    right: Spacing.four,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  previewCloseLabel: {
    color: '#ffffff',
  },
});
