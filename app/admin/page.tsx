'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

interface User {
  id: string;
  email: string;
  name?: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data } = await authClient.getSession();
        
        if (!data?.user) {
          router.push('/login');
          return;
        }

        setUser(data.user as User);

        // Check if user is admin
        const response = await fetch('/api/user/check-admin');
        const result = await response.json();

        if (!result.isAdmin) {
          toast.error('Access denied: Admin privileges required');
          router.push('/dashboard');
          return;
        }

        setIsAdmin(true);
      } catch (error) {
        console.error('Error checking admin access:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Spinner />
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <p className="text-destructive font-semibold">Access Denied</p>
          <p className="text-muted-foreground">You do not have admin privileges</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-3xl font-bold">Roxan Super Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">System Administration & Management</p>
          </div>
          <div className="text-right">
            <p className="font-medium">{user?.name || 'Admin'}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6">
        <div className="grid gap-6">
          {/* Welcome Section */}
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-2xl font-bold mb-2">Welcome to Super Admin</h2>
            <p className="text-muted-foreground mb-4">
              You have been promoted to Super Admin status. You now have full system access and can:
            </p>
            <ul className="space-y-2 text-muted-foreground list-disc list-inside">
              <li>Manage all system users and their roles</li>
              <li>Configure system settings and preferences</li>
              <li>Access administrative tools and reports</li>
              <li>Promote users to admin roles</li>
              <li>Monitor system activity and logs</li>
            </ul>
          </div>

          {/* Admin Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Users Management */}
            <div className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                  <span className="text-lg">👥</span>
                </div>
                <h3 className="font-semibold">User Management</h3>
              </div>
              <p className="text-sm text-muted-foreground">Manage system users, roles, and permissions</p>
            </div>

            {/* System Settings */}
            <div className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                  <span className="text-lg">⚙️</span>
                </div>
                <h3 className="font-semibold">System Settings</h3>
              </div>
              <p className="text-sm text-muted-foreground">Configure system-wide settings and preferences</p>
            </div>

            {/* Reports & Analytics */}
            <div className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                  <span className="text-lg">📊</span>
                </div>
                <h3 className="font-semibold">Reports & Analytics</h3>
              </div>
              <p className="text-sm text-muted-foreground">View system reports and analytics data</p>
            </div>

            {/* Audit Logs */}
            <div className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                  <span className="text-lg">📋</span>
                </div>
                <h3 className="font-semibold">Audit Logs</h3>
              </div>
              <p className="text-sm text-muted-foreground">View system activity and audit logs</p>
            </div>

            {/* Database Management */}
            <div className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                  <span className="text-lg">🗄️</span>
                </div>
                <h3 className="font-semibold">Database Management</h3>
              </div>
              <p className="text-sm text-muted-foreground">Manage database and backups</p>
            </div>

            {/* Documentation */}
            <div className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                  <span className="text-lg">📖</span>
                </div>
                <h3 className="font-semibold">Documentation</h3>
              </div>
              <p className="text-sm text-muted-foreground">Access system documentation and guides</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-xl font-semibold mb-4">System Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-semibold">Operational</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="text-lg font-semibold">Super Admin</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">System Version</p>
                <p className="text-lg font-semibold">1.0.0</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Environment</p>
                <p className="text-lg font-semibold">Production</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

