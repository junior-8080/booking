import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useConfirm } from '@/components/confirm-dialog';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast-provider';
import { Brand, Spacing } from '@/constants/theme';
import { createService, deleteService, updateService } from '@/features/services/api';
import { DepositType, Service } from '@/features/services/types';
import { formatAmount } from '@/lib/format';
import { pickImage, uploadImage, type PickedImage } from '@/lib/upload';

interface ServiceFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  service: Service | null;
  brandId: string | null;
  defaultCurrency: string;
}

interface FormState {
  name: string;
  description: string;
  imageUrl: string;
  durationMinutes: string;
  priceAmount: string;
  priceCurrency: string;
  depositType: DepositType;
  depositValue: string;
  isActive: boolean;
}

function emptyForm(defaultCurrency: string): FormState {
  return {
    name: '',
    description: '',
    imageUrl: '',
    durationMinutes: '30',
    priceAmount: '',
    priceCurrency: defaultCurrency,
    depositType: 'PERCENTAGE',
    depositValue: '30',
    isActive: true,
  };
}

function formFromService(service: Service): FormState {
  return {
    name: service.name,
    description: service.description ?? '',
    imageUrl: service.image_url ?? '',
    durationMinutes: String(service.duration_minutes),
    priceAmount: String(service.price_amount / 100),
    priceCurrency: service.price_currency,
    depositType: service.deposit_type,
    depositValue: String(service.deposit_type === 'FIXED' ? service.deposit_value / 100 : service.deposit_value),
    isActive: service.is_active,
  };
}

