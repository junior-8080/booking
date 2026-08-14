import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { getTenantSettings, listBrands } from '@/features/brands/api';
import { ServiceFormModal } from '@/features/services/components/service-form-modal';
import { ServiceRow } from '@/features/services/components/service-row';
import { listServices } from '@/features/services/api';
import { Service } from '@/features/services/types';

export default function ServicesScreen() {
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [editingService, setEditingService] = useState<Service | null | undefined>(undefined);

  const { data: services, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['services'],
    queryFn: () => listServices(true),
  });

  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: listBrands });
  const { data: settings } = useQuery({ queryKey: ['tenant-settings'], queryFn: getTenantSettings });

  const primaryBrand = useMemo(() => brands?.find((b) => b.is_primary) ?? brands?.[0] ?? null, [brands]);

  const visibleServices = useMemo(
    () => (services ?? []).filter((s) => showInactive || s.is_active),
    [services, showInactive],
  );
  const inactiveCount = useMemo(() => (services ?? []).filter((s) => !s.is_active).length, [services]);

  const closeModal = () => setEditingService(undefined);
  const handleMutated = () => {
    closeModal();
    queryClient.invalidateQueries({ queryKey: ['services'] });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <ThemedText type="title" style={styles.title}>Services</ThemedText>
          <Pressable style={styles.addButton} onPress={() => setEditingService(null)}>
            <Feather name="plus" size={18} color="#ffffff" />
          </Pressable>
        </View>
        {inactiveCount > 0 && (
          <Pressable onPress={() => setShowInactive((v) => !v)}>
            <ThemedText type="small" style={styles.toggleInactive}>
              {showInactive ? 'Hide inactive' : `Show inactive (${inactiveCount})`}
            </ThemedText>
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Brand.brand} />
        </View>
      ) : (
        <FlatList
          data={visibleServices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ServiceRow service={item} onPress={() => setEditingService(item)} />}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <EmptyState icon="tag" title="No services yet" message="Add your first service to start accepting bookings." />
          }
        />
      )}

      <ServiceFormModal
        visible={editingService !== undefined}
        onClose={closeModal}
        onSaved={handleMutated}
        onDeleted={handleMutated}
        service={editingService ?? null}
        brandId={primaryBrand?.id ?? null}
        defaultCurrency={settings?.default_currency ?? 'USD'}
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
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  toggleInactive: {
    color: Brand.text2,
    paddingBottom: Spacing.two,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
