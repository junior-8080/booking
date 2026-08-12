import { SMSProvider, SMSMessage } from './SMSProvider.interface';
import { env } from '../../../config/env';

// Brevo transactional SMS — worldwide coverage, one provider for all countries.
export class BrevoProvider implements SMSProvider {
  readonly countryCode = '*';

  async send(message: SMSMessage): Promise<void> {
    if (!env.BREVO_API_KEY) {
      console.warn('[BrevoProvider] BREVO_API_KEY not configured — skipping SMS');
      return;
    }

    const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        'api-key': env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        type: 'transactional',
        sender: env.BREVO_SMS_SENDER,
        recipient: message.to,
        content: message.body,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Brevo SMS failed (${response.status}): ${text}`);
    }
  }
}
