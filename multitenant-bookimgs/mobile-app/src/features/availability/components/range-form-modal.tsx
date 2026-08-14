import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TimeField } from '@/components/time-field';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast-provider';
import { Brand, Spacing } from '@/constants/theme';
import { createRange, updateRange } from '@/features/availability/api';
import { RangeInput, ScheduleRange } from '@/features/availability/types';

interface RangeFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  serviceId: string;
  dayOfWeek: number;
  dayLabel: string;
  range: ScheduleRange | null;
  defaultSlotDuration: number;
}

export function RangeFormModal({ visible, onClose, onSaved, serviceId, dayOfWeek, dayLabel, range, defaultSlotDuration }: RangeFormModalProps) {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [slotDuration, setSlotDuration] = useState(String(defaultSlotDuration));
  const [capacity, setCapacity] = useState('1');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!visible) return;
    setStartTime(range?.start_time ?? '09:00');
    setEndTime(range?.end_time ?? '17:00');
    setSlotDuration(String(range?.slot_duration_minutes ?? defaultSlotDuration));
    setCapacity(String(range?.capacity ?? 1));
  }, [visible, range, defaultSlotDuration]);

  const slotDurationNum = Number(slotDuration) || 0;
  const capacityNum = Number(capacity) || 0;

  const validationError = (): string | null => {
    if (startTime >= endTime) return 'Close time must be after open time.';
    if (slotDurationNum < 5) return 'Slot duration must be at least 5 minutes.';
    if (capacityNum < 1) return 'Capacity must be at least 1.';
    return null;
  };

  const handleSubmit = async () => {
    const error = validationError();
    if (error) {
      toast.showToast(error, 'error');
      return;
    }

    const payload: RangeInput = {
      start_time: startTime,
      end_time: endTime,
      slot_duration_minutes: slotDurationNum,
      capacity: capacityNum,
    };

    setSaving(true);
    try {
      if (range) await updateRange(range.id, payload);
      else await createRange(serviceId, dayOfWeek, payload);
      toast.showToast(range ? 'Time range updated.' : 'Time range added.');
      onSaved();
    } catch (err) {
      toast.showToast(err instanceof Error ? err.message : 'Something went wrong. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>{range ? 'Edit range' : 'Add range'}</ThemedText>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={18} color={Brand.text2} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <ThemedText type="small" style={styles.dayLabel}>{dayLabel}</ThemedText>

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <TimeField label="Opens" value={startTime} onChange={setStartTime} />
            </View>
            <View style={styles.rowItem}>
              <TimeField label="Closes" value={endTime} onChange={setEndTime} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <ThemedText type="small" style={styles.label}>Seats per slot</ThemedText>
              <TextInput
                value={capacity}
                onChangeText={(v) => setCapacity(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
            <View style={styles.rowItem}>
              <ThemedText type="small" style={styles.label}>Slot length (min)</ThemedText>
              <TextInput
                value={slotDuration}
                onChangeText={(v) => setSlotDuration(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
          </View>

          <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color="#ffffff" /> : (
              <ThemedText type="smallBold" style={styles.saveButtonLabel}>{range ? 'Save changes' : 'Add range'}</ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  headerTitle: {
    fontSize: 18,
    color: Brand.text1,
  },
  closeButton: {
    backgroundColor: '#F0F0F3',
    padding: 8,
    borderRadius: 8,
  },
  form: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  dayLabel: {
    color: Brand.text3,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rowItem: {
    flex: 1,
  },
  label: {
    color: Brand.text2,
    marginBottom: 6,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  input: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 15,
    color: Brand.text1,
  },
  saveButton: {
    backgroundColor: Brand.brand,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonLabel: {
    color: '#ffffff',
  },
});
