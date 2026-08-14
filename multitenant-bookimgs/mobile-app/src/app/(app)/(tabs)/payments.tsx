import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useConfirm } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast-provider';
import { Brand, Spacing } from '@/constants/theme';
import { deletePaymentSource, listPaymentSources, togglePaymentSource } from '@/features/payment-sources/api';
import { PaymentSourceFormModal } from '@/features/payment-sources/components/payment-source-form-modal';
import { PaymentSourceRow } from '@/features/payment-sources/components/payment-source-row';
import { PaymentSource } from '@/features/payment-sources/types';

export default function PaymentSourcesScreen() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const [editingSource, setEditingSource] = useState<PaymentSource | null | undefined>(undefined);

  const { data: sources, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['payment-sources'],
    queryFn: listPaymentSources,
  });

  const closeModal = () => setEditingSource(undefined);
  const handleMutated = () => {
    closeModal();
    queryClient.invalidateQueries({ queryKey: ['payment-sources'] });
  };

  const handleToggle = async (source: PaymentSource) => {
    try {
      await togglePaymentSource(source.id);
      toast.showToast(source.is_active ? 'Payment source disabled.' : 'Payment source enabled.');
      queryClient.invalidateQueries({ queryKey: ['payment-sources'] });
    } catch (err) {
      toast.showToast(err instanceof Error ? err.message : 'Could not update payment source.', 'error');
    }
  };

  const handleDelete = async (source: PaymentSource) => {
    const ok = await confirm({
      title: 'Delete payment source?',
      message: 'This payment source will be permanently removed.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deletePaymentSource(source.id);
      toast.showToast('Payment source deleted.');
      queryClient.invalidateQueries({ queryKey: ['payment-sources'] });
    } catch (err) {
      toast.showToast(err instanceof Error ? err.message : 'Could not delete payment source.', 'error');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Payments</ThemedText>
        <Pressable style={styles.addButton} onPress={() => setEditingSource(null)}>
          <Feather name="plus" size={18} color="#ffffff" />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Brand.brand} />
        </View>
      ) : (
        <FlatList
          data={sources ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PaymentSourceRow
              source={item}
              onPress={() => setEditingSource(item)}
              onToggle={() => handleToggle(item)}
              onDelete={() => handleDelete(item)}
            />
          )}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <EmptyState icon="credit-card" title="No payment sources yet" message="Add a way for clients to pay their deposit." />
          }
        />
      )}

      <PaymentSourceFormModal
        visible={editingSource !== undefined}
        onClose={closeModal}
        onSaved={handleMutated}
        onDeleted={handleMutated}
        source={editingSource ?? null}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    color: Brand.text1,
  },
  addButton: {
    backgroundColor: Brand.brand,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
