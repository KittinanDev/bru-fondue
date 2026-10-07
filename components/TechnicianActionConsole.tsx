"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { readImageFile, IMAGE_ACCEPT } from "@/lib/upload-policy";
import {
  Wrench,
  CheckCircle2,
  Camera,
  X,
  Send,
} from "lucide-react";

interface TechnicianActionConsoleProps {
  ticketId: string;
  currentStatus: string;
  expectedUpdatedAt: string;
  technicianName: string;
}

export default function TechnicianActionConsole({
  ticketId,
  currentStatus,
  expectedUpdatedAt,
  technicianName,
}: TechnicianActionConsoleProps) {
  const router = useRouter();

  const [status, setStatus] = useState<string>(
    currentStatus === "PENDING" ? "IN_PROGRESS" : currentStatus
  );
  const [note, setNote] = useState<string>("");
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [readingImage, setReadingImage] = useState(false);
  const readLock = useRef(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file || readLock.current || loading) return;
    readLock.current = true; setReadingImage(true); setErrorMsg(null);
    try { setAfterImage(await readImageFile(file)); }
    catch (error) { setErrorMsg(error instanceof Error ? error.message : "อ่านรูปภาพไม่ได้"); }
    finally { readLock.current = false; setReadingImage(false); }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || readLock.current) return;
    setErrorMsg(null);
    setLoading(true);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/technician/update-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          expectedUpdatedAt,
          status,
          note: note.trim() || undefined,
          afterImage: afterImage || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "อัปเดตไม่สำเร็จ");
      }

      setSuccessMsg("✅ อัปเดตสถานะงานและส่งข้อมูลสำเร็จเรียบร้อยแล้ว!");
      setNote("");
      setAfterImage(null);
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-amber-200/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-950 text-base">
              บันทึกงานซ่อม
            </h3>
            <p className="text-xs text-amber-800">
              ผู้ปฏิบัติงาน: <b>{technicianName}</b> • บันทึกผลและอัปเดตขั้นตอนการซ่อม
            </p>
          </div>
        </div>

        <span className="text-xs bg-amber-200/80 text-amber-900 px-3 py-1 rounded-full font-bold self-start sm:self-auto">
          สถานะปัจจุบัน: {currentStatus}
        </span>
      </div>

      {errorMsg && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</p>}
      {successMsg && (
        <div className="p-3.5 bg-emerald-100 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Select Status */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-amber-950 block">
            1. เลือกสถานะการดำเนินงานปัจจุบัน:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                id: "IN_PROGRESS",
                label: "⚙️ กำลังดำเนินการ",
                desc: "กำลังตรวจสอบ / ซ่อมแซม",
              },
              {
                id: "WAITING_PARTS",
                label: "⏳ รอดำเนินการ (รออะไหล่)",
                desc: "อยู่ระหว่างสั่งซื้ออะไหล่",
              },
              {
                id: "COMPLETED",
                label: "✅ ซ่อมเสร็จสมบูรณ์",
                desc: "แก้ไขเรียบร้อย พร้อมส่งมอบงาน",
              },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStatus(s.id)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  status === s.id
                    ? "border-amber-600 bg-white ring-2 ring-amber-500/30 text-amber-950 shadow-xs font-bold"
                    : "border-amber-200 bg-white/60 hover:bg-white text-slate-700 font-medium"
                }`}
              >
                <div className="text-xs">{s.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Note / Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-amber-950 block">
            2. บันทึกผลการดำเนินงาน / หมายเหตุของช่าง:
          </label>
          <input
            type="text"
            maxLength={2000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              status === "COMPLETED"
                ? "เช่น เปลี่ยนหลอดไฟ LED T8 เรียบร้อย แสงสว่างทำงานปกติ"
                : status === "WAITING_PARTS"
                ? "เช่น รอสั่งซื้อคอมเพรสเซอร์แอร์ตัวใหม่จากศูนย์ คาดว่าได้ใน 2 วัน"
                : "เช่น กำลังเดินทางเข้าตรวจสอบจุดเกิดเหตุ"
            }
            className="w-full bg-white border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-medium"
          />
        </div>

        {/* Step 3: Upload After Photo (especially for COMPLETED) */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-amber-950 flex items-center justify-between">
            <span>3. ภาพถ่ายหลังซ่อมแซมเสร็จ (After Photo) {status === "COMPLETED" && <span className="text-rose-600">*แนะนำเป็นอย่างยิ่ง</span>}</span>
            <span className="text-[11px] text-amber-800 font-normal">รูปยืนยันผลงานให้ผู้แจ้งตรวจสอบ</span>
          </label>

          {afterImage ? (
            <div className="relative w-36 h-28 rounded-2xl overflow-hidden border border-amber-300 group">
              <img src={afterImage} alt="After preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setAfterImage(null)}
                className="absolute top-1.5 right-1.5 bg-black/70 hover:bg-rose-600 text-white p-1 rounded-full transition-colors"
                title="ลบรูปภาพ"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-1 left-1 text-[9px] bg-emerald-700 text-white px-1.5 py-0.5 rounded font-bold">
                AFTER PHOTO
              </div>
            </div>
          ) : (
            <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-amber-100/60 border border-amber-300 rounded-xl cursor-pointer text-xs font-bold text-amber-900 transition-colors shadow-2xs">
              <Camera className="w-4 h-4 text-amber-600" />
              <span>{readingImage ? "กำลังอ่านรูป…" : "แนบ JPG, PNG หรือ WebP ไม่เกิน 5 MB"}</span>
              <input
                type="file"
                accept={IMAGE_ACCEPT}
                disabled={readingImage || loading}
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Submit */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={loading || readingImage}
            className="flex items-center gap-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {loading ? "กำลังบันทึกข้อมูล..." : "บันทึกและอัปเดตสถานะงาน"}
          </button>
        </div>
      </form>
    </div>
  );
}

