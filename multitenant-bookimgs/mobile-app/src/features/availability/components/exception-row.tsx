import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { AvailabilityException } from '@/features/availability/types';

interface ExceptionRowProps {
  exception: AvailabilityException;
  onRemove: () => void;
}

export function ExceptionRow({ exception, onRemove }: ExceptionRowProps) {
  const isBlocked = exception.type === 'BLOCKED';
  const dateLabel = new Date(`${exception.date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: isBlocked ? Brand.dangerFg : Brand.warningFg }]} />
      <View style={styles.main}>
        <View style={styles.topLine}>
          <ThemedText type="smallBold" style={styles.date}>{dateLabel}</ThemedText>
          <View style={[styles.badge, { backgroundColor: isBlocked ? Brand.dangerBg : Brand.warningBg }]}>
            <ThemedText type="small" style={[styles.badgeLabel, { color: isBlocked ? Brand.dangerFg : Brand.warningFg }]}>
              {isBlocked ? 'Closed' : 'Custom hours'}
            </ThemedText>
          </View>
        </View>
        <ThemedText type="small" style={styles.meta}>
          {!isBlocked && exception.start_time ? `${exception.start_time} – ${exception.end_time}` : null}
          {exception.reason ? (!isBlocked && exception.start_time ? `  ·  ${exception.reason}` : exception.reason) : null}
        </ThemedText>
      </View>
      <Pressable style={styles.removeButton} onPress={onRemove} hitSlop={8}>
        <Feather name="trash-2" size={16} color={Brand.text3} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: '#ffffff',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  main: {
    flex: 1,
    gap: 3,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  date: {
    color: Brand.text1,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  meta: {
    color: Brand.text3,
  },
  removeButton: {
    padding: 4,
  },
});
