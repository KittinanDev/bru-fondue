import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { hashPassword } from "../lib/password";
const db = new PrismaClient();
const ids = ["user-student-1", "user-student-2", "user-admin-1", "user-tech-1", "user-tech-2"];
async function main() {
  await mkdir(".local", { recursive: true });
  let count = 0;
  for (const id of ids) {
    const user = await db.user.findUnique({ where: { id }, include: { credential: true } });
    if (!user?.email || user.credential) continue;
    const password = randomBytes(18).toString("base64url");
    const passwordHash = await hashPassword(password);
    // Save the generated credential locally before provisioning; never print secrets to logs.
    await appendFile(".local/test-accounts.md", `\n### ${user.role} — ${user.name}\nอีเมล: ${user.email.toLowerCase()}\n\nรหัสผ่าน: \`${password}\`\n\n`, "utf8");
    await db.$transaction([
      db.user.update({ where: { id }, data: { email: user.email.toLowerCase() } }),
      db.authCredential.create({ data: { userId: id, passwordHash } }),
    ]);
    count++;
  }
  console.log(`Provisioned ${count} existing demo accounts. Credentials are in .local/test-accounts.md (git-ignored). Existing credentials were not overwritten.`);
}
main().finally(() => db.$disconnect());
