import type { FastifyReply, FastifyRequest } from "fastify";
import { and, eq, gt } from "drizzle-orm";
import { db } from "./db/client.js";
import { authSessions, users } from "./db/schema.js";
import { env } from "./config.js";
import { createSessionToken, hashSessionToken, SESSION_COOKIE } from "./security.js";

export type AuthUser = { id: string; professionalName: string; email: string };

export async function issueSession(reply: FastifyReply, userId: string) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_DAYS * 86_400_000);

  await db.insert(authSessions).values({ userId, tokenHash: hashSessionToken(token), expiresAt });
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getAuthUser(request: FastifyRequest): Promise<AuthUser | null> {
  const token = request.cookies[SESSION_COOKIE];
  if (!token) return null;

  const [record] = await db
    .select({ id: users.id, professionalName: users.professionalName, email: users.email })
    .from(authSessions)
    .innerJoin(users, eq(users.id, authSessions.userId))
    .where(and(eq(authSessions.tokenHash, hashSessionToken(token)), gt(authSessions.expiresAt, new Date())))
    .limit(1);
  return record ?? null;
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const user = await getAuthUser(request);
  if (!user) return reply.code(401).send({ error: "authentication_required" });
  request.authUser = user;
}

declare module "fastify" {
  interface FastifyRequest { authUser: AuthUser }
}
