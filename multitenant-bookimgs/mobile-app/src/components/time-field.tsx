import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';

interface TimeFieldProps {
  label: string;
  value: string; // "HH:mm"
  onChange: (value: string) => void;
}

function timeToDate(value: string): Date {
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

function dateToTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function TimeField({ label, value, onChange }: TimeFieldProps) {
  const [picking, setPicking] = useState(false);

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setPicking(false);
      if (event.type === 'set' && date) onChange(dateToTime(date));
      return;
    }
    if (date) onChange(dateToTime(date));
  };

  return (
    <View>
      <ThemedText type="small" style={styles.label}>{label}</ThemedText>
      <Pressable style={styles.field} onPress={() => setPicking(true)}>
        <ThemedText style={styles.value}>{value}</ThemedText>
      </Pressable>

      {picking && Platform.OS === 'android' && (
        <DateTimePicker mode="time" value={timeToDate(value)} display="default" onChange={handleChange} />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={picking} transparent animationType="fade" onRequestClose={() => setPicking(false)}>
          <Pressable style={styles.backdrop} onPress={() => setPicking(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <DateTimePicker mode="time" value={timeToDate(value)} display="spinner" onChange={handleChange} />
              <Pressable style={styles.doneButton} onPress={() => setPicking(false)}>
                <ThemedText type="smallBold" style={styles.doneLabel}>Done</ThemedText>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: Brand.text2,
    marginBottom: 6,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  field: {
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  value: {
    color: Brand.text1,
    fontSize: 15,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Spacing.four,
  },
  doneButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: Spacing.four,
    backgroundColor: Brand.brand,
    borderRadius: 10,
  },
  doneLabel: {
    color: '#ffffff',
  },
});
