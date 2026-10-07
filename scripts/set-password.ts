import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { hashPassword } from "../lib/password";
const db = new PrismaClient();
async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.env.BRU_NEW_PASSWORD;
  if (!email || !password) throw new Error("Provide account email and BRU_NEW_PASSWORD (12–128 characters). Never pass a password on the command line.");
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error("Account not found");
  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.authCredential.upsert({ where: { userId: user.id }, create: { userId: user.id, passwordHash }, update: { passwordHash, disabledAt: null } }),
    db.authSession.deleteMany({ where: { userId: user.id } }),
    db.authLoginLimit.deleteMany({ where: { key: createHash("sha256").update(email).digest("hex") } }),
  ]);
  console.log("Password updated; previous sessions revoked.");
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
