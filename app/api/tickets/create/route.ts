import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { isSameOrigin } from "@/lib/session";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canReportTicket } from "@/lib/permissions";
import { InputError, readBody, textField, positiveId, enumField, PRIORITIES, coordinates, inputErrorResponse, limitMutation } from "@/lib/input-validation";
import { normalizeImage } from "@/lib/image-validation";
import { MAX_IMAGES } from "@/lib/upload-policy";
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนแจ้งปัญหา" }, { status: 401 });
    if (!canReportTicket(user)) return NextResponse.json({ error: "เฉพาะนักศึกษาและบุคลากรเท่านั้นที่แจ้งปัญหาได้" }, { status: 403 });
    await limitMutation(user.id, "create");
    const body = await readBody(request, 28 * 1024 * 1024);
    const title = textField(body.title, "หัวข้อปัญหา", 160);
    const description = textField(body.description, "รายละเอียด", 4000);
    const location = textField(body.location, "สถานที่", 240);
    const categoryId = positiveId(body.categoryId, "หมวดหมู่");
    const buildingId = positiveId(body.buildingId, "อาคาร");
    const priority = enumField(body.priority ?? "MEDIUM", PRIORITIES, "ความเร่งด่วน");
    const coords = coordinates(body.latitude, body.longitude);
    const rawImages = body.images ?? [];
    if (!Array.isArray(rawImages) || rawImages.length > MAX_IMAGES) throw new InputError("แนบรูปภาพได้สูงสุด 4 รูป");
    const [building, category] = await Promise.all([
      prisma.building.findUnique({ where: { id: buildingId }, select: { id: true } }),
      prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }),
    ]);
    if (!building || !category) throw new InputError("ไม่พบอาคารหรือหมวดหมู่ที่เลือก กรุณาโหลดหน้าใหม่", 404);
    const images: string[] = [];
    for (const value of rawImages) images.push(await normalizeImage(value));
    const period = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", year: "2-digit", month: "2-digit", calendar: "buddhist" }).formatToParts(new Date());
    const prefix = `BRU-${period.find(p => p.type === "year")!.value}${period.find(p => p.type === "month")!.value}`;
    const createTicket = async () => {
    const ticketCode = `${prefix}-${randomBytes(6).toString("hex").toUpperCase()}`;
    const ticket = await prisma.$transaction(async tx => {
      const created = await tx.ticket.create({ data: { ticketCode, title, description, status: "PENDING", priority, categoryId, buildingId, locationNote: location, room: location, ...coords, reporterId: user.id } });
      await tx.ticketStatusLog.create({ data: { ticketId: created.id, status: "PENDING", note: `ผู้แจ้ง (${user.name}) ส่งคำร้องแจ้งปัญหาเข้าระบบเรียบร้อยแล้ว`, changedById: user.id } });
      for (const imageUrl of images) await tx.ticketImage.create({ data: { ticketId: created.id, imageUrl, imageType: "BEFORE", uploadedById: user.id } });
      return created;
    });
    return ticket;
    };
    // Unique constraint is authoritative; retry the entire atomic creation on a code collision.
    let ticket;
    for (let attempt = 0; attempt < 4; attempt++) {
      try { ticket = await createTicket(); break; }
      catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002" || attempt === 3) throw error;
      }
    }
    return NextResponse.json({ success: true, ticket });
  } catch (error) {
    const response = inputErrorResponse(error); if (response) return response;
    console.error("Create ticket error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลคำร้อง" }, { status: 500 });
  }
}
