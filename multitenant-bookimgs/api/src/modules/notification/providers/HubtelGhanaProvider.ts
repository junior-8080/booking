import { SMSProvider, SMSMessage } from './SMSProvider.interface';
import { env } from '../../../config/env';

export class HubtelGhanaProvider implements SMSProvider {
  readonly countryCode = 'GH';

  async send(message: SMSMessage): Promise<void> {
    if (!env.HUBTEL_CLIENT_ID || !env.HUBTEL_CLIENT_SECRET || !env.HUBTEL_FROM_NUMBER) {
      console.warn('[HubtelGhanaProvider] credentials not configured — skipping SMS');
      return;
    }

    const url = 'https://smsc.hubtel.com/v1/messages/send';
    const params = new URLSearchParams({
      clientsecret: env.HUBTEL_CLIENT_SECRET,
      clientid: env.HUBTEL_CLIENT_ID,
      from: env.HUBTEL_FROM_NUMBER,
      to: message.to,
      content: message.body,
    });

    const response = await fetch(`${url}?${params.toString()}`);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Hubtel SMS failed (${response.status}): ${text}`);
    }
  }
}
