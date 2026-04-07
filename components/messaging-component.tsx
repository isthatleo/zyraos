"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageCircle, Send, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { getSocket, connectSocket, disconnectSocket } from "@/lib/socket"
import { toast } from "sonner"

interface Message {
  id: string
  senderId: string
  content: string
  createdAt: Date
  senderName: string
  isCurrentUser: boolean
}

interface MessagingProps {
  currentUserId: string
  currentUserName: string
}

export function MessagingComponent({ currentUserId, currentUserName }: MessagingProps) {
  const [activeTab, setActiveTab] = useState("chat")
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  const socket = getSocket()

  useEffect(() => {
    connectSocket()

    socket.on('connect', () => {
      setIsConnected(true)
      toast.success('Connected to chat')
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      toast.error('Disconnected from chat')
    })

    socket.on('message', (message: Message) => {
      setMessages(prev => [...prev, message])
    })

    socket.on('userTyping', (data: { userId: string, userName: string, isTyping: boolean }) => {
      setTypingUsers(prev => {
        if (data.isTyping) {
          return [...prev.filter(u => u !== data.userName), data.userName]
        } else {
          return prev.filter(u => u !== data.userName)
        }
      })
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('message')
      socket.off('userTyping')
      disconnectSocket()
    }
  }, [])

  useEffect(() => {
    if (selectedConversation) {
      socket.emit('joinConversation', selectedConversation)
    }

    return () => {
      if (selectedConversation) {
        socket.emit('leaveConversation', selectedConversation)
      }
    }
  }, [selectedConversation])

  const mockConversations = [
    { id: "1", name: "Teachers", lastMessage: "See you tomorrow", unread: 2 },
    { id: "2", name: "Science Class", lastMessage: "Assignment due Friday", unread: 0 },
    { id: "3", name: "Parent Group", lastMessage: "Meeting at 3pm", unread: 1 },
  ]

  const mockMessages: Message[] = [
    {
      id: "1",
      senderId: "user2",
      content: "Hello! How are you?",
      createdAt: new Date(),
      senderName: "Teacher Name",
      isCurrentUser: false,
    },
    {
      id: "2",
      senderId: currentUserId,
      content: "I'm doing well, thanks for asking!",
      createdAt: new Date(),
      senderName: currentUserName,
      isCurrentUser: true,
    },
  ]

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    const message: Message = {
      id: Date.now().toString(),
      senderId: currentUserId,
      content: newMessage,
      createdAt: new Date(),
      senderName: currentUserName,
      isCurrentUser: true,
    }

    // Send via socket
    socket.emit('sendMessage', {
      conversationId: selectedConversation,
      message
    })

    setMessages(prev => [...prev, message])
    setNewMessage("")

    // Stop typing
    socket.emit('typing', {
      userId: currentUserId,
      userName: currentUserName,
      isTyping: false
    })
  }

  const handleTyping = () => {
    if (newMessage.trim()) {
      socket.emit('typing', {
        userId: currentUserId,
        userName: currentUserName,
        isTyping: true
      })
    }
  }

  const filteredConversations = mockConversations.filter((conv) =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Left Sidebar - Conversations */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Messages</CardTitle>
            <div className="mt-4 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {filteredConversations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No conversations found</p>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedConversation === conv.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{conv.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.lastMessage}
                      </p>
                    </div>
                    {conv.unread > 0 && (
                      <span className="bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Main Chat Area */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {selectedConversation
                  ? mockConversations.find((c) => c.id === selectedConversation)?.name
                  : "Select a conversation"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-xs text-muted-foreground">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="info">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="chat" className="space-y-4">
                {/* Messages Display */}
                <div className="h-96 overflow-y-auto border rounded-lg p-4 space-y-3 bg-muted/50">
                  {mockMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mb-2 opacity-20" />
                      <p className="text-sm">No messages yet</p>
                      <p className="text-xs">Send the first message</p>
                    </div>
                  ) : (
                    mockMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.isCurrentUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-lg ${
                            msg.isCurrentUser
                              ? "bg-primary text-primary-foreground"
                              : "bg-accent text-accent-foreground"
                          }`}
                        >
                          <p className="text-sm font-medium mb-1">{msg.senderName}</p>
                          <p className="text-sm">{msg.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Typing Indicators */}
                {typingUsers.length > 0 && (
                  <div className="text-sm text-muted-foreground italic">
                    {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing...
                  </div>
                )}

                {/* Message Input */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type a message... (Shift + Enter for new line)"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value)
                      handleTyping()
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                    className="min-h-12 resize-none"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="info" className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Conversation Details</p>
                  <p className="text-sm">Members: 5</p>
                  <p className="text-sm">Created: 2 weeks ago</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
