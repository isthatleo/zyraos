import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { userTable, sessionTable, accountTable, verificationTable } from "./db-schema";
import { getTenantDb } from "./db";

export function createTenantAuth(databaseUrl: string) {
  const db = getTenantDb(databaseUrl);

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: userTable,
        session: sessionTable,
        account: accountTable,
        verification: verificationTable,
      },
    }),
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    secret: process.env.BETTER_AUTH_SECRET,
    // Disable email/password for tenants - only magic links
    emailAndPassword: {
      enabled: false,
    },
    // Enable magic link authentication
    magicLink: {
      enabled: true,
      sendMagicLink: async ({ email, token, url }: { email: string; token: string; url: string }) => {
        // TODO: Implement email sending for magic links
        console.log("Send magic link to:", email, "URL:", url, "Token:", token);
      },
    },
    // Disable social providers for tenants
    socialProviders: {},
  });
}
