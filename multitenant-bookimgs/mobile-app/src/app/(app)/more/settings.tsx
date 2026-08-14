import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BookingLinkBar } from '@/components/booking-link-bar';
import { useConfirm } from '@/components/confirm-dialog';
import { PickerField } from '@/components/picker-field';
import { ThemedText } from '@/components/themed-text';
import { useToast } from '@/components/toast-provider';
import { Brand, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { createBrand, getTenantSettings, listBrands, listCountries, updateBrand, updateTenantSettings } from '@/features/brands/api';
import { pickImage, uploadImage, type PickedImage } from '@/lib/upload';

const WHATSAPP_REGEX = /^\+?[0-9\s-]{7,20}$/;

function tzLabel(tz: string): string {
  const city = tz.split('/').pop()?.replace(/_/g, ' ') ?? tz;
  try {
    const offset = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName')?.value;
    return offset ? `${city} (${offset})` : city;
  } catch {
    return city;
  }
}

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const confirm = useConfirm();
  const { user, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const { data: settings, isLoading: settingsLoading } = useQuery({ queryKey: ['tenant-settings'], queryFn: getTenantSettings });
  const { data: brands, isLoading: brandsLoading } = useQuery({ queryKey: ['brands'], queryFn: listBrands });
  const { data: countries, isLoading: countriesLoading } = useQuery({ queryKey: ['countries'], queryFn: listCountries });

  const brand = brands?.find((b) => b.is_primary) ?? brands?.[0] ?? null;

  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [terms, setTerms] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [pendingLogo, setPendingLogo] = useState<PickedImage | null>(null);

  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('');
  const [slotHoldMinutes, setSlotHoldMinutes] = useState('20');
  const [confirmationSlaHours, setConfirmationSlaHours] = useState('48');

  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || !settings || brandsLoading) return;
    setName(brand?.name ?? settings.name);
    setTagline(brand?.description ?? '');
    setWhatsapp(brand?.whatsapp_number ?? '');
    setTerms(brand?.terms_conditions ?? '');
    setLogoUrl(brand?.logo_url ?? null);
    setCountry(settings.country_code);
    setTimezone(settings.timezone);
    setSlotHoldMinutes(String(settings.slot_hold_minutes));
    setConfirmationSlaHours(String(settings.booking_confirmation_sla_hours));
    setInitialized(true);
  }, [initialized, settings, brand, brandsLoading]);

  const selectedCountry = countries?.find((c) => c.code === country);

  const handleCountryChange = (code: string) => {
    const next = countries?.find((c) => c.code === code);
    setCountry(code);
    if (next && !next.timezones.includes(timezone)) setTimezone(next.default_timezone);
  };

  const handlePickLogo = async () => {
    const image = await pickImage();
    if (image) setPendingLogo(image);
  };

  const handleSave = async () => {
    if (name.trim().length < 2) {
      toast.showToast('Business name must be at least 2 characters.', 'error');
      return;
    }
    if (whatsapp.trim() && !WHATSAPP_REGEX.test(whatsapp.trim())) {
      toast.showToast('Enter a valid WhatsApp number, e.g. +1 555 000 0000.', 'error');
      return;
    }

    setSaving(true);
    try {
      let nextLogoUrl = logoUrl;
      if (pendingLogo) nextLogoUrl = await uploadImage(pendingLogo, 'logos');

      const brandData = {
        name: name.trim(),
        description: tagline.trim() || undefined,
        terms_conditions: terms.trim() || undefined,
        whatsapp_number: whatsapp.trim() || null,
        logo_url: nextLogoUrl,
      };

      if (brand) await updateBrand(brand.id, brandData);
      else await createBrand({ ...brandData, is_primary: true });

      await updateTenantSettings({
        country,
        timezone,
        slot_hold_minutes: Number(slotHoldMinutes) || 0,
        booking_confirmation_sla_hours: Number(confirmationSlaHours) || 0,
      });

      setPendingLogo(null);
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      toast.showToast('Settings saved.');
    } catch (err) {
      toast.showToast(err instanceof Error ? err.message : 'Failed to save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const isOwner = user?.role === 'TENANT_OWNER';
    const ok = await confirm({
      title: 'Delete account',
      message: isOwner
        ? 'This permanently deletes your login and suspends this business — your public booking page will stop accepting bookings and no one will be able to sign in. Existing booking and customer records are kept for your records but not accessible. This cannot be undone.'
        : 'This permanently deletes your login. You will no longer be able to sign in, and your name is removed from your account. This cannot be undone.',
      confirmLabel: 'Delete account',
      destructive: true,
    });
    if (!ok) return;

    setDeleting(true);
    try {
      await deleteAccount();
    } catch (err) {
      toast.showToast(err instanceof Error ? err.message : 'Could not delete account. Please try again.', 'error');
      setDeleting(false);
    }
  };

  const isLoading = settingsLoading || brandsLoading || countriesLoading || !initialized;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loading}>
          <ActivityIndicator color={Brand.brand} />
        </View>
      </SafeAreaView>
    );
  }

  const logoPreview = pendingLogo?.uri ?? logoUrl;
  const countryOptions = (countries ?? []).map((c) => ({ value: c.code, label: c.name }));
  const timezoneOptions = (selectedCountry?.timezones ?? [timezone]).map((tz) => ({ value: tz, label: tzLabel(tz) }));

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {/* Profile */}
        <View style={styles.section}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>Profile</ThemedText>
          <ThemedText type="small" style={styles.sectionSubtitle}>Shown to customers on your public booking page.</ThemedText>

          <View style={styles.logoRow}>
            <Pressable style={styles.logo} onPress={handlePickLogo}>
              {logoPreview ? (
                <Image source={{ uri: logoPreview }} style={styles.logoImage} contentFit="cover" />
              ) : (
                <ThemedText type="subtitle" style={styles.logoInitials}>{(name || '?').slice(0, 2).toUpperCase()}</ThemedText>
              )}
            </Pressable>
            <View style={styles.logoActions}>
              <ThemedText type="small" style={styles.logoHint}>JPG, PNG, WebP or HEIC.{'\n'}Recommended 400×400px.</ThemedText>
              <Pressable onPress={handlePickLogo}>
                <ThemedText type="small" style={styles.logoActionLabel}>{logoPreview ? 'Change photo' : 'Upload photo'}</ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={styles.field}>
            <ThemedText type="small" style={styles.label}>Display name</ThemedText>
            <TextInput value={name} onChangeText={setName} placeholder="e.g. Glow Spa" placeholderTextColor={Brand.text3} style={styles.input} />
          </View>

          <View style={styles.field}>
            <ThemedText type="small" style={styles.label}>Tagline (optional)</ThemedText>
            <TextInput
              value={tagline}
              onChangeText={setTagline}
              placeholder="A short line customers see when they book"
              placeholderTextColor={Brand.text3}
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="small" style={styles.label}>WhatsApp number (optional)</ThemedText>
            <TextInput
              value={whatsapp}
              onChangeText={setWhatsapp}
              placeholder="e.g. +1 555 000 0000"
              placeholderTextColor={Brand.text3}
              keyboardType="phone-pad"
              style={styles.input}
            />
            <ThemedText type="small" style={styles.hint}>Shown as a &quot;Message us&quot; button on your booking page.</ThemedText>
          </View>

          <View style={styles.field}>
            <ThemedText type="small" style={styles.label}>Terms & Conditions (optional)</ThemedText>
            <TextInput
              value={terms}
              onChangeText={setTerms}
              placeholder="Your booking terms, cancellation policy, etc."
              placeholderTextColor={Brand.text3}
              style={[styles.input, styles.textAreaLarge]}
              multiline
              numberOfLines={5}
            />
          </View>

          <View style={styles.field}>
            <ThemedText type="small" style={styles.label}>Booking link</ThemedText>
            <BookingLinkBar subdomain={settings?.subdomain} />
          </View>
        </View>

        {/* Location & currency */}
        <View style={styles.section}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>Location & currency</ThemedText>
          <ThemedText type="small" style={styles.sectionSubtitle}>Your timezone controls when booking slots appear.</ThemedText>

          <View style={styles.field}>
            <PickerField label="Country" value={country} options={countryOptions} onChange={handleCountryChange} />
          </View>
          <View style={styles.field}>
            <PickerField
              label="Timezone"
              value={timezone}
              options={timezoneOptions}
              onChange={setTimezone}
              disabled={(selectedCountry?.timezones.length ?? 0) <= 1}
            />
          </View>
          <View style={styles.field}>
            <ThemedText type="small" style={styles.label}>Currency</ThemedText>
            <View style={[styles.input, styles.currencyDisplay]}>
              <ThemedText style={styles.currencyValue}>{selectedCountry?.currency ?? settings?.default_currency}</ThemedText>
            </View>
            <ThemedText type="small" style={styles.hint}>Set automatically from your country.</ThemedText>
          </View>
        </View>

        {/* Booking rules */}
        <View style={styles.section}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>Booking rules</ThemedText>
          <ThemedText type="small" style={styles.sectionSubtitle}>How long clients have to pay, and how long you have to confirm.</ThemedText>

          <View style={styles.row}>
            <View style={styles.rowItem}>
              <ThemedText type="small" style={styles.label}>Slot hold (min)</ThemedText>
              <TextInput
                value={slotHoldMinutes}
                onChangeText={(v) => setSlotHoldMinutes(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
            <View style={styles.rowItem}>
              <ThemedText type="small" style={styles.label}>Confirmation SLA (hrs)</ThemedText>
              <TextInput
                value={confirmationSlaHours}
                onChangeText={(v) => setConfirmationSlaHours(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                style={styles.input}
              />
            </View>
          </View>
        </View>

        <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#ffffff" /> : (
            <ThemedText type="smallBold" style={styles.saveButtonLabel}>Save changes</ThemedText>
          )}
        </Pressable>

        {/* Legal */}
        <View style={styles.section}>
          <Pressable style={styles.legalRow} onPress={() => router.push('/terms')}>
            <ThemedText style={styles.legalLabel}>Terms & Conditions</ThemedText>
            <Feather name="chevron-right" size={18} color={Brand.text3} />
          </Pressable>
          <View style={styles.legalDivider} />
          <Pressable style={styles.legalRow} onPress={() => router.push('/privacy')}>
            <ThemedText style={styles.legalLabel}>Privacy Policy</ThemedText>
            <Feather name="chevron-right" size={18} color={Brand.text3} />
          </Pressable>
        </View>

        {/* Danger zone */}
        <View style={[styles.section, styles.dangerSection]}>
          <ThemedText type="smallBold" style={styles.dangerTitle}>Danger zone</ThemedText>
          <ThemedText type="small" style={styles.dangerSubtitle}>
            Permanently delete your account. This cannot be undone.
          </ThemedText>
          <Pressable style={styles.deleteButton} onPress={handleDeleteAccount} disabled={deleting}>
            {deleting ? <ActivityIndicator color={Brand.dangerFg} /> : (
              <ThemedText type="smallBold" style={styles.deleteButtonLabel}>Delete account</ThemedText>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: '#ffffff',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  sectionTitle: {
    color: Brand.text1,
    fontSize: 16,
  },
  sectionSubtitle: {
    color: Brand.text3,
    marginTop: -8,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: Brand.brand,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  logoInitials: {
    color: '#ffffff',
    fontSize: 22,
  },
  logoActions: {
    flex: 1,
    gap: 6,
  },
  logoHint: {
    color: Brand.text3,
  },
  logoActionLabel: {
    color: Brand.brand,
    fontWeight: '600',
  },
  field: {
    gap: 0,
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
    minHeight: 50,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  hint: {
    color: Brand.text3,
    marginTop: 6,
  },
  currencyDisplay: {
    backgroundColor: '#FAFAF9',
    justifyContent: 'center',
  },
  currencyValue: {
    color: Brand.text2,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  rowItem: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: Brand.brand,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonLabel: {
    color: '#ffffff',
  },
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  legalLabel: {
    color: Brand.text1,
  },
  legalDivider: {
    height: 1,
    backgroundColor: Brand.border,
    marginVertical: Spacing.three,
  },
  dangerSection: {
    borderColor: 'rgba(220,38,38,0.25)',
    backgroundColor: Brand.dangerBg,
  },
  dangerTitle: {
    color: Brand.dangerFg,
    fontSize: 16,
  },
  dangerSubtitle: {
    color: Brand.text2,
    marginTop: -8,
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: Brand.dangerFg,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  deleteButtonLabel: {
    color: Brand.dangerFg,
  },
});
