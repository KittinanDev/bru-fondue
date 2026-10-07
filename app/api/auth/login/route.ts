import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { safeReturnPath, workspaceForRole } from "@/lib/auth-shared";
import { createSession, isSameOrigin, readLoginBody, sessionCookieOptions, sessionHash, SESSION_COOKIE, SESSION_SECONDS, takeLoginAttempt } from "@/lib/session";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง กรุณาเปิดหน้าเข้าสู่ระบบใหม่" }, { status: 403 });
  let body;
  try { body = await readLoginBody(request); } catch {
    return NextResponse.json({ error: "ข้อมูลเข้าสู่ระบบไม่ถูกต้อง" }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  const { email, password, next } = body as Record<string, unknown>;
  if (typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof password !== "string" || !password || password.length > 128) {
    return NextResponse.json({ error: "กรุณากรอกอีเมลและรหัสผ่านให้ถูกต้อง" }, { status: 400 });
  }
  const normalizedEmail = email.trim().toLowerCase();
  try {
    if (!await takeLoginAttempt(normalizedEmail)) {
      return NextResponse.json({ error: "ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่" }, { status: 429, headers: { "Retry-After": "900" } });
    }
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail }, include: { credential: true } });
    const valid = await verifyPassword(password, user?.credential?.passwordHash ?? null);
    if (!valid || !user?.credential || user.credential.disabledAt) {
      return NextResponse.json({ error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    }
    const cookieStore = await cookies();
    const { token, expiresAt } = await createSession(user.id, cookieStore.get(SESSION_COOKIE)?.value);
    await prisma.authLoginLimit.deleteMany({ where: { key: sessionHash(normalizedEmail) } });
    const response = NextResponse.json({ success: true, redirectTo: safeReturnPath(next) || workspaceForRole(user.role) }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SESSION_COOKIE, token, { ...sessionCookieOptions(request), maxAge: SESSION_SECONDS, expires: expiresAt });
    response.cookies.set("bru_auth_user_id", "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("Login unavailable", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "เข้าสู่ระบบไม่ได้ชั่วคราว กรุณาลองใหม่" }, { status: 503 });
  }
}
