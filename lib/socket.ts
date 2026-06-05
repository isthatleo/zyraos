import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const getSocket = () => {
  if (!socket) {
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window === "undefined" ? "http://localhost:3000" : `${window.location.protocol}//${window.location.host}`)
    const socketPath =
      process.env.NEXT_PUBLIC_SOCKET_PATH ||
      (process.env.NEXT_PUBLIC_SOCKET_URL ? "/socket.io" : "/api/socket")

    socket = io(socketUrl, {
      autoConnect: false,
      path: socketPath,
      addTrailingSlash: false,
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 800,
      reconnectionDelayMax: 3000,
      timeout: 5000,
    })
  }
  return socket
}

export const realtimeSocket = getSocket()
export { realtimeSocket as socket }

export const connectSocket = (auth?: Record<string, unknown>) => {
  const socket = getSocket()
  if (auth) {
    socket.auth = { ...(socket.auth || {}), ...auth }
  }
  if (!socket.connected) {
    socket.connect()
  } else if (auth) {
    socket.emit("register", auth)
  }
  return socket
}

export const connectRealtimeSocket = async (auth?: Record<string, unknown>) => {
  const socket = connectSocket(auth)
  if (auth) socket.emit("register", auth)
  return socket.connected
}

export const disconnectSocket = () => {
  const socket = getSocket()
  if (socket.connected) {
    socket.disconnect()
  }
}
