import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { env } from "./config.js";
import { db } from "./db/client.js";
import { authSessions, clients, users } from "./db/schema.js";
import { getAuthUser, issueSession, requireAuth } from "./auth.js";
import { hashPassword, hashSessionToken, normalizeEmail, SESSION_COOKIE, verifyPassword } from "./security.js";

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});
const registerSchema = credentialsSchema.extend({ professionalName: z.string().trim().min(2).max(120) });
const clientSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional(),
  sessionPrice: z.coerce.number().positive().max(100_000),
  sessionsPerMonth: z.coerce.number().int().min(1).max(31).default(4),
});
const updateClientSchema = clientSchema.partial().refine((value) => Object.keys(value).length > 0);
const clientParamsSchema = z.object({ id: z.string().uuid() });
const clientListQuerySchema = z.object({ status: z.enum(["active", "archived", "all"]).default("active") });

function parsedBody<T>(schema: z.ZodType<T>, body: unknown) {
  const result = schema.safeParse(body);
  return result.success ? result.data : null;
}

export function buildApp() {
  const app = Fastify({
    trustProxy: true,
    bodyLimit: 64 * 1024,
    logger: {
      level: env.NODE_ENV === "test" ? "silent" : "info",
      redact: ["req.headers.cookie", "req.headers.authorization", "res.headers.set-cookie"],
    },
  });

  app.decorateRequest("authUser", null as unknown as import("./auth.js").AuthUser);
  app.register(cookie);
  app.register(helmet, { contentSecurityPolicy: false });
  app.register(cors, { origin: env.WEB_ORIGIN, credentials: true, methods: ["GET", "POST", "PATCH", "DELETE"] });
  app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

  app.addHook("onRequest", async (request, reply) => {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return;
    const origin = request.headers.origin;
    if (origin && origin !== env.WEB_ORIGIN) return reply.code(403).send({ error: "origin_not_allowed" });
  });

  app.get("/health", async () => ({ status: "ok" }));

  app.post("/auth/register", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request, reply) => {
    const input = parsedBody(registerSchema, request.body);
    if (!input) return reply.code(400).send({ error: "invalid_input" });
    const email = normalizeEmail(input.email);
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) return reply.code(409).send({ error: "email_already_registered" });
    const passwordHash = await hashPassword(input.password);
    const [user] = await db.insert(users).values({ professionalName: input.professionalName, email, passwordHash }).returning({ id: users.id, professionalName: users.professionalName, email: users.email });
    if (!user) throw new Error("User creation failed");
    await issueSession(reply, user.id);
    return reply.code(201).send({ user });
  });

  app.post("/auth/login", { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } }, async (request, reply) => {
    const input = parsedBody(credentialsSchema, request.body);
    if (!input) return reply.code(400).send({ error: "invalid_credentials" });
    const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(input.email))).limit(1);
    if (!user || !(await verifyPassword(user.passwordHash, input.password))) return reply.code(401).send({ error: "invalid_credentials" });
    await issueSession(reply, user.id);
    return { user: { id: user.id, professionalName: user.professionalName, email: user.email } };
  });

  app.post("/auth/logout", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) await db.delete(authSessions).where(eq(authSessions.tokenHash, hashSessionToken(token)));
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.code(204).send();
  });

  app.get("/auth/me", async (request, reply) => {
    const user = await getAuthUser(request);
    if (!user) return reply.code(401).send({ error: "authentication_required" });
    return { user };
  });

  app.get("/clients", { preHandler: requireAuth }, async (request, reply) => {
    const query = clientListQuerySchema.safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: "invalid_query" });
    const ownerFilter = eq(clients.ownerId, request.authUser.id);
    const visibilityFilter = query.data.status === "all"
      ? ownerFilter
      : and(ownerFilter, eq(clients.active, query.data.status === "active"));
    const rows = await db.select().from(clients).where(visibilityFilter).orderBy(asc(clients.name));
    return { clients: rows };
  });

  app.post("/clients", { preHandler: requireAuth }, async (request, reply) => {
    const input = parsedBody(clientSchema, request.body);
    if (!input) return reply.code(400).send({ error: "invalid_input" });
    const [client] = await db.insert(clients).values({ ownerId: request.authUser.id, name: input.name, email: input.email || null, phone: input.phone || null, sessionPrice: input.sessionPrice.toFixed(2), sessionsPerMonth: input.sessionsPerMonth }).returning();
    return reply.code(201).send({ client });
  });

  app.patch("/clients/:id", { preHandler: requireAuth }, async (request, reply) => {
    const params = clientParamsSchema.safeParse(request.params);
    const input = parsedBody(updateClientSchema, request.body);
    if (!params.success || !input) return reply.code(400).send({ error: "invalid_input" });
    const updates: Partial<typeof clients.$inferInsert> = { updatedAt: new Date() };
    if (input.name !== undefined) updates.name = input.name;
    if (input.email !== undefined) updates.email = input.email || null;
    if (input.phone !== undefined) updates.phone = input.phone || null;
    if (input.sessionPrice !== undefined) updates.sessionPrice = Number(input.sessionPrice).toFixed(2);
    if (input.sessionsPerMonth !== undefined) updates.sessionsPerMonth = input.sessionsPerMonth;
    const [client] = await db.update(clients).set(updates).where(and(eq(clients.id, params.data.id), eq(clients.ownerId, request.authUser.id), eq(clients.active, true))).returning();
    if (!client) return reply.code(404).send({ error: "client_not_found" });
    return { client };
  });

  app.post("/clients/:id/restore", { preHandler: requireAuth }, async (request, reply) => {
    const params = clientParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_input" });
    const [client] = await db.update(clients).set({ active: true, updatedAt: new Date() }).where(and(eq(clients.id, params.data.id), eq(clients.ownerId, request.authUser.id), eq(clients.active, false))).returning();
    if (!client) return reply.code(404).send({ error: "client_not_found" });
    return { client };
  });

  app.delete("/clients/:id", { preHandler: requireAuth }, async (request, reply) => {
    const params = clientParamsSchema.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "invalid_input" });
    const [client] = await db.update(clients).set({ active: false, updatedAt: new Date() }).where(and(eq(clients.id, params.data.id), eq(clients.ownerId, request.authUser.id), eq(clients.active, true))).returning({ id: clients.id });
    if (!client) return reply.code(404).send({ error: "client_not_found" });
    return reply.code(204).send();
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode && statusCode < 500) return reply.code(statusCode).send({ error: "request_failed" });
    return reply.code(500).send({ error: "internal_error" });
  });
  return app;
}
