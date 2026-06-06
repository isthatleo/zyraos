import type { Server as ServerIO, Socket } from "socket.io";

type RegisteredUser = { userId: string; tenantId?: string };

const userSockets = new Map<string, Set<string>>();
const socketUsers = new Map<string, RegisteredUser>();

function getSocketUser(socket: Socket, input?: Record<string, unknown>): RegisteredUser | null {
  const userId = String(input?.userId || socket.handshake.auth?.userId || socket.handshake.query?.userId || "");
  const tenantId = String(input?.tenantId || socket.handshake.auth?.tenantId || socket.handshake.query?.tenantId || "");
  if (!userId) return null;
  return { userId, tenantId: tenantId || undefined };
}

function presenceSnapshot() {
  const updatedAt = new Date().toISOString();
  return Array.from(userSockets.entries()).reduce<Record<string, { status: "online"; updatedAt: string }>>(
    (snapshot, [id, sockets]) => {
      if (sockets.size > 0) snapshot[id] = { status: "online", updatedAt };
      return snapshot;
    },
    {}
  );
}

export function configureRealtimeServer(io: ServerIO) {
  const registerSocket = (socket: Socket, input?: Record<string, unknown>) => {
    const user = getSocketUser(socket, input);
    if (!user) return;

    socketUsers.set(socket.id, user);
    if (!userSockets.has(user.userId)) userSockets.set(user.userId, new Set());
    userSockets.get(user.userId)?.add(socket.id);
    socket.join(`user:${user.userId}`);
    if (user.tenantId) socket.join(`tenant:${user.tenantId}`);

    io.emit("user-status", { userId: user.userId, status: "online", updatedAt: new Date().toISOString() });
    socket.emit("presence:snapshot", presenceSnapshot());
  };

  const emitToUser = (receiverId: unknown, event: string, payload: Record<string, unknown>) => {
    const id = String(receiverId || "");
    if (!id) return;
    io.to(`user:${id}`).emit(event, payload);
  };

  io.on("connection", (socket) => {
    registerSocket(socket);

    socket.on("register", (data) => registerSocket(socket, data));
    socket.on("user:join", (data) => registerSocket(socket, data));

    socket.on("sendMessage", (data) => {
      if (data?.conversationId) {
        socket.to(String(data.conversationId)).emit("message", data.message);
        socket.to(String(data.conversationId)).emit("message:new", data.message);
      }
      if (data?.receiverId) {
        emitToUser(data.receiverId, "message:new", {
          ...data,
          senderId: socketUsers.get(socket.id)?.userId || data.senderId,
        });
        emitToUser(data.receiverId, "notification", {
          type: "message.new",
          metadata: {
            senderId: socketUsers.get(socket.id)?.userId || data.senderId,
            message: data.message,
            messageId: data.message?.id,
          },
        });
      }
    });

    socket.on("message:new", (data) => {
      emitToUser(data?.receiverId, "message:new", {
        ...data,
        senderId: socketUsers.get(socket.id)?.userId || data?.senderId,
      });
      emitToUser(data?.receiverId, "notification", {
        type: "message.new",
        metadata: {
          senderId: socketUsers.get(socket.id)?.userId || data?.senderId,
          message: data?.message,
          messageId: data?.message?.id,
        },
      });
    });

    socket.on("joinConversation", (conversationId) => {
      if (conversationId) socket.join(String(conversationId));
    });

    socket.on("leaveConversation", (conversationId) => {
      if (conversationId) socket.leave(String(conversationId));
    });

    socket.on("typing", (data) => {
      if (data?.conversationId) socket.to(String(data.conversationId)).emit("userTyping", data);
      emitToUser(data?.receiverId, "user-typing", {
        ...data,
        senderId: socketUsers.get(socket.id)?.userId,
        updatedAt: new Date().toISOString(),
      });
    });

    socket.on("message:read", (data) => {
      emitToUser(data?.receiverId, "message:read", data);
      emitToUser(data?.receiverId, "notification", { type: "message.read", metadata: data });
    });

    socket.on("call:offer", (data) => {
      const callerId = socketUsers.get(socket.id)?.userId || data?.callerId;
      const payload = { ...data, callerId };
      emitToUser(data?.receiverId, "call:offer", payload);
      emitToUser(data?.receiverId, "call:incoming", payload);
      emitToUser(data?.receiverId, "call:update", { ...payload, status: "ringing" });
    });

    socket.on("call:answer", (data) => {
      emitToUser(data?.receiverId, "call:answer", data);
      emitToUser(data?.receiverId, "call:update", { ...data, status: "accepted" });
    });

    socket.on("call:ice-candidate", (data) => {
      emitToUser(data?.receiverId, "call:ice-candidate", data);
    });

    socket.on("call:update", (data) => {
      emitToUser(data?.receiverId, "call:update", data);
    });

    socket.on("call:reject", (data) => {
      emitToUser(data?.receiverId, "call:reject", data);
      emitToUser(data?.receiverId, "call:update", { ...data, status: "declined" });
    });

    socket.on("call:end", (data) => {
      emitToUser(data?.receiverId, "call:end", data);
      emitToUser(data?.receiverId, "call:update", { ...data, status: "ended" });
    });

    socket.on("sendBroadcast", (data) => {
      io.emit("new_broadcast", data?.broadcast || data);
      io.emit("notification", { type: "broadcast.new", metadata: data });
    });

    socket.on("disconnect", () => {
      const user = socketUsers.get(socket.id);
      if (user?.userId) {
        const sockets = userSockets.get(user.userId);
        sockets?.delete(socket.id);
        if (!sockets || sockets.size === 0) {
          userSockets.delete(user.userId);
          io.emit("user-status", { userId: user.userId, status: "offline", updatedAt: new Date().toISOString() });
        }
      }
      socketUsers.delete(socket.id);
    });
  });

  return io;
}
