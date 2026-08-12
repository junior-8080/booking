import { parsePhoneNumber } from 'libphonenumber-js';
import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../core/BaseRepository';
import { SMSProvider } from './providers/SMSProvider.interface';
import { TwilioUSProvider } from './providers/TwilioUSProvider';
import { HubtelGhanaProvider } from './providers/HubtelGhanaProvider';
import { BrevoProvider } from './providers/BrevoProvider';
import { env } from '../../config/env';

// ─── Email templates (minimal text, extend with HTML in production) ────────────

const TEMPLATES: Record<string, (data: Record<string, unknown>) => { subject: string; text: string }> = {
  booking_hold_created: (d) => ({
    subject: 'Your booking slot is held!',
    text: `Your slot is held. Pay ${d['requiredAmount']} ${d['requiredCurrency']} before ${d['holdExpiresAt']} and include reference ${d['referenceCode']} in your transfer.`,
  }),
  payment_proof_reminder: (d) => ({
    subject: 'Reminder: submit your payment proof',
    text: `Don't lose your slot! Submit payment proof for booking ${d['referenceCode']} soon.`,
  }),
  tenant_new_booking_alert: (d) => ({
    subject: 'New booking proof submitted',
    text: `A client submitted payment proof for booking ${d['referenceCode']}. Amount: ${d['amount']} ${d['currency']}. Please review in your dashboard.`,
  }),
  booking_confirmed: (d) => ({
    subject: "You're booked!",
    text: `Your deposit has been confirmed. Booking reference: ${d['referenceCode']}. See you at your appointment!`,
  }),
  booking_rejected: (d) => ({
    subject: 'Payment proof rejected',
    text: `Your payment proof for booking ${d['referenceCode']} was rejected. Reason: ${d['rejectionReason']}. You may resubmit.`,
  }),
  tenant_review_sla_reminder: (d) => ({
    subject: 'Action needed: booking awaiting review',
    text: `Booking ${d['referenceCode']} has been awaiting your review for more than ${d['slaHours']} hours. Please confirm or reject.`,
  }),
};

export class NotificationService extends BaseRepository {
  private readonly smsProviders: Map<string, SMSProvider>;
  private readonly brevoSms: BrevoProvider;

  constructor(db: PrismaClient) {
    super(db);
    this.brevoSms = new BrevoProvider();
    // Country-specific fallbacks, used only when Brevo is not configured.
    // Routing is by the RECIPIENT's number prefix, not the tenant's country.
    this.smsProviders = new Map<string, SMSProvider>([
      ['US', new TwilioUSProvider()],
      ['GH', new HubtelGhanaProvider()],
    ]);
  }

  async send(params: {
    tenantId: string;
    bookingId?: string;
    template: string;
    recipientType: 'CLIENT' | 'TENANT';
    channels: Array<'EMAIL' | 'SMS'>;
    to: { email?: string; phone?: string; name?: string };
    data: Record<string, unknown>;
  }): Promise<void> {
    const templateFn = TEMPLATES[params.template];
    const { subject, text } = templateFn ? templateFn(params.data) : { subject: params.template, text: JSON.stringify(params.data) };

    for (const channel of params.channels) {
      const notif = await this.db.notification.create({
        data: {
          booking_id: params.bookingId ?? null,
          recipient_type: params.recipientType,
          channel,
          template: params.template,
          status: 'QUEUED',
        },
      } as Parameters<typeof this.db.notification.create>[0]);

      try {
        if (channel === 'EMAIL' && params.to.email) {
          await this.sendEmail(params.to.email, params.to.name ?? '', subject, text);
        } else if (channel === 'SMS' && params.to.phone) {
          await this.sendSMS(params.to.phone, text);
        }

        await this.db.notification.update({
          where: { id: notif.id },
          data: { status: 'SENT', sent_at: new Date() },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[NotificationService] failed ${channel} for ${params.template}:`, msg);
        await this.db.notification.update({
          where: { id: notif.id },
          data: { status: 'FAILED', error_message: msg },
        });
      }
    }
  }

  private async sendEmail(to: string, name: string, subject: string, text: string): Promise<void> {
    const apiKey = env.EMAIL_API_KEY;
    const from = env.EMAIL_FROM;

    if (env.EMAIL_PROVIDER === 'brevo') {
      if (!env.BREVO_API_KEY) {
        console.warn('[NotificationService] BREVO_API_KEY not configured — skipping email');
        return;
      }
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': env.BREVO_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: from, name: env.EMAIL_FROM_NAME },
          to: [{ email: to, ...(name ? { name } : {}) }],
          subject,
          textContent: text,
        }),
      });
      if (!res.ok) throw new Error(`Brevo email failed (${res.status}): ${await res.text()}`);
    } else if (env.EMAIL_PROVIDER === 'resend') {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: `${name} <${to}>`, subject, text }),
      });
      if (!res.ok) throw new Error(`Resend failed: ${await res.text()}`);
    } else {
      // SendGrid
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to, name }] }],
          from: { email: from },
          subject,
          content: [{ type: 'text/plain', value: text }],
        }),
      });
      if (!res.ok) throw new Error(`SendGrid failed: ${await res.text()}`);
    }
  }

  private async sendSMS(phone: string, body: string): Promise<void> {
    // Brevo handles all countries with one integration — preferred when configured
    if (env.BREVO_API_KEY) {
      await this.brevoSms.send({ to: phone, body });
      return;
    }

    // Fallback: route by the recipient number's country prefix
    let countryCode = 'US';
    try {
      const parsed = parsePhoneNumber(phone);
      countryCode = parsed.country ?? 'US';
    } catch {
      // unparseable — fall back to US provider
    }

    const provider = this.smsProviders.get(countryCode) ?? this.smsProviders.get('US')!;
    await provider.send({ to: phone, body });
  }
}
