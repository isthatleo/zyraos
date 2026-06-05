"use client";

import { authClient } from "@/lib/auth-client";

type AuthStoreUser = {
  id?: string;
  email?: string;
  fullName?: string | null;
  name?: string | null;
  role?: string | null;
  avatar?: string | null;
  image?: string | null;
};

export function useAuthStore(): { user: AuthStoreUser | null } {
  const { data } = authClient.useSession();
  const sessionUser = data?.user as AuthStoreUser | undefined;

  return {
    user: sessionUser
      ? {
          ...sessionUser,
          fullName: sessionUser.fullName || sessionUser.name || sessionUser.email || null,
          avatar: sessionUser.avatar || sessionUser.image || null,
        }
      : null,
  };
}
