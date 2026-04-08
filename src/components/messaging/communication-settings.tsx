/**
 * Communication Settings Component
 * Path: src/components/messaging/communication-settings.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Mail, CheckCircle, AlertCircle, Save } from 'lucide-react';

export function CommunicationSettingsComponent() {
  const [smsProvider, setSmsProvider] = useState({
    name: 'mnotify',
    apiKey: '••••••••••••••••',
    isActive: true,
  });

  const [emailProvider, setEmailProvider] = useState({
    name: 'resend',
    apiKey: '••••••••••••••••',
    isActive: true,
  });

  const [automatedNotifications, setAutomatedNotifications] = useState({
    absenceNotifications: true,
    gradeNotifications: true,
    feeNotifications: true,
    eventReminders: true,
  });

  const [testResults, setTestResults] = useState<{
    sms?: boolean;
    email?: boolean;
  }>({});

  const [saving, setSaving] = useState(false);

  const handleTestSMS = async () => {
    try {
      const response = await fetch('/api/messaging/test-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      setTestResults((prev) => ({
        ...prev,
        sms: response.ok,
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        sms: false,
      }));
    }
  };

  const handleTestEmail = async () => {
    try {
      const response = await fetch('/api/messaging/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      setTestResults((prev) => ({
        ...prev,
        email: response.ok,
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        email: false,
      }));
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/messaging/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smsProvider,
          emailProvider,
          automatedNotifications,
        }),
      });

      if (response.ok) {
        // Show success toast
        console.log('Settings saved successfully');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Communication Settings</h1>
        <p className="text-slate-400">Configure SMS, Email, and notification providers</p>
      </div>

      {/* SMS Provider Configuration */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-white">SMS Gateway Configuration</CardTitle>
          </div>
          <CardDescription className="text-slate-400">Configure your SMS provider</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">SMS Provider</label>
              <select
                value={smsProvider.name}
                onChange={(e) =>
                  setSmsProvider((prev) => ({ ...prev, name: e.target.value as any }))
                }
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="mnotify">mNotify</option>
                <option value="arkesel">Arkesel</option>
                <option value="hubtel">Hubtel</option>
                <option value="twilio">Twilio</option>
                <option value="termii">Termii</option>
              </select>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">API Key</label>
              <Input
                type="password"
                value={smsProvider.apiKey}
                onChange={(e) =>
                  setSmsProvider((prev) => ({ ...prev, apiKey: e.target.value }))
                }
                placeholder="Enter API key"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Status and Test */}
          <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
            <div className="flex items-center gap-2">
              {smsProvider.isActive ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-sm text-green-400">Active</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <span className="text-sm text-red-400">Inactive</span>
                </>
              )}
            </div>
            <Button
              onClick={handleTestSMS}
              variant="outline"
              className="border-slate-600 text-slate-300"
            >
              Test Connection
            </Button>
          </div>

          {testResults.sms !== undefined && (
            <div
              className={`p-3 rounded-lg text-sm ${
                testResults.sms
                  ? 'bg-green-900/30 text-green-300 border border-green-800/50'
                  : 'bg-red-900/30 text-red-300 border border-red-800/50'
              }`}
            >
              {testResults.sms ? '✓ SMS provider connected successfully' : '✗ Failed to connect to SMS provider'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Provider Configuration */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-green-400" />
            <CardTitle className="text-white">Email Provider Configuration</CardTitle>
          </div>
          <CardDescription className="text-slate-400">Configure your email delivery service</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">Email Provider</label>
              <select
                value={emailProvider.name}
                onChange={(e) =>
                  setEmailProvider((prev) => ({ ...prev, name: e.target.value as any }))
                }
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="resend">Resend</option>
                <option value="sendgrid">SendGrid</option>
                <option value="mailgun">Mailgun</option>
              </select>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm text-slate-300 mb-2">API Key</label>
              <Input
                type="password"
                value={emailProvider.apiKey}
                onChange={(e) =>
                  setEmailProvider((prev) => ({ ...prev, apiKey: e.target.value }))
                }
                placeholder="Enter API key"
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          {/* Status and Test */}
          <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
            <div className="flex items-center gap-2">
              {emailProvider.isActive ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-sm text-green-400">Active</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <span className="text-sm text-red-400">Inactive</span>
                </>
              )}
            </div>
            <Button
              onClick={handleTestEmail}
              variant="outline"
              className="border-slate-600 text-slate-300"
            >
              Test Connection
            </Button>
          </div>

          {testResults.email !== undefined && (
            <div
              className={`p-3 rounded-lg text-sm ${
                testResults.email
                  ? 'bg-green-900/30 text-green-300 border border-green-800/50'
                  : 'bg-red-900/30 text-red-300 border border-red-800/50'
              }`}
            >
              {testResults.email ? '✓ Email provider connected successfully' : '✗ Failed to connect to email provider'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Automated Notifications */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Automated Notifications</CardTitle>
          <CardDescription className="text-slate-400">
            Configure system-triggered messages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              key: 'absenceNotifications',
              label: 'Absence Notifications',
              description: 'Send SMS/Email when a student is marked absent',
            },
            {
              key: 'gradeNotifications',
              label: 'Grade Notifications',
              description: 'Notify parents when grades are published',
            },
            {
              key: 'feeNotifications',
              label: 'Fee Notifications',
              description: 'Send reminders for pending fee payments',
            },
            {
              key: 'eventReminders',
              label: 'Event Reminders',
              description: 'Send reminders for upcoming school events',
            },
          ].map((notification) => (
            <label
              key={notification.key}
              className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 cursor-pointer hover:bg-slate-700/50"
            >
              <input
                type="checkbox"
                checked={
                  automatedNotifications[
                    notification.key as keyof typeof automatedNotifications
                  ]
                }
                onChange={(e) =>
                  setAutomatedNotifications((prev) => ({
                    ...prev,
                    [notification.key]: e.target.checked,
                  }))
                }
                className="mt-1 w-4 h-4"
              />
              <div>
                <p className="text-sm font-semibold text-white">{notification.label}</p>
                <p className="text-xs text-slate-400">{notification.description}</p>
              </div>
            </label>
          ))}
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSaveSettings}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
      >
        <Save className="h-4 w-4" />
        {saving ? 'Saving...' : 'Save Settings'}
      </Button>
    </div>
  );
}

