"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  MessageCircle,
  Send,
  Search,
  Plus,
  Users,
  Hash,
  Circle,
  Smile,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  ArrowLeft,
  Bell,
  BellOff,
  UserPlus,
  Settings,
  Check,
  CheckCheck,
} from "lucide-react"
import { toast } from "sonner"

// --- Types ---
interface ChatUser {
  id: string
  name: string
  avatar?: string
  role: string
  status: 'online' | 'offline' | 'away'
  lastSeen?: Date
}

interface Message {
  id: string
  senderId: string
  senderName: string
  content: string
  timestamp: Date
  status: 'sent' | 'delivered' | 'read'
  type: 'text' | 'system'
}

interface Conversation {
  id: string
  name: string
  type: 'direct' | 'group' | 'channel'
  participants: ChatUser[]
  lastMessage?: Message
  unreadCount: number
  muted: boolean
  icon?: string
}

interface MessagingSystemProps {
  currentUserId: string
  currentUserName: string
  currentUserRole: string
}

// --- Mock Data ---
const MOCK_USERS: ChatUser[] = [
  { id: 'u1', name: 'Dr. Ama Mensah', role: 'Principal', status: 'online' },
  { id: 'u2', name: 'Kofi Owusu', role: 'Teacher', status: 'online' },
  { id: 'u3', name: 'Abena Sarpong', role: 'Teacher', status: 'away' },
  { id: 'u4', name: 'Yaw Boateng', role: 'Accountant', status: 'offline', lastSeen: new Date(Date.now() - 3600000) },
  { id: 'u5', name: 'Efua Darko', role: 'Parent', status: 'online' },
]

const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1', name: 'Staff Room', type: 'group',
    participants: MOCK_USERS.slice(0, 4),
    lastMessage: { id: 'm1', senderId: 'u2', senderName: 'Kofi Owusu', content: 'Meeting rescheduled to 3pm', timestamp: new Date(Date.now() - 300000), status: 'read', type: 'text' },
    unreadCount: 2, muted: false,
  },
  {
    id: 'c2', name: 'Grade 10 Science', type: 'channel',
    participants: MOCK_USERS.slice(1, 4),
    lastMessage: { id: 'm2', senderId: 'u3', senderName: 'Abena Sarpong', content: 'Lab reports due Friday', timestamp: new Date(Date.now() - 1800000), status: 'delivered', type: 'text' },
    unreadCount: 0, muted: false,
  },
  {
    id: 'c3', name: 'Dr. Ama Mensah', type: 'direct',
    participants: [MOCK_USERS[0]],
    lastMessage: { id: 'm3', senderId: 'u1', senderName: 'Dr. Ama Mensah', content: 'Please send the term report', timestamp: new Date(Date.now() - 7200000), status: 'read', type: 'text' },
    unreadCount: 1, muted: false,
  },
  {
    id: 'c4', name: 'Finance Team', type: 'group',
    participants: [MOCK_USERS[0], MOCK_USERS[3]],
    lastMessage: { id: 'm4', senderId: 'u4', senderName: 'Yaw Boateng', content: 'Fee collection report attached', timestamp: new Date(Date.now() - 86400000), status: 'read', type: 'text' },
    unreadCount: 0, muted: true,
  },
]

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function formatTime(date: Date) {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60000) return 'now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString([], { day: '2-digit', month: 'short' })
}

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  away: 'bg-yellow-500',
  offline: 'bg-muted-foreground/30',
}

