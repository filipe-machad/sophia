import { createHash, randomBytes } from "node:crypto";
import { Algorithm, hash, verify } from "@node-rs/argon2";

export const SESSION_COOKIE = "entrelaco_session";

export function normalizeEmail(email: string) {
  return email.trim().toLocaleLowerCase("pt-BR");
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function createSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function hashPassword(password: string) {
  return hash(password, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
    outputLen: 32,
  });
}

export function verifyPassword(passwordHash: string, password: string) {
  return verify(passwordHash, password);
}
