import "dotenv/config";
import { buildApp } from "./app.js";
import { env } from "./config.js";
import { sql } from "./db/client.js";

const app = buildApp();

async function shutdown(signal: string) {
  app.log.info({ signal }, "shutting down");
  await app.close();
  await sql.end({ timeout: 5 });
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

await app.listen({ host: env.HOST, port: env.PORT });
