import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { ServiceRevenue } from '@/features/analytics/types';
import { formatAmount } from '@/lib/format';

interface RevenueByServiceProps {
  data: ServiceRevenue[];
  currency: string;
}

export function RevenueByService({ data, currency }: RevenueByServiceProps) {
  const maxRevenue = data[0]?.revenue ?? 1;

  return (
    <View style={styles.card}>
      <ThemedText type="smallBold" style={styles.title}>Revenue by service</ThemedText>
      <ThemedText type="small" style={styles.subtitle}>Confirmed deposits only</ThemedText>

      {data.length === 0 ? (
        <ThemedText type="small" style={styles.empty}>No confirmed payments yet.</ThemedText>
      ) : (
        <View style={styles.list}>
          {data.map((item, i) => (
            <View key={i}>
              <View style={styles.row}>
                <ThemedText type="small" numberOfLines={1} style={styles.serviceName}>{item.service_name}</ThemedText>
                <ThemedText type="smallBold" style={styles.revenue}>{formatAmount(item.revenue, currency)}</ThemedText>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${(item.revenue / maxRevenue) * 100}%` }]} />
              </View>
              <ThemedText type="small" style={styles.count}>{item.count} booking{item.count !== 1 ? 's' : ''}</ThemedText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: '#ffffff',
    padding: Spacing.four,
  },
  title: {
    color: Brand.text1,
  },
  subtitle: {
    color: Brand.text3,
    marginBottom: Spacing.four,
    marginTop: 2,
  },
  empty: {
    color: Brand.text3,
    textAlign: 'center',
    paddingVertical: Spacing.six,
  },
  list: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: Spacing.two,
  },
  serviceName: {
    flex: 1,
    color: Brand.text1,
  },
  revenue: {
    color: Brand.text1,
  },
  track: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#F0F0F3',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: Brand.brand,
    opacity: 0.85,
  },
  count: {
    color: Brand.text3,
    marginTop: 4,
  },
});
