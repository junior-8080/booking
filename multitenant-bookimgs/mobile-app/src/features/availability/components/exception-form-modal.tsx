import { Feather } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { TimeField } from '@/components/time-field';
import { useToast } from '@/components/toast-provider';
import { Brand, Spacing } from '@/constants/theme';
import { addException } from '@/features/availability/api';
import { ExceptionType } from '@/features/availability/types';

interface ExceptionFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  serviceId: string;
}

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function ExceptionFormModal({ visible, onClose, onSaved, serviceId }: ExceptionFormModalProps) {
  const [date, setDate] = useState(new Date());
  const [pickingDate, setPickingDate] = useState(false);
  const [type, setType] = useState<ExceptionType>('BLOCKED');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!visible) return;
    setDate(new Date());
    setType('BLOCKED');
    setStartTime('09:00');
    setEndTime('17:00');
    setReason('');
  }, [visible]);

  const handleDateChange = (event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS === 'android') setPickingDate(false);
    if (next && event.type !== 'dismissed') setDate(next);
  };

  const handleSubmit = async () => {
    if (type === 'CUSTOM_HOURS' && startTime >= endTime) {
      toast.showToast('Close time must be after open time.', 'error');
      return;
    }

    setSaving(true);
    try {
      await addException({
        service_id: serviceId,
        date: toDateStr(date),
        type,
        start_time: type === 'CUSTOM_HOURS' ? startTime : undefined,
        end_time: type === 'CUSTOM_HOURS' ? endTime : undefined,
        reason: reason.trim() || undefined,
      });
      toast.showToast('Exception added.');
      onSaved();
    } catch (err) {
      toast.showToast(err instanceof Error ? err.message : 'Failed to save exception.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>New exception</ThemedText>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={18} color={Brand.text2} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <View>
            <ThemedText type="small" style={styles.label}>Date</ThemedText>
            <Pressable style={styles.dateField} onPress={() => setPickingDate(true)}>
              <ThemedText style={styles.dateValue}>
                {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </ThemedText>
            </Pressable>
            {pickingDate && (
              <DateTimePicker
                mode="date"
                value={date}
                minimumDate={new Date()}
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={handleDateChange}
              />
            )}
          </View>

          <View>
            <ThemedText type="small" style={styles.label}>Type</ThemedText>
            <View style={styles.segmented}>
              {([
                { value: 'BLOCKED' as const, label: 'Closed' },
                { value: 'CUSTOM_HOURS' as const, label: 'Custom hours' },
              ]).map((opt) => {
                const active = type === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.segment, active && styles.segmentActive]}
                    onPress={() => setType(opt.value)}
                  >
                    <ThemedText type="smallBold" style={active ? styles.segmentLabelActive : styles.segmentLabel}>
                      {opt.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {type === 'CUSTOM_HOURS' && (
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <TimeField label="Opens" value={startTime} onChange={setStartTime} />
              </View>
              <View style={styles.rowItem}>
                <TimeField label="Closes" value={endTime} onChange={setEndTime} />
              </View>
            </View>
          )}

          <View>
            <ThemedText type="small" style={styles.label}>Reason (optional)</ThemedText>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. Public holiday, staff training…"
              placeholderTextColor={Brand.text3}
              style={styles.input}
            />
          </View>

          <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color="#ffffff" /> : (
              <ThemedText type="smallBold" style={styles.saveButtonLabel}>Add exception</ThemedText>
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
  label: {
    color: Brand.text2,
    marginBottom: 6,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  dateField: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  dateValue: {
    color: Brand.text1,
    fontSize: 15,
  },
  segmented: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Brand.border,
    alignItems: 'center',
  },
  segmentActive: {
    borderColor: Brand.brand,
    backgroundColor: Brand.brandTint,
  },
  segmentLabel: {
    color: Brand.text2,
  },
  segmentLabelActive: {
    color: Brand.brand,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rowItem: {
    flex: 1,
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
