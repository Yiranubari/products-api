import { createApp } from "@/app";
import { env } from "@/config/env";
import { prisma } from "@/db/client";

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
  process.exit(1);
});

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`Server listening on port ${env.PORT}`);
});

let isShuttingDown = false;
const SHUTDOWN_TIMEOUT_MS = 10_000;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received, shutting down...`);

  const forceExit = setTimeout(() => {
    console.error("Shutdown timed out, forcing exit.");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  server.close(async (err) => {
    if (err) {
      console.error("Error closing server:", err);
    }
    try {
      await prisma.$disconnect();
    } catch (disconnectErr) {
      console.error("Error disconnecting Prisma:", disconnectErr);
    } finally {
      clearTimeout(forceExit);
      process.exit(err ? 1 : 0);
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
