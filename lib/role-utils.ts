import { authClient } from "./auth-client";

export async function isUserAdmin(): Promise<boolean> {
  try {
    const { data } = await authClient.getSession();
    if (!data?.user) return false;
    
    // Get full user data to check role
    const response = await fetch("/api/user/check-admin");
    const result = await response.json();
    return result.isAdmin ?? false;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

export async function getUserRole(): Promise<string | null> {
  try {
    const { data } = await authClient.getSession();
    if (!data?.user) return null;
    
    const response = await fetch("/api/user/role");
    const result = await response.json();
    return result.role ?? null;
  } catch (error) {
    console.error("Error getting user role:", error);
    return null;
  }
}

