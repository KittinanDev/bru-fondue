import { reportFilter, statusLabels, thaiDate } from "@/lib/reporting";
import { latestAssignmentOrder } from "@/lib/permissions";
import { csvCell } from "@/lib/csv";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return NextResponse.json({ error: "เฉพาะเจ้าหน้าที่กองอาคารสถานที่เท่านั้น" }, { status: 403 });
    }

    let filter;
    try { filter = reportFilter(Object.fromEntries(Array.from(new URL(request.url).searchParams.keys(), key => { const values = new URL(request.url).searchParams.getAll(key); return [key, values.length > 1 ? values : values[0]]; }))); } catch { return NextResponse.json({error:"ตัวกรองไม่ถูกต้อง"},{status:400}); }
    const tickets = await prisma.ticket.findMany({
      where: filter.where,
      include: {
        building: true,
        category: true,
        reporter: true,
        assignments: {
          orderBy: latestAssignmentOrder, take: 1,
          include: { technician: true },
        },
        evaluation: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // CSV Header with UTF-8 BOM for Thai support in Windows Excel
    const header = [
      "รหัสคำร้อง",
      "หัวข้อปัญหา",
      "หมวดหมู่",
      "สถานที่",
      "อาคารอ้างอิง",
      "ระดับความเร่งด่วน",
      "สถานะ",
      "ผู้แจ้ง",
      "เบอร์โทรผู้แจ้ง",
      "ช่างผู้รับผิดชอบ",
      "วันที่แจ้ง",
      "วันที่เสร็จสิ้น",
      "คะแนนประเมิน (ดาว)",
      "ข้อคิดเห็นประเมิน",
    ];

    const rows = tickets.map((t) => {
      const technicianName = t.assignments[0]?.technician.name || "ยังไม่ได้มอบหมาย";
      const resolvedDate = t.resolvedAt
        ? thaiDate(t.resolvedAt)
        : "-";
      const evalScore = t.evaluation ? t.evaluation.score.toString() : "-";
      const evalComment = t.evaluation?.comment || "-";

      const statusTh = statusLabels[t.status] || t.status;

      return [
        t.ticketCode,
        t.title,
        t.category.name,
        t.room || t.locationNote || t.building.name,
        t.building.name,
        t.priority,
        statusTh,
        t.reporter.name,
        t.reporter.phoneNumber || "-",
        technicianName,
        thaiDate(t.createdAt),
        resolvedDate,
        evalScore,
        evalComment,
      ].map(csvCell).join(",");
    });

    const csvContent = "\uFEFF" + [header.map(csvCell).join(","), ...rows].join("\r\n");

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `BRU-Fondue-Report-${dateStr}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export CSV error:", error);
    return NextResponse.json({ error: "ไม่สามารถส่งออกข้อมูลได้" }, { status: 500 });
  }
}

