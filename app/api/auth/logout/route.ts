import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSameOrigin, sessionCookieOptions, sessionHash, SESSION_COOKIE } from "@/lib/session";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  try {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) await prisma.authSession.deleteMany({ where: { tokenHash: sessionHash(token) } });
    const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(request), maxAge: 0 });
    response.cookies.set("bru_auth_user_id", "", { path: "/", maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ error: "ออกจากระบบไม่สำเร็จ กรุณาลองใหม่" }, { status: 503 });
  }
}
