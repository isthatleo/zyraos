// Notification service
import { EmailService } from './email.service';
import { SmsService } from '../modules/sms/sms.service';
import { SmsConfig } from '../modules/sms/sms.interface';

interface NotificationConfig {
  email?: {
    provider: string;
    apiKey?: string;
    from: string;
    fromName?: string;
  };
  sms?: SmsConfig;
}

interface NotificationOptions {
  type: 'email' | 'sms' | 'both';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  userId?: string;
  email?: string;
  phone?: string;
  template: string;
  data?: Record<string, any>;
}

export class NotificationService {
  private emailService?: EmailService;
  private smsService?: SmsService;
  private templates: Map<string, NotificationTemplate> = new Map();

  constructor(config: NotificationConfig) {
    if (config.email) {
      this.emailService = new EmailService(config.email);
    }
    if (config.sms) {
      this.smsService = new SmsService(config.sms);
    }
    this.initializeTemplates();
  }

  async sendNotification(options: NotificationOptions): Promise<{ success: boolean; emailResult?: any; smsResult?: any; error?: string }> {
    try {
      const template = this.templates.get(options.template);
      if (!template) {
        return { success: false, error: `Template '${options.template}' not found` };
      }

      const rendered = this.renderTemplate(template, options.data || {});

      let emailResult;
      let smsResult;

      if ((options.type === 'email' || options.type === 'both') && this.emailService && options.email) {
        emailResult = await this.emailService.sendEmail({
          to: options.email,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        });
      }

      if ((options.type === 'sms' || options.type === 'both') && this.smsService && options.phone) {
        smsResult = await this.smsService.sendSms(options.phone, rendered.sms || rendered.text || '');
      }

      const success = (emailResult?.success !== false) && (smsResult?.success !== false);

      // Log notification
      console.log(`Notification sent: ${options.template} to ${options.email || options.phone} - Success: ${success}`);

      return { success, emailResult, smsResult };
    } catch (error) {
      console.error('Notification service error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async sendBulkNotifications(notifications: NotificationOptions[]): Promise<Array<{ success: boolean; error?: string }>> {
    const results = await Promise.allSettled(
      notifications.map(notification => this.sendNotification(notification))
    );

    return results.map(result =>
      result.status === 'fulfilled'
        ? { success: result.value.success, error: result.value.error }
        : { success: false, error: 'Promise rejected' }
    );
  }

  private renderTemplate(template: NotificationTemplate, data: Record<string, any>): RenderedTemplate {
    const render = (text: string) => {
      return text.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
    };

    return {
      subject: render(template.subject),
      html: template.html ? render(template.html) : undefined,
      text: template.text ? render(template.text) : undefined,
      sms: template.sms ? render(template.sms) : undefined,
    };
  }

  private initializeTemplates(): void {
    // Welcome notification
    this.templates.set('welcome', {
      subject: 'Welcome to CompuSphere, {{name}}!',
      html: `
        <h1>Welcome {{name}}!</h1>
        <p>Your account has been created successfully.</p>
        <p>Login URL: <a href="{{loginUrl}}">{{loginUrl}}</a></p>
      `,
      text: 'Welcome {{name}}! Your account is ready. Login at: {{loginUrl}}',
      sms: 'Welcome {{name}}! Your CompuSphere account is ready.',
    });

    // Password reset
    this.templates.set('password_reset', {
      subject: 'Password Reset Request',
      html: `
        <h1>Password Reset</h1>
        <p>Click here to reset your password: <a href="{{resetUrl}}">{{resetUrl}}</a></p>
        <p>Expires in 1 hour.</p>
      `,
      text: 'Reset your password: {{resetUrl}} (expires in 1 hour)',
      sms: 'Password reset link: {{resetUrl}}',
    });

    // Assignment due
    this.templates.set('assignment_due', {
      subject: 'Assignment Due Soon',
      html: `
        <h1>Assignment Due</h1>
        <p>{{assignmentName}} is due on {{dueDate}}.</p>
        <p>Subject: {{subject}}</p>
      `,
      text: '{{assignmentName}} due {{dueDate}} for {{subject}}',
      sms: '{{assignmentName}} due {{dueDate}}',
    });

    // Grade posted
    this.templates.set('grade_posted', {
      subject: 'New Grade Posted',
      html: `
        <h1>New Grade</h1>
        <p>You received {{grade}} in {{subject}}.</p>
        <p>Assignment: {{assignmentName}}</p>
      `,
      text: 'Grade posted: {{grade}} in {{subject}} for {{assignmentName}}',
      sms: 'New grade: {{grade}} in {{subject}}',
    });
  }

  // Queue system for delayed notifications
  async queueNotification(options: NotificationOptions & { delay?: number }): Promise<void> {
    // Implementation would use a queue system like Bull or similar
    // For now, just delay with setTimeout
    setTimeout(() => {
      this.sendNotification(options);
    }, options.delay || 0);
  }

  // Get notification history (would require database)
  async getNotificationHistory(userId: string, limit: number = 50): Promise<any[]> {
    // Implementation would query database
    return []; // Placeholder
  }
}

interface NotificationTemplate {
  subject: string;
  html?: string;
  text?: string;
  sms?: string;
}

interface RenderedTemplate {
  subject: string;
  html?: string;
  text?: string;
  sms?: string;
}
