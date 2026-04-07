import { Server as NetServer } from 'http'
import { NextApiResponse } from 'next'
import { Server as ServerIO } from 'socket.io'

export type NextApiResponseServerIo = NextApiResponse & {
  socket: any & {
    server: NetServer & {
      io: ServerIO
    }
  }
}

export const initSocket = (res: NextApiResponseServerIo) => {
  if (res.socket.server.io) {
    console.log('Socket is already running')
  } else {
    console.log('Socket is initializing')
    const io = new ServerIO(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
    })

    res.socket.server.io = io

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      socket.on('sendMessage', (data) => {
        // Broadcast to all clients in the conversation
        socket.to(data.conversationId).emit('message', data.message)
      })

      socket.on('joinConversation', (conversationId) => {
        socket.join(conversationId)
      })

      socket.on('leaveConversation', (conversationId) => {
        socket.leave(conversationId)
      })

      socket.on('typing', (data) => {
        socket.to(data.conversationId).emit('userTyping', data)
      })

      socket.on('sendBroadcast', (data) => {
        // Broadcast to all connected clients or specific rooms based on audience
        io.emit('new_broadcast', data.broadcast)
      })

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id)
      })
    })
  }

  return res.socket.server.io
}
