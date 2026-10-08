"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRoundCheck, Wrench } from "lucide-react";

type Technician = { id: string; name: string; department: string | null };

export default function AdminTicketAssignment({
  ticketId,
  status,
  priority: initialPriority,
  updatedAt,
  technicians,
  currentTechnicianId,
}: {
  ticketId: string;
  status: string;
  priority: string;
  updatedAt: string;
  technicians: Technician[];
  currentTechnicianId?: string;
}) {
  const router = useRouter();
  const lock = useRef(false);
  const [technicianId, setTechnicianId] = useState(currentTechnicianId || technicians[0]?.id || "");
  const [priority, setPriority] = useState(initialPriority);
  const [adminNote, setAdminNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!technicianId || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/tickets/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, technicianId, priority, adminNote, expectedUpdatedAt: updatedAt }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "มอบหมายงานไม่สำเร็จ");
      setSuccess(data.message || "มอบหมายงานเรียบร้อยแล้ว");
      setAdminNote("");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "มอบหมายงานไม่สำเร็จ");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  const pending = status === "PENDING";
  return <section className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm sm:p-6">
    <div className="flex items-start gap-3 border-b border-indigo-100 pb-4">
      <span className="rounded-xl bg-indigo-600 p-2.5 text-white"><UserRoundCheck className="h-5 w-5" /></span>
      <div><h2 className="text-lg font-semibold text-slate-900">{pending ? "รับเรื่องและมอบหมายช่าง" : currentTechnicianId ? "เปลี่ยนช่างผู้รับผิดชอบ" : "มอบหมายช่างผู้รับผิดชอบ"}</h2><p className="mt-1 text-sm text-slate-500">เลือกช่างและระดับความเร่งด่วน แล้วระบบจะแจ้งงานให้ช่างทันที</p></div>
    </div>
    {!technicians.length ? <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">ยังไม่มีบัญชีช่างในระบบ กรุณาเพิ่มบัญชีช่างก่อนมอบหมายงาน</p> : <form onSubmit={submit} className="mt-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-slate-700">ช่างผู้รับผิดชอบ *<select required disabled={busy} value={technicianId} onChange={event=>setTechnicianId(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"><option value="" disabled>เลือกช่าง</option>{technicians.map(technician=><option key={technician.id} value={technician.id}>{technician.name} — {technician.department || "กองอาคารสถานที่"}</option>)}</select></label>
        <label className="text-sm font-semibold text-slate-700">ความเร่งด่วน<select disabled={busy} value={priority} onChange={event=>setPriority(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"><option value="LOW">ต่ำ</option><option value="MEDIUM">ปานกลาง</option><option value="HIGH">สูง</option><option value="URGENT">เร่งด่วน</option></select></label>
      </div>
      <label className="block text-sm font-semibold text-slate-700">หมายเหตุถึงช่าง <span className="font-normal text-slate-400">(ไม่บังคับ)</span><textarea rows={3} maxLength={2000} disabled={busy} value={adminNote} onChange={event=>setAdminNote(event.target.value)} placeholder="เช่น กรุณาตรวจสอบจุดเกิดเหตุก่อนเวลา 12:00 น." className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
      <button disabled={busy || !technicianId} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"><Wrench className="h-4 w-4" />{busy ? "กำลังบันทึก…" : pending ? "รับเรื่องและมอบหมายช่าง" : currentTechnicianId ? "ยืนยันการเปลี่ยนช่าง" : "มอบหมายงานให้ช่าง"}</button>
    </form>}
  </section>;
}
