import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { createSession, isSameOrigin, sessionCookieOptions, SESSION_COOKIE, SESSION_SECONDS, takeRegistrationAttempt } from "@/lib/session";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+()\-\s]{8,20}$/;
const studentPattern = /^[A-Za-z0-9_-]{4,32}$/;
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง กรุณาเปิดหน้าสมัครสมาชิกใหม่" }, { status: 403 });
  if (!request.headers.get("content-type")?.includes("application/json")) return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 8192) throw new Error("Body too large");
    body = JSON.parse(text);
  } catch { return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 }); }

  const name = clean(body.name);
  const email = clean(body.email).toLowerCase();
  const studentId = clean(body.studentId).toUpperCase();
  const phoneNumber = clean(body.phoneNumber);
  const faculty = clean(body.faculty);
  const department = clean(body.department);
  const password = typeof body.password === "string" ? body.password : "";
  const confirmPassword = typeof body.confirmPassword === "string" ? body.confirmPassword : "";
  if (name.length < 2 || name.length > 120 || !emailPattern.test(email) || email.length > 254 || !studentPattern.test(studentId) || !phonePattern.test(phoneNumber) || faculty.length < 2 || faculty.length > 120 || department.length > 120 || password.length < 12 || password.length > 128 || password !== confirmPassword) {
    return NextResponse.json({ error: "กรุณาตรวจสอบข้อมูลและรหัสผ่านอย่างน้อย 12 ตัวอักษร" }, { status: 400 });
  }

  try {
    if (!await takeRegistrationAttempt(request, email)) return NextResponse.json({ error: "สมัครสมาชิกหลายครั้งเกินไป กรุณารอ 1 ชั่วโมงแล้วลองใหม่" }, { status: 429, headers: { "Retry-After": "3600" } });
    const duplicate = await prisma.user.findFirst({ where: { OR: [{ email }, { studentId }] }, select: { email: true, studentId: true } });
    if (duplicate) return NextResponse.json({ error: duplicate.email === email ? "อีเมลนี้มีบัญชีแล้ว กรุณาเข้าสู่ระบบ" : "รหัสนักศึกษาหรือรหัสบุคลากรนี้มีบัญชีแล้ว" }, { status: 409 });
    const passwordHash = await hashPassword(password);
    const user = await prisma.$transaction(async tx => {
      const created = await tx.user.create({ data: { name, email, role: "STUDENT", studentId, phoneNumber, faculty, department: department || null } });
      await tx.authCredential.create({ data: { userId: created.id, passwordHash } });
      return created;
    });
    const cookieStore = await cookies();
    const { token, expiresAt } = await createSession(user.id, cookieStore.get(SESSION_COOKIE)?.value);
    const response = NextResponse.json({ success: true, redirectTo: "/my-tickets" }, { status: 201, headers: { "Cache-Control": "no-store" } });
    response.cookies.set(SESSION_COOKIE, token, { ...sessionCookieOptions(request), maxAge: SESSION_SECONDS, expires: expiresAt });
    return response;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code === "P2002") return NextResponse.json({ error: "อีเมลนี้มีบัญชีแล้ว กรุณาเข้าสู่ระบบ" }, { status: 409 });
    console.error("Registration unavailable", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "สมัครสมาชิกไม่ได้ชั่วคราว กรุณาลองใหม่" }, { status: 503 });
  }
}
