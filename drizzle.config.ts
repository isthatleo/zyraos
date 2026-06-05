import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
import { normalizeDatabaseUrl } from "./lib/database-url";

dotenv.config({ override: true });

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db-schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: normalizeDatabaseUrl(process.env.DATABASE_URL)!,
  },
});
