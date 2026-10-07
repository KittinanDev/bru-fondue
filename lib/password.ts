import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error); else resolve(key);
    });
  });
}
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 12 || password.length > 128) throw new Error("Password must have 12–128 characters");
  const salt = randomBytes(16).toString("hex");
  return `scrypt-v1:${salt}:${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const match = stored?.match(/^scrypt-v1:([a-f0-9]{32}):([a-f0-9]{128})$/);
  // Unknown accounts still perform the same expensive hash operation.
  const key = await derive(password, match?.[1] ?? "0".repeat(32));
  const expected = Buffer.from(match?.[2] ?? "0".repeat(128), "hex");
  return timingSafeEqual(key, expected) && !!match;
}
