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

// Draft terms for the Bookaata Business app, grounded in this app's actual
// functionality (trial/subscription model, manual payment-proof deposits,
// push notifications, account deletion behavior). This is a starting point
// for App Store / Play Store submission, not a substitute for review by a
// lawyer before shipping to real customers.
export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.headerTitle}>Terms & Conditions</ThemedText>
        <Pressable onPress={() => router.back()} style={styles.closeButton} hitSlop={8}>
          <Feather name="x" size={18} color={Brand.text2} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="small" style={styles.updated}>Last updated: August 2026</ThemedText>

        <Section title="1. Acceptance of terms">
          By creating an account or using the Bookaata Business app, you agree to these Terms &
          Conditions and to our handling of your data as described here. If you do not agree,
          please do not use the app.
        </Section>

        <Section title="2. What Bookaata Business is">
          Bookaata Business is a booking-management tool for tenant owners and staff to review and
          confirm client bookings, manage services and availability, track customers and payment
          proofs, and receive real-time push notifications. It is not the customer-facing booking
          page — clients book through a separate, no-login public page tied to your business.
        </Section>

        <Section title="3. Accounts and roles">
          Accounts are created by a business (tenant) owner during onboarding, either from this app
          or from the web dashboard. Owners can be joined by staff accounts with more limited
          permissions. You are responsible for keeping your login credentials secure and for all
          activity under your account.
        </Section>

        <Section title="4. Subscription and billing">
          New businesses start with a 30-day free trial. After the trial, continued access requires
          an active subscription (billed monthly or yearly), processed through Paystack. We do not
          store your card details. If a payment fails or a subscription lapses, your business's
          public booking page and dashboard access may be suspended until payment is resolved.
        </Section>

        <Section title="5. Payments you collect from your clients">
          This app does not process your clients' deposit payments. Clients pay you directly
          through the payment methods you configure (mobile money, bank transfer, cash, etc.), and
          you confirm payment manually after reviewing the proof they submit. Bookaata Business is
          not a party to, and is not responsible for, transactions between you and your clients.
        </Section>

        <Section title="6. Notifications">
          If you enable push notifications, we send you alerts for events like new bookings,
          submitted payment proofs, and expired holds. You can disable these at any time from your
          device's notification settings.
        </Section>

        <Section title="7. Acceptable use">
          You agree not to use the app to store or process information you don't have the right to
          use, to attempt to disrupt or reverse-engineer the service, or to use it for any unlawful
          purpose. We may suspend accounts that violate this.
        </Section>

        <Section title="8. Data retention and deletion">
          You can permanently delete your account from Settings at any time. Deleting a staff
          account disables that login only. Deleting the account of a business owner also suspends
          the business — its public booking page stops accepting new bookings and no one can log
          in. Historical booking, customer, and payment records tied to the business are retained
          as business records rather than erased, since they may be needed for accounting or
          dispute purposes; your personal account details are removed from active use immediately.
        </Section>

        <Section title="9. Changes to these terms">
          We may update these terms as the app evolves. Continuing to use the app after an update
          means you accept the revised terms.
        </Section>

        <Section title="10. Contact">
          Questions about these terms can be sent to the business email associated with your
          Bookaata Business subscription.
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
