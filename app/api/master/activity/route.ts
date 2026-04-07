import { NextResponse } from 'next/server';
import { masterDb } from '@/lib/db';
import { auditLogsTable, platformAdminsTable } from '@/lib/db-schema';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  try {
    const logs = await masterDb
      .select({
        id: auditLogsTable.id,
        timestamp: auditLogsTable.createdAt,
        user: platformAdminsTable.name,
        action: auditLogsTable.action,
        resource: auditLogsTable.resource,
        ip: auditLogsTable.ipAddress,
        status: auditLogsTable.status,
        details: auditLogsTable.changes,
      })
      .from(auditLogsTable)
      .leftJoin(platformAdminsTable, eq(auditLogsTable.adminId, platformAdminsTable.id))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(100);

    const formattedLogs = logs.map(log => ({
      ...log,
      timestamp: log.timestamp ? new Date(log.timestamp).toISOString().replace('T', ' ').substring(0, 19) : 'N/A',
      user: log.user || 'System',
      details: typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)
    }));

    return NextResponse.json({ logs: formattedLogs });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    return NextResponse.json(
      { logs: [], error: 'Failed to fetch activity logs' },
      { status: 500 }
    );
  }
}
