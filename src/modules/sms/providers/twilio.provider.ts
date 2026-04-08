// Twilio SMS provider
import { SmsProvider, SmsConfig } from '../sms.interface';

export class TwilioProvider implements SmsProvider {
  private config: SmsConfig;

  constructor(config: SmsConfig) {
    this.config = config;
  }

  async sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const accountSid = this.config.apiKey;
      const authToken = this.config.apiSecret;
      const from = this.config.senderId;

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: from,
          Body: message,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, messageId: data.sid };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getBalance(): Promise<{ balance: number; currency: string }> {
    // Twilio doesn't provide direct balance API, return placeholder
    return { balance: 0, currency: 'USD' };
  }
}
