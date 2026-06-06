import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null
let usingFallbackSocket = false

export const getSocket = () => {
  if (!socket) {
    const configuredSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL
    const shouldUseConfiguredSocket =
      !!configuredSocketUrl &&
      !usingFallbackSocket &&
      !(
        typeof window !== "undefined" &&
        window.location.hostname.includes("localhost") &&
        configuredSocketUrl.includes("localhost:4000")
      )
    const socketUrl =
      (shouldUseConfiguredSocket ? configuredSocketUrl : "") ||
      (typeof window === "undefined" ? "http://localhost:3000" : `${window.location.protocol}//${window.location.host}`)
    const socketPath =
      (shouldUseConfiguredSocket ? process.env.NEXT_PUBLIC_SOCKET_PATH : "/api/socket") ||
      (shouldUseConfiguredSocket ? "/socket.io" : "/api/socket")

    socket = io(socketUrl, {
      autoConnect: false,
      path: socketPath,
      addTrailingSlash: false,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 300,
      reconnectionDelayMax: 1500,
      timeout: 1500,
    })

    socket.on("connect_error", () => {
      if (usingFallbackSocket || !shouldUseConfiguredSocket || typeof window === "undefined") return
      socket?.disconnect()
      socket = null
      usingFallbackSocket = true
      const fallback = getSocket()
      fallback.connect()
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
