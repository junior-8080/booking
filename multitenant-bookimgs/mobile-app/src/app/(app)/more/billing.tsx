import { Feather } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Brand, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/auth-context';
import { BillingStatus, getBillingStatus, initializePayment, listSubscriptionPlans, verifyPayment } from '@/features/billing/api';
import { SubscriptionPlan } from '@/features/billing/types';
import { formatAmount } from '@/lib/format';

// Paystack redirects the in-app browser here once checkout completes (success
// or decline) — used as the openAuthSessionAsync match, so cancelling out of
// the browser (no redirect reached) is distinguishable from an attempted payment.
const PAYSTACK_REDIRECT_URL = Linking.createURL('billing');

const STATUS_META: Record<BillingStatus['subscription_status'], { label: string; color: string; bg: string }> = {
  TRIALING: { label: 'Free trial', color: '#1d7afc', bg: 'rgba(29,122,252,0.08)' },
  ACTIVE: { label: 'Active', color: '#16a34a', bg: 'rgba(22,163,74,0.08)' },
  PAST_DUE: { label: 'Payment overdue', color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
  CANCELLED: { label: 'Cancelled', color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
};

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 10;

function daysLeft(isoDate: string | null): number {
  if (!isoDate) return 0;
  const diff = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const FEATURES = [
  'Unlimited booking management',
  'Client email & SMS notifications',
  'Custom subdomain booking page',
  'Payment tracking & analytics',
];

export default function BillingScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: billing, isLoading: billingLoading } = useQuery({ queryKey: ['billing-status'], queryFn: getBillingStatus });
  const { data: plans, isLoading: plansLoading } = useQuery({ queryKey: ['subscription-plans'], queryFn: listSubscriptionPlans });

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState('');
  const [justPaid, setJustPaid] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!plans || plans.length === 0 || selectedPlan) return;
    setSelectedPlan(plans.find((p) => p.interval === 'MONTHLY') ?? plans[0] ?? null);
  }, [plans, selectedPlan]);

  useEffect(() => () => { if (pollTimer.current) clearInterval(pollTimer.current); }, []);

  const startPolling = () => {
    setJustPaid(true);
    setPolling(true);
    let attempts = 0;
    pollTimer.current = setInterval(async () => {
      attempts++;
      try {
        const status = await getBillingStatus();
        queryClient.setQueryData(['billing-status'], status);
        if (status.subscription_status === 'ACTIVE' || attempts >= POLL_MAX_ATTEMPTS) {
          if (pollTimer.current) clearInterval(pollTimer.current);
          setPolling(false);
        }
      } catch {
        if (pollTimer.current) clearInterval(pollTimer.current);
        setPolling(false);
      }
    }, POLL_INTERVAL_MS);
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !user) return;
    setError('');
    setSubscribing(true);
    try {
      const { checkout_url } = await initializePayment(user.email, selectedPlan.interval, PAYSTACK_REDIRECT_URL);
      const result = await WebBrowser.openAuthSessionAsync(checkout_url, PAYSTACK_REDIRECT_URL);

      if (result.type === 'success') {
        const reference = Linking.parse(result.url).queryParams?.['reference'] ?? Linking.parse(result.url).queryParams?.['trxref'];
        if (typeof reference === 'string') await verifyPayment(reference).catch(() => {});
        startPolling();
      } else {
        setError('Payment was not completed.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout. Please try again.');
    } finally {
      setSubscribing(false);
    }
  };

  const isLoading = billingLoading || plansLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loading}>
          <ActivityIndicator color={Brand.brand} />
        </View>
      </SafeAreaView>
    );
  }

  if (!billing) return null;

  const meta = STATUS_META[billing.subscription_status];
  const trialDays = billing.trial_ends_at ? daysLeft(billing.trial_ends_at) : 0;
  const isActive = billing.subscription_status === 'ACTIVE';
  const needsAction = billing.needs_payment;
  const activePlan = billing.current_plan ? plans?.find((p) => p.interval === billing.current_plan) ?? null : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.body}>
        {justPaid && (
          <View style={styles.successBanner}>
            <Feather name="check-circle" size={16} color="#16a34a" style={styles.bannerIcon} />
            <View style={styles.bannerText}>
              <ThemedText type="smallBold" style={styles.bannerTitle}>Payment received</ThemedText>
              <ThemedText type="small" style={styles.bannerSubtitle}>
                {polling ? 'Activating your subscription…' : "Payment received. Pull to refresh if the status below hasn't updated."}
              </ThemedText>
            </View>
          </View>
        )}

        {!!error && (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={14} color={Brand.dangerFg} />
            <ThemedText type="small" style={styles.errorText}>{error}</ThemedText>
          </View>
        )}

        <View style={styles.card}>
          <ThemedText type="small" style={styles.cardLabel}>Current plan</ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
            <ThemedText type="small" style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</ThemedText>
          </View>

          {plans && plans.length > 0 ? (
            <View style={styles.planRow}>
              {plans.map((plan) => {
                const selected = selectedPlan?.id === plan.id;
                return (
                  <Pressable
                    key={plan.id}
                    style={[styles.planCard, selected && styles.planCardSelected]}
                    onPress={() => setSelectedPlan(plan)}
                  >
                    {plan.interval === 'YEARLY' && (
                      <View style={styles.bestValueBadge}>
                        <ThemedText type="small" style={styles.bestValueLabel}>BEST VALUE</ThemedText>
                      </View>
                    )}
                    <ThemedText type="small" style={[styles.planName, selected && styles.planNameSelected]}>{plan.name}</ThemedText>
                    <ThemedText type="smallBold" style={styles.planAmount}>
                      {formatAmount(plan.amount, plan.currency)}
                      <ThemedText type="small" style={styles.planInterval}>{plan.interval === 'MONTHLY' ? '/mo' : '/yr'}</ThemedText>
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.noPlans}>
              <ThemedText type="small" style={styles.noPlansText}>No active plans available. Contact support.</ThemedText>
            </View>
          )}

          <ThemedText type="small" style={styles.included}>Unlimited bookings · Client notifications · Custom booking page</ThemedText>

          {billing.subscription_status === 'TRIALING' && billing.trial_ends_at && (
            <View style={[styles.noticeBox, trialDays <= 5 && styles.noticeBoxWarning]}>
              <ThemedText type="smallBold" style={trialDays <= 5 ? styles.noticeTitleWarning : styles.noticeTitle}>
                {trialDays === 0 ? 'Trial expired' : `${trialDays} day${trialDays === 1 ? '' : 's'} left in your trial`}
              </ThemedText>
              <ThemedText type="small" style={styles.noticeSubtitle}>
                Trial ends {new Date(billing.trial_ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </ThemedText>
            </View>
          )}

          {billing.subscription_status === 'PAST_DUE' && (
            <View style={[styles.noticeBox, styles.noticeBoxWarning]}>
              <ThemedText type="smallBold" style={styles.noticeTitleWarning}>Payment failed</ThemedText>
              <ThemedText type="small" style={styles.noticeSubtitle}>Your last payment could not be processed. Subscribe below to restore access.</ThemedText>
            </View>
          )}

          {billing.subscription_status === 'CANCELLED' && (
            <View style={[styles.noticeBox, styles.noticeBoxDanger]}>
              <ThemedText type="smallBold" style={styles.noticeTitleDanger}>Subscription cancelled</ThemedText>
              <ThemedText type="small" style={styles.noticeSubtitle}>Subscribe again to re-activate your booking page.</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <ThemedText type="small" style={styles.cardLabel}>{isActive ? 'Your subscription' : 'Get started'}</ThemedText>

          {isActive ? (
            <View>
              <View style={styles.activeRow}>
                <Feather name="check-circle" size={15} color="#16a34a" />
                <ThemedText type="small" style={styles.activeLabel}>
                  {activePlan ? activePlan.name : billing.current_plan === 'YEARLY' ? 'Yearly plan active' : 'Monthly plan active'}
                </ThemedText>
              </View>
              {activePlan && (
                <ThemedText type="title" style={styles.activeAmount}>
                  {formatAmount(activePlan.amount, activePlan.currency)}
                  <ThemedText type="small" style={styles.activeInterval}>{activePlan.interval === 'MONTHLY' ? '/month' : '/year'}</ThemedText>
                </ThemedText>
              )}
              {billing.subscription_expires_at && (
                <ThemedText type="small" style={styles.renewsText}>
                  Renews by {new Date(billing.subscription_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </ThemedText>
              )}
              <ThemedText type="small" style={styles.activeFooter}>Your booking page is live. Renew before the expiry date to keep access.</ThemedText>
            </View>
          ) : (
            <View>
              {FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Feather name="check" size={14} color={Brand.brand} />
                  <ThemedText type="small" style={styles.featureLabel}>{f}</ThemedText>
                </View>
              ))}

              <Pressable
                style={[styles.payButton, (subscribing || !selectedPlan) && styles.payButtonDisabled]}
                onPress={handleSubscribe}
                disabled={subscribing || !selectedPlan}
              >
                {subscribing ? <ActivityIndicator color="#ffffff" /> : (
                  <ThemedText type="smallBold" style={styles.payButtonLabel}>
                    {selectedPlan
                      ? needsAction && billing.subscription_status !== 'TRIALING'
                        ? `Pay ${formatAmount(selectedPlan.amount, selectedPlan.currency)} to restore access`
                        : `Pay ${formatAmount(selectedPlan.amount, selectedPlan.currency)} — MoMo or card`
                      : 'Select a plan'}
                  </ThemedText>
                )}
              </Pressable>
              <ThemedText type="small" style={styles.payHint}>Secure checkout via Paystack · MoMo, card, or bank transfer</ThemedText>
            </View>
          )}
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
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 10,
    backgroundColor: 'rgba(22,163,74,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.2)',
  },
  bannerIcon: {
    marginTop: 2,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    color: '#16a34a',
  },
  bannerSubtitle: {
    color: Brand.text2,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 10,
    backgroundColor: Brand.dangerBg,
  },
  errorText: {
    flex: 1,
    color: Brand.dangerFg,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.border,
    backgroundColor: '#ffffff',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  cardLabel: {
    color: Brand.text3,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontWeight: '600',
  },
  planRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  planCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: Brand.border,
    borderRadius: 10,
    padding: Spacing.three,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: Brand.brand,
    backgroundColor: Brand.brandTint,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -10,
    right: 8,
    backgroundColor: Brand.brand,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  bestValueLabel: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  planName: {
    color: Brand.text3,
    textTransform: 'uppercase',
    fontSize: 11,
    marginBottom: 4,
  },
  planNameSelected: {
    color: Brand.brand,
  },
  planAmount: {
    color: Brand.text1,
    fontSize: 18,
  },
  planInterval: {
    color: Brand.text3,
  },
  noPlans: {
    padding: Spacing.three,
    borderRadius: 8,
    backgroundColor: '#F0F0F3',
  },
  noPlansText: {
    color: Brand.text3,
  },
  included: {
    color: Brand.text3,
  },
  noticeBox: {
    padding: Spacing.three,
    borderRadius: 8,
    backgroundColor: '#F0F0F3',
    borderWidth: 1,
    borderColor: Brand.border,
  },
  noticeBoxWarning: {
    backgroundColor: Brand.warningBg,
    borderColor: 'rgba(217,119,6,0.2)',
  },
  noticeBoxDanger: {
    backgroundColor: Brand.dangerBg,
    borderColor: 'rgba(220,38,38,0.15)',
  },
  noticeTitle: {
    color: Brand.text1,
  },
  noticeTitleWarning: {
    color: Brand.warningFg,
  },
  noticeTitleDanger: {
    color: Brand.dangerFg,
  },
  noticeSubtitle: {
    color: Brand.text3,
    marginTop: 3,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  activeLabel: {
    color: Brand.text2,
  },
  activeAmount: {
    fontSize: 26,
    color: Brand.text1,
  },
  activeInterval: {
    color: Brand.text3,
  },
  renewsText: {
    color: Brand.text3,
    marginTop: 4,
  },
  activeFooter: {
    color: Brand.text3,
    marginTop: Spacing.two,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  featureLabel: {
    color: Brand.text2,
  },
  payButton: {
    marginTop: Spacing.two,
    backgroundColor: Brand.brand,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonLabel: {
    color: '#ffffff',
  },
  payHint: {
    marginTop: Spacing.two,
    color: Brand.text3,
    textAlign: 'center',
  },
});
