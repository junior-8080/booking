import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { PAYMENT_SOURCE_TYPE_LABELS, PaymentSource } from '@/features/payment-sources/types';

interface PaymentSourceRowProps {
  source: PaymentSource;
  onPress: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

export function PaymentSourceRow({ source, onPress, onToggle, onDelete }: PaymentSourceRowProps) {
  const detailsSummary = Object.entries(source.details)
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
    .join(' · ') || 'No details';

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.main}>
        <View style={styles.topLine}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.label}>{source.label}</ThemedText>
          <View style={styles.typeBadge}>
            <ThemedText type="small" style={styles.typeBadgeLabel}>{PAYMENT_SOURCE_TYPE_LABELS[source.type]}</ThemedText>
          </View>
          {!source.is_active && (
            <View style={styles.inactiveBadge}>
              <ThemedText type="small" style={styles.inactiveLabel}>Inactive</ThemedText>
            </View>
          )}
        </View>
        <ThemedText type="small" numberOfLines={1} style={styles.details}>{detailsSummary}</ThemedText>
      </View>
      <View style={styles.actions}>
        <Pressable style={styles.actionButton} onPress={(e) => { e.stopPropagation(); onToggle(); }} hitSlop={8}>
          <Feather name={source.is_active ? 'eye-off' : 'eye'} size={16} color={Brand.text2} />
        </Pressable>
        <Pressable style={styles.actionButton} onPress={(e) => { e.stopPropagation(); onDelete(); }} hitSlop={8}>
          <Feather name="trash-2" size={16} color={Brand.dangerFg} />
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  main: {
    flex: 1,
    gap: 4,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  label: {
    color: Brand.text1,
  },
  typeBadge: {
    backgroundColor: '#F0F0F3',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeBadgeLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: Brand.text2,
  },
  inactiveBadge: {
    borderWidth: 1,
    borderColor: Brand.border2,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  inactiveLabel: {
    fontSize: 11,
    lineHeight: 14,
    color: Brand.text3,
  },
  details: {
    color: Brand.text3,
  },
  actions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 8,
  },
});
