import { SMSProvider, SMSConfig } from './sms-provider.interface';
import {
  ArkeselProvider,
  HubtelProvider,
  TwilioProvider,
  TermiiProvider,
  MNotifyProvider,
} from './sms-providers';

/**
 * SMS Service Factory
 * Creates and manages SMS provider instances
 */
export class SMSServiceFactory {
  private static providers: Map<string, SMSProvider> = new Map();

  /**
   * Create or get an SMS provider instance
   */
  static createProvider(config: SMSConfig): SMSProvider {
    const key = `${config.provider}_${config.apiKey}`;

    if (this.providers.has(key)) {
      return this.providers.get(key)!;
    }

    let provider: SMSProvider;

    switch (config.provider) {
      case 'arkesel':
        provider = new ArkeselProvider(config);
        break;
      case 'hubtel':
        provider = new HubtelProvider(config);
        break;
      case 'twilio':
        provider = new TwilioProvider(config);
        break;
      case 'termii':
        provider = new TermiiProvider(config);
        break;
      case 'mnotify':
        provider = new MNotifyProvider(config);
        break;
      default:
        throw new Error(`Unknown SMS provider: ${config.provider}`);
    }

    this.providers.set(key, provider);
    return provider;
  }

  /**
   * Send SMS using the specified provider
   */
  static async sendSMS(config: SMSConfig, phoneNumber: string, message: string) {
    const provider = this.createProvider(config);
    return provider.send(phoneNumber, message);
  }

  /**
   * Get balance for a provider
   */
  static async getBalance(config: SMSConfig): Promise<number> {
    const provider = this.createProvider(config);
    return provider.getBalance();
  }

  /**
   * Validate provider credentials
   */
  static async validateCredentials(config: SMSConfig): Promise<boolean> {
    const provider = this.createProvider(config);
    return provider.validateCredentials();
  }

  /**
   * Clear cached providers
   */
  static clearCache() {
    this.providers.clear();
  }
}

/**
 * Main SMS Service
 * High-level interface for sending SMS messages
 */
export class SMSService {
  constructor(private config: SMSConfig) {}

  /**
   * Send a single SMS
   */
  async send(phoneNumber: string, message: string) {
    return SMSServiceFactory.sendSMS(this.config, phoneNumber, message);
  }

  /**
   * Send SMS to multiple recipients
   */
  async sendBulk(phoneNumbers: string[], message: string) {
    const results = await Promise.all(
      phoneNumbers.map((phone) => this.send(phone, message))
    );
    return {
      total: phoneNumbers.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Get available balance
   */
  async getBalance(): Promise<number> {
    return SMSServiceFactory.getBalance(this.config);
  }

  /**
   * Validate credentials
   */
  async validateCredentials(): Promise<boolean> {
    return SMSServiceFactory.validateCredentials(this.config);
  }
}

