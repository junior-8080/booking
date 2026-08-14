import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookingLinkBar } from '@/components/booking-link-bar';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { getTenantSettings } from '@/features/brands/api';
import { BookingRow } from '@/features/bookings/components/booking-row';
import { listBookings } from '@/features/bookings/api';
import { BookingStatus } from '@/features/bookings/types';

const FILTERS: Array<{ label: string; value: BookingStatus | undefined }> = [
  { label: 'All', value: undefined },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Booked', value: 'BOOKED' },
  { label: 'Rejected', value: 'REJECTED' },
];

export default function BookingsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<BookingStatus | undefined>(undefined);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['bookings', filter],
    queryFn: () => listBookings(filter),
  });

  const { data: settings } = useQuery({ queryKey: ['tenant-settings'], queryFn: getTenantSettings });

  // Tab screens stay mounted once visited (react-navigation doesn't unmount
  // on blur), so the query above never re-runs on its own when a new booking
  // comes in elsewhere — refetch every time this tab regains focus instead.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Bookings</ThemedText>
      </View>

      <BookingLinkBar subdomain={settings?.subdomain} />

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <Pressable
              key={f.label}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(f.value)}
            >
              <ThemedText type="small" style={active ? styles.filterLabelActive : styles.filterLabel}>
                {f.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Brand.brand} />
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingRow booking={item} onPress={() => router.push(`/bookings/${item.id}`)} />
          )}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <EmptyState icon="calendar" title="No bookings yet" message="New bookings will show up here as soon as a client books a slot." />
          }
        />
      )}
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
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    color: Brand.text1,
  },
  filters: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F0F0F3',
  },
  filterChipActive: {
    backgroundColor: Brand.brand,
  },
  filterLabel: {
    color: Brand.text2,
  },
  filterLabelActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
