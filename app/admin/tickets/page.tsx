import { latestAssignmentOrder } from "@/lib/permissions";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AdminCampusMapWrapper from "@/components/AdminCampusMapWrapper";
import AdminTicketTable from "@/components/AdminTicketTable";
import {
  ShieldAlert,
  Wrench,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Layers,
} from "lucide-react";

export default async function AdminTicketsPage() {
  const currentUser = await requireCurrentUser("/admin/tickets");

  if (currentUser?.role !== "ADMIN" && currentUser?.role !== "SUPERADMIN") {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-12 bg-purple-50 border border-purple-200 rounded-2xl text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-purple-600 mx-auto" />
        <h2 className="text-lg font-bold text-purple-900">
          พื้นที่สงวนสิทธิ์สำหรับ เจ้าหน้าที่กองอาคารสถานที่ (Admin)
        </h2>
        <p className="text-sm text-purple-700">
          คุณกำลังเข้าสู่ระบบในบทบาท: <span className="font-bold">{currentUser?.role}</span> ({currentUser?.name})
        </p>
        <p className="text-xs text-slate-500">
          กรุณาออกจากระบบแล้วเข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ใช้งานหน้านี้
        </p>
      </div>
    );
  }

  // Fetch all tickets with full relations
  const allTickets = await prisma.ticket.findMany({
    include: {
      building: true,
      category: true,
      reporter: true,
      images: true,
      assignments: {
        include: { technician: true },
        orderBy: latestAssignmentOrder,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch all technicians for assignment
  const technicians = await prisma.user.findMany({
    where: { role: "TECHNICIAN" },
    orderBy: { name: "asc" },
  });

  // KPI Calculations
  const pendingCount = allTickets.filter((t) => t.status === "PENDING").length;
  const inProgressCount = allTickets.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "WAITING_PARTS"
  ).length;
  const completedCount = allTickets.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-purple-600 font-bold text-xs uppercase tracking-wide">
            <ShieldAlert className="w-4 h-4" /> กองอาคารสถานที่และยานพาหนะ มรภ.บุรีรัมย์
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            ศูนย์ควบคุมและจ่ายงานซ่อมบำรุง (Ticket Dispatching)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            เจ้าหน้าที่ผู้ดูแล: <span className="font-semibold text-slate-800">{currentUser.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-xl">
            ช่างในสังกัด: {technicians.length} คน
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-semibold text-slate-900">{allTickets.length}</div>
            <div className="text-[11px] text-slate-400">คำร้องทั้งหมด</div>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-100 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-semibold text-rose-600">{pendingCount}</div>
            <div className="text-[11px] text-slate-400">รอรับเรื่อง / ยังไม่จ่ายงาน</div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-100 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-semibold text-amber-600">{inProgressCount}</div>
            <div className="text-[11px] text-slate-400">กำลังดำเนินการ</div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-100 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-semibold text-emerald-600">{completedCount}</div>
            <div className="text-[11px] text-slate-400">ซ่อมเสร็จสิ้นแล้ว</div>
          </div>
        </div>
      </div>

      {/* 1. Interactive Campus Map View */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-600" />
              แผนที่ภาพรวมปัญหาจุดชำรุดในมหาวิทยาลัย (Interactive Campus Map)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              คลิกที่หมุดบนแผนที่เพื่อดูข้อมูลสรุป ภาพถ่ายจุดชำรุด และเปิดดูรายละเอียดคำร้อง
            </p>
          </div>
        </div>

        <AdminCampusMapWrapper tickets={allTickets} />
      </div>

      {/* 2. Ticket Table with Assignment Modal */}
      <div className="space-y-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            รายการคำร้องแจ้งซ่อมและมอบหมายงาน (Ticket Management)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            คลิกปุ่ม <b>จ่ายงานช่าง</b> เพื่อเลือกช่างผู้รับผิดชอบ
          </p>
        </div>

        <AdminTicketTable initialTickets={allTickets} technicians={technicians} />
      </div>
    </div>
  );
}

