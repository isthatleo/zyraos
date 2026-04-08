// SMS service - Orchestration layer
import { SmsService as SmsModuleService } from '../modules/sms/sms.service';
import { SmsConfig } from '../modules/sms/sms.interface';

export class SmsService {
  private smsModule: SmsModuleService;

  constructor(config: SmsConfig) {
    this.smsModule = new SmsModuleService(config);
  }

  async sendSms(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.smsModule.sendSms(to, message);
  }

  async sendBulkSms(recipients: string[], message: string): Promise<Array<{ to: string; success: boolean; messageId?: string; error?: string }>> {
    return this.smsModule.sendBulkSms(recipients, message);
  }

  async getBalance(): Promise<{ balance: number; currency: string }> {
    return this.smsModule.getBalance();
  }

  switchProvider(newConfig: SmsConfig): void {
    this.smsModule.switchProvider(newConfig);
  }

  getCurrentProvider(): string {
    return this.smsModule.getCurrentProvider();
  }

  // Additional orchestration methods
  async sendWelcomeSms(phone: string, userName: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Welcome to CompuSphere, ${userName}! Your account has been created successfully.`;
    return this.sendSms(phone, message);
  }

  async sendPasswordResetSms(phone: string, resetCode: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Your password reset code is: ${resetCode}. This code expires in 10 minutes.`;
    return this.sendSms(phone, message);
  }

  async sendAssignmentNotification(phone: string, assignmentName: string, dueDate: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `Reminder: ${assignmentName} is due on ${dueDate}.`;
    return this.sendSms(phone, message);
  }

  async sendGradeNotification(phone: string, subject: string, grade: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const message = `New grade posted: ${grade} in ${subject}.`;
    return this.sendSms(phone, message);
  }
}
