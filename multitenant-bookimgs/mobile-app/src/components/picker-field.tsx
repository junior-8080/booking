import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';

interface PickerOption {
  value: string;
  label: string;
}

interface PickerFieldProps {
  label: string;
  value: string;
  options: PickerOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PickerField({ label, value, options, onChange, disabled }: PickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label ?? value;

  return (
    <View>
      <ThemedText type="small" style={styles.label}>{label}</ThemedText>
      <Pressable
        style={[styles.field, disabled && styles.fieldDisabled]}
        onPress={() => !disabled && setOpen(true)}
      >
        <ThemedText style={styles.value}>{selectedLabel}</ThemedText>
        {!disabled && <Feather name="chevron-down" size={16} color={Brand.text3} />}
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)} presentationStyle="pageSheet">
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.headerTitle}>{label}</ThemedText>
            <Pressable onPress={() => setOpen(false)} style={styles.closeButton}>
              <Feather name="x" size={18} color={Brand.text2} />
            </Pressable>
          </View>
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <Pressable
                style={styles.option}
                onPress={() => { onChange(item.value); setOpen(false); }}
              >
                <ThemedText style={styles.optionLabel}>{item.label}</ThemedText>
                {item.value === value && <Feather name="check" size={18} color={Brand.brand} />}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  fieldDisabled: {
    backgroundColor: '#FAFAF9',
  },
  value: {
    color: Brand.text1,
    fontSize: 15,
  },
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
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Brand.border,
  },
  optionLabel: {
    color: Brand.text1,
    fontSize: 15,
  },
});
