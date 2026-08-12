import { SMSProvider, SMSMessage } from './SMSProvider.interface';
import { env } from '../../../config/env';

export class TwilioUSProvider implements SMSProvider {
  readonly countryCode = 'US';

  async send(message: SMSMessage): Promise<void> {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER) {
      console.warn('[TwilioUSProvider] credentials not configured — skipping SMS');
      return;
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
    const body = new URLSearchParams({
      To: message.to,
      From: env.TWILIO_FROM_NUMBER,
      Body: message.body,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Twilio SMS failed (${response.status}): ${text}`);
    }
  }
}
