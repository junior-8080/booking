import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { useConfirm } from '@/components/confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast-provider';
import { Brand, Spacing } from '@/constants/theme';
import { clearDay, createRange, deleteRange } from '@/features/availability/api';
import { ScheduleRange } from '@/features/availability/types';

interface DayCardProps {
  dayLabel: string;
  dayIndex: number;
  ranges: ScheduleRange[];
  serviceId: string;
  defaultSlotDuration: number;
  onChanged: () => void;
  onAddRange: () => void;
  onEditRange: (range: ScheduleRange) => void;
}

export function DayCard({ dayLabel, dayIndex, ranges, serviceId, defaultSlotDuration, onChanged, onAddRange, onEditRange }: DayCardProps) {
  const active = ranges.length > 0;
  const confirm = useConfirm();
  const toast = useToast();

  const handleToggle = async (next: boolean) => {
    if (!next) {
      const ok = await confirm({
        title: `Close ${dayLabel}?`,
        message: `This removes all ${ranges.length} time range${ranges.length !== 1 ? 's' : ''} for ${dayLabel}. Existing bookings are not affected.`,
        confirmLabel: 'Close day',
        destructive: true,
      });
      if (!ok) return;
      try {
        await clearDay(serviceId, dayIndex);
        toast.showToast(`${dayLabel} closed.`);
        onChanged();
      } catch (err) {
        toast.showToast(err instanceof Error ? err.message : 'Could not update hours.', 'error');
      }
      return;
    }

    try {
      await createRange(serviceId, dayIndex, {
        start_time: '09:00',
        end_time: '17:00',
        slot_duration_minutes: defaultSlotDuration,
        capacity: 1,
      });
      onChanged();
    } catch (err) {
      toast.showToast(err instanceof Error ? err.message : 'Could not update hours.', 'error');
    }
  };

  const handleDeleteRange = async (range: ScheduleRange) => {
    const ok = await confirm({
      title: 'Remove time range?',
      message: `Remove ${range.start_time}–${range.end_time} on ${dayLabel}? Existing bookings are not affected.`,
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteRange(range.id);
      toast.showToast('Time range removed.');
      onChanged();
    } catch (err) {
      toast.showToast(err instanceof Error ? err.message : 'Could not remove time range.', 'error');
    }
  };

  return (
    <View style={[styles.card, !active && styles.cardClosed]}>
      <View style={styles.headerRow}>
        <Switch value={active} onValueChange={handleToggle} trackColor={{ true: Brand.brand, false: Brand.border }} />
        <ThemedText type="smallBold" style={[styles.dayLabel, !active && styles.dayLabelClosed]}>{dayLabel}</ThemedText>
        {active ? (
          <Pressable style={styles.addButton} onPress={onAddRange}>
            <Feather name="plus" size={14} color={Brand.brand} />
            <ThemedText type="small" style={styles.addLabel}>Add range</ThemedText>
          </Pressable>
        ) : (
          <ThemedText type="small" style={styles.closedLabel}>Closed</ThemedText>
        )}
      </View>

      {active && (
        <View style={styles.ranges}>
          {ranges.map((range) => (
            <Pressable key={range.id} style={styles.rangeRow} onPress={() => onEditRange(range)}>
              <View style={styles.rangeMain}>
                <ThemedText type="smallBold" style={styles.rangeTime}>{range.start_time} – {range.end_time}</ThemedText>
                <ThemedText type="small" style={styles.rangeMeta}>
                  {range.capacity} per slot · {range.slot_duration_minutes} min
                </ThemedText>
              </View>
              <Pressable
                style={styles.deleteButton}
                onPress={(e) => { e.stopPropagation(); handleDeleteRange(range); }}
                hitSlop={8}
              >
                <Feather name="trash-2" size={14} color={Brand.dangerFg} />
              </Pressable>
            </Pressable>
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
    overflow: 'hidden',
  },
  cardClosed: {
    backgroundColor: '#FAFAF9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  dayLabel: {
    flex: 1,
    color: Brand.text1,
  },
  dayLabelClosed: {
    color: Brand.text3,
  },
  closedLabel: {
    color: Brand.text3,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Brand.border,
  },
  addLabel: {
    color: Brand.brand,
  },
  ranges: {
    borderTopWidth: 1,
    borderTopColor: Brand.border,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.two,
    borderRadius: 8,
    backgroundColor: '#FAFAF9',
  },
  rangeMain: {
    flex: 1,
    gap: 2,
  },
  rangeTime: {
    color: Brand.text1,
  },
  rangeMeta: {
    color: Brand.text3,
  },
  deleteButton: {
    padding: 8,
  },
});
