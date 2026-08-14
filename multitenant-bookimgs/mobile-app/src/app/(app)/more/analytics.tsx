import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, Spacing } from '@/constants/theme';
import { getBookingsOverTime, getRevenueByService, getSummary } from '@/features/analytics/api';
import { BookingsChart } from '@/features/analytics/components/bookings-chart';
import { RevenueByService } from '@/features/analytics/components/revenue-by-service';
import { StatCard } from '@/features/analytics/components/stat-card';
import { GroupBy } from '@/features/analytics/types';
import { getTenantSettings } from '@/features/brands/api';
import { formatAmount } from '@/lib/format';

export default function AnalyticsScreen() {
  const [groupBy, setGroupBy] = useState<GroupBy>('day');

  const { data: summary, isLoading: summaryLoading } = useQuery({ queryKey: ['analytics-summary'], queryFn: getSummary });
  const { data: revenue, isLoading: revenueLoading } = useQuery({ queryKey: ['analytics-revenue'], queryFn: getRevenueByService });
  const { data: settings } = useQuery({ queryKey: ['tenant-settings'], queryFn: getTenantSettings });
  const { data: timeSeries, isLoading: timeSeriesLoading } = useQuery({
    queryKey: ['analytics-bookings-over-time', groupBy],
    queryFn: () => getBookingsOverTime(groupBy),
  });

  const currency = settings?.default_currency ?? 'USD';
  const isLoading = summaryLoading || revenueLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loading}>
          <ActivityIndicator color={Brand.brand} />
        </View>
      </SafeAreaView>
    );
  }

  const sortedRevenue = [...(revenue ?? [])].sort((a, b) => b.revenue - a.revenue);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        {summary && (
          <View style={styles.statGrid}>
            <StatCard label="Total bookings" value={summary.total_bookings.toLocaleString()} sub="Last 30 days" />
            <StatCard label="Booked" value={summary.booked_bookings.toLocaleString()} sub={`of ${summary.total_bookings}`} />
            <StatCard label="Revenue collected" value={formatAmount(summary.total_revenue, currency)} sub="Confirmed deposits" />
            <StatCard label="Repeat customers" value={summary.repeat_customer_count.toLocaleString()} sub="Booked 2+ times" />
            <StatCard label="Rejection rate" value={`${(summary.rejection_rate * 100).toFixed(1)}%`} sub="of all bookings" />
          </View>
        )}

        {timeSeriesLoading ? (
          <View style={styles.chartLoading}>
            <ActivityIndicator color={Brand.brand} />
          </View>
        ) : (
          <BookingsChart data={timeSeries ?? []} groupBy={groupBy} onGroupByChange={setGroupBy} />
        )}

        <RevenueByService data={sortedRevenue} currency={currency} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  chartLoading: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border,
  },
});
