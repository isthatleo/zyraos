// Termii SMS provider
import { SmsProvider, SmsConfig } from '../sms.interface';

export class TermiiProvider implements SmsProvider {
  private config: SmsConfig;

  constructor(config: SmsConfig) {
    this.config = config;
  }

  async sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: to,
          from: this.config.senderId || 'N-Alert',
          sms: message,
          type: 'plain',
          channel: 'generic',
          api_key: this.config.apiKey,
        }),
      });

      const data = await response.json();

      if (data.code === 'ok') {
        return { success: true, messageId: data.message_id };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getBalance(): Promise<{ balance: number; currency: string }> {
    try {
      const response = await fetch(`https://api.ng.termii.com/api/get-balance?api_key=${this.config.apiKey}`);
      const data = await response.json();

      if (data.code === 'ok') {
        return { balance: parseFloat(data.balance), currency: data.currency || 'NGN' };
      }
      return { balance: 0, currency: 'NGN' };
    } catch (error) {
      return { balance: 0, currency: 'NGN' };
    }
  }
}
