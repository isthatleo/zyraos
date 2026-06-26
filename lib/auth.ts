import { betterAuth } from "better-auth";
import { dash } from "@better-auth/infra";

export const auth = betterAuth({
  baseURL: "http://localhost:3000/",
  secret: process.env.BETTER_AUTH_SECRET,
  plugins: [dash()],
});

