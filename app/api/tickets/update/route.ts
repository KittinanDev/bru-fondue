import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isAdmin, canReportTicket } from "@/lib/permissions";
import { isClosedTicket } from "@/lib/ticket-workflow";
import { isSameOrigin } from "@/lib/session";
import {
  readBody,
  idField,
  textField,
  positiveId,
  enumField,
  PRIORITIES,
  coordinates,
  InputError,
  inputErrorResponse,
  limitMutation,
} from "@/lib/input-validation";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  }

  try {
    const user = await getCurrentUser();
    if (!user) throw new InputError("กรุณาเข้าสู่ระบบ", 401);

    await limitMutation(user.id, "update_ticket");
    const body = await readBody(request, 64 * 1024);

    const ticketId = idField(body.ticketId);
    const title = textField(body.title, "หัวข้อปัญหา", 160);
    const description = textField(body.description, "รายละเอียด", 4000);
    const location = textField(body.location, "สถานที่", 240);
    const categoryId = positiveId(body.categoryId, "หมวดหมู่");
    const buildingId = body.buildingId ? positiveId(body.buildingId, "อาคาร") : undefined;
    const priority = enumField(body.priority ?? "MEDIUM", PRIORITIES, "ความเร่งด่วน");
    const coords = coordinates(body.latitude, body.longitude);

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          reporterId: true,
          status: true,
          updatedAt: true,
          buildingId: true,
        },
      });

      if (!ticket) throw new InputError("ไม่พบคำร้อง", 404);

      const admin = isAdmin(user);
      const isOwner = (canReportTicket(user) || true) && user.id === ticket.reporterId;

      if (!admin && !isOwner) {
        throw new InputError("ไม่มีสิทธิ์แก้ไขคำร้องนี้ เฉพาะผู้แจ้งหรือผู้ดูแลเท่านั้น", 403);
      }

      if (isClosedTicket(ticket.status)) {
        throw new InputError("ไม่สามารถแก้ไขคำร้องที่ปิดหรือเสร็จสิ้นแล้วได้", 400);
      }

      if (body.expectedUpdatedAt && body.expectedUpdatedAt !== ticket.updatedAt.toISOString()) {
        throw new InputError("ข้อมูลมีการเปลี่ยนแปลงแล้ว กรุณาโหลดหน้าใหม่", 409);
      }

      // Verify category exists
      const category = await tx.category.findUnique({
        where: { id: categoryId },
        select: { id: true, name: true },
      });
      if (!category) throw new InputError("ไม่พบหมวดหมู่ที่เลือก", 404);

      // Verify building exists if provided
      const resolvedBuildingId = buildingId ?? ticket.buildingId;
      const building = await tx.building.findUnique({
        where: { id: resolvedBuildingId },
        select: { id: true },
      });
      if (!building) throw new InputError("ไม่พบอาคารที่เลือก", 404);

      const updated = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          title,
          description,
          locationNote: location,
          room: location,
          categoryId,
          buildingId: resolvedBuildingId,
          priority,
          latitude: coords.latitude !== undefined ? coords.latitude : undefined,
          longitude: coords.longitude !== undefined ? coords.longitude : undefined,
          updatedAt: new Date(Math.max(Date.now(), ticket.updatedAt.getTime() + 1)),
        },
      });

      // Audit Log
      const roleLabel = admin ? "ผู้ดูแลระบบ" : "ผู้แจ้ง";
      await tx.ticketStatusLog.create({
        data: {
          ticketId,
          status: ticket.status,
          changedById: user.id,
          note: `${roleLabel} (${user.name}) แก้ไขข้อมูลคำร้อง: "${title}"`,
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, ticket: result });
  } catch (error) {
    const r = inputErrorResponse(error);
    if (r) return r;
    console.error("Update ticket error:", error);
    return NextResponse.json({ error: "บันทึกการแก้ไขไม่สำเร็จ" }, { status: 500 });
  }
}
