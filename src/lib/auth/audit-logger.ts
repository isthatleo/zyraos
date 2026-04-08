// Audit logger utilities
export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LOGIN = 'login',
  LOGOUT = 'logout',
  PERMISSION_CHANGE = 'permission_change',
  ROLE_CHANGE = 'role_change',
  PASSWORD_CHANGE = 'password_change',
  EXPORT = 'export',
  IMPORT = 'import',
}

export class AuditLogger {
  private static events: AuditEvent[] = [];
  private static maxEventsInMemory = 10000;

  static async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event,
    };

    // Store in memory (in production, would store in database)
    this.events.push(auditEvent);

    // Maintain max events limit
    if (this.events.length > this.maxEventsInMemory) {
      this.events = this.events.slice(-this.maxEventsInMemory);
    }

    // Log to console for development
    console.log(`[AUDIT] ${auditEvent.action.toUpperCase()} ${auditEvent.resource}${auditEvent.resourceId ? `:${auditEvent.resourceId}` : ''} by ${auditEvent.userId || 'system'} - ${auditEvent.success ? 'SUCCESS' : 'FAILED'}`);

    // In production, would also send to external logging service
    if (!auditEvent.success && auditEvent.errorMessage) {
      console.error(`[AUDIT ERROR] ${auditEvent.errorMessage}`);
    }
  }

  static async logUserAction(
    userId: string,
    action: AuditAction,
    resource: string,
    resourceId?: string,
    details?: Record<string, any>,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource,
      resourceId,
      details,
      success,
      errorMessage,
    });
  }

  static async logSystemAction(
    action: AuditAction,
    resource: string,
    resourceId?: string,
    details?: Record<string, any>,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      action,
      resource,
      resourceId,
      details,
      success,
      errorMessage,
    });
  }

  static async logAuthEvent(
    userId: string | undefined,
    action: 'login' | 'logout' | 'failed_login',
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource: 'auth',
      details: { ipAddress, userAgent },
      ipAddress,
      userAgent,
      success,
      errorMessage,
    });
  }

  static getEvents(
    filters?: {
      userId?: string;
      action?: string;
      resource?: string;
      success?: boolean;
      startDate?: Date;
      endDate?: Date;
    },
    limit: number = 100
  ): AuditEvent[] {
    let filtered = this.events;

    if (filters) {
      filtered = filtered.filter(event => {
        if (filters.userId && event.userId !== filters.userId) return false;
        if (filters.action && event.action !== filters.action) return false;
        if (filters.resource && event.resource !== filters.resource) return false;
        if (filters.success !== undefined && event.success !== filters.success) return false;
        if (filters.startDate && event.timestamp < filters.startDate) return false;
        if (filters.endDate && event.timestamp > filters.endDate) return false;
        return true;
      });
    }

    return filtered.slice(-limit).reverse(); // Most recent first
  }

  static getUserActivity(userId: string, limit: number = 50): AuditEvent[] {
    return this.getEvents({ userId }, limit);
  }

  static getResourceActivity(resource: string, resourceId?: string, limit: number = 50): AuditEvent[] {
    return this.getEvents({ resource }, limit).filter(event =>
      !resourceId || event.resourceId === resourceId
    );
  }

  static getFailedEvents(limit: number = 50): AuditEvent[] {
    return this.getEvents({ success: false }, limit);
  }

  static generateReport(startDate: Date, endDate: Date): {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    eventsByAction: Record<string, number>;
    eventsByResource: Record<string, number>;
    topUsers: Array<{ userId: string; count: number }>;
  } {
    const events = this.events.filter(e =>
      e.timestamp >= startDate && e.timestamp <= endDate
    );

    const eventsByAction = events.reduce((acc, event) => {
      acc[event.action] = (acc[event.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const eventsByResource = events.reduce((acc, event) => {
      acc[event.resource] = (acc[event.resource] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const userCounts = events.reduce((acc, event) => {
      if (event.userId) {
        acc[event.userId] = (acc[event.userId] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topUsers = Object.entries(userCounts)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalEvents: events.length,
      successfulEvents: events.filter(e => e.success).length,
      failedEvents: events.filter(e => !e.success).length,
      eventsByAction,
      eventsByResource,
      topUsers,
    };
  }

  static exportEvents(format: 'json' | 'csv' = 'json', filters?: any): string {
    const events = this.getEvents(filters, 10000); // Export up to 10k events

    if (format === 'json') {
      return JSON.stringify(events, null, 2);
    } else {
      const headers = ['id', 'timestamp', 'userId', 'action', 'resource', 'resourceId', 'success', 'errorMessage'];
      const rows = events.map(event => [
        event.id,
        event.timestamp.toISOString(),
        event.userId || '',
        event.action,
        event.resource,
        event.resourceId || '',
        event.success.toString(),
        event.errorMessage || '',
      ]);

      return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }
  }

  private static generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static clearEvents(): void {
    this.events = [];
  }

  static getStats(): { totalEvents: number; memoryUsage: number } {
    return {
      totalEvents: this.events.length,
      memoryUsage: JSON.stringify(this.events).length,
    };
  }
}
