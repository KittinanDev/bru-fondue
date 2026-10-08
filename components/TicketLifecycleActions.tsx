"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

type Action = "accept" | "reject" | "cancel" | "reopen";

export default function TicketLifecycleActions({ ticketId, status, updatedAt, admin, owner }: { ticketId: string; status: string; updatedAt: string; admin: boolean; owner: boolean }) {
  const closed = ["COMPLETED", "REJECTED", "CANCELLED"].includes(status);
  const actions: Array<[Action, string]> = admin
    ? closed ? [["reopen", "เปิดงานใหม่"]] : status === "PENDING" ? [["accept", "รับคำร้อง"], ["reject", "ไม่รับดำเนินการ"], ["cancel", "ยกเลิกคำร้อง"]] : [["reject", "ไม่รับดำเนินการ"], ["cancel", "ยกเลิกคำร้อง"]]
    : owner && status === "PENDING" ? [["cancel", "ยกเลิกคำร้อง"]] : [];
  const [action, setAction] = useState<Action | "">("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const router = useRouter();

  if (!actions.length) return null;
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!action || lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/tickets/lifecycle", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ticketId, action, reason, expectedUpdatedAt: updatedAt }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAction(""); setReason(""); router.refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "บันทึกไม่สำเร็จ"); }
    finally { lock.current = false; setBusy(false); }
  }
  const selectedLabel = actions.find(([value]) => value === action)?.[1];
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <div className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-indigo-600" /><h2 className="font-semibold">จัดการคำร้อง</h2></div>
    {!action ? <div className="mt-4 flex flex-wrap gap-3">{actions.map(([value, label]) => <button type="button" key={value} className={value === "accept" ? "rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white" : "rounded-xl border border-slate-300 px-4 py-2.5 text-sm"} onClick={() => setAction(value)}>{label}</button>)}</div>
    : <form onSubmit={submit} className="mt-4 space-y-4">
      <p className="text-sm text-slate-600">{action === "accept" ? "ยืนยันว่าตรวจสอบคำร้องแล้ว จากนั้นสามารถมอบหมายช่างจากหน้าจัดการคำร้องได้" : action === "reopen" ? "งานจะกลับให้ช่างล่าสุด หรือรอรับเรื่องหากยังไม่มีช่าง" : "งานจะหยุดดำเนินการและเก็บประวัติไว้ ผู้ดูแลสามารถเปิดงานใหม่ได้"}</p>
      <label className="block text-sm">{action === "accept" ? "หมายเหตุ (ไม่บังคับ)" : "เหตุผล *"}<textarea required={action !== "accept"} maxLength={2000} disabled={busy} className="mt-2 w-full rounded-xl border p-3" value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row"><button type="button" disabled={busy} className="rounded-xl border px-4 py-2.5 text-sm" onClick={() => { setAction(""); setError(""); }}>กลับ</button><button disabled={busy} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white">{busy ? "กำลังบันทึก…" : `ยืนยัน${selectedLabel}`}</button></div>
    </form>}
  </section>;
}
