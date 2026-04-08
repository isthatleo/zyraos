// Authentication utilities
import { AuthService } from '../../services/auth.service';

export class AuthUtils {
  // JWT utilities
  static generateAccessToken(payload: any): string {
    return AuthService.generateToken(payload, '1h');
  }

  static generateRefreshToken(payload: any): string {
    return AuthService.generateToken(payload, '30d');
  }

  static verifyAccessToken(token: string): any {
    return AuthService.verifyToken(token);
  }

  static verifyRefreshToken(token: string): any {
    return AuthService.verifyToken(token);
  }

  // Password utilities
  static async hashPassword(password: string): Promise<string> {
    return AuthService.hashPassword(password);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return AuthService.verifyPassword(password, hash);
  }

  // Session utilities
  static async createUserSession(userId: string): Promise<string> {
    return AuthService.createSession(userId);
  }

  static async validateUserSession(sessionId: string): Promise<any> {
    return AuthService.validateSession(sessionId);
  }

  static async destroyUserSession(sessionId: string): Promise<void> {
    return AuthService.destroySession(sessionId);
  }

  // Permission utilities
  static async checkPermission(userId: string, permission: string): Promise<boolean> {
    return AuthService.hasPermission(userId, permission);
  }

  static async getUserPermissions(userId: string): Promise<string[]> {
    // Implementation would query database for user permissions
    return ['read']; // Placeholder
  }

  static async hasRole(userId: string, role: string): Promise<boolean> {
    const roles = await AuthService.getUserRoles(userId);
    return roles.includes(role);
  }

  // OAuth helpers
  static getGoogleAuthUrl(): string {
    return AuthService.getOAuthUrl('google');
  }

  static getGitHubAuthUrl(): string {
    return AuthService.getOAuthUrl('github');
  }

  // Security utilities
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static sanitizeUserInput(input: string): string {
    // Basic sanitization - in production, use a proper sanitization library
    return input.replace(/[<>]/g, '');
  }
}
