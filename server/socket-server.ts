import "dotenv/config";

import { createServer } from "node:http";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { Server } from "socket.io";

import { configureRealtimeServer } from "../lib/realtime-socket";

const port = Number(process.env.SOCKET_PORT || process.env.PORT || 4000);
const corsOrigins = (process.env.SOCKET_CORS_ORIGIN || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const httpServer = createServer((request, response) => {
  if (request.url === "/health" || request.url === "/healthz") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true, service: "roxan-realtime", uptime: process.uptime() }));
    return;
  }

  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

const io = new Server(httpServer, {
  path: process.env.SOCKET_PATH || "/socket.io",
  cors: {
    origin: corsOrigins,
    credentials: true,
  },
  transports: ["polling", "websocket"],
  pingInterval: 25_000,
  pingTimeout: 20_000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60_000,
    skipMiddlewares: true,
  },
});

async function attachRedisAdapter() {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL || "";
  if (!redisUrl || redisUrl.startsWith("https://")) {
    console.log("[realtime] Redis adapter disabled; set REDIS_URL for multi-instance fanout.");
    return;
  }

  const pubClient = createClient({ url: redisUrl });
  const subClient = pubClient.duplicate();

  pubClient.on("error", (error) => console.error("[realtime] Redis pub error", error));
  subClient.on("error", (error) => console.error("[realtime] Redis sub error", error));

  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));
  console.log("[realtime] Redis adapter enabled.");
}

async function main() {
  await attachRedisAdapter().catch((error) => {
    console.error("[realtime] Redis adapter failed; continuing without Redis.", error);
  });

  configureRealtimeServer(io);

  httpServer.listen(port, () => {
    console.log(`[realtime] Socket.IO server listening on http://localhost:${port}`);
    console.log(`[realtime] Allowed origins: ${corsOrigins.join(", ") || "*"}`);
  });
}

process.on("SIGINT", () => {
  console.log("[realtime] Shutting down.");
  io.close();
  httpServer.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  console.log("[realtime] Shutting down.");
  io.close();
  httpServer.close(() => process.exit(0));
});

void main();
