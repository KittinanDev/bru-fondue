import TicketLifecycleActions from "@/components/TicketLifecycleActions";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { notFound } from "next/navigation";
import TechnicianActionConsole from "@/components/TechnicianActionConsole";
import AdminTicketAssignment from "@/components/AdminTicketAssignment";
import TicketEvaluationCard from "@/components/TicketEvaluationCard";
import AccessDenied from "@/components/AccessDenied";
import { statusLabels } from "@/lib/reporting";
import { canViewTicket, canManageTicket, canEvaluateTicket, latestAssignmentOrder } from "@/lib/permissions";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  User,
  Building2,
} from "lucide-react";

interface TicketDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}

export default async function TicketDetailPage({
  params,
  searchParams,
}: TicketDetailPageProps) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const currentUser = await requireCurrentUser(`/tickets/${id}`);

  const access = await prisma.ticket.findUnique({
    where: { id },
    select: {
      reporterId: true,
      assignments: {
        select: { technicianId: true },
        orderBy: latestAssignmentOrder,
        take: 1,
      },
    },
  });

  if (!access) notFound();
  if (!canViewTicket(currentUser, access)) {
    return <AccessDenied message="เฉพาะผู้แจ้ง เจ้าหน้าที่ผู้ดูแล หรือช่างที่รับผิดชอบงานนี้เท่านั้นที่เปิดดูคำร้องได้" />;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      building: true,
      category: true,
      reporter: true,
      images: true,
      assignments: {
        include: { technician: true, assignedBy: true },
        orderBy: latestAssignmentOrder,
        take: 1,
      },
      statusLogs: {
        include: { changedBy: true },
        orderBy: { createdAt: "asc" },
      },
      evaluation: true,
    },
  });

  if (!ticket) {
    notFound();
  }

  const beforeImages = ticket.images.filter((img) => img.imageType === "BEFORE");
  const afterImages = ticket.images.filter((img) => img.imageType === "AFTER");

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
          label: "รออะไหล่/จัดซื้อ",
          bg: "bg-amber-100 text-amber-800 border-amber-200",
        };
      default:
        return {
          label: "รอรับเรื่อง",
          bg: "bg-slate-100 text-slate-800 border-slate-200",
        };
    }
  };

  const statusBadge = getStatusBadge(ticket.status);
  const admin = isAdmin(currentUser);
  const technicians = admin ? await prisma.user.findMany({
    where: { role: "TECHNICIAN" },
    select: { id: true, name: true, department: true },
    orderBy: { name: "asc" },
  }) : [];

  // Smart back link based on user role
  const backHref =
    currentUser?.role === "TECHNICIAN"
      ? "/technician/jobs"
      : currentUser?.role === "ADMIN" || currentUser?.role === "SUPERADMIN"
      ? "/admin/tickets"
      : "/my-tickets";

  const backLabel =
    currentUser?.role === "TECHNICIAN"
      ? "กลับไปหน้ารายการงานของช่าง"
      : currentUser?.role === "ADMIN" || currentUser?.role === "SUPERADMIN"
      ? "กลับไปหน้าจัดการคำร้อง (Admin)"
      : "กลับไปหน้ารายการแจ้งซ่อมของฉัน";

  const canManageJob = canManageTicket(currentUser, access);

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Back button */}
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {backLabel}
        </Link>
      </div>

      {/* Success Notification if newly created */}
      {isNew === "true" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-emerald-900 animate-in fade-in">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold">ส่งคำร้องแจ้งซ่อมเข้าระบบสำเร็จ!</h3>
            <p className="text-xs text-emerald-700 mt-0.5">
              รหัสคำร้องของคุณคือ <span className="font-mono font-bold">{ticket.ticketCode}</span> ระบบได้ส่งเรื่องให้เจ้าหน้าที่กองอาคารสถานที่เพื่อจัดส่งช่างซ่อมบำรุงแล้ว
            </p>
          </div>
        </div>
      )}

      <section className="ticket-next-step rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-indigo-700">สถานะปัจจุบัน</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{statusBadge.label}</h2></div><span className={`rounded-full border px-3 py-1.5 font-semibold ${statusBadge.bg}`}>{statusBadge.label}</span></div>
        <p className="mt-3 text-slate-600">{ticket.status==="PENDING"?"เจ้าหน้าที่กำลังตรวจสอบและมอบหมายช่าง":ticket.status==="IN_PROGRESS"?"ช่างรับงานแล้วและกำลังดำเนินการ":ticket.status==="WAITING_PARTS"?"งานหยุดรออะไหล่หรือวัสดุที่จำเป็น":ticket.status==="COMPLETED"?"งานซ่อมเสร็จแล้ว กรุณาตรวจสอบผลและประเมินบริการ":"คำร้องนี้ปิดการดำเนินการแล้ว"}</p>
      </section>

      {admin && !["COMPLETED", "REJECTED", "CANCELLED"].includes(ticket.status) && <AdminTicketAssignment
        ticketId={ticket.id}
        status={ticket.status}
        priority={ticket.priority}
        updatedAt={ticket.updatedAt.toISOString()}
        technicians={technicians}
        currentTechnicianId={ticket.assignments[0]?.technicianId}
      />}

      {/* Only the assigned technician updates repair progress. */}
      {currentUser.role === "TECHNICIAN" && canManageJob && ["IN_PROGRESS", "WAITING_PARTS"].includes(ticket.status) && (
        <TechnicianActionConsole
          ticketId={ticket.id}
          currentStatus={ticket.status}
          key={ticket.updatedAt.toISOString()}
          expectedUpdatedAt={ticket.updatedAt.toISOString()}
          technicianName={currentUser?.name || "ช่างซ่อมบำรุง"}
        />
      )}

      <TicketLifecycleActions key={`lifecycle-${ticket.updatedAt.toISOString()}`} ticketId={ticket.id} status={ticket.status} updatedAt={ticket.updatedAt.toISOString()} admin={admin} owner={canEvaluateTicket(currentUser, access)} />
      {/* Main Ticket Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 border-b border-slate-100 pb-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                {ticket.ticketCode}
              </span>
              <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg">
                {ticket.category.name}
              </span>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg border ${statusBadge.bg}`}>
                {statusBadge.label}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
              {ticket.title}
            </h1>
          </div>

          <div className="text-right text-xs text-slate-400 shrink-0">
            <div>แจ้งเมื่อ</div>
            <div className="font-medium text-slate-600">
              {new Date(ticket.createdAt).toLocaleString("th-TH")}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Location info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <Building2 className="w-4 h-4 text-indigo-600" />
              สถานที่
            </h3>
            <div className="space-y-1 text-slate-600">
              <div className="text-sm font-semibold text-slate-800">
                {ticket.locationNote || ticket.room || ticket.building.name}
              </div>
              {ticket.building.name && ticket.locationNote !== ticket.building.name && (
                <div className="text-[11px] text-slate-400">
                  บริเวณ: {ticket.building.name}
                </div>
              )}
              {ticket.latitude && ticket.longitude && (
                <div className="text-slate-500 font-mono pt-1 text-[11px]">
                  📍 พิกัด GPS: {ticket.latitude.toFixed(6)}, {ticket.longitude.toFixed(6)}
                </div>
              )}
            </div>
          </div>

          {/* Reporter & Technician Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <User className="w-4 h-4 text-indigo-600" />
              ข้อมูลผู้เกี่ยวข้อง
            </h3>
            <div className="space-y-1 text-slate-600">
              <div>
                <b>ผู้แจ้ง:</b> {ticket.reporter.name} ({ticket.reporter.studentId || ticket.reporter.email})
              </div>
              <div><b>เบอร์ติดต่อ:</b> {ticket.reporter.phoneNumber || "-"}</div>
              <div className="pt-1 border-t border-slate-200 mt-1">
                <b>ช่างผู้รับผิดชอบ:</b>{" "}
                {ticket.assignments[0] ? (
                  <span className="font-semibold text-slate-900">
                    {ticket.assignments[0].technician.name} ({ticket.assignments[0].technician.phoneNumber || "ช่างเวร"})
                  </span>
                ) : (
                  <span className="text-slate-400 italic">อยู่ระหว่างรอกองอาคารมอบหมายงาน</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Problem Description */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-slate-700">รายละเอียดอาการชำรุด</h3>
          <p className="text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
            {ticket.description}
          </p>
        </div>

        {/* Photos (Before & After Comparison) */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-slate-800">รูปภาพก่อนและหลังซ่อม</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Before Photo */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                ภาพถ่ายตอนแจ้ง
              </div>
              {beforeImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {beforeImages.map((img) => (
                    <img
                      key={img.id}
                      src={img.imageUrl}
                      alt="Before"
                      className="w-full h-36 object-cover rounded-lg border border-slate-200"
                    />
                  ))}
                </div>
              ) : (
                <div className="h-28 flex items-center justify-center text-xs text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
                  ไม่มีรูปภาพประกอบ
                </div>
              )}
            </div>

            {/* After Photo */}
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <div className="text-[11px] font-bold text-slate-600 mb-2 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                ภาพถ่ายหลังซ่อมเสร็จ
              </div>
              {afterImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {afterImages.map((img) => (
                    <img
                      key={img.id}
                      src={img.imageUrl}
                      alt="After"
                      className="w-full h-36 object-cover rounded-lg border border-slate-200"
                    />
                  ))}
                </div>
              ) : (
                <div className="h-28 flex items-center justify-center text-xs text-slate-400 bg-white rounded-lg border border-dashed border-slate-200">
                  {ticket.status === "COMPLETED"
                    ? "ช่างไม่ได้แนบรูปภาพ After"
                    : "อยู่ระหว่างการดำเนินงานซ่อมแซม"}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Evaluation Card (Inspect Before/After & 1-5 Star Rating) */}
        <TicketEvaluationCard
          ticketId={ticket.id}
          status={ticket.status}
          evaluation={ticket.evaluation}
          canEvaluate={canEvaluateTicket(currentUser, access)}
        />

        {/* Status Timeline / Audit Log */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-indigo-600" />
            ประวัติการดำเนินงาน
          </h3>
          <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {ticket.statusLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 pl-1 relative">
                <div className="w-4 h-4 rounded-full bg-indigo-600 ring-4 ring-white shrink-0 mt-0.5" />
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex-1 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-slate-800">{statusLabels[log.status]||log.status}</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(log.createdAt).toLocaleString("th-TH")}
                    </span>
                  </div>
                  <p className="text-slate-600">{log.note || "-"}</p>
                  <div className="text-[10px] text-slate-400 mt-1">
                    โดย: {log.changedBy.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


