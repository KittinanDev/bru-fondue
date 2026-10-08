import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
export const SESSION_COOKIE = "bru_session";
export const SESSION_SECONDS = 8 * 60 * 60;
export const sessionHash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function createSession(userId: string, previousToken?: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await prisma.$transaction(async (tx) => {
    await tx.authSession.deleteMany({ where: { OR: [
      { expiresAt: { lte: new Date() } },
      ...(previousToken ? [{ tokenHash: sessionHash(previousToken) }] : []),
    ] } });
    await tx.authSession.create({ data: { tokenHash: sessionHash(token), userId, expiresAt } });
  });
  return { token, expiresAt };
}
export function sessionCookieOptions(request: Request) {
  const url = new URL(process.env.APP_ORIGIN || `${new URL(request.url).protocol}//${request.headers.get("host") || new URL(request.url).host}`);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  return { httpOnly: true, sameSite: "lax" as const, secure: !local || url.protocol === "https:", path: "/" };
}
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  // Next may normalize request.url to localhost; Host retains the browser's target.
  const expected = process.env.APP_ORIGIN || `${new URL(request.url).protocol}//${request.headers.get("host") || new URL(request.url).host}`;
  return !!origin && origin === expected && request.headers.get("sec-fetch-site") !== "cross-site";
}
export async function takeLoginAttempt(email: string): Promise<boolean> {
  const now = new Date();
  const key = sessionHash(email);
  return prisma.$transaction(async (tx) => {
    const limit = await tx.authLoginLimit.findUnique({ where: { key } });
    if (limit && limit.resetsAt > now && limit.attempts >= 5) return false;
    if (!limit || limit.resetsAt <= now) {
      await tx.authLoginLimit.upsert({ where: { key },
        create: { key, attempts: 1, resetsAt: new Date(now.getTime() + 15 * 60 * 1000) },
        update: { attempts: 1, resetsAt: new Date(now.getTime() + 15 * 60 * 1000) },
      });
    } else {
      await tx.authLoginLimit.update({ where: { key }, data: { attempts: { increment: 1 } } });
    }
    return true;
  });
}
export async function takeRegistrationAttempt(request: Request, email: string): Promise<boolean> {
  const now = new Date();
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = sessionHash(`register:${forwarded}:${email}`);
  return prisma.$transaction(async (tx) => {
    const limit = await tx.authLoginLimit.findUnique({ where: { key } });
    if (limit && limit.resetsAt > now && limit.attempts >= 3) return false;
    if (!limit || limit.resetsAt <= now) {
      await tx.authLoginLimit.upsert({ where: { key },
        create: { key, attempts: 1, resetsAt: new Date(now.getTime() + 60 * 60 * 1000) },
        update: { attempts: 1, resetsAt: new Date(now.getTime() + 60 * 60 * 1000) },
      });
    } else {
      await tx.authLoginLimit.update({ where: { key }, data: { attempts: { increment: 1 } } });
    }
    return true;
  });
}
export async function readLoginBody(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.includes("application/json")) throw new Error("Invalid body");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing body");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) { await reader.cancel(); throw new Error("Body too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