// --- Main Component ---
export function MessagingSystem({ currentUserId, currentUserName, currentUserRole }: MessagingSystemProps) {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS)
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [showMobile, setShowMobile] = useState<'list' | 'chat'>('list')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedConv = conversations.find(c => c.id === selectedConvId)

  // Load messages when conversation selected
  useEffect(() => {
    if (!selectedConvId) return
    // Generate mock messages for selected conversation
    const conv = conversations.find(c => c.id === selectedConvId)
    if (!conv) return
    const mockMsgs: Message[] = [
      { id: 'sys1', senderId: 'system', senderName: 'System', content: `Welcome to ${conv.name}`, timestamp: new Date(Date.now() - 86400000 * 2), status: 'read', type: 'system' },
      ...(conv.lastMessage ? [
        { id: 'prev1', senderId: conv.participants[0]?.id || 'u1', senderName: conv.participants[0]?.name || 'User', content: 'Good morning everyone!', timestamp: new Date(Date.now() - 86400000), status: 'read' as const, type: 'text' as const },
        { id: 'prev2', senderId: currentUserId, senderName: currentUserName, content: 'Good morning! Ready for today.', timestamp: new Date(Date.now() - 82800000), status: 'read' as const, type: 'text' as const },
        conv.lastMessage,
      ] : []),
    ]
    setMessages(mockMsgs)
    // Clear unread
    setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, unreadCount: 0 } : c))
  }, [selectedConvId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = () => {
    if (!newMessage.trim() || !selectedConvId) return
    const msg: Message = {
      id: `msg-${Date.now()}`,
      senderId: currentUserId,
      senderName: currentUserName,
      content: newMessage.trim(),
      timestamp: new Date(),
      status: 'sent',
      type: 'text',
    }
    setMessages(prev => [...prev, msg])
    setConversations(prev => prev.map(c => c.id === selectedConvId ? { ...c, lastMessage: msg } : c))
    setNewMessage("")
    inputRef.current?.focus()

    // Simulate delivery
    setTimeout(() => {
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, status: 'delivered' } : m))
    }, 1000)
    // Simulate typing response
    setTimeout(() => setIsTyping(true), 2000)
    setTimeout(() => {
      setIsTyping(false)
      const reply: Message = {
        id: `msg-${Date.now()}-reply`,
        senderId: selectedConv?.participants[0]?.id || 'u1',
        senderName: selectedConv?.participants[0]?.name || 'User',
        content: 'Got it, thanks! 👍',
        timestamp: new Date(),
        status: 'read',
        type: 'text',
      }
      setMessages(prev => [...prev, reply])
    }, 4000)
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const convIcon = (conv: Conversation) => {
    if (conv.type === 'channel') return <Hash className="h-4 w-4" />
    if (conv.type === 'group') return <Users className="h-4 w-4" />
    return null
  }

  return (
    <div className="h-[calc(100vh-10rem)] flex rounded-xl border bg-card overflow-hidden">
      {/* Sidebar */}
      <div className={`w-80 border-r flex flex-col ${showMobile === 'chat' ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              Messages
              {totalUnread > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">{totalUnread}</Badge>
              )}
            </h2>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search conversations..." className="pl-8 h-9 text-sm" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          {filteredConversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => { setSelectedConvId(conv.id); setShowMobile('chat') }}
              className={`w-full text-left p-3 flex items-start gap-3 transition-colors hover:bg-accent/50 ${selectedConvId === conv.id ? 'bg-accent' : ''}`}
            >
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {conv.type === 'direct' ? getInitials(conv.name) : conv.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {conv.type === 'direct' && conv.participants[0] && (
                  <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${statusColors[conv.participants[0].status]}`} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate flex items-center gap-1">
                    {convIcon(conv)}{conv.name}
                    {conv.muted && <BellOff className="h-3 w-3 text-muted-foreground" />}
                  </span>
                  {conv.lastMessage && (
                    <span className="text-[10px] text-muted-foreground">{formatTime(conv.lastMessage.timestamp)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-muted-foreground truncate pr-2">
                    {conv.lastMessage?.content || 'No messages yet'}
                  </p>
                  {conv.unreadCount > 0 && (
                    <Badge className="text-[9px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center">{conv.unreadCount}</Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
        </ScrollArea>

        {/* Online Users */}
        <div className="p-3 border-t">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-2">Online Now</p>
          <div className="flex gap-1">
            {MOCK_USERS.filter(u => u.status === 'online').map(u => (
              <div key={u.id} className="relative" title={u.name}>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(u.name)}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-card" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${showMobile === 'list' ? 'hidden md:flex' : 'flex'}`}>
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={() => setShowMobile('list')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {selectedConv.type === 'direct' ? getInitials(selectedConv.name) : selectedConv.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-sm flex items-center gap-1">{convIcon(selectedConv)} {selectedConv.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedConv.type === 'direct'
                      ? selectedConv.participants[0]?.status === 'online' ? 'Online' : `Last seen ${selectedConv.participants[0]?.lastSeen ? formatTime(selectedConv.participants[0].lastSeen) : 'recently'}`
                      : `${selectedConv.participants.length} members`
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Phone className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><Video className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4 max-w-3xl mx-auto">
                {messages.map(msg => {
                  if (msg.type === 'system') {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full">{msg.content}</span>
                      </div>
                    )
                  }
                  const isOwn = msg.senderId === currentUserId
                  return (
                    <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
                        {!isOwn && (
                          <Avatar className="h-7 w-7 mt-1">
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">{getInitials(msg.senderName)}</AvatarFallback>
                          </Avatar>
                        )}
                        <div>
                          {!isOwn && <p className="text-[10px] text-muted-foreground mb-0.5 ml-1">{msg.senderName}</p>}
                          <div className={`px-3 py-2 rounded-2xl text-sm ${isOwn ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-accent rounded-bl-md'}`}>
                            {msg.content}
                          </div>
                          <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : ''}`}>
                            <span className="text-[10px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
                            {isOwn && (
                              msg.status === 'read' ? <CheckCheck className="h-3 w-3 text-primary" /> :
                              msg.status === 'delivered' ? <CheckCheck className="h-3 w-3 text-muted-foreground" /> :
                              <Check className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {isTyping && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                        {getInitials(selectedConv.participants[0]?.name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-accent px-4 py-2 rounded-2xl rounded-bl-md">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex items-center gap-2 max-w-3xl mx-auto">
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  ref={inputRef}
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  className="h-9"
                />
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                  <Smile className="h-4 w-4" />
                </Button>
                <Button size="icon" className="h-9 w-9 shrink-0" onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose from the sidebar or start a new chat</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
