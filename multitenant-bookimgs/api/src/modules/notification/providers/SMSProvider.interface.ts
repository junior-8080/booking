export interface SMSMessage {
  to: string;   // E.164 phone number
  body: string;
}

export interface SMSProvider {
  readonly countryCode: string; // ISO 3166-1 alpha-2 this provider handles (e.g. 'US', 'GH')
  send(message: SMSMessage): Promise<void>;
}
