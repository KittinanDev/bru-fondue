import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, sessionHash } from "@/lib/session";
import { safeReturnPath } from "@/lib/auth-shared";
export async function getCurrentUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: sessionHash(token) },
    include: { user: { include: { credential: { select: { disabledAt: true } } } } },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.credential || session.user.credential.disabledAt) return null;
  const user = session.user;
  // Return only the profile fields needed by server-rendered pages.
  return { id: user.id, name: user.name, role: user.role, email: user.email, studentId: user.studentId,
    phoneNumber: user.phoneNumber, faculty: user.faculty, department: user.department };
}
export async function requireCurrentUser(returnTo: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeReturnPath(returnTo) || "/my-tickets")}`);
  return user;
}
