// Hubtel SMS provider
import { SmsProvider, SmsConfig } from '../sms.interface';

export class HubtelProvider implements SmsProvider {
  private config: SmsConfig;

  constructor(config: SmsConfig) {
    this.config = config;
  }

  async sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch('https://smsc.hubtel.com/v1/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64'),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.config.senderId || 'Hubtel',
          to: to,
          content: message,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 0) {
        return { success: true, messageId: data.messageId };
      } else {
        return { success: false, error: data.message || 'Failed to send SMS' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getBalance(): Promise<{ balance: number; currency: string }> {
    // Hubtel balance API implementation
    try {
      const response = await fetch('https://smsc.hubtel.com/v1/account/balance', {
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64'),
        },
      });

      const data = await response.json();
      return { balance: parseFloat(data.balance || '0'), currency: data.currency || 'GHS' };
    } catch (error) {
      return { balance: 0, currency: 'GHS' };
    }
  }
}
