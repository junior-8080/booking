import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { BookingsTimePoint, GroupBy } from '@/features/analytics/types';

const GROUP_OPTIONS: GroupBy[] = ['day', 'week', 'month'];
const CHART_HEIGHT = 140;

interface BookingsChartProps {
  data: BookingsTimePoint[];
  groupBy: GroupBy;
  onGroupByChange: (value: GroupBy) => void;
}

export function BookingsChart({ data, groupBy, onGroupByChange }: BookingsChartProps) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <ThemedText type="smallBold" style={styles.title}>Bookings over time</ThemedText>
          <ThemedText type="small" style={styles.subtitle}>New bookings per period</ThemedText>
        </View>
        <View style={styles.segmented}>
          {GROUP_OPTIONS.map((opt) => {
            const active = opt === groupBy;
            return (
              <Pressable key={opt} style={[styles.segment, active && styles.segmentActive]} onPress={() => onGroupByChange(opt)}>
                <ThemedText type="small" style={active ? styles.segmentLabelActive : styles.segmentLabel}>
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {data.length === 0 ? (
        <ThemedText type="small" style={styles.empty}>No data for this period.</ThemedText>
      ) : (
        <View style={styles.chart}>
          {data.map((point, i) => {
            const height = Math.max(3, (point.count / maxCount) * CHART_HEIGHT);
            return <View key={i} style={[styles.bar, { height }]} />;
          })}
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.four,
    gap: Spacing.two,
  },
  title: {
    color: Brand.text1,
  },
  subtitle: {
    color: Brand.text3,
    marginTop: 2,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F3',
    borderRadius: 8,
    padding: 3,
    gap: 2,
  },
  segment: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: '#ffffff',
  },
  segmentLabel: {
    color: Brand.text2,
    fontSize: 12,
  },
  segmentLabelActive: {
    color: Brand.text1,
    fontSize: 12,
    fontWeight: '600',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: CHART_HEIGHT,
  },
  bar: {
    flex: 1,
    backgroundColor: Brand.brand,
    borderRadius: 3,
    opacity: 0.85,
    minWidth: 2,
  },
  empty: {
    color: Brand.text3,
    textAlign: 'center',
    paddingVertical: Spacing.six,
  },
});
