import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" style={styles.sectionTitle}>{title}</ThemedText>
      <ThemedText style={styles.paragraph}>{children}</ThemedText>
    </View>
  );
}

// Draft privacy policy for the Bookaata Business app, grounded in what this
// app actually collects and which third parties it actually uses. Store
// listings (App Store Connect / Play Console) also require a hosted, public
// URL for this — this in-app screen satisfies "easy to find in-app" but
// does not replace that. Have this reviewed by a lawyer before shipping to
// real customers.
export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.headerTitle}>Privacy Policy</ThemedText>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={8}>
          <Feather name="x" size={18} color={Brand.text2} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="small" style={styles.updated}>Last updated: August 2026</ThemedText>

        <Section title="1. What we collect">
          Account info you provide: your name, email, phone number, and password. Business info:
          your business name, description, logo, and settings. Booking data you or your clients
          enter: customer names, phone numbers, emails, booking details, and payment proof images
          uploaded to confirm a deposit. If you enable notifications, we also store a device push
          token so we can alert you about new bookings.
        </Section>

        <Section title="2. How we use it">
          To run the service — showing your bookings and customers, sending you push/email/SMS
          alerts, processing your subscription, and displaying your public booking page to your
          clients. We don't sell your data or use it for advertising.
        </Section>

        <Section title="3. Who we share it with">
          We use third-party services to operate the app: Paystack (subscription billing), Expo
          (push notification delivery), Cloudflare (image storage for logos and payment proofs),
          and email/SMS providers (Brevo, Twilio, or Hubtel depending on region) to deliver
          notifications. Each only receives what it needs to perform its function — for example,
          Paystack sees your billing email, not your client list.
        </Section>

        <Section title="4. Your clients' data">
          When your clients book through your public booking page, the name, phone, email, and
          booking details they submit are stored under your business account so you can manage the
          booking. You're responsible for handling that data appropriately, consistent with
          whatever you tell your own clients about how you use it.
        </Section>

        <Section title="5. Data retention and account deletion">
          You can delete your account at any time from Settings. This immediately removes your
          personal login details and, for a business owner, suspends the business's public booking
          page. Historical booking, customer, and payment records tied to the business are retained
          as business records rather than erased, since they may be needed for accounting or
          dispute purposes.
        </Section>

        <Section title="6. Security">
          Passwords are hashed, not stored in plain text. Your session token is stored in your
          device's secure credential storage, not in plain app storage. All traffic between the app
          and our servers is encrypted (HTTPS).
        </Section>

        <Section title="7. Children's privacy">
          This app is intended for business owners and staff, not children, and we don't knowingly
          collect data from anyone under 16.
        </Section>

        <Section title="8. Changes to this policy">
          We may update this policy as the app evolves. Continuing to use the app after an update
          means you accept the revised policy.
        </Section>

        <Section title="9. Contact">
          Questions about this policy or your data can be sent to the business email associated
          with your Bookaata Business subscription.
        </Section>
      </ScrollView>
    </SafeAreaView>
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
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
  },
  updated: {
    color: Brand.text3,
    marginBottom: Spacing.four,
  },
  section: {
    marginBottom: Spacing.four,
    gap: 6,
  },
  sectionTitle: {
    color: Brand.text1,
    fontSize: 15,
  },
  paragraph: {
    color: Brand.text2,
    lineHeight: 22,
  },
});
