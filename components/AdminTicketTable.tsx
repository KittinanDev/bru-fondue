"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "./Modal";
import Link from "next/link";
import {
  Wrench,
  Search,
  CheckCircle2,
  Send,
  X,
  ExternalLink,
} from "lucide-react";

interface Technician {
  id: string;
  name: string;
  email: string | null;
  department: string | null;
}

interface TicketItem {
  id: string;
  ticketCode: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  room: string | null;
  locationNote: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  building: { name: string };
  category: { id: number; name: string };
  reporter: { name: string; studentId: string | null; phoneNumber: string | null };
  images: { imageUrl: string; imageType: string }[];
  assignments: {
    id: string;
    technician: { id: string; name: string; department: string | null };
  }[];
}

interface AdminTicketTableProps {
  initialTickets: TicketItem[];
  technicians: Technician[];
}

export default function AdminTicketTable({
  initialTickets,
  technicians,
}: AdminTicketTableProps) {
  const router = useRouter();

  const [page, setPage] = useState(1);
  const [assignError, setAssignError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  // Assignment Modal state
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string>(technicians[0]?.id || "");
  const [priority, setPriority] = useState<string>("HIGH");
  const [adminNote, setAdminNote] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [notificationSuccess, setNotificationSuccess] = useState<string | null>(null);

  // Filter logic
  const filteredTickets = initialTickets.filter((t) => {
    const matchesSearch =
      t.ticketCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.reporter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.room && t.room.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.locationNote && t.locationNote.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    const matchesCategory =
      categoryFilter === "ALL" || t.category.id.toString() === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });
  const safePage = Math.min(page, Math.max(1, Math.ceil(filteredTickets.length / 20)));
  const pagedTickets = filteredTickets.slice((safePage - 1) * 20, safePage * 20);

  const handleOpenAssignModal = (ticket: TicketItem) => {
    setSelectedTicket(ticket);
    setSelectedTechId(ticket.assignments[0]?.technician.id || technicians[0]?.id || "");
    setPriority(ticket.priority || "HIGH");
    setAdminNote("");
    setNotificationSuccess(null);
    setAssignError("");
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !selectedTechId || isAssigning) return;

    setIsAssigning(true);
    try {
      const res = await fetch("/api/admin/tickets/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          expectedUpdatedAt: new Date(selectedTicket.updatedAt).toISOString(),
          technicianId: selectedTechId,
          priority,
          adminNote,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการมอบหมายงาน");
      }

      setNotificationSuccess(
        `มอบหมายงานสำเร็จ`
      );

      setTimeout(() => {
        setSelectedTicket(null);
        router.refresh();
      }, 1400);
    } catch (err: unknown) {
      setAssignError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setIsAssigning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CANCELLED": return {label:"ยกเลิกแล้ว",bg:"bg-slate-100 text-slate-700 border-slate-200"};
      case "REJECTED": return {label:"ไม่รับดำเนินการ",bg:"bg-slate-100 text-slate-700 border-slate-200"};
      case "COMPLETED":
        return {
          label: "เสร็จสิ้น",
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "IN_PROGRESS":
        return {
          label: "กำลังดำเนินการ",
          bg: "bg-amber-50 text-amber-700 border-amber-200",
        };
      case "WAITING_PARTS":
        return {
          label: "รออะไหล่",
          bg: "bg-purple-50 text-purple-700 border-purple-200",
        };
      default:
        return {
          label: "รอรับเรื่อง",
          bg: "bg-rose-50 text-rose-700 border-rose-200",
        };
    }
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "URGENT":
        return "bg-rose-100 text-rose-800 font-bold";
      case "HIGH":
        return "bg-amber-100 text-amber-800 font-semibold";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };
  const priorityLabel = (value:string) => ({LOW:"ต่ำ",MEDIUM:"ปานกลาง",HIGH:"สูง",URGENT:"เร่งด่วน"}[value] || value);

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            aria-label="ค้นหาคำร้อง"
            onChange={(e) => {setSearchTerm(e.target.value);setPage(1);}}
            placeholder="ค้นหาด้วยรหัสคำร้อง, ชื่อปัญหา, ผู้แจ้ง, หรือสถานที่..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <select aria-label="กรองหมวดหมู่" value={categoryFilter} onChange={e=>{setCategoryFilter(e.target.value);setPage(1);}} className="rounded-lg border p-2 text-sm"><option value="ALL">ทุกหมวดหมู่</option>{Array.from(new Map(initialTickets.map(t=>[t.category.id,t.category])).values()).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
        {/* Filter by Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: "ALL", label: "ทั้งหมด" },
            { id: "PENDING", label: "รอรับเรื่อง" },
            { id: "IN_PROGRESS", label: "กำลังทำ" },
            { id: "WAITING_PARTS", label: "รออะไหล่" },
            { id: "COMPLETED", label: "เสร็จสิ้น" },
            { id: "REJECTED", label: "ไม่รับดำเนินการ" },
            { id: "CANCELLED", label: "ยกเลิกแล้ว" },
          ].map((tab) => (
            <button
              key={tab.id}
              aria-pressed={statusFilter===tab.id}
              onClick={() => {setStatusFilter(tab.id);setPage(1);}}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm"><span>พบ {filteredTickets.length} รายการ</span><div className="flex gap-3"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="rounded border px-3 py-2 disabled:opacity-40">ก่อนหน้า</button><button disabled={page*20>=filteredTickets.length} onClick={()=>setPage(p=>p+1)} className="rounded border px-3 py-2 disabled:opacity-40">ถัดไป</button></div></div>
      {/* Mobile and narrow-screen ticket cards */}
      <div className="grid gap-3 xl:hidden">
        {pagedTickets.map((t) => {
          const statusBadge = getStatusBadge(t.status);
          const currentTech = t.assignments[0]?.technician;
          const isAssigned = Boolean(currentTech);
          return <article key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/tickets/${t.id}`} className="font-mono text-sm font-bold text-indigo-600">{t.ticketCode}</Link>
              <span className={`shrink-0 rounded-full border px-2.5 py-1 text-sm font-semibold ${statusBadge.bg}`}>{statusBadge.label}</span>
            </div>
            <h3 className="mt-3 text-lg font-semibold leading-snug text-slate-900">{t.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{t.room || t.locationNote || t.building.name}</p>
            {t.room && <p className="text-sm text-slate-500">{t.building.name}</p>}
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1">{t.category.name}</span>
              <span className={`rounded-lg px-2.5 py-1 ${getPriorityBadge(t.priority)}`}>{priorityLabel(t.priority)}</span>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
              {currentTech ? `ช่างผู้รับผิดชอบ: ${currentTech.name}` : "ยังไม่ได้จ่ายงาน"}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {t.status !== "COMPLETED" && t.status !== "REJECTED" && t.status !== "CANCELLED" && <button onClick={()=>handleOpenAssignModal(t)} className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 font-semibold text-white"><Wrench className="h-4 w-4"/>{isAssigned ? "เปลี่ยนช่าง" : "จ่ายงานช่าง"}</button>}
              <Link href={`/tickets/${t.id}`} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 font-semibold text-slate-700"><ExternalLink className="h-4 w-4"/>ดูรายละเอียด</Link>
            </div>
          </article>;
        })}
      </div>
      {/* Ticket Table */}
      <div className="hidden bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden xl:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] table-fixed text-left text-xs">
            <colgroup><col className="w-[150px]"/><col className="w-[280px]"/><col className="w-[250px]"/><col className="w-[170px]"/><col className="w-[130px]"/><col className="w-[150px]"/><col className="w-[230px]"/><col className="w-[170px]"/></colgroup>
            <thead className="bg-slate-50/80 text-slate-600 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">รหัสคำร้อง</th>
                <th className="p-3.5">ปัญหา / อาการ</th>
                <th className="p-3.5">สถานที่</th>
                <th className="p-3.5">หมวดหมู่</th>
                <th className="p-3.5">ความเร่งด่วน</th>
                <th className="p-3.5">สถานะ</th>
                <th className="p-3.5">ช่างผู้รับผิดชอบ</th>
                <th className="p-3.5 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    ไม่พบรายการคำร้องที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                pagedTickets.map((t) => {
                  const statusBadge = getStatusBadge(t.status);
                  const isAssigned = t.assignments.length > 0;
                  const currentTech = t.assignments[0]?.technician;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Code */}
                      <td className="p-3.5 font-mono font-bold text-indigo-600 whitespace-nowrap">
                        <Link href={`/tickets/${t.id}`} className="hover:underline">
                          {t.ticketCode}
                        </Link>
                      </td>

                      {/* Title */}
                      <td className="p-3.5 break-normal">
                        <div className="font-semibold text-slate-800 line-clamp-2">{t.title}</div>
                        <div className="text-[11px] text-slate-400">
                          โดย: {t.reporter.name}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="p-3.5 text-slate-700 whitespace-nowrap">
                        <div className="font-medium">{t.room || t.locationNote || t.building.name}</div>
                        {t.room && t.room !== t.building.name && (
                          <div className="text-[10px] text-slate-400">{t.building.name}</div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="p-3.5 text-slate-600 whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {t.category.name}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${getPriorityBadge(t.priority)}`}>
                          {priorityLabel(t.priority)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full font-semibold border ${statusBadge.bg}`}>
                          {statusBadge.label}
                        </span>
                      </td>

                      {/* Technician */}
                      <td className="p-3.5 whitespace-nowrap">
                        {isAssigned && currentTech ? (
                          <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>{currentTech.name}</span>
                          </div>
                        ) : (
                          <span className="text-rose-500 font-medium text-[11px] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            ยังไม่ได้จ่ายงาน
                          </span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {t.status !== "COMPLETED" && t.status !== "REJECTED" && t.status !== "CANCELLED" && (
                            <button
                              onClick={() => handleOpenAssignModal(t)}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                              {isAssigned ? "เปลี่ยนช่าง" : "จ่ายงานช่าง"}
                            </button>
                          )}
                          <Link
                            href={`/tickets/${t.id}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="ดูรายละเอียดคำร้อง"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign Technician Modal */}
      {selectedTicket && (
        <Modal busy={isAssigning} onClose={()=>setSelectedTicket(null)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {selectedTicket.ticketCode}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  มอบหมายงานให้ช่างซ่อมบำรุง
                </h3>
              </div>
              <button
                disabled={isAssigning}
                aria-label="ปิดหน้าต่างมอบหมายงาน"
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ticket Summary Card */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs space-y-1">
              <div className="font-bold text-slate-800">{selectedTicket.title}</div>
              <div className="text-slate-500">
                📍 {selectedTicket.room || selectedTicket.locationNote || selectedTicket.building.name} • หมวด: {selectedTicket.category.name}
              </div>
              <div className="text-slate-500">
                👤 ผู้แจ้ง: {selectedTicket.reporter.name} ({selectedTicket.reporter.phoneNumber || "ไม่มีเบอร์"})
              </div>
            </div>

            {assignError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{assignError}</p>}
            {notificationSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{notificationSuccess}</span>
              </div>
            )}

            {/* Assignment Form */}
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              {/* Select Technician */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  เลือกช่างซ่อมบำรุงที่รับผิดชอบ *
                </label>
                <select
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} — {tech.department || "กองอาคารสถานที่"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Adjust Priority */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">ระดับความเร่งด่วน</label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                    <label
                      key={p}
                      className={`p-2 rounded-xl border text-center cursor-pointer text-xs font-semibold ${
                        priority === p
                          ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="modal_priority"
                        value={p}
                        checked={priority === p}
                        onChange={(e) => setPriority(e.target.value)}
                        className="hidden"
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </div>

              {/* Note to Technician */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">
                  หมายเหตุ / กำชับงานถึงช่าง (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  maxLength={2000}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="เช่น ตรวจเช็กระบบไฟด่วนก่อนเริ่มการเรียนการสอนคาบบ่าย"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <p className="text-sm text-slate-500">ช่างผู้รับผิดชอบจะเห็นรายการในหน้าแจ้งเตือนของระบบ</p>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isAssigning}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isAssigning ? "กำลังจ่ายงาน..." : "ยืนยันและส่งงานช่าง"}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}

