import { auth } from "@/lib/auth";

export type DashboardUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string | null;
};

export type DashboardNotification = {
  id: string;
  userId: string;
  type: "message" | "academic" | "billing" | "system" | "alert";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type DashboardMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readBy: string[];
  createdAt: string;
};

export type DashboardConversation = {
  id: string;
  type: "direct" | "group";
  name?: string;
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
};

type Store = {
  users: DashboardUser[];
  notifications: DashboardNotification[];
  conversations: DashboardConversation[];
  messages: DashboardMessage[];
  typing: Record<string, string[]>;
  presence: Record<string, { status: "online" | "away" | "offline"; updatedAt: string }>;
  calls: Array<{
    id: string;
    callerId: string;
    recipientId: string;
    callType: "audio" | "video";
    status: "ringing" | "accepted" | "declined" | "ended";
    offer?: RTCSessionDescriptionInit;
    answer?: RTCSessionDescriptionInit;
    callerCandidates?: RTCIceCandidateInit[];
    recipientCandidates?: RTCIceCandidateInit[];
    createdAt: string;
    endedAt?: string;
  }>;
};

const now = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

function createInitialStore(): Store {
  return {
    users: [],
    notifications: [],
    conversations: [],
    messages: [],
    typing: {},
    presence: {},
    calls: [],
  };
}

const globalStore = globalThis as typeof globalThis & { __zyraDashboardStore?: Store };

export function getDashboardStore() {
  if (!globalStore.__zyraDashboardStore) {
    globalStore.__zyraDashboardStore = createInitialStore();
  }
  return globalStore.__zyraDashboardStore;
}

export async function getCurrentDashboardUser(headers: Headers): Promise<DashboardUser> {
  const session = await auth.api.getSession({ headers }).catch(() => null);
  const store = getDashboardStore();

  if (session?.user?.email) {
    const existing = store.users.find((user) => user.email.toLowerCase() === session.user.email.toLowerCase());
    if (existing) return existing;

    const user: DashboardUser = {
      id: session.user.id || makeId("user"),
      name: session.user.name || session.user.email,
      email: session.user.email,
      role: (session.user as { role?: string }).role || "user",
      image: session.user.image,
    };
    store.users.push(user);
    return user;
  }

  return store.users[0];
}

export function serializeConversation(conversation: DashboardConversation, currentUserId: string) {
  const store = getDashboardStore();
  const messages = store.messages
    .filter((message) => message.conversationId === conversation.id)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const lastMessage = messages.at(-1) || null;
  const members = conversation.memberIds
    .map((memberId) => store.users.find((user) => user.id === memberId))
    .filter(Boolean) as DashboardUser[];
  const otherMembers = members.filter((member) => member.id !== currentUserId);

  return {
    ...conversation,
    name: conversation.name || otherMembers.map((member) => member.name).join(", ") || "Conversation",
    members,
    lastMessage,
    unreadCount: messages.filter((message) => message.senderId !== currentUserId && !message.readBy.includes(currentUserId)).length,
  };
}

export function findOrCreateDirectConversation(currentUserId: string, otherUserId: string) {
  const store = getDashboardStore();
  const existing = store.conversations.find(
    (conversation) =>
      conversation.type === "direct" &&
      conversation.memberIds.includes(currentUserId) &&
      conversation.memberIds.includes(otherUserId)
  );

  if (existing) return existing;

  const createdAt = now();
  const conversation: DashboardConversation = {
    id: makeId("conv"),
    type: "direct",
    memberIds: [currentUserId, otherUserId],
    createdAt,
    updatedAt: createdAt,
  };
  store.conversations.push(conversation);
  return conversation;
}

export function createDashboardNotification(input: Omit<DashboardNotification, "id" | "createdAt" | "read"> & { read?: boolean }) {
  const notification: DashboardNotification = {
    ...input,
    id: makeId("notif"),
    read: input.read ?? false,
    createdAt: now(),
  };
  getDashboardStore().notifications.unshift(notification);
  return notification;
}

export function createDashboardMessage(input: { conversationId: string; senderId: string; content: string }) {
  const store = getDashboardStore();
  const message: DashboardMessage = {
    id: makeId("msg"),
    conversationId: input.conversationId,
    senderId: input.senderId,
    content: input.content,
    readBy: [input.senderId],
    createdAt: now(),
  };
  store.messages.push(message);

  const conversation = store.conversations.find((item) => item.id === input.conversationId);
  if (conversation) {
    conversation.updatedAt = message.createdAt;
    conversation.memberIds
      .filter((memberId) => memberId !== input.senderId)
      .forEach((userId) => {
        createDashboardNotification({
          userId,
          type: "message",
          title: "New message",
          message: message.content,
          metadata: { conversationId: conversation.id, messageId: message.id },
        });
      });
  }

  return message;
}
