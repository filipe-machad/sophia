import { describe, expect, it } from "vitest";
import { createSessionToken, hashPassword, hashSessionToken, normalizeEmail, verifyPassword } from "./security.js";

describe("security primitives", () => {
  it("normalizes email without changing its meaning", () => {
    expect(normalizeEmail("  Profissional@Example.COM  ")).toBe("profissional@example.com");
  });

  it("hashes passwords with a unique salt and verifies only the correct value", async () => {
    const first = await hashPassword("correct horse battery staple");
    const second = await hashPassword("correct horse battery staple");
    expect(first).not.toBe(second);
    await expect(verifyPassword(first, "correct horse battery staple")).resolves.toBe(true);
    await expect(verifyPassword(first, "wrong password")).resolves.toBe(false);
  });

  it("creates high-entropy opaque tokens and stores only deterministic hashes", () => {
    const token = createSessionToken();
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(hashSessionToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashSessionToken(token)).toBe(hashSessionToken(token));
    expect(hashSessionToken(createSessionToken())).not.toBe(hashSessionToken(token));
  });
});
