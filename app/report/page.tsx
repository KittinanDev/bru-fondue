import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TicketCreateForm from "@/components/TicketCreateForm";
import { PlusCircle, ShieldAlert } from "lucide-react";

export default async function ReportPage() {
  const currentUser = await requireCurrentUser("/report");

  if (currentUser?.role !== "STUDENT" && currentUser?.role !== "STAFF") {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-12 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto" />
        <h2 className="text-lg font-bold text-amber-900">หน้านี้สำหรับ นักศึกษา / บุคลากร ผู้แจ้งปัญหา</h2>
        <p className="text-sm text-amber-700">
          คุณกำลังเข้าสู่ระบบในบทบาท: <span className="font-bold">{currentUser?.role}</span> ({currentUser?.name})
        </p>
        <p className="text-xs text-slate-500">
          กรุณาออกจากระบบแล้วเข้าสู่ระบบด้วยบัญชีที่มีสิทธิ์ใช้งานหน้านี้
        </p>
      </div>
    );
  }

  const categories = await prisma.category.findMany({
    orderBy: { id: "asc" },
  });

  const buildings = await prisma.building.findMany({
    orderBy: { id: "asc" },
  });

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-xs uppercase tracking-wide">
            <PlusCircle className="w-4 h-4" /> Issue Reporting System
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            แจ้งซ่อมอุปกรณ์ชำรุด / ปัญหาสิ่งแวดล้อม
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            มหาวิทยาลัยราชภัฏบุรีรัมย์ • กรอกข้อมูลและแนบภาพถ่ายเพื่อให้ช่างเข้าซ่อมบำรุง
          </p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 px-3.5 py-1.5 rounded-xl text-xs text-indigo-900 font-semibold self-start sm:self-auto">
          ผู้แจ้ง: {currentUser.name}
        </div>
      </div>

      {/* Form Component */}
      <TicketCreateForm
        categories={categories}
        buildings={buildings}
        currentUserName={currentUser.name}
      />
    </div>
  );
}

