import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
export class InputError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export async function readBody(request: Request, maxBytes = 16 * 1024): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw new InputError("รูปแบบข้อมูลไม่รองรับ", 415);
  if (Number(request.headers.get("content-length")) > maxBytes) throw new InputError("ข้อมูลหรือรูปภาพมีขนาดใหญ่เกินกำหนด", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new InputError("ไม่พบข้อมูลที่ส่งมา");
  const parts: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      length += value.length;
      if (length > maxBytes) { await reader.cancel(); throw new InputError("ข้อมูลหรือรูปภาพมีขนาดใหญ่เกินกำหนด", 413); }
      parts.push(value);
    }
  } finally { reader.releaseLock(); }
  let data;
  try { data = JSON.parse(Buffer.concat(parts).toString("utf8")); } catch { throw new InputError("รูปแบบข้อมูลไม่ถูกต้อง กรุณาลองใหม่"); }
  if (!data || Array.isArray(data) || typeof data !== "object") throw new InputError("รูปแบบข้อมูลไม่ถูกต้อง");
  return data;
}
export function textField(value: unknown, label: string, max: number, optional = false): string {
  if (optional && (value === undefined || value === null)) return "";
  if (typeof value !== "string") throw new InputError(`${label}ต้องเป็นข้อความ`);
  const text = value.trim();
  if (!optional && !text) throw new InputError(`กรุณาระบุ${label}`);
  if (text.length > max || value.length > max) throw new InputError(`${label}ยาวได้ไม่เกิน ${max} ตัวอักษร`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) throw new InputError(`${label}มีอักขระที่ไม่รองรับ`);
  return text;
}
export function idField(value: unknown, label = "รหัสคำร้อง"): string {
  const id = textField(value, label, 128);
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new InputError(`${label}ไม่ถูกต้อง`);
  return id;
}
export function positiveId(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) throw new InputError(`กรุณาเลือก${label}ที่ถูกต้อง`);
  return value;
}
export function enumField<T extends string>(value: unknown, allowed: readonly T[], label: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) throw new InputError(`${label}ไม่ถูกต้อง`);
  return value as T;
}
export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const JOB_STATUSES = ["IN_PROGRESS", "WAITING_PARTS", "COMPLETED"] as const;
export function coordinates(lat: unknown, lng: unknown) {
  if (lat == null && lng == null) return { latitude: null, longitude: null };
  if (typeof lat !== "number" || !Number.isFinite(lat) || lat < -90 || lat > 90 || typeof lng !== "number" || !Number.isFinite(lng) || lng < -180 || lng > 180) throw new InputError("พิกัดสถานที่ไม่ถูกต้อง กรุณาปักหมุดใหม่");
  return { latitude: lat, longitude: lng };
}
export async function limitMutation(userId: string, action: string) {
  // A separate key namespace shares the existing persistent rate-limit table.
  const key = `mutation:${action}:${userId}`; const now = new Date();
  const allowed = await prisma.$transaction(async tx => {
    const limit = await tx.authLoginLimit.findUnique({ where: { key } });
    if (limit && limit.resetsAt > now && limit.attempts >= 30) return false;
    if (!limit || limit.resetsAt <= now) await tx.authLoginLimit.upsert({ where: { key }, create: { key, attempts: 1, resetsAt: new Date(now.getTime() + 60000) }, update: { attempts: 1, resetsAt: new Date(now.getTime() + 60000) } });
    else await tx.authLoginLimit.update({ where: { key }, data: { attempts: { increment: 1 } } });
    return true;
  });
  if (!allowed) throw new InputError("ทำรายการถี่เกินไป กรุณารอ 1 นาทีแล้วลองใหม่", 429);
}
export function inputErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: error.status, ...(error.status === 429 ? { headers: { "Retry-After": "60" } } : {}) });
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2025" || error.code === "P2003") return NextResponse.json({ error: "ไม่พบข้อมูลอ้างอิง กรุณาโหลดหน้าใหม่" }, { status: 404 });
    if (error.code === "P2002" || error.code === "P2034") return NextResponse.json({ error: "ข้อมูลมีการเปลี่ยนแปลง กรุณาลองใหม่" }, { status: 409 });
  }
  return null;
}
