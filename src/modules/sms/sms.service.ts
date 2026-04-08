// SMS service
import { SmsProvider, SmsConfig } from './sms.interface';
import { SmsFactory } from './sms.factory';

export class SmsService {
  private provider: SmsProvider;
  private config: SmsConfig;

  constructor(config: SmsConfig) {
    this.config = config;
    this.provider = SmsFactory.createProvider(config);
  }

  async sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Validate phone number format
      if (!this.isValidPhoneNumber(to)) {
        return { success: false, error: 'Invalid phone number format' };
      }

      // Check message length (most providers limit to 160 chars for single SMS)
      if (message.length > 160) {
        // Could implement multipart SMS logic here
        console.warn('Message exceeds 160 characters, may be split into multiple SMS');
      }

      const result = await this.provider.sendSms(to, message);

      // Log the SMS attempt
      console.log(`SMS ${result.success ? 'sent' : 'failed'} to ${to}: ${result.messageId || result.error}`);

      return result;
    } catch (error) {
      console.error('SMS service error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async sendBulkSms(recipients: string[], message: string): Promise<Array<{ to: string; success: boolean; messageId?: string; error?: string }>> {
    const results = await Promise.allSettled(
      recipients.map(recipient => this.sendSms(recipient, message))
    );

    return results.map((result, index) => ({
      to: recipients[index],
      ...(result.status === 'fulfilled' ? result.value : { success: false, error: 'Promise rejected' })
    }));
  }

  async getBalance(): Promise<{ balance: number; currency: string }> {
    try {
      if (this.provider.getBalance) {
        return await this.provider.getBalance();
      }
      return { balance: 0, currency: 'USD' };
    } catch (error) {
      console.error('Error getting SMS balance:', error);
      return { balance: 0, currency: 'USD' };
    }
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic phone number validation (supports international format)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  // Method to switch providers dynamically
  switchProvider(newConfig: SmsConfig): void {
    this.config = newConfig;
    this.provider = SmsFactory.createProvider(newConfig);
  }

  getCurrentProvider(): string {
    return this.config.provider;
  }
}
