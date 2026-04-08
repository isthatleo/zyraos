// SMS Provider Interface
export interface SMSProvider {
  send(phoneNumber: string, message: string): Promise<{ success: boolean; messageId: string; error?: string }>;
  getBalance(): Promise<number>;
  validateCredentials(): Promise<boolean>;
}

export interface SMSConfig {
  provider: 'arkesel' | 'hubtel' | 'twilio' | 'termii' | 'mnotify';
  apiKey: string;
  apiSecret?: string;
  senderId: string;
  isActive: boolean;
}

