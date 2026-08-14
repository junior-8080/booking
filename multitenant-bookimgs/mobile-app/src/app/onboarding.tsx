import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PickerField } from '@/components/picker-field';
import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { listCountries } from '@/features/brands/api';
import { useAuth } from '@/features/auth/auth-context';
import { pickImage, uploadImage, type PickedImage } from '@/lib/upload';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

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

const STEPS = [
  { title: 'Business', subtitle: 'Tell us about your business' },
  { title: 'Owner', subtitle: 'Your contact details' },
  { title: 'Access', subtitle: 'Create your account' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [country, setCountry] = useState('US');
  const [timezone, setTimezone] = useState('America/New_York');
  const [logo, setLogo] = useState<PickedImage | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: countries } = useQuery({ queryKey: ['countries'], queryFn: listCountries });
  const selectedCountry = countries?.find((c) => c.code === country);
  const subdomain = slugify(businessName);

  const handleCountryChange = (code: string) => {
    const next = countries?.find((c) => c.code === code);
    setCountry(code);
    setTimezone(next?.default_timezone ?? timezone);
  };

  const handlePickLogo = async () => {
    const image = await pickImage();
    if (image) setLogo(image);
  };

  const stepIsValid = (): boolean => {
    if (step === 0) return businessName.trim().length >= 2;
    if (step === 1) return ownerName.trim().length >= 2 && ownerPhone.trim().length >= 6;
    return email.trim().length > 0 && password.length >= 8;
  };

  const handleNext = () => {
    setError('');
    if (!stepIsValid()) {
      setError('Please fill in the required fields.');
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError('');
    setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    if (!stepIsValid()) {
      setError('Please fill in the required fields.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      let logo_url: string | undefined;
      if (logo) logo_url = await uploadImage(logo, 'logos');

      await register({
        business_name: businessName.trim(),
        description: description.trim() || undefined,
        logo_url,
        country,
        timezone,
        owner_name: ownerName.trim(),
        owner_phone: ownerPhone.trim(),
        email: email.trim(),
        password,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Pressable onPress={() => (step > 0 ? handleBack() : router.back())} hitSlop={8}>
              <Feather name="arrow-left" size={20} color={Brand.text2} />
            </Pressable>
            <View style={styles.stepDots}>
              {STEPS.map((_, i) => (
                <View key={i} style={[styles.stepDot, i <= step && styles.stepDotActive]} />
              ))}
            </View>
          </View>

          <ThemedText type="small" style={styles.stepLabel}>Step {step + 1} of {STEPS.length}</ThemedText>
          <ThemedText type="title" style={styles.title}>{STEPS[step]!.title}</ThemedText>
          <ThemedText type="small" style={styles.subtitle}>{STEPS[step]!.subtitle}</ThemedText>

          {!!error && (
            <View style={styles.errorBanner}>
              <Feather name="alert-circle" size={14} color={Brand.dangerFg} />
              <ThemedText type="small" style={styles.errorText}>{error}</ThemedText>
            </View>
          )}

          {step === 0 && (
            <View style={styles.form}>
              <View>
                <ThemedText type="smallBold">Business name</ThemedText>
                <TextInput
                  style={styles.input}
                  value={businessName}
                  onChangeText={setBusinessName}
                  placeholder="e.g. Glow Spa"
                  placeholderTextColor={Brand.text3}
                />
                {!!subdomain && (
                  <ThemedText type="small" style={styles.hint}>
                    Booking link: <ThemedText type="smallBold" style={styles.hintBrand}>bookaata.app/book/{subdomain}</ThemedText>
                  </ThemedText>
                )}
              </View>

              <PickerField
                label="Country"
                value={country}
                options={(countries ?? []).map((c) => ({ value: c.code, label: c.name }))}
                onChange={handleCountryChange}
              />
              <PickerField
                label="Timezone"
                value={timezone}
                options={(selectedCountry?.timezones ?? [timezone]).map((tz) => ({ value: tz, label: tzLabel(tz) }))}
                onChange={setTimezone}
                disabled={(selectedCountry?.timezones.length ?? 0) <= 1}
              />
              {!!selectedCountry && (
                <ThemedText type="small" style={styles.hint}>
                  Prices will be in <ThemedText type="smallBold" style={styles.hintStrong}>{selectedCountry.currency}</ThemedText>. You can change country later in Settings.
                </ThemedText>
              )}

              <View>
                <ThemedText type="smallBold">Description (optional)</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What services do you offer?"
                  placeholderTextColor={Brand.text3}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View>
                <ThemedText type="smallBold">Logo (optional)</ThemedText>
                <Pressable style={styles.logoPicker} onPress={handlePickLogo}>
                  <View style={styles.logoPreviewBox}>
                    {logo ? (
                      <Image source={{ uri: logo.uri }} style={styles.logoPreviewImage} contentFit="cover" />
                    ) : (
                      <Feather name="image" size={20} color={Brand.text3} />
                    )}
                  </View>
                  <View style={styles.logoPickerText}>
                    <ThemedText style={styles.logoPickerLabel}>{logo ? 'Change logo' : 'Upload logo'}</ThemedText>
                    <ThemedText type="small" style={styles.hint}>JPEG, PNG, WebP, or HEIC</ThemedText>
                  </View>
                </Pressable>
              </View>
            </View>
          )}

          {step === 1 && (
            <View style={styles.form}>
              <View>
                <ThemedText type="smallBold">Your full name</ThemedText>
                <TextInput
                  style={styles.input}
                  value={ownerName}
                  onChangeText={setOwnerName}
                  placeholder="Your name"
                  placeholderTextColor={Brand.text3}
                />
              </View>
              <View>
                <ThemedText type="smallBold">Phone number</ThemedText>
                <TextInput
                  style={styles.input}
                  value={ownerPhone}
                  onChangeText={setOwnerPhone}
                  placeholder="+1 555 000 0000"
                  placeholderTextColor={Brand.text3}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.form}>
              <View>
                <ThemedText type="smallBold">Email address</ThemedText>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={Brand.text3}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
              <View>
                <ThemedText type="smallBold">Password</ThemedText>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={Brand.text3}
                  secureTextEntry
                />
                <ThemedText type="small" style={styles.hint}>Use at least 8 characters.</ThemedText>
              </View>
              <ThemedText type="small" style={styles.termsNotice}>
                By creating an account, you agree to our{' '}
                <ThemedText type="small" style={styles.termsLink} onPress={() => router.push('/terms')}>
                  Terms & Conditions
                </ThemedText>
                {' '}and{' '}
                <ThemedText type="small" style={styles.termsLink} onPress={() => router.push('/privacy')}>
                  Privacy Policy
                </ThemedText>
                .
              </ThemedText>
            </View>
          )}

          <View style={styles.actions}>
            {step > 0 && (
              <Pressable style={styles.backButton} onPress={handleBack}>
                <ThemedText type="smallBold" style={styles.backButtonLabel}>Back</ThemedText>
              </Pressable>
            )}
            <Pressable
              style={[styles.nextButton, submitting && styles.nextButtonDisabled]}
              onPress={step < 2 ? handleNext : handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText type="smallBold" style={styles.nextButtonLabel}>
                  {step < 2 ? 'Continue' : 'Create booking page'}
                </ThemedText>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  flex: {
    flex: 1,
  },
  container: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  stepDots: {
    flexDirection: 'row',
    gap: 6,
  },
  stepDot: {
    width: 24,
    height: 4,
    borderRadius: 2,
    backgroundColor: Brand.border2,
  },
  stepDotActive: {
    backgroundColor: Brand.brand,
  },
  stepLabel: {
    color: Brand.text3,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    color: Brand.text1,
    marginTop: 2,
  },
  subtitle: {
    color: Brand.text2,
    marginBottom: Spacing.two,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 10,
    backgroundColor: Brand.dangerBg,
    marginBottom: Spacing.two,
  },
  errorText: {
    flex: 1,
    color: Brand.dangerFg,
  },
  form: {
    gap: Spacing.three,
  },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: Brand.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: 12,
    fontSize: 15,
    color: Brand.text1,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  hint: {
    marginTop: 6,
    color: Brand.text3,
  },
  termsNotice: {
    color: Brand.text3,
    lineHeight: 20,
  },
  termsLink: {
    color: Brand.brand,
    fontWeight: '600',
  },
  hintBrand: {
    color: Brand.brand,
  },
  hintStrong: {
    color: Brand.text2,
  },
  logoPicker: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  logoPreviewBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Brand.border2,
    backgroundColor: '#FAFAF9',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  logoPickerText: {
    flex: 1,
  },
  logoPickerLabel: {
    color: Brand.text1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  backButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Brand.border,
    alignItems: 'center',
  },
  backButtonLabel: {
    color: Brand.text1,
  },
  nextButton: {
    flex: 2,
    backgroundColor: Brand.brand,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonLabel: {
    color: '#ffffff',
  },
});
