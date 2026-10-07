import { readBody, idField, textField, inputErrorResponse, limitMutation, InputError } from "@/lib/input-validation";
import { isSameOrigin } from "@/lib/session";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { canEvaluateTicket } from "@/lib/permissions";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "คำขอไม่ถูกต้อง" }, { status: 403 });
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" }, { status: 401 });
    }

    await limitMutation(user.id, "evaluate");
    const body = await readBody(request);
    const ticketId = idField(body.ticketId);
    const score = body.score;
    if (typeof score !== "number" || !Number.isInteger(score) || score < 1 || score > 5) throw new InputError("กรุณาระบุคะแนนจำนวนเต็ม 1 ถึง 5 ดาว");
    const comment = textField(body.comment, "ข้อเสนอแนะ", 2000, true);
    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        select: { reporterId: true, status: true, evaluation: { select: { id: true } } },
      });
      if (!ticket) return { error: "ไม่พบคำร้องที่ระบุ", statusCode: 404 };
      if (!canEvaluateTicket(user, { reporterId: ticket.reporterId, assignments: [] })) {
        return { error: "เฉพาะผู้แจ้งคำร้องนี้เท่านั้นที่ให้คะแนนประเมินได้", statusCode: 403 };
      }
      if (ticket.status !== "COMPLETED") {
        return { error: "สามารถประเมินได้เมื่อซ่อมเสร็จสิ้นแล้วเท่านั้น", statusCode: 400 };
      }
      if (ticket.evaluation) {
        return { error: "คำร้องนี้ได้รับการประเมินแล้ว ไม่สามารถส่งคะแนนซ้ำได้", statusCode: 409 };
      }

      const evaluation = await tx.evaluation.create({
        data: { ticketId, reporterId: user.id, score, comment: comment?.trim() || null },
      });
      await tx.ticketStatusLog.create({
        data: {
          ticketId,
          status: "COMPLETED",
          note: `ผู้แจ้ง (${user.name}) ประเมินความพึงพอใจ ${score} ดาว${comment?.trim() ? `: "${comment.trim()}"` : ""}`,
          changedById: user.id,
        },
      });
      return { evaluation };
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode });
    }
    return NextResponse.json({ success: true, evaluation: result.evaluation });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "คำร้องนี้ได้รับการประเมินแล้ว" }, { status: 409 });
    }
    const response = inputErrorResponse(error); if (response) return response;
    console.error("Evaluation error:", error);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดในการบันทึกการประเมิน" }, { status: 500 });
  }
}


