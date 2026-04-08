// MNotify SMS provider
import { SmsProvider, SmsConfig } from '../sms.interface';

export class MNotifyProvider implements SmsProvider {
  private config: SmsConfig;

  constructor(config: SmsConfig) {
    this.config = config;
  }

  async sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch('https://api.mnotify.com/api/sms/quick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient: [to],
          sender: this.config.senderId || 'MNotify',
          message: message,
          is_schedule: false,
          schedule_date: '',
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        return { success: true, messageId: data.id };
      } else {
        return { success: false, error: data.message || 'Failed to send SMS' };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getBalance(): Promise<{ balance: number; currency: string }> {
    // MNotify balance API implementation
    try {
      const response = await fetch('https://api.mnotify.com/api/balance', {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });

      const data = await response.json();
      return { balance: parseFloat(data.balance || '0'), currency: data.currency || 'GHS' };
    } catch (error) {
      return { balance: 0, currency: 'GHS' };
    }
  }
}
