import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/session";
import { enumField, idField, InputError, inputErrorResponse, limitMutation, readBody, textField } from "@/lib/input-validation";

const MANAGED_ROLES = ["STUDENT", "STAFF", "TECHNICIAN"] as const;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[0-9+()\-\s]{8,20}$/;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  try {
    const admin = await getCurrentUser();
    if (!admin) throw new InputError("กรุณาเข้าสู่ระบบ", 401);
    if (!isAdmin(admin)) throw new InputError("เฉพาะผู้ดูแลระบบเท่านั้น", 403);
    await limitMutation(admin.id, "users");
    const body = await readBody(request);
    const action = enumField(body.action, ["create", "update"] as const, "การทำรายการ");
    const name = textField(body.name, "ชื่อ–นามสกุล", 120).normalize("NFC");
    const email = textField(body.email, "อีเมล", 254).toLowerCase();
    const studentId = textField(body.studentId, "รหัสนักศึกษาหรือรหัสบุคลากร", 32).toUpperCase();
    const phoneNumber = textField(body.phoneNumber, "เบอร์โทรศัพท์", 20);
    const faculty = textField(body.faculty, "คณะหรือหน่วยงาน", 120);
    const department = textField(body.department, "สาขาวิชาหรือฝ่ายงาน", 120, true) || null;
    if (!emailPattern.test(email)) throw new InputError("รูปแบบอีเมลไม่ถูกต้อง");
    if (!/^[A-Z0-9_-]{4,32}$/.test(studentId)) throw new InputError("รหัสนักศึกษาหรือรหัสบุคลากรไม่ถูกต้อง");
    if (!phonePattern.test(phoneNumber)) throw new InputError("รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง");
    const password = typeof body.password === "string" ? body.password : "";

    if (action === "create") {
      const role = enumField(body.role, MANAGED_ROLES, "บทบาท");
      if (password.length < 12 || password.length > 128) throw new InputError("รหัสผ่านต้องมี 12–128 ตัวอักษร");
      const duplicate = await prisma.user.findFirst({ where: { OR: [{ email }, { studentId }] }, select: { email: true } });
      if (duplicate) throw new InputError(duplicate.email === email ? "อีเมลนี้มีบัญชีแล้ว" : "รหัสนี้มีบัญชีแล้ว", 409);
      const passwordHash = await hashPassword(password);
      const created = await prisma.$transaction(async tx => {
        const user = await tx.user.create({ data: { name, email, role, studentId, phoneNumber, faculty, department } });
        await tx.authCredential.create({ data: { userId: user.id, passwordHash } });
        return user;
      });
      return NextResponse.json({ success: true, id: created.id }, { status: 201 });
    }

    const id = idField(body.id, "รหัสผู้ใช้");
    const current = await prisma.user.findUnique({ where: { id }, include: { credential: { select: { disabledAt: true } } } });
    if (!current) throw new InputError("ไม่พบบัญชีผู้ใช้", 404);
    if (body.expected !== current.updatedAt.toISOString()) throw new InputError("ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดหน้าใหม่", 409);
    const protectedAccount = current.role === "ADMIN" || current.role === "SUPERADMIN";
    if (protectedAccount && id !== admin.id && admin.role !== "SUPERADMIN") throw new InputError("คุณไม่มีสิทธิ์แก้ไขบัญชีผู้ดูแลรายนี้", 403);
    const role = id === admin.id || protectedAccount ? current.role : enumField(body.role, MANAGED_ROLES, "บทบาท");
    const disabled = id === admin.id ? false : body.disabled === true;
    if (!current.credential && !password) throw new InputError("บัญชีนี้ยังไม่มีรหัสผ่าน กรุณาตั้งรหัสผ่านใหม่");
    if (password && (password.length < 12 || password.length > 128)) throw new InputError("รหัสผ่านต้องมี 12–128 ตัวอักษร");
    const duplicate = await prisma.user.findFirst({ where: { id: { not: id }, OR: [{ email }, { studentId }] }, select: { email: true } });
    if (duplicate) throw new InputError(duplicate.email === email ? "อีเมลนี้มีบัญชีแล้ว" : "รหัสนี้มีบัญชีแล้ว", 409);
    const passwordHash = password ? await hashPassword(password) : null;
    await prisma.$transaction(async tx => {
      await tx.user.update({ where: { id }, data: { name, email, role, studentId, phoneNumber, faculty, department } });
      if (passwordHash) await tx.authCredential.upsert({ where: { userId: id }, create: { userId: id, passwordHash, disabledAt: disabled ? new Date() : null }, update: { passwordHash, disabledAt: disabled ? new Date() : null } });
      else await tx.authCredential.update({ where: { userId: id }, data: { disabledAt: disabled ? current.credential?.disabledAt ?? new Date() : null } });
      if (disabled || passwordHash || role !== current.role) await tx.authSession.deleteMany({ where: { userId: id } });
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "อีเมลหรือรหัสนี้มีบัญชีแล้ว" }, { status: 409 });
    const response = inputErrorResponse(error); if (response) return response;
    console.error("User management failed", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "บันทึกบัญชีไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
}
