import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workaround for Next.js/Vercel middleware build artifact issue:
  // ENOENT: .next/server/middleware.js.nft.json
  // (No supported stable config flag found for `experimental.turbo` in this Next version)
};

export default nextConfig;

