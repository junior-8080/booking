import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useConfirm } from '@/components/confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast-provider';
import { Brand, Spacing } from '@/constants/theme';
import { createPaymentSource, deletePaymentSource, updatePaymentSource } from '@/features/payment-sources/api';
import {
  PAYMENT_SOURCE_DETAIL_FIELDS,
  PAYMENT_SOURCE_TYPES,
  PAYMENT_SOURCE_TYPE_LABELS,
  PaymentSource,
  PaymentSourceType,
} from '@/features/payment-sources/types';

interface PaymentSourceFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  source: PaymentSource | null;
}

export function PaymentSourceFormModal({ visible, onClose, onSaved, onDeleted, source }: PaymentSourceFormModalProps) {
  const [type, setType] = useState<PaymentSourceType>('MOBILE_MONEY');
  const [label, setLabel] = useState('');
  const [details, setDetails] = useState<Record<string, string>>({});
  const [instructions, setInstructions] = useState('');
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    if (!visible) return;
    setType(source?.type ?? 'MOBILE_MONEY');
    setLabel(source?.label ?? '');
    setDetails(source?.details ?? {});
    setInstructions(source?.instructions ?? '');
  }, [visible, source]);

  const detailFields = PAYMENT_SOURCE_DETAIL_FIELDS[type];

  const handleSubmit = async () => {
    if (!label.trim()) {
      toast.showToast('Enter a label for this payment source.', 'error');
      return;
    }

    const payload = {
      type,
      label: label.trim(),
      details,
      instructions: instructions.trim() || undefined,
    };

    setSaving(true);
    try {
      if (source) await updatePaymentSource(source.id, payload);
      else await createPaymentSource(payload);
      toast.showToast(source ? 'Payment source updated.' : 'Payment source added.');
      onSaved();
    } catch (err) {
      toast.showToast(err instanceof Error ? err.message : 'Something went wrong. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!source) return;
    const ok = await confirm({
      title: 'Delete payment source?',
      message: 'This payment source will be permanently removed.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    try {
      await deletePaymentSource(source.id);
      toast.showToast('Payment source deleted.');
      onDeleted();
    } catch (err) {
      toast.showToast(err instanceof Error ? err.message : 'Could not delete payment source.', 'error');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>{source ? 'Edit payment source' : 'New payment source'}</ThemedText>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={18} color={Brand.text2} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <View>
            <ThemedText type="small" style={styles.label}>Type</ThemedText>
            <View style={styles.typeGrid}>
              {PAYMENT_SOURCE_TYPES.map((t) => {
                const active = type === t;
                return (
                  <Pressable
                    key={t}
                    style={[styles.typeChip, active && styles.typeChipActive]}
                    onPress={() => { setType(t); setDetails({}); }}
                  >
                    <ThemedText type="small" style={active ? styles.typeChipLabelActive : styles.typeChipLabel}>
                      {PAYMENT_SOURCE_TYPE_LABELS[t]}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <ThemedText type="small" style={styles.label}>Label</ThemedText>
            <TextInput
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. MTN MoMo — Main"
              placeholderTextColor={Brand.text3}
              style={styles.input}
            />
          </View>

          {detailFields.length > 0 && (
            <View style={styles.detailsCard}>
              <ThemedText type="small" style={styles.detailsHeading}>Details shown to client</ThemedText>
              {detailFields.map((field) => (
                <View key={field.key}>
                  <ThemedText type="small" style={styles.label}>{field.label}</ThemedText>
                  <TextInput
                    value={details[field.key] ?? ''}
                    onChangeText={(v) => setDetails((p) => ({ ...p, [field.key]: v }))}
                    placeholder={field.label}
                    placeholderTextColor={Brand.text3}
                    style={styles.input}
                  />
                </View>
              ))}
            </View>
          )}

          <View>
            <ThemedText type="small" style={styles.label}>Client instructions (optional)</ThemedText>
            <TextInput
              value={instructions}
              onChangeText={setInstructions}
              placeholder="e.g. Include your booking code in the transfer note"
              placeholderTextColor={Brand.text3}
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={2}
            />
          </View>

          <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color="#ffffff" /> : (
              <ThemedText type="smallBold" style={styles.saveButtonLabel}>{source ? 'Save changes' : 'Add source'}</ThemedText>
            )}
          </Pressable>

          {source && (
            <Pressable style={styles.deleteButton} onPress={handleDelete}>
              <ThemedText type="smallBold" style={styles.deleteButtonLabel}>Delete payment source</ThemedText>
            </Pressable>
          )}
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Brand.border,
  },
  typeChipActive: {
    borderColor: Brand.brand,
    backgroundColor: Brand.brandTint,
  },
  typeChipLabel: {
    color: Brand.text2,
  },
  typeChipLabelActive: {
    color: Brand.brand,
    fontWeight: '600',
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
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  detailsCard: {
    backgroundColor: '#FAFAF9',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  detailsHeading: {
    color: Brand.text2,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.4,
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
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  deleteButtonLabel: {
    color: Brand.dangerFg,
  },
});
