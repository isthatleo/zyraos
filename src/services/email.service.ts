// Email service
interface EmailConfig {
  provider: string;
  apiKey?: string;
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: string;
  fromName?: string;
}

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export class EmailService {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const result = await this.sendViaProvider(options);
      console.log(`Email ${result.success ? 'sent' : 'failed'} to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
      return result;
    } catch (error) {
      console.error('Email service error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async sendViaProvider(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    switch (this.config.provider.toLowerCase()) {
      case 'sendgrid':
        return this.sendViaSendGrid(options);
      case 'mailgun':
        return this.sendViaMailgun(options);
      case 'smtp':
        return this.sendViaSMTP(options);
      default:
        return this.sendViaSendGrid(options); // Default fallback
    }
  }

  private async sendViaSendGrid(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{
            to: Array.isArray(options.to) ? options.to.map(email => ({ email })) : [{ email: options.to }],
            cc: options.cc ? (Array.isArray(options.cc) ? options.cc.map(email => ({ email })) : [{ email: options.cc }]) : undefined,
            bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.map(email => ({ email })) : [{ email: options.bcc }]) : undefined,
            subject: options.subject,
          }],
          from: {
            email: this.config.from,
            name: this.config.fromName,
          },
          content: [
            options.text ? { type: 'text/plain', value: options.text } : undefined,
            options.html ? { type: 'text/html', value: options.html } : undefined,
          ].filter(Boolean),
          attachments: options.attachments?.map(att => ({
            content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
            filename: att.filename,
            type: att.contentType,
            disposition: 'attachment',
          })),
        }),
      });

      if (response.ok) {
        const messageId = response.headers.get('x-message-id');
        return { success: true, messageId: messageId || undefined };
      } else {
        const error = await response.text();
        return { success: false, error };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'SendGrid error' };
    }
  }

  private async sendViaMailgun(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const formData = new FormData();
      formData.append('from', `${this.config.fromName || 'App'} <${this.config.from}>`);
      formData.append('to', Array.isArray(options.to) ? options.to.join(',') : options.to);
      formData.append('subject', options.subject);

      if (options.cc) {
        formData.append('cc', Array.isArray(options.cc) ? options.cc.join(',') : options.cc);
      }
      if (options.bcc) {
        formData.append('bcc', Array.isArray(options.bcc) ? options.bcc.join(',') : options.bcc);
      }
      if (options.text) {
        formData.append('text', options.text);
      }
      if (options.html) {
        formData.append('html', options.html);
      }

      options.attachments?.forEach((att, index) => {
        const blob = new Blob([att.content], { type: att.contentType || 'application/octet-stream' });
        formData.append(`attachment`, blob, att.filename);
      });

      const response = await fetch(`https://api.mailgun.net/v3/${this.config.apiKey?.split(':')[0]}.mailgun.org/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.config.apiKey}`).toString('base64')}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, messageId: data.id };
      } else {
        const error = await response.text();
        return { success: false, error };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Mailgun error' };
    }
  }

  private async sendViaSMTP(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // SMTP implementation would require nodemailer
    // For now, return placeholder
    console.log('SMTP email sending not implemented yet');
    return { success: false, error: 'SMTP not implemented' };
  }

  // Template helpers
  static createWelcomeEmail(userName: string, loginUrl: string): EmailOptions {
    return {
      to: '', // Set by caller
      subject: 'Welcome to CompuSphere!',
      html: `
        <h1>Welcome ${userName}!</h1>
        <p>Your account has been created successfully.</p>
        <p><a href="${loginUrl}">Click here to login</a></p>
      `,
      text: `Welcome ${userName}! Your account has been created. Login at: ${loginUrl}`,
    };
  }

  static createPasswordResetEmail(resetUrl: string): EmailOptions {
    return {
      to: '', // Set by caller
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset</h1>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetUrl}">Reset Password</a></p>
        <p>This link will expire in 1 hour.</p>
      `,
      text: `Reset your password: ${resetUrl} (expires in 1 hour)`,
    };
  }
}
