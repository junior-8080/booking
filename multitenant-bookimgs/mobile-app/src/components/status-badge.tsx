import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BookingStatusColor } from '@/constants/theme';

interface StatusBadgeProps {
  status: keyof typeof BookingStatusColor;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const color = BookingStatusColor[status];
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1a`, borderColor: color }]}>
      <ThemedText type="small" style={[styles.label, { color }]}>
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
});