export function ServiceFormModal({ visible, onClose, onSaved, onDeleted, service, brandId, defaultCurrency }: ServiceFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm(defaultCurrency));
  const [pendingImage, setPendingImage] = useState<PickedImage | null>(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    if (!visible) return;
    setForm(service ? formFromService(service) : emptyForm(defaultCurrency));
    setPendingImage(null);
  }, [visible, service, defaultCurrency]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((p) => ({ ...p, [key]: value }));

  const priceAmountNum = Number(form.priceAmount) || 0;
  const durationNum = Number(form.durationMinutes) || 0;
  const depositValueNum = Number(form.depositValue) || 0;

  const validationError = (): string | null => {
    if (!form.name.trim()) return 'Enter a service name.';
    if (priceAmountNum < 0) return 'Price must be zero or more.';
    if (durationNum < 1) return 'Duration must be at least 1 minute.';
    if (form.priceCurrency.trim().length !== 3) return 'Currency must be a 3-letter code, e.g. USD.';
    if (form.depositType === 'PERCENTAGE' && (depositValueNum < 1 || depositValueNum > 100)) {
      return 'Deposit percentage must be between 1 and 100.';
    }
    if (form.depositType === 'FIXED' && depositValueNum < 0) return 'Deposit amount must be zero or more.';
    return null;
  };

  const handlePickImage = async () => {
    const image = await pickImage();
    if (image) setPendingImage(image);
  };

  const handleSubmit = async () => {
    const error = validationError();
    if (error) {
      toast.showToast(error, 'error');
      return;
    }
    if (!service && !brandId) {
      toast.showToast('No brand found for this business yet.', 'error');
      return;
    }

    setSaving(true);
    try {
      let imageUrl = form.imageUrl || null;
      if (pendingImage) {
        imageUrl = await uploadImage(pendingImage, 'services');
      }

      const payload = {
        brand_id: service?.brand_id ?? (brandId as string),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        image_url: imageUrl,
        duration_minutes: durationNum,
        price_amount: Math.round(priceAmountNum * 100),
        price_currency: form.priceCurrency.trim().toUpperCase(),
        deposit_type: form.depositType,
        deposit_value: form.depositType === 'FIXED' ? Math.round(depositValueNum * 100) : depositValueNum,
        is_active: form.isActive,
      };

      if (service) await updateService(service.id, payload);
      else await createService(payload);

      toast.showToast(service ? 'Service updated.' : 'Service created.');
      onSaved();
    } catch (err) {
      toast.showToast(err instanceof Error ? err.message : 'Something went wrong. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!service) return;
    const ok = await confirm({
      title: 'Delete service',
      message: `"${service.name}" will be hidden and marked inactive — it won't be permanently removed, so past bookings stay intact.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    try {
      await deleteService(service.id);
      toast.showToast('Service deleted.');
      onDeleted();
    } catch (err) {
      toast.showToast(err instanceof Error ? err.message : 'Could not delete service. Please try again.', 'error');
    }
  };

  const previewUri = pendingImage?.uri || form.imageUrl || null;
  const depositPreview = priceAmountNum > 0 && depositValueNum > 0
    ? form.depositType === 'PERCENTAGE'
      ? formatAmount(Math.round(priceAmountNum * 100 * depositValueNum / 100), form.priceCurrency)
      : formatAmount(Math.round(depositValueNum * 100), form.priceCurrency)
    : null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.headerTitle}>{service ? 'Edit service' : 'New service'}</ThemedText>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={18} color={Brand.text2} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <View>
            <ThemedText type="small" style={styles.label}>Service name</ThemedText>
            <TextInput
              value={form.name}
              onChangeText={(v) => set('name', v)}
              placeholder="e.g. Full Set Acrylic"
              style={styles.input}
              placeholderTextColor={Brand.text3}
            />
          </View>

          <View>
            <ThemedText type="small" style={styles.label}>Description (optional)</ThemedText>
            <TextInput
              value={form.description}
              onChangeText={(v) => set('description', v)}
              placeholder="Short description shown to clients"
              style={[styles.input, styles.textArea]}
              placeholderTextColor={Brand.text3}
              multiline
              numberOfLines={3}
            />
          </View>

          <View>
            <ThemedText type="small" style={styles.label}>Photo (optional)</ThemedText>
            <Pressable style={styles.photoPicker} onPress={handlePickImage}>
              {previewUri ? (
                <Image source={{ uri: previewUri }} style={styles.photoPreview} contentFit="cover" />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Feather name="image" size={20} color={Brand.text3} />
                  <ThemedText type="small" style={styles.photoPlaceholderLabel}>Add a photo — shown on your booking page</ThemedText>
                </View>
              )}
            </Pressable>
            {previewUri && (
              <Pressable onPress={() => { setPendingImage(null); set('imageUrl', ''); }}>
                <ThemedText type="small" style={styles.removePhoto}>Remove photo</ThemedText>
              </Pressable>
            )}
          </View>

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <ThemedText type="small" style={styles.label}>Duration (min)</ThemedText>
              <TextInput
                value={form.durationMinutes}
                onChangeText={(v) => set('durationMinutes', v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
            <View style={styles.rowItem}>
              <ThemedText type="small" style={styles.label}>Price</ThemedText>
              <TextInput
                value={form.priceAmount}
                onChangeText={(v) => set('priceAmount', v.replace(/[^0-9.]/g, ''))}
                keyboardType="decimal-pad"
                placeholder="0.00"
                style={styles.input}
                placeholderTextColor={Brand.text3}
              />
            </View>
            <View style={[styles.rowItem, { flex: 0.6 }]}>
              <ThemedText type="small" style={styles.label}>Currency</ThemedText>
              <TextInput
                value={form.priceCurrency}
                onChangeText={(v) => set('priceCurrency', v.toUpperCase())}
                maxLength={3}
                autoCapitalize="characters"
                style={[styles.input, styles.currencyInput]}
              />
            </View>
          </View>

          <View>
            <ThemedText type="small" style={styles.label}>Deposit type</ThemedText>
            <View style={styles.segmented}>
              {(['PERCENTAGE', 'FIXED'] as const).map((type) => {
                const active = form.depositType === type;
                return (
                  <Pressable
                    key={type}
                    style={[styles.segment, active && styles.segmentActive]}
                    onPress={() => set('depositType', type)}
                  >
                    <ThemedText type="smallBold" style={active ? styles.segmentLabelActive : styles.segmentLabel}>
                      {type === 'PERCENTAGE' ? '% of price' : 'Fixed amount'}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <ThemedText type="small" style={styles.label}>
              {form.depositType === 'PERCENTAGE' ? 'Deposit percentage' : `Deposit amount (${form.priceCurrency})`}
            </ThemedText>
            <TextInput
              value={form.depositValue}
              onChangeText={(v) => set('depositValue', v.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            {depositPreview && (
              <ThemedText type="small" style={styles.depositPreview}>
                Client pays <ThemedText type="smallBold" style={styles.depositPreviewAmount}>{depositPreview}</ThemedText> as deposit
              </ThemedText>
            )}
          </View>

          {service && (
            <View style={styles.activeRow}>
              <ThemedText style={styles.activeLabel}>
                {form.isActive ? 'Active — visible to clients' : 'Inactive — hidden from booking'}
              </ThemedText>
              <Switch
                value={form.isActive}
                onValueChange={(v) => set('isActive', v)}
                trackColor={{ true: Brand.brand, false: Brand.border }}
              />
            </View>
          )}

          <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSubmit} disabled={saving}>
            {saving ? <ActivityIndicator color="#ffffff" /> : (
              <ThemedText type="smallBold" style={styles.saveButtonLabel}>{service ? 'Save changes' : 'Create service'}</ThemedText>
            )}
          </Pressable>

          {service && (
            <Pressable style={styles.deleteButton} onPress={handleDelete}>
              <ThemedText type="smallBold" style={styles.deleteButtonLabel}>Delete service</ThemedText>
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
    minHeight: 70,
    textAlignVertical: 'top',
  },
  photoPicker: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0F0F3',
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Brand.border2,
  },
  photoPlaceholderLabel: {
    color: Brand.text3,
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
  removePhoto: {
    color: Brand.dangerFg,
    marginTop: 6,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  rowItem: {
    flex: 1,
  },
  currencyInput: {
    textAlign: 'center',
    fontWeight: '700',
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
  depositPreview: {
    marginTop: 8,
    color: Brand.text3,
  },
  depositPreviewAmount: {
    color: Brand.brand,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeLabel: {
    color: Brand.text1,
    flex: 1,
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
