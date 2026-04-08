// SMS interface
export interface SmsProvider {
  sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  getBalance?(): Promise<{ balance: number; currency: string }>;
}

export interface SmsConfig {
  provider: string;
  apiKey: string;
  apiSecret?: string;
  senderId?: string;
  baseUrl?: string;
}
