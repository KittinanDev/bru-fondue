import { reportFilter, reportMetrics, statusLabels, type ReportParams } from "@/lib/reporting";
import { latestAssignmentOrder } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth";
import PrintReportButton from "@/components/PrintReportButton";
import AccessDenied from "@/components/AccessDenied";
import { isAdmin } from "@/lib/permissions";
import { Zap } from "lucide-react";

export default async function AdminPdfReportPage({searchParams}: {searchParams: Promise<ReportParams>}) {
  const currentUser = await requireCurrentUser("/admin/reports/pdf");

  if (!isAdmin(currentUser)) {
    return <AccessDenied message="รายงานสรุปข้อมูลสำหรับเจ้าหน้าที่ผู้ดูแลระบบเท่านั้น" />;
  }

  let filter;
  try { filter = reportFilter(await searchParams); } catch { return <p role="alert">ตัวกรองไม่ถูกต้อง <a href="/admin/dashboard">กลับไปเลือกตัวกรอง</a></p>; }
  const tickets = await prisma.ticket.findMany({
    where: filter.where,
    include: {
      category: true,
      building: true,
      reporter: true,
      evaluation: true,
      assignments: {
        orderBy: latestAssignmentOrder, take: 1,
        include: { technician: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const categories = await prisma.category.findMany({orderBy:{name:"asc"}});
  const selectedBuilding = filter.values.buildingId ? await prisma.building.findUnique({where:{id:Number(filter.values.buildingId)}}) : null;

  const metrics = reportMetrics(tickets);
  const {total, completed, resolutionRate, avgRating} = metrics;

  const currentDate = new Date().toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white text-slate-900 font-sans">
      {/* Top Print Trigger Bar */}
      <PrintReportButton />

      {/* A4 Sheet Container */}
      <div className="max-w-[850px] mx-auto my-6 print:my-0 p-8 sm:p-12 bg-white rounded-2xl print:rounded-none shadow-md print:shadow-none border border-slate-200 print:border-none space-y-6">
        {/* Official Header */}
        <div className="text-center space-y-1.5 border-b-2 border-slate-900 pb-5">
          <div className="inline-flex items-center justify-center gap-2 mb-1">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Zap className="w-6 h-6 fill-white" />
            </div>
            <span className="font-semibold text-xl tracking-tight text-slate-900">
              BRU FONDUE SMART CAMPUS
            </span>
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            รายงานสรุปผลการดำเนินงานรับแจ้งและซ่อมบำรุงอุปกรณ์ชำรุด
          </h1>
          <p className="text-xs text-slate-600">
            กองอาคารสถานที่และยานพาหนะ มหาวิทยาลัยราชภัฏบุรีรัมย์
          </p>
          <div className="flex justify-between items-center text-[11px] text-slate-500 pt-2 font-medium">
            <span>พิมพ์ออกเอกสารเมื่อ: {currentDate}</span>
            <span>เจ้าหน้าที่ผู้จัดทำ: {currentUser?.name || "กองอาคารสถานที่"}</span>
          </div>
        </div>

        <p className="text-xs">วันที่แจ้ง: {filter.values.from || "ไม่จำกัด"} ถึง {filter.values.to || "ไม่จำกัด"} (เวลาไทย) • สถานะ: {statusLabels[filter.values.status] || "ทั้งหมด"} • อาคาร: {filter.values.buildingId ? selectedBuilding?.name || "ไม่พบอาคาร" : "ทั้งหมด"} • หมวดหมู่: {filter.values.categoryId ? categories.find(c => c.id === Number(filter.values.categoryId))?.name || "ไม่พบหมวดหมู่" : "ทั้งหมด"}</p>
        <p className="text-xs">เวลาเฉลี่ยตั้งแต่แจ้งถึงเสร็จ: {metrics.avgHours === null ? "ยังไม่มีข้อมูล" : metrics.avgHours + " ชั่วโมง"} จาก {metrics.durationCount} งาน • คะแนนจาก {metrics.ratedCount} การประเมิน</p>
        {/* 1. Executive Summary Table */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800 border-l-4 border-indigo-600 pl-2">
            1. สรุปภาพรวมการดำเนินงาน (Executive Overview)
          </h2>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="border border-slate-300 p-2.5 rounded-lg bg-slate-50">
              <div className="text-slate-500 text-[10px]">คำร้องทั้งหมด</div>
              <div className="text-lg font-bold text-slate-900">{total} รายการ</div>
            </div>
            <div className="border border-slate-300 p-2.5 rounded-lg bg-slate-50">
              <div className="text-slate-500 text-[10px]">ซ่อมเสร็จสิ้น</div>
              <div className="text-lg font-bold text-emerald-700">{completed} รายการ</div>
            </div>
            <div className="border border-slate-300 p-2.5 rounded-lg bg-slate-50">
              <div className="text-slate-500 text-[10px]">อัตราความสำเร็จ</div>
              <div className="text-lg font-bold text-indigo-700">{resolutionRate}%</div>
            </div>
            <div className="border border-slate-300 p-2.5 rounded-lg bg-slate-50">
              <div className="text-slate-500 text-[10px]">ความพึงพอใจเฉลี่ย</div>
              <div className="text-lg font-bold text-amber-600">{avgRating}{metrics.ratedCount ? " / 5.0" : ""}</div>
            </div>
          </div>
        </div>

        {/* 2. Category Summary Table */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800 border-l-4 border-indigo-600 pl-2">
            2. สถิติจำนวนปัญหาจำแนกตามหมวดหมู่อุปกรณ์ (Issues by Category)
          </h2>
          <table className="w-full text-left text-xs border border-slate-300 border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <th className="p-2 border-r border-slate-300 w-12 text-center">ลำดับ</th>
                <th className="p-2 border-r border-slate-300">หมวดหมู่งานซ่อมบำรุง</th>
                <th className="p-2 border-r border-slate-300 text-center w-24">จำนวนคำร้อง</th>
                <th className="p-2 border-r border-slate-300 text-center w-24">สัดส่วน (%)</th>
                <th className="p-2 text-slate-600">แนวทางการบำรุงรักษาเชิงป้องกัน (Preventive Plan)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {categories.map((cat, idx) => {
                const count = tickets.filter((t) => t.categoryId === cat.id).length;
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;

                return (
                  <tr key={cat.id}>
                    <td className="p-2 border-r border-slate-300 text-center">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-300 font-medium">{cat.name}</td>
                    <td className="p-2 border-r border-slate-300 text-center font-bold">{count}</td>
                    <td className="p-2 border-r border-slate-300 text-center">{pct}%</td>
                    <td className="p-2 text-slate-600 text-[11px]">
                      ยังไม่ได้กำหนดแผนบำรุงรักษา
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {total === 0 && <p className="text-sm">ไม่พบคำร้องตามตัวกรองนี้</p>}
        {/* 3. Detailed Incident Table */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-800 border-l-4 border-indigo-600 pl-2">
            3. รายการคำร้องและผลการแก้ไขปัญหา (Ticket Incident Log)
          </h2>
          <table className="w-full text-left text-[11px] border border-slate-300 border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                <th className="p-1.5 border-r border-slate-300 w-24">รหัสคำร้อง</th>
                <th className="p-1.5 border-r border-slate-300">ปัญหา / อุปกรณ์</th>
                <th className="p-1.5 border-r border-slate-300">สถานที่</th>
                <th className="p-1.5 border-r border-slate-300">ผู้แจ้ง</th>
                <th className="p-1.5 border-r border-slate-300">ช่างผู้รับผิดชอบ</th>
                <th className="p-1.5 border-r border-slate-300 text-center w-20">สถานะ</th>
                <th className="p-1.5 text-center w-16">คะแนน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td className="p-1.5 border-r border-slate-300 font-mono font-bold text-indigo-700">
                    {t.ticketCode}
                  </td>
                  <td className="p-1.5 border-r border-slate-300 font-medium">
                    {t.title}
                  </td>
                  <td className="p-1.5 border-r border-slate-300">
                    {t.room || t.locationNote || t.building.name}
                  </td>
                  <td className="p-1.5 border-r border-slate-300">
                    {t.reporter.name}
                  </td>
                  <td className="p-1.5 border-r border-slate-300">
                    {t.assignments[0]?.technician.name || "-"}
                  </td>
                  <td className="p-1.5 border-r border-slate-300 text-center">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        t.status === "COMPLETED"
                          ? "bg-emerald-100 text-emerald-800"
                          : t.status === "IN_PROGRESS"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {statusLabels[t.status] || t.status}
                    </span>
                  </td>
                  <td className="p-1.5 text-center font-bold text-amber-600">
                    {t.evaluation ? `${t.evaluation.score} ⭐` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. Signature Block for Official University Submission */}
        <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
          <div className="space-y-12">
            <div>
              <p className="text-slate-500">ลงชื่อ ..............................................................</p>
              <p className="font-bold text-slate-800 mt-2">({currentUser?.name || "ผู้รายงาน"})</p>
              <p className="text-slate-500 text-[11px]">เจ้าหน้าที่กองอาคารสถานที่และยานพาหนะ</p>
              <p className="text-slate-400 text-[10px]">วันที่ {currentDate}</p>
            </div>
          </div>

          <div className="space-y-12">
            <div>
              <p className="text-slate-500">ลงชื่อ ..............................................................</p>
              <p className="font-bold text-slate-800 mt-2">(ผู้ช่วยศาสตราจารย์ ดร.วิไลรัตน์ ยาทองไชย)</p>
              <p className="text-slate-500 text-[11px]">อาจารย์ที่ปรึกษาโครงงาน / ผู้บริหารจัดการระบบ</p>
              <p className="text-slate-400 text-[10px]">มหาวิทยาลัยราชภัฏบุรีรัมย์</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400">
          BRU Fondue Smart Campus Management System • Buriram Rajabhat University
        </div>
      </div>
    </div>
  );
}


