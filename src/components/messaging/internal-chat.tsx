/**
 * Internal Chat Component
 * Path: src/components/messaging/internal-chat.tsx
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Phone, Info, Search, Clock, CheckCheck } from 'lucide-react';
import { useMessaging } from '@/hooks/use-messaging';

interface ChatUser {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export function InternalChatComponent({ schoolId, userId }: { schoolId: string; userId: string }) {
  const { conversations, messages, selectedConversation, sendMessage } = useMessaging({
    schoolId,
    userId,
  });

  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [recentUsers] = useState<ChatUser[]>([
    {
      id: '1',
      name: 'Sarah Johnson',
      role: 'Teacher',
      isOnline: true,
      avatar: '👩‍🏫',
    },
    {
      id: '2',
      name: 'John Smith',
      role: 'Principal',
      isOnline: true,
      avatar: '👨‍💼',
    },
    {
      id: '3',
      name: 'Mary Davis',
      role: 'Parent',
      isOnline: false,
      lastSeen: '2 hours ago',
      avatar: '👩‍🦰',
    },
    {
      id: '4',
      name: 'Alex Wilson',
      role: 'Student',
      isOnline: true,
      avatar: '👨‍🎓',
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedUser) return;

    try {
      await sendMessage(messageInput, selectedUser.id);
      setMessageInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
      {/* Users List */}
      <div className="lg:col-span-1">
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur h-full flex flex-col">
          <CardHeader>
            <CardTitle className="text-white">Messages</CardTitle>
            <CardDescription className="text-slate-400">Your conversations</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-2">
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* User List */}
            {recentUsers.map((user) => (
              <button
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  selectedUser?.id === user.id
                    ? 'bg-blue-600/20 border border-blue-500'
                    : 'bg-slate-700/30 border border-slate-600/30 hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-lg">
                      {user.avatar}
                    </div>
                    {user.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.role}</p>
                  </div>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Chat Window */}
      <div className="lg:col-span-2">
        {selectedUser ? (
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur h-full flex flex-col">
            {/* Chat Header */}
            <CardHeader className="border-b border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center text-lg">
                    {selectedUser.avatar}
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">{selectedUser.name}</h3>
                    <p className="text-xs text-slate-400">
                      {selectedUser.isOnline ? (
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          Online
                        </span>
                      ) : (
                        <span>Last seen {selectedUser.lastSeen}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="border-slate-600">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" className="border-slate-600">
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === userId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      message.senderId === userId
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-100'
                    }`}
                  >
                    <p className="text-sm break-words">{message.content}</p>
                    <div className="flex items-center gap-1 mt-1 opacity-75">
                      <span className="text-xs">
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {message.senderId === userId && message.status === 'read' && (
                        <CheckCheck className="h-3 w-3" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </CardContent>

            {/* Input Area */}
            <div className="border-t border-slate-700 p-4">
              <div className="flex gap-2">
                <textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... (Shift+Enter for new line)"
                  className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 resize-none max-h-24"
                  rows={2}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur h-full flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-400">Select a conversation to start messaging</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

