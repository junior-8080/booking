import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { Brand, Spacing } from '@/constants/theme';
import { getTenantSettings } from '@/features/brands/api';
import { listCustomers } from '@/features/customers/api';
import { CustomerHistoryModal } from '@/features/customers/components/customer-history-modal';
import { CustomerRow } from '@/features/customers/components/customer-row';
import { Customer } from '@/features/customers/types';

const SEARCH_DEBOUNCE_MS = 380;

export default function CustomersScreen() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const { data: customers, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => listCustomers(search || undefined),
  });

  const { data: settings } = useQuery({ queryKey: ['tenant-settings'], queryFn: getTenantSettings });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color={Brand.text3} style={styles.searchIcon} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search by name, phone, or email…"
          placeholderTextColor={Brand.text3}
          style={styles.searchInput}
        />
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Brand.brand} />
        </View>
      ) : (
        <FlatList
          data={customers ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CustomerRow customer={item} onPress={() => setSelectedCustomer(item)} />}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <EmptyState icon="users" title="No customers found" message={search ? 'Try a different search.' : 'Customers appear here once they book.'} />
          }
        />
      )}

      <CustomerHistoryModal
        visible={selectedCustomer !== null}
        onClose={() => setSelectedCustomer(null)}
        customer={selectedCustomer}
        tenantTimezone={settings?.timezone}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  searchWrap: {
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.three,
  },
  searchIcon: {
    position: 'absolute',
    left: 12,
    top: 13,
    zIndex: 1,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 10,
    paddingLeft: 36,
    paddingRight: 13,
    paddingVertical: 10,
    fontSize: 15,
    color: Brand.text1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
