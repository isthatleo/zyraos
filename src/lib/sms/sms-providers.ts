import { SMSProvider, SMSConfig } from './sms-provider.interface';

// Arkesel Provider Implementation
export class ArkeselProvider implements SMSProvider {
  private apiKey: string;
  private senderId: string;
  private baseUrl = 'https://sms.arkesel.com/api/v2/sms/send';

  constructor(config: SMSConfig) {
    if (config.provider !== 'arkesel') {
      throw new Error('Invalid provider for ArkeselProvider');
    }
    this.apiKey = config.apiKey;
    this.senderId = config.senderId;
  }

  async send(phoneNumber: string, message: string): Promise<{ success: boolean; messageId: string; error?: string }> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          sender_id: this.senderId,
          recipients: [{ phone_number: phoneNumber }],
          message: message,
        }),
      });

      const data = await response.json();

      if (data.status === 'success' || data.code === 0) {
        return {
          success: true,
          messageId: data.message_id || data.data?.message_id || `arkesel_${Date.now()}`,
        };
      }

      return {
        success: false,
        messageId: '',
        error: data.message || 'Failed to send SMS',
      };
    } catch (error: any) {
      return {
        success: false,
        messageId: '',
        error: error.message || 'SMS sending error',
      };
    }
  }

  async getBalance(): Promise<number> {
    try {
      const response = await fetch(`https://sms.arkesel.com/api/v2/account/balance?api_key=${this.apiKey}`);
      const data = await response.json();
      return data.balance || 0;
    } catch {
      return 0;
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const balance = await this.getBalance();
      return balance >= 0;
    } catch {
      return false;
    }
  }
}

// Hubtel Provider Implementation
export class HubtelProvider implements SMSProvider {
  private apiKey: string;
  private senderId: string;
  private baseUrl = 'https://api.hubtel.com/v1/sms/send';

  constructor(config: SMSConfig) {
    if (config.provider !== 'hubtel') {
      throw new Error('Invalid provider for HubtelProvider');
    }
    this.apiKey = config.apiKey;
    this.senderId = config.senderId;
  }

  async send(phoneNumber: string, message: string): Promise<{ success: boolean; messageId: string; error?: string }> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          From: this.senderId,
          To: phoneNumber,
          Content: message,
        }),
      });

      const data = await response.json();

      if (response.ok && data.Status === 0) {
        return {
          success: true,
          messageId: data.MessageId || `hubtel_${Date.now()}`,
        };
      }

      return {
        success: false,
        messageId: '',
        error: data.StatusText || 'Failed to send SMS',
      };
    } catch (error: any) {
      return {
        success: false,
        messageId: '',
        error: error.message || 'SMS sending error',
      };
    }
  }

  async getBalance(): Promise<number> {
    try {
      const response = await fetch('https://api.hubtel.com/v1/account/balance', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      const data = await response.json();
      return data.Balance || 0;
    } catch {
      return 0;
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const balance = await this.getBalance();
      return balance >= 0;
    } catch {
      return false;
    }
  }
}

// Twilio Provider Implementation
export class TwilioProvider implements SMSProvider {
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;
  private baseUrl: string;

  constructor(config: SMSConfig) {
    if (config.provider !== 'twilio') {
      throw new Error('Invalid provider for TwilioProvider');
    }
    const [accountSid, authToken] = config.apiKey.split(':');
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.phoneNumber = config.senderId;
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}`;
  }

  async send(phoneNumber: string, message: string): Promise<{ success: boolean; messageId: string; error?: string }> {
    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      const response = await fetch(`${this.baseUrl}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: this.phoneNumber,
          To: phoneNumber,
          Body: message,
        }).toString(),
      });

      const data = await response.json();

      if (response.ok && data.sid) {
        return {
          success: true,
          messageId: data.sid,
        };
      }

      return {
        success: false,
        messageId: '',
        error: data.message || 'Failed to send SMS',
      };
    } catch (error: any) {
      return {
        success: false,
        messageId: '',
        error: error.message || 'SMS sending error',
      };
    }
  }

  async getBalance(): Promise<number> {
    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      const response = await fetch(`${this.baseUrl}.json`, {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      const data = await response.json();
      return parseFloat(data.balance) || 0;
    } catch {
      return 0;
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const balance = await this.getBalance();
      return balance >= 0;
    } catch {
      return false;
    }
  }
}

// Termii Provider Implementation
export class TermiiProvider implements SMSProvider {
  private apiKey: string;
  private senderId: string;
  private baseUrl = 'https://api.ng.termii.com/api/sms/send';

  constructor(config: SMSConfig) {
    if (config.provider !== 'termii') {
      throw new Error('Invalid provider for TermiiProvider');
    }
    this.apiKey = config.apiKey;
    this.senderId = config.senderId;
  }

  async send(phoneNumber: string, message: string): Promise<{ success: boolean; messageId: string; error?: string }> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          to: phoneNumber,
          from: this.senderId,
          sms: message,
          type: 0,
          channel: 'generic',
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        return {
          success: true,
          messageId: data.message_id || `termii_${Date.now()}`,
        };
      }

      return {
        success: false,
        messageId: '',
        error: data.message || 'Failed to send SMS',
      };
    } catch (error: any) {
      return {
        success: false,
        messageId: '',
        error: error.message || 'SMS sending error',
      };
    }
  }

  async getBalance(): Promise<number> {
    try {
      const response = await fetch('https://api.ng.termii.com/api/user/balance', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data.balance || 0;
    } catch {
      return 0;
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const balance = await this.getBalance();
      return balance >= 0;
    } catch {
      return false;
    }
  }
}

// mNotify Provider Implementation
export class MNotifyProvider implements SMSProvider {
  private apiKey: string;
  private accountId: string;
  private senderId: string;
  private baseUrl = 'https://api.mnotify.com.gh/api/sms/quick';

  constructor(config: SMSConfig) {
    if (config.provider !== 'mnotify') {
      throw new Error('Invalid provider for MNotifyProvider');
    }
    const [apiKey, accountId] = config.apiKey.split(':');
    this.apiKey = apiKey;
    this.accountId = accountId || '';
    this.senderId = config.senderId;
  }

  async send(phoneNumber: string, message: string): Promise<{ success: boolean; messageId: string; error?: string }> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          to: phoneNumber,
          sender_id: this.senderId,
          text: message,
        }),
      });

      const data = await response.json();

      if (data.code === '201') {
        return {
          success: true,
          messageId: data.message_id || `mnotify_${Date.now()}`,
        };
      }

      return {
        success: false,
        messageId: '',
        error: data.message || 'Failed to send SMS',
      };
    } catch (error: any) {
      return {
        success: false,
        messageId: '',
        error: error.message || 'SMS sending error',
      };
    }
  }

  async getBalance(): Promise<number> {
    try {
      const response = await fetch('https://api.mnotify.com.gh/api/user/get-balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.apiKey,
        }),
      });

      const data = await response.json();
      return data.balance || 0;
    } catch {
      return 0;
    }
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const balance = await this.getBalance();
      return balance >= 0;
    } catch {
      return false;
    }
  }
}

