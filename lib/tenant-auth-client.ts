import { createAuthClient } from "better-auth/react";

export function createTenantAuthClient(baseURL: string) {
  return createAuthClient({
    baseURL,
  });
}
