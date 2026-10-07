import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { latestAssignmentOrder } from "@/lib/permissions";
import {
  Wrench,
  Phone,
  ChevronRight,
} from "lucide-react";

export default async function TechnicianJobsPage() {
  const currentUser = await requireCurrentUser("/technician/jobs");

  if (currentUser?.role !== "TECHNICIAN" && currentUser?.role !== "ADMIN" && currentUser?.role !== "SUPERADMIN") {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-12 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
        <Wrench className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="text-lg font-bold text-amber-900">
          พื้นที่ปฏิบัติงานสำหรับ ช่างซ่อมบำรุง (Technician)
        </h2>
        <p className="text-sm text-amber-700">
          คุณกำลังเข้าสู่ระบบในบทบาท: <span className="font-bold">{currentUser?.role}</span> ({currentUser?.name})
        </p>
        <p className="text-xs text-slate-500">
          กรุณาออกจากระบบแล้วเข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ใช้งานหน้านี้
        </p>
      </div>
    );
  }

  // Find assignments for this technician (or all assigned jobs if admin testing)
  const assignmentHistory = await prisma.ticketAssignment.findMany({
    where: currentUser?.role === "TECHNICIAN" ? { technicianId: currentUser.id } : undefined,
    include: {
      ticket: {
        include: {
          building: true,
          category: true,
          reporter: true,
          images: true,
          evaluation: true,
          assignments: {
            select: { id: true },
            orderBy: latestAssignmentOrder,
            take: 1,
          },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });

  // Hide old assignments so the work list matches the ticket access policy.
  const assignments = assignmentHistory.filter(
    (assignment) => assignment.ticket.assignments[0]?.id === assignment.id
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CANCELLED": return {label:"ยกเลิกแล้ว",bg:"bg-slate-100 text-slate-700 border-slate-200"};
      case "REJECTED": return {label:"ไม่รับดำเนินการ",bg:"bg-slate-100 text-slate-700 border-slate-200"};
      case "COMPLETED":
        return {
          label: "เสร็จสิ้น",
          bg: "bg-emerald-100 text-emerald-800 border-emerald-200",
        };
      case "IN_PROGRESS":
        return {
          label: "กำลังดำเนินการ",
          bg: "bg-blue-100 text-blue-800 border-blue-200",
        };
      case "WAITING_PARTS":
        return {
          label: "รออะไหล่",
          bg: "bg-amber-100 text-amber-800 border-amber-200",
        };
      default:
        return {
          label: "รอรับเรื่อง",
          bg: "bg-slate-100 text-slate-800 border-slate-200",
        };
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs uppercase tracking-wide">
            <Wrench className="w-4 h-4" /> ระบบงานช่างซ่อมบำรุงภาคสนาม
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            งานที่ได้รับมอบหมาย (My Assigned Jobs)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ช่างผู้ปฏิบัติงาน: <span className="font-semibold text-slate-800">{currentUser.name}</span> ({currentUser.department || "กองอาคารสถานที่"})
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3.5 py-1.5 rounded-xl">
            งานที่รับผิดชอบ: {assignments.length} งาน
          </span>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {assignments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3 shadow-xs">
            <Wrench className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
            <h3 className="text-base font-bold text-slate-700">ไม่มีงานค้างที่ได้รับมอบหมาย</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              เมื่อเจ้าหน้าที่กองอาคารสถานที่จ่ายงานให้คุณ รายการงานจะปรากฏที่นี่ทันที
            </p>
          </div>
        ) : (
          assignments.map((a) => {
            const t = a.ticket;
            const badge = getStatusBadge(t.status);
            const beforeImage = t.images.find((img) => img.imageType === "BEFORE");

            return (
              <div
                key={a.id}
                className="bg-white hover:bg-slate-50/80 transition-all rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-amber-300 hover:shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    {beforeImage ? (
                      <img
                        src={beforeImage.imageUrl}
                        alt="Thumbnail"
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                        ไม่มีรูป
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded">
                          {t.ticketCode}
                        </span>
                        <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {t.category.name}
                        </span>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                        {t.title}
                      </h3>

                      <p className="text-xs text-slate-600 font-medium">
                        📍 สถานที่: {t.room || t.locationNote || t.building.name}
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-400 shrink-0">
                    <div>มอบหมายเมื่อ</div>
                    <div className="font-medium text-slate-600">
                      {new Date(a.assignedAt).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>

                {/* Reporter Contact & Action row */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 text-slate-600">
                    <span>👤 ผู้แจ้ง: <b>{t.reporter.name}</b></span>
                    {t.reporter.phoneNumber && (
                      <a
                        href={`tel:${t.reporter.phoneNumber}`}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:underline font-semibold bg-indigo-50 px-2 py-1 rounded-lg"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{t.reporter.phoneNumber}</span>
                      </a>
                    )}
                  </div>

                  <Link
                    href={`/tickets/${t.id}`}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold rounded-xl shadow-xs transition-all text-xs"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>เปิดดูรายละเอียด & บันทึกงานซ่อม</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


