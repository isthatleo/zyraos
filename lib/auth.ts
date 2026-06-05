import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { userTable, sessionTable, accountTable, verificationTable } from "./db-schema";
import { normalizeDatabaseUrl } from "./database-url";

const client = new Pool({
  connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL),
});

const db = drizzle(client);

export const auth = betterAuth({
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
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    "http://localhost:3000",
    "http://*.localhost:3000",
    "https://roxan.com",
    "https://*.roxan.com",
  ],
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, token }) => {
      // TODO: Implement email sending
      console.log("Send verification email to:", user.email, "with token:", token);
    },
  },
});
