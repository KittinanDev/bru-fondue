import { NextResponse } from "next/server";
// The old demo endpoint can never authenticate a caller, even in development.
export async function POST() {
  return NextResponse.json({ error: "ปิดการสลับบัญชีเดโมแล้ว กรุณาเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน" }, { status: 410 });
}
