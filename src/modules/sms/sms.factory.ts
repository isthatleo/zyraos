// SMS factory
import { SmsProvider, SmsConfig } from './sms.interface';
import { TwilioProvider } from './providers/twilio.provider';
import { TermiiProvider } from './providers/termii.provider';
import { HubtelProvider } from './providers/hubtel.provider';
import { MNotifyProvider } from './providers/mnotify.provider';

export class SmsFactory {
  static createProvider(config: SmsConfig): SmsProvider {
    switch (config.provider.toLowerCase()) {
      case 'twilio':
        return new TwilioProvider(config);
      case 'termii':
        return new TermiiProvider(config);
      case 'hubtel':
        return new HubtelProvider(config);
      case 'mnotify':
        return new MNotifyProvider(config);
      default:
        throw new Error(`Unsupported SMS provider: ${config.provider}`);
    }
  }

  static getAvailableProviders(): string[] {
    return ['twilio', 'termii', 'hubtel', 'mnotify'];
  }
}
