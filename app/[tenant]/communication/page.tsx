'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Send, MessageCircle, Bell, Settings } from 'lucide-react';

export default function CommunicationDashboard() {
  const [messages, setMessages] = useState([
    { id: '1', from: 'John Doe', role: 'Parent', message: 'Can you please provide the exam schedule?', time: '2 hours ago', unread: true },
    { id: '2', from: 'Mrs. Sarah', role: 'Teacher', message: 'Student performance has improved significantly', time: '4 hours ago', unread: false },
    { id: '3', from: 'Principal', role: 'Admin', message: 'Staff meeting scheduled for tomorrow', time: '1 day ago', unread: false },
  ]);

  const [broadcasts, setBroadcasts] = useState([
    { id: '1', title: 'Exam Results Released', channel: 'Email', recipients: 450, sent: '2024-03-15', status: 'Sent' },
    { id: '2', title: 'Fee Reminder', channel: 'SMS', recipients: 280, sent: '2024-03-10', status: 'Sent' },
    { id: '3', title: 'Holiday Announcement', channel: 'Both', recipients: 600, sent: '2024-03-01', status: 'Sent' },
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Communications & Messaging</h1>
            <p className="text-slate-400">Send messages, broadcasts, and manage notifications</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Broadcast
          </Button>
        </div>

        <Tabs defaultValue="messages" className="w-full">
          <TabsList className="bg-slate-800/50 border border-slate-700 mb-6">
            <TabsTrigger value="messages" className="text-slate-300 data-[state=active]:text-white flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="broadcasts" className="text-slate-300 data-[state=active]:text-white flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Broadcasts
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-slate-300 data-[state=active]:text-white">
              Templates
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-slate-300 data-[state=active]:text-white flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Message List */}
              <Card className="lg:col-span-1 bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white text-lg">Conversations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          msg.unread
                            ? 'bg-blue-900/20 border-blue-800/50'
                            : 'bg-slate-700/20 border-slate-600/30 hover:bg-slate-700/30'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-semibold text-white">{msg.from}</p>
                            <p className="text-xs text-slate-400">{msg.role}</p>
                          </div>
                          {msg.unread && <div className="w-2 h-2 bg-blue-400 rounded-full" />}
                        </div>
                        <p className="text-xs text-slate-400 mt-2 truncate">{msg.message}</p>
                        <p className="text-xs text-slate-500 mt-1">{msg.time}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Chat Area */}
              <Card className="lg:col-span-2 bg-slate-800/50 border-slate-700 backdrop-blur">
                <CardHeader>
                  <CardTitle className="text-white">Chat with John Doe</CardTitle>
                  <CardDescription className="text-slate-400">Parent</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 mb-4 h-96 overflow-y-auto">
                    <div className="flex justify-start">
                      <div className="max-w-xs bg-slate-700/50 p-3 rounded-lg rounded-tl-none border border-slate-600/30">
                        <p className="text-sm text-slate-300">Can you please provide the exam schedule?</p>
                        <p className="text-xs text-slate-500 mt-1">2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <div className="max-w-xs bg-blue-600/50 p-3 rounded-lg rounded-tr-none border border-blue-500/30">
                        <p className="text-sm text-white">Sure! The exam schedule will be sent to all parents by Friday.</p>
                        <p className="text-xs text-blue-200 mt-1">1 hour ago</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                    />
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="broadcasts" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Broadcast History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="px-4 py-3 text-left text-slate-300 font-semibold">Title</th>
                        <th className="px-4 py-3 text-left text-slate-300 font-semibold">Channel</th>
                        <th className="px-4 py-3 text-left text-slate-300 font-semibold">Recipients</th>
                        <th className="px-4 py-3 text-left text-slate-300 font-semibold">Sent Date</th>
                        <th className="px-4 py-3 text-left text-slate-300 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {broadcasts.map((bc) => (
                        <tr key={bc.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                          <td className="px-4 py-3 text-white">{bc.title}</td>
                          <td className="px-4 py-3 text-slate-400">{bc.channel}</td>
                          <td className="px-4 py-3 text-slate-400">{bc.recipients}</td>
                          <td className="px-4 py-3 text-slate-400 text-xs">{bc.sent}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-300 border border-green-800/50">
                              {bc.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Message Templates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Message templates interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-white">Communication Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">Communication settings interface will be displayed here</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

