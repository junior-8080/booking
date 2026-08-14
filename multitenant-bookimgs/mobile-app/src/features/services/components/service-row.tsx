import { LinearGradient } from 'expo-linear-gradient';
import { ImageBackground, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { Service } from '@/features/services/types';
import { formatAmount } from '@/lib/format';

interface ServiceRowProps {
  service: Service;
  onPress: () => void;
}

export function ServiceRow({ service, onPress }: ServiceRowProps) {
  const content = (
    <>
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.75)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      {!service.is_active && (
        <View style={styles.inactiveBadge}>
          <ThemedText type="small" style={styles.inactiveLabel}>Inactive</ThemedText>
        </View>
      )}
      <View style={styles.content}>
        <ThemedText type="subtitle" numberOfLines={2} style={styles.name}>
          {service.name}
        </ThemedText>
        <ThemedText style={styles.meta}>
          {service.duration_minutes} min · {formatAmount(service.price_amount, service.price_currency)}
        </ThemedText>
        <ThemedText type="small" style={styles.deposit}>
          Deposit: {service.deposit_type === 'PERCENTAGE' ? `${service.deposit_value}%` : formatAmount(service.deposit_value, service.price_currency)}
        </ThemedText>
      </View>
    </>
  );

  if (service.image_url) {
    return (
      <Pressable onPress={onPress} style={styles.card}>
        <ImageBackground source={{ uri: service.image_url }} style={styles.image} imageStyle={styles.imageRadius}>
          {content}
        </ImageBackground>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={[styles.card, styles.image, styles.imagePlaceholder]}>
      {content}
    </Pressable>
  );
}

const CARD_HEIGHT = 220;

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.two,
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    height: CARD_HEIGHT,
    justifyContent: 'flex-end',
  },
  imageRadius: {
    borderRadius: 20,
  },
  imagePlaceholder: {
    backgroundColor: Brand.brand,
  },
  content: {
    padding: Spacing.four,
    gap: 4,
  },
  name: {
    color: '#ffffff',
    fontSize: 26,
    lineHeight: 30,
  },
  meta: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
  },
  deposit: {
    color: 'rgba(255,255,255,0.75)',
  },
  inactiveBadge: {
    position: 'absolute',
    top: Spacing.three,
    right: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  inactiveLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
});
