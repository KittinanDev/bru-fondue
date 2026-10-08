import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  ClipboardList,
  PlusCircle,
  ChevronRight,
  Calendar,
} from "lucide-react";

export default async function MyTicketsPage() {
  const currentUser = await requireCurrentUser("/my-tickets");

  const tickets = currentUser
    ? await prisma.ticket.findMany({
        where: { reporterId: currentUser.id },
        include: {
          building: true,
          category: true,
          images: true,
          assignments: { include: { technician: true } },
          evaluation: true,
        },
        orderBy: { createdAt: "desc" },
      })
    : [];

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
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-xs uppercase tracking-wide">
            <ClipboardList className="w-4 h-4" /> Issue Tracking
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            ประวัติการแจ้งซ่อมของฉัน
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ผู้แจ้ง: <span className="font-semibold text-slate-800">{currentUser?.name}</span> ({currentUser?.studentId || currentUser?.email})
          </p>
        </div>
        <Link
          href="/report"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs"
        >
          <PlusCircle className="w-4 h-4" />
          แจ้งปัญหาใหม่
        </Link>
      </div>

      {/* Tickets List */}
      <div className="space-y-4">
        {tickets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-3 shadow-xs">
            <ClipboardList className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
            <h3 className="text-base font-bold text-slate-700">ยังไม่มีประวัติการแจ้งปัญหา</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              คุณยังไม่เคยส่งคำร้องแจ้งซ่อมในระบบ หากพบเห็นอุปกรณ์ชำรุด สามารถกดแจ้งเรื่องได้ทันที
            </p>
            <Link
              href="/report"
              className="inline-block mt-2 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl"
            >
              คลิกเพื่อแจ้งปัญหาแรก
            </Link>
          </div>
        ) : (
          tickets.map((t) => {
            const badge = getStatusBadge(t.status);
            const beforeImage = t.images.find((img) => img.imageType === "BEFORE");

            return (
              <Link
                key={t.id}
                href={`/tickets/${t.id}`}
                className="block bg-white hover:bg-slate-50/80 transition-all rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-indigo-300 hover:shadow-sm group"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Thumbnail */}
                    {beforeImage ? (
                      <img
                        src={beforeImage.imageUrl}
                        alt="Thumbnail"
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                        ไม่มีรูป
                      </div>
                    )}

                    {/* Info */}
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

                      <h3 className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {t.title}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-1">
                        📍 {t.building.name} {t.room ? `(${t.room})` : ""}
                      </p>

                      <div className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(t.createdAt).toLocaleDateString("th-TH", {
                          timeZone: "Asia/Bangkok",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Arrow action */}
                  <div className="flex items-center gap-2 self-end sm:self-center text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition-transform">
                    <span>ดูรายละเอียด</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

