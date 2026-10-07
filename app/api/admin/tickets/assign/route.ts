import { readBody, idField, textField, enumField, PRIORITIES, inputErrorResponse, limitMutation, InputError } from "@/lib/input-validation";
import { isSameOrigin } from "@/lib/session";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { latestAssignmentOrder } from "@/lib/permissions";
import { isClosedTicket } from "@/lib/ticket-workflow";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  try {
    const adminUser = await getCurrentUser();
    if (!adminUser || (adminUser.role !== "ADMIN" && adminUser.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ (เฉพาะเจ้าหน้าที่กองอาคารสถานที่)" }, { status: 403 });
    }

    await limitMutation(adminUser.id, "assign");
    const body = await readBody(request);
    const ticketId = idField(body.ticketId);
    const technicianId = idField(body.technicianId, "รหัสช่าง");
    const priority = body.priority === undefined ? undefined : enumField(body.priority, PRIORITIES, "ความเร่งด่วน");
    const adminNote = textField(body.adminNote, "หมายเหตุ", 2000, true);
    if (!await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } })) throw new InputError("ไม่พบคำร้องที่ระบุ", 404);
    const technician = await prisma.user.findUnique({
      where: { id: technicianId },
    });

    if (!technician || technician.role !== "TECHNICIAN") {
      return NextResponse.json({ error: "ไม่พบข้อมูลช่างซ่อมบำรุงที่เลือก" }, { status: 404 });
    }

    const updatedTicket = await prisma.$transaction(async (tx) => {
      const current = await tx.ticket.findUnique({ where: { id: ticketId }, include: { assignments: { orderBy: latestAssignmentOrder, take: 1 } } });
      if (!current) throw new InputError("ไม่พบคำร้องที่ระบุ", 404);
      if (isClosedTicket(current.status)) throw new InputError("คำร้องนี้ปิดแล้ว ไม่สามารถมอบหมายใหม่ได้", 409);
      if (body.expectedUpdatedAt !== undefined && body.expectedUpdatedAt !== current.updatedAt.toISOString()) throw new InputError("ข้อมูลเปลี่ยนแปลงแล้ว กรุณาโหลดหน้าใหม่ก่อนมอบหมาย", 409);
      const latest = current.assignments[0];
      if (latest?.technicianId === technicianId) throw new InputError("ช่างคนนี้เป็นผู้รับผิดชอบอยู่แล้ว", 409);
      const nextStatus = current.status === "PENDING" ? "IN_PROGRESS" : current.status;
      // 1. Create or update assignment
      await tx.ticketAssignment.create({
        data: {
          ticketId,
          technicianId,
          assignedById: adminUser.id,
          assignedAt: new Date(Math.max(Date.now(), (latest?.assignedAt.getTime() ?? 0) + 1)),
        },
      });

      // 2. Update Ticket Status to IN_PROGRESS and Priority
      const ticket = await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: nextStatus,
          resolvedAt: null,
          updatedAt: new Date(Math.max(Date.now(), current.updatedAt.getTime() + 1)),
          priority: priority || undefined,
        },
      });

      // 3. Log status history
      await tx.ticketStatusLog.create({
        data: {
          ticketId,
          status: nextStatus,
          note: adminNote
            ? `กองอาคารสถานที่มอบหมายงานให้ ${technician.name}: ${adminNote}`
            : `กองอาคารสถานที่ (${adminUser.name}) มอบหมายงานให้ ${technician.name}`,
          changedById: adminUser.id,
        },
      });

      return ticket;
    });

    return NextResponse.json({
      success: true,
      ticket: updatedTicket,
      message: `มอบหมายงานให้ ${technician.name} เรียบร้อยแล้ว`,
    });
  } catch (error) {
    const response = inputErrorResponse(error); if (response) return response;
    console.error("Assign technician error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการมอบหมายงาน" }, { status: 500 });
  }
}


