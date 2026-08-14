import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { Customer } from '@/features/customers/types';

interface CustomerRowProps {
  customer: Customer;
  onPress: () => void;
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export function CustomerRow({ customer, onPress }: CustomerRowProps) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.avatar}>
        <ThemedText type="smallBold" style={styles.avatarLabel}>{initials(customer.full_name)}</ThemedText>
      </View>
      <View style={styles.main}>
        <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>{customer.full_name}</ThemedText>
        <ThemedText type="small" numberOfLines={1} style={styles.meta}>
          {customer.phone}{customer.email ? ` · ${customer.email}` : ''}
        </ThemedText>
      </View>
      <Feather name="chevron-right" size={18} color={Brand.text3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLabel: {
    color: Brand.text2,
  },
  main: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: Brand.text1,
  },
  meta: {
    color: Brand.text2,
  },
});
