"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, X, Check, AlertCircle, Save, Building2 } from "lucide-react";

interface Category {
  id: number;
  name: string;
}

interface Building {
  id: number;
  name: string;
  defaultLat?: number | null;
  defaultLng?: number | null;
}

interface TicketEditModalProps {
  ticket: {
    id: string;
    ticketCode: string;
    title: string;
    description: string;
    categoryId: number;
    buildingId: number;
    room: string | null;
    locationNote: string | null;
    priority: string;
    status: string;
    updatedAt: string;
    latitude?: number | null;
    longitude?: number | null;
  };
  categories: Category[];
  buildings: Building[];
}

export default function TicketEditModal({
  ticket,
  categories,
  buildings,
}: TicketEditModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldAutoOpen = searchParams?.get("edit") === "true";

  const [isOpen, setIsOpen] = useState(shouldAutoOpen);
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description);
  const [categoryId, setCategoryId] = useState(ticket.categoryId);
  const [buildingId, setBuildingId] = useState(ticket.buildingId);
  const [location, setLocation] = useState(ticket.locationNote || ticket.room || "");
  const [priority, setPriority] = useState(ticket.priority);
  const [latitude, setLatitude] = useState<number | null | undefined>(ticket.latitude);
  const [longitude, setLongitude] = useState<number | null | undefined>(ticket.longitude);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (shouldAutoOpen) {
      setIsOpen(true);
    }
  }, [shouldAutoOpen]);

  const handleOpen = () => {
    // Reset to current ticket state
    setTitle(ticket.title);
    setDescription(ticket.description);
    setCategoryId(ticket.categoryId);
    setBuildingId(ticket.buildingId);
    setLocation(ticket.locationNote || ticket.room || "");
    setPriority(ticket.priority);
    setLatitude(ticket.latitude);
    setLongitude(ticket.longitude);
    setError(null);
    setSuccess(false);
    setIsOpen(true);
  };

  const handleClose = () => {
    if (busy) return;
    setIsOpen(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("กรุณาระบุหัวข้อปัญหา");
      return;
    }
    if (!location.trim()) {
      setError("กรุณาระบุสถานที่");
      return;
    }
    if (!description.trim()) {
      setError("กรุณาระบุรายละเอียดเพิ่มเติม");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/tickets/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket.id,
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          categoryId: Number(categoryId),
          buildingId: Number(buildingId),
          priority,
          expectedUpdatedAt: ticket.updatedAt,
          latitude: latitude ?? undefined,
          longitude: longitude ?? undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "บันทึกการแก้ไขไม่สำเร็จ");
      }

      setSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        router.refresh();
      }, 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-all active:scale-95 shadow-2xs"
        title="แก้ไขข้อมูลคำร้องที่แจ้งไว้"
      >
        <Pencil className="w-3.5 h-3.5" />
        <span>แก้ไขข้อมูลคำร้อง</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 my-8">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {ticket.ticketCode}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  แก้ไขข้อมูลคำร้องแจ้งซ่อม
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={busy}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>บันทึกการแก้ไขเรียบร้อยแล้ว! กำลังอัปเดตหน้าจอ...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  หัวข้อปัญหา (สั้น กระชับ) *
                </label>
                <input
                  type="text"
                  required
                  maxLength={160}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น เครื่องปรับอากาศมีน้ำหยด, หลอดไฟทางเดินดับ"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  หมวดหมู่อุปกรณ์ *
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex justify-between">
                  <span>สถานที่ *</span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    พิมพ์ระบุชื่ออาคาร ชั้น หรือห้องได้เอง
                  </span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={240}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="เช่น อาคาร 15 ชั้น 2 ห้อง 1502, หน้าโรงอาหารกลาง"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />

                {/* Quick Chips */}
                <div className="pt-1">
                  <span className="text-[11px] text-slate-400 block mb-1">
                    หรือคลิกเพื่อเลือกอาคาร:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {buildings.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setLocation(b.name);
                          setBuildingId(b.id);
                          if (b.defaultLat != null && b.defaultLng != null) {
                            setLatitude(b.defaultLat);
                            setLongitude(b.defaultLng);
                          }
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-[10px] text-slate-600 transition-colors border border-slate-200"
                      >
                        {b.name.split(" ")[0]} {b.name.split(" ")[1] || ""}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  รายละเอียดเพิ่มเติม *
                </label>
                <textarea
                  required
                  rows={3}
                  maxLength={4000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="อธิบายอาการชำรุดเพิ่มเติม"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">
                  ระดับความเร่งด่วน
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    { id: "LOW", label: "ต่ำ" },
                    { id: "MEDIUM", label: "ปานกลาง" },
                    { id: "HIGH", label: "สูง" },
                    { id: "URGENT", label: "เร่งด่วน" },
                  ].map((p) => (
                    <label
                      key={p.id}
                      className={`flex items-center justify-center gap-1.5 p-2 rounded-xl border cursor-pointer text-xs font-medium transition-all ${
                        priority === p.id
                          ? "border-indigo-600 bg-indigo-50 text-indigo-900 font-bold"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <input
                        type="radio"
                        name="edit_priority"
                        value={p.id}
                        checked={priority === p.id}
                        onChange={(e) => setPriority(e.target.value)}
                        className="accent-indigo-600"
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={busy}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex items-center gap-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{busy ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
