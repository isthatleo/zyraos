/**
 * Messaging & Broadcasts Component
 * Path: src/components/messaging/broadcasts-page.tsx
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { MessageSquare, Send, Settings, BarChart3, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface RecentBroadcast {
  id: string;
  type: 'sms' | 'email';
  message: string;
  recipientCount: number;
  successCount: number;
  status: 'sent' | 'pending' | 'failed';
  sentAt: string;
}

export function BroadcastsPage() {
  const [channel, setChannel] = useState<'sms' | 'email'>('sms');
  const [targetAudience, setTargetAudience] = useState<string>('entire_school');
  const [message, setMessage] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [charCount, setCharCount] = useState(0);

  const [recentBroadcasts] = useState<RecentBroadcast[]>([
    {
      id: '1',
      type: 'sms',
      message: 'Attendance reminder for today. Please mark your attendance',
      recipientCount: 450,
      successCount: 445,
      status: 'sent',
      sentAt: '2024-03-15 14:30',
    },
    {
      id: '2',
      type: 'email',
      message: 'Parent-Teacher Conference scheduled for March 20, 2024',
      recipientCount: 300,
      successCount: 298,
      status: 'sent',
      sentAt: '2024-03-12 09:00',
    },
    {
      id: '3',
      type: 'sms',
      message: 'School closure notice - March 18 due to maintenance',
      recipientCount: 500,
      successCount: 485,
      status: 'sent',
      sentAt: '2024-03-10 16:45',
    },
  ]);

  const [broadcastStats] = useState([
    { date: 'Mar 1', sms: 250, email: 180 },
    { date: 'Mar 5', sms: 320, email: 200 },
    { date: 'Mar 10', sms: 485, email: 298 },
    { date: 'Mar 15', sms: 445, email: 250 },
  ]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setMessage(text);
    setCharCount(text.length);
  };

  const smsPages = Math.ceil(charCount / 160);
  const creditCost = smsPages * 1;

  const targetOptions = [
    { value: 'entire_school', label: 'Entire School Community' },
    { value: 'all_students', label: 'All Students' },
    { value: 'all_parents', label: 'All Parents' },
    { value: 'all_teachers', label: 'All Teachers' },
    { value: 'all_staff', label: 'All Staff' },
    { value: 'custom', label: 'Custom Numbers' },
    { value: 'individual', label: 'Specific Individual' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Messaging & Broadcasts</h1>
        <p className="text-slate-400">Send SMS and email communications to your school community</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Broadcast Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Channel Selection */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Select Channel</CardTitle>
              <CardDescription className="text-slate-400">Choose how to send your message</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="sms"
                    checked={channel === 'sms'}
                    onChange={(e) => setChannel(e.target.value as 'sms' | 'email')}
                    className="w-4 h-4"
                  />
                  <span className="text-white">SMS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="email"
                    checked={channel === 'email'}
                    onChange={(e) => setChannel(e.target.value as 'sms' | 'email')}
                    className="w-4 h-4"
                  />
                  <span className="text-white">Email</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Target Audience */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Target Audience</CardTitle>
              <CardDescription className="text-slate-400">Select who should receive this message</CardDescription>
            </CardHeader>
            <CardContent>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                {targetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>

          {/* Message Composition */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Compose Message</CardTitle>
              <CardDescription className="text-slate-400">
                {channel === 'sms' ? 'SMS Credits: 1 unit per recipient' : 'Email message'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">Message Content</label>
                <textarea
                  value={message}
                  onChange={handleMessageChange}
                  placeholder="Type your message here..."
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 h-32 resize-none"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-slate-400">
                    {charCount} characters {channel === 'sms' && `• ${smsPages} page(s) • ${creditCost} credits`}
                  </span>
                </div>
              </div>

              {/* Schedule Option */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleEnabled}
                    onChange={(e) => setScheduleEnabled(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-white">Schedule for later</span>
                </label>

                {scheduleEnabled && (
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />
                )}
              </div>

              {/* Send Button */}
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2">
                <Send className="h-4 w-4" />
                {channel === 'sms' ? 'Send SMS' : 'Send Email'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Recent Broadcasts */}
        <div className="space-y-6">
          {/* SMS Gateway Status */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-sm text-white">SMS Gateway</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Status:</span>
                <span className="text-sm font-semibold text-green-400">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Balance:</span>
                <span className="text-sm font-semibold text-white">2,450 credits</span>
              </div>
              <Button size="sm" variant="outline" className="w-full border-slate-600 text-slate-300">
                <Settings className="h-3 w-3 mr-2" />
                Configure
              </Button>
            </CardContent>
          </Card>

          {/* Recent Broadcasts */}
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-sm text-white">Recent Broadcasts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-80 overflow-y-auto">
              {recentBroadcasts.map((broadcast) => (
                <div
                  key={broadcast.id}
                  className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/30 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      {broadcast.type === 'sms' ? '📱 SMS' : '📧 Email'}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">{broadcast.sentAt}</span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2">{broadcast.message}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      {broadcast.successCount}/{broadcast.recipientCount}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        broadcast.status === 'sent'
                          ? 'bg-green-900/30 text-green-300 border border-green-800/50'
                          : broadcast.status === 'pending'
                          ? 'bg-yellow-900/30 text-yellow-300 border border-yellow-800/50'
                          : 'bg-red-900/30 text-red-300 border border-red-800/50'
                      }`}
                    >
                      {broadcast.status === 'sent' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {broadcast.status}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Analytics */}
      <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white">Broadcast Analytics</CardTitle>
          <CardDescription className="text-slate-400">SMS and email delivery trends</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={broadcastStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis stroke="#94a3b8" dataKey="date" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
              <Legend />
              <Line type="monotone" dataKey="sms" stroke="#3B82F6" name="SMS Sent" strokeWidth={2} />
              <Line type="monotone" dataKey="email" stroke="#10B981" name="Email Sent" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

