import { readBody, idField, textField, enumField, JOB_STATUSES, inputErrorResponse, limitMutation } from "@/lib/input-validation";
import { normalizeImage } from "@/lib/image-validation";
import { canUpdateJob } from "@/lib/ticket-workflow";
import { isSameOrigin } from "@/lib/session";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canManageTicket, isAdmin, latestAssignmentOrder } from "@/lib/permissions";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }
    if (user.role !== "TECHNICIAN" && !isAdmin(user)) {
      return NextResponse.json({ error: "เฉพาะช่างผู้รับผิดชอบหรือผู้ดูแลเท่านั้นที่อัปเดตงานได้" }, { status: 403 });
    }

    await limitMutation(user.id, "update");
    const body = await readBody(request, 7 * 1024 * 1024);
    const ticketId = idField(body.ticketId);
    const status = enumField(body.status, JOB_STATUSES, "สถานะงาน");
    const note = textField(body.note, "บันทึกงานซ่อม", 2000, true);
    const preliminary = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { reporterId: true, assignments: { select: { technicianId: true }, orderBy: latestAssignmentOrder, take: 1 } } });
    if (!preliminary) return NextResponse.json({ error: "ไม่พบคำร้องที่ระบุ" }, { status: 404 });
    if (!canManageTicket(user, preliminary)) return NextResponse.json({ error: "คุณไม่ได้เป็นช่างผู้รับผิดชอบงานนี้" }, { status: 403 });
    const afterImage = body.afterImage == null ? null : await normalizeImage(body.afterImage);
    const result = await prisma.$transaction(async (tx) => {
      const access = await tx.ticket.findUnique({
        where: { id: ticketId },
        select: {
          status: true,
          updatedAt: true,
          reporterId: true,
          assignments: {
            select: { technicianId: true },
            orderBy: latestAssignmentOrder,
            take: 1,
          },
        },
      });
      if (!access) return { error: "ไม่พบคำร้องที่ระบุ", statusCode: 404 };
      if (!canManageTicket(user, access)) {
        return { error: "คุณไม่ได้เป็นช่างผู้รับผิดชอบงานนี้", statusCode: 403 };
      }

      if (!canUpdateJob(access.status, status)) return { error: "งานนี้ยังไม่ได้มอบหมายหรือปิดแล้ว ไม่สามารถเปลี่ยนสถานะได้", statusCode: 409 };
      if (body.expectedUpdatedAt !== undefined && body.expectedUpdatedAt !== access.updatedAt.toISOString()) return { error: "ข้อมูลเปลี่ยนแปลงแล้ว กรุณาโหลดหน้าใหม่ก่อนบันทึก", statusCode: 409 };
      if (status === access.status && !note && !afterImage) return { error: "กรุณาระบุหมายเหตุหรือแนบรูปเมื่อบันทึกสถานะเดิม", statusCode: 400 };

      const ticket = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status,
          resolvedAt: status === "COMPLETED" ? new Date() : null,
          updatedAt: new Date(Math.max(Date.now(), access.updatedAt.getTime() + 1)),
        },
      });
      if (afterImage && typeof afterImage === "string") {
        await tx.ticketImage.create({
          data: { ticketId, imageUrl: afterImage, imageType: "AFTER", uploadedById: user.id },
        });
      }
      await tx.ticketStatusLog.create({
        data: {
          ticketId,
          status,
          note: note || `ช่างซ่อมบำรุง (${user.name}) อัปเดตสถานะเป็น ${status}`,
          changedById: user.id,
        },
      });
      return { ticket };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode });
    }
    return NextResponse.json({ success: true, ticket: result.ticket });
  } catch (error) {
    const response = inputErrorResponse(error); if (response) return response;
    console.error("Update job error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการอัปเดตสถานะงาน" }, { status: 500 });
  }
}


