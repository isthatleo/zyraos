/**
 * Real-time Chat Hook
 * Path: src/hooks/use-messaging.ts
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Message, Conversation } from '@/types/messaging';

interface UseChatOptions {
  schoolId: string;
  userId: string;
}

export function useMessaging(options: UseChatOptions) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/messaging/conversations?schoolId=${options.schoolId}`);
      if (!response.ok) throw new Error('Failed to fetch conversations');
      const data = await response.json();
      setConversations(data);
      setUnreadCount(data.reduce((sum: number, conv: Conversation) => sum + conv.unreadCount, 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching conversations');
    } finally {
      setLoading(false);
    }
  }, [options.schoolId]);

  // Fetch messages for conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/messaging/messages?conversationId=${conversationId}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching messages');
    } finally {
      setLoading(false);
    }
  }, []);

  // Send message
  const sendMessage = useCallback(
    async (content: string, recipientId: string) => {
      try {
        const response = await fetch('/api/messaging/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientId,
            content,
            schoolId: options.schoolId,
          }),
        });

        if (!response.ok) throw new Error('Failed to send message');
        const newMessage = await response.json();

        setMessages((prev) => [...prev, newMessage]);
        return newMessage;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error sending message');
        throw err;
      }
    },
    [options.schoolId]
  );

  // Mark messages as read
  const markAsRead = useCallback(async (messageIds: string[]) => {
    try {
      await fetch('/api/messaging/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds }),
      });

      setMessages((prev) =>
        prev.map((msg) =>
          messageIds.includes(msg.id) ? { ...msg, status: 'read', readAt: new Date() } : msg
        )
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  }, []);

  // Open conversation
  const openConversation = useCallback(
    async (conversation: Conversation) => {
      setSelectedConversation(conversation);
      await fetchMessages(conversation.id);

      // Mark as read
      if (conversation.unreadCount > 0) {
        const unreadMessages = messages.filter(
          (m) => m.status !== 'read' && m.recipientId === options.userId
        );
        if (unreadMessages.length > 0) {
          await markAsRead(unreadMessages.map((m) => m.id));
        }
      }
    },
    [fetchMessages, markAsRead, messages, options.userId]
  );

  // Subscribe to real-time updates
  useEffect(() => {
    // This would implement WebSocket or Server-Sent Events for real-time updates
    fetchConversations();

    const interval = setInterval(fetchConversations, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchConversations]);

  return {
    conversations,
    messages,
    selectedConversation,
    loading,
    error,
    unreadCount,
    fetchConversations,
    fetchMessages,
    sendMessage,
    markAsRead,
    openConversation,
  };
}

