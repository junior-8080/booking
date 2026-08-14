import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <View style={styles.card}>
      <ThemedText type="small" style={styles.label}>{label}</ThemedText>
      <ThemedText type="title" style={styles.value}>{value}</ThemedText>
      <ThemedText type="small" style={styles.sub}>{sub}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: '#ffffff',
    padding: Spacing.three,
    gap: 4,
  },
  label: {
    color: Brand.text3,
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  value: {
    color: Brand.text1,
    fontSize: 24,
    lineHeight: 28,
  },
  sub: {
    color: Brand.text3,
  },
});
