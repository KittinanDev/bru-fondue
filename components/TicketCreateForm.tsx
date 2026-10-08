"use client";
import { validCoordinates } from "@/lib/coordinates";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { readImageFile, IMAGE_ACCEPT, IMAGE_HELP, MAX_IMAGES } from "@/lib/upload-policy";
import {
  Zap,
  Wind,
  Droplets,
  Tv,
  Hammer,
  HelpCircle,
  Camera,
  X,
  Send,
  AlertCircle,
} from "lucide-react";

// Dynamically import LocationPickerMap to prevent SSR leaflet errors
const LocationPickerMap = dynamic(() => import("./LocationPickerMap"), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-xs text-slate-400">
      กำลังโหลดแผนที่ มรภ.บุรีรัมย์...
    </div>
  ),
});

interface Category {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
}

interface Building {
  id: number;
  name: string;
  code: string;
  defaultLat: number | null;
  defaultLng: number | null;
}

interface TicketCreateFormProps {
  categories: Category[];
  buildings: Building[];
  currentUserName: string;
}

export default function TicketCreateForm({
  categories,
  buildings,
  currentUserName,
}: TicketCreateFormProps) {
  const router = useRouter();

  // Form states
  const [selectedCategory, setSelectedCategory] = useState<number>(categories[0]?.id || 1);
  const [hasCoordinates, setHasCoordinates] = useState(validCoordinates(buildings[0]?.defaultLat, buildings[0]?.defaultLng));
  const [location, setLocation] = useState<string>("");
  const [selectedBuilding, setSelectedBuilding] = useState<number>(buildings[0]?.id || 1);

  const [lat, setLat] = useState<number>(buildings[0]?.defaultLat ?? 14.9928);
  const [lng, setLng] = useState<number>(buildings[0]?.defaultLng ?? 103.1025);

  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [priority, setPriority] = useState<string>("MEDIUM");

  // Images state
  const [readingImages, setReadingImages] = useState(false);
  const imageReadLock = useRef(false);
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const goNext = () => {
    setErrorMsg(null);
    if (step === 1 && (!title.trim() || !description.trim())) { setErrorMsg("กรุณากรอกหัวข้อและรายละเอียดปัญหาให้ครบ"); return; }
    if (step === 2 && !location.trim()) { setErrorMsg("กรุณาระบุสถานที่ที่พบปัญหา"); return; }
    setStep(value => Math.min(3, value + 1));
    window.scrollTo({top:0,behavior:"smooth"});
  };

  // Helper icons
  const getCategoryIcon = (id: number) => {
    switch (id) {
      case 1:
        return Zap;
      case 2:
        return Wind;
      case 3:
        return Droplets;
      case 4:
        return Tv;
      case 5:
        return Hammer;
      default:
        return HelpCircle;
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length || imageReadLock.current || submitting) return;
    if (images.length + files.length > MAX_IMAGES) { setErrorMsg("สามารถแนบรูปภาพได้สูงสุด 4 รูป"); return; }
    imageReadLock.current = true; setReadingImages(true); setErrorMsg(null);
    try {
      const selected: string[] = [];
      for (const file of files) selected.push(await readImageFile(file));
      setImages(previous => [...previous, ...selected]);
    } catch (error) { setErrorMsg(error instanceof Error ? error.message : "อ่านรูปภาพไม่ได้"); }
    finally { imageReadLock.current = false; setReadingImages(false); }
  };
  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || imageReadLock.current) return;
    if (!location.trim()) {
      setErrorMsg("กรุณากรอกสถานที่ที่พบปัญหา");
      return;
    }
    if (!title.trim()) {
      setErrorMsg("กรุณาระบุหัวข้อปัญหาที่ต้องการแจ้ง");
      return;
    }
    if (!description.trim()) {
      setErrorMsg("กรุณาระบุรายละเอียดของปัญหาเพิ่มเติม");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/tickets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          categoryId: selectedCategory,
          buildingId: selectedBuilding,
          location: location.trim(),
          latitude: hasCoordinates ? lat : null,
          longitude: hasCoordinates ? lng : null,
          priority,
          images,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึก");
      }

      // Success -> Redirect to ticket detail or list
      router.push(`/tickets/${data.ticket.id}?new=true`);
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "ส่งคำร้องไม่สำเร็จ");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="report-progress" aria-label={`ขั้น ${step} จาก 3`}>
        {["อธิบายปัญหา","ระบุสถานที่","รูปภาพและส่ง"].map((label,index)=>{const number=index+1;return <div key={label} className={number===step?"is-current":number<step?"is-complete":""}><span>{number<step?"✓":number}</span><b>{label}</b></div>})}
      </div>
      {errorMsg && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Category Selection */}
      <div className={`${step===1?"":"hidden"} bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">
                1
              </span>
              เลือกหมวดหมู่ปัญหาอุปกรณ์ชำรุด
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              เลือกประเภทงานเพื่อให้ระบบส่งต่อไปยังกลุ่มช่างที่รับผิดชอบได้ถูกต้อง
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.id);
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between h-28 ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20 text-indigo-950 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight line-clamp-1">{cat.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                    {cat.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Photo Upload (Before Image) */}
      <div className={`${step===3?"":"hidden"} bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4`}>
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">
              2
            </span>
            ภาพถ่ายจุดที่เกิดปัญหา (รูปหลักฐานก่อนซ่อม)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ถ่ายภาพหรืออัปโหลดรูปภาพเพื่อให้ช่างประเมินเครื่องมือและอะไหล่ก่อนเดินทาง
          </p>
        </div>

        <p className="text-xs text-slate-500">{IMAGE_HELP}</p>
        <div className="flex flex-wrap gap-3">
          {images.map((img, idx) => (
            <div key={idx} className="relative w-28 h-28 rounded-xl overflow-hidden border border-slate-200 group">
              <img src={img} alt="Before preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1 right-1 bg-black/60 hover:bg-rose-600 text-white p-1 rounded-full transition-colors"
                title="ลบรูปภาพ"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-1 left-1 text-[9px] bg-indigo-900/80 text-white px-1.5 py-0.5 rounded font-mono">
                รูปที่ {idx + 1}
              </div>
            </div>
          ))}

          {images.length < 4 && (
            <label className="w-28 h-28 border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 cursor-pointer transition-all">
              <Camera className="w-6 h-6 mb-1" />
              <span className="text-[11px] font-semibold">{readingImages ? "กำลังอ่านรูป…" : "แนบรูปถ่าย"}</span>
              <span className="text-[9px] text-slate-400">({images.length}/4 รูป)</span>
              <input
                type="file"
                accept={IMAGE_ACCEPT}
                disabled={readingImages || submitting}
                multiple
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* 3. Location & Indoor Details */}
      <div className={`${step===2?"":"hidden"} bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5`}>
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">
              3
            </span>
            สถานที่
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            พิมพ์ระบุสถานที่ที่พบปัญหาได้อย่างอิสระ (เช่น ชื่ออาคาร ชั้น ห้อง หรือบริเวณที่พบ) พร้อมปักหมุดบนแผนที่
          </p>
        </div>

        {/* Free text location input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>สถานที่ *</span>
            <span className="text-[11px] text-slate-400 font-normal">สามารถพิมพ์ระบุได้อย่างอิสระ</span>
          </label>
          <input
            type="text"
            required
            maxLength={240}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="เช่น อาคาร 15 ชั้น 2 ห้อง 1502, หน้าโรงอาหารกลาง, เสาไฟข้างหอประชุม ฯลฯ"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          />

          <p className="text-sm text-slate-600">อาคารอ้างอิง: <strong>{buildings.find(b => b.id === selectedBuilding)?.name || "ยังไม่ได้เลือก"}</strong> • หากเปลี่ยนอาคาร ให้เลือกปุ่มอาคารด้านล่าง</p>
          {/* Quick select chips */}
          <div className="pt-1">
            <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
              หรือคลิกเพื่อเลือกอาคารด่วน (ระบบจะช่วยกรอกและเลื่อนหมุดแผนที่ให้):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {buildings.map((b) => (
                <button
                  key={b.id}
                  aria-pressed={selectedBuilding === b.id}
                  type="button"
                  onClick={() => {
                    setLocation(b.name);
                    setSelectedBuilding(b.id);
                    setHasCoordinates(validCoordinates(b.defaultLat, b.defaultLng));
                    setLat(b.defaultLat ?? 14.9928);
                    setLng(b.defaultLng ?? 103.1025);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-[11px] text-slate-600 transition-colors border border-slate-200"
                >
                  {b.name.split(" ")[0]} {b.name.split(" ")[1] || ""}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="pt-2">
          <label className="text-xs font-bold text-slate-700 block mb-2">
            ปักหมุดบนแผนที่ มหาวิทยาลัยราชภัฏบุรีรัมย์ (Leaflet GPS)
          </label>
          {!hasCoordinates && <p className="mb-2 text-sm text-amber-700">อาคารนี้ยังไม่มีพิกัด กรุณาปักหมุด หากไม่เลือกจะบันทึกโดยไม่มีพิกัด</p>}
          <LocationPickerMap
            key={selectedBuilding}
            initialLat={lat}
            initialLng={lng}
            onLocationSelect={(newLat, newLng) => {
              setHasCoordinates(true);
              setLat(newLat);
              setLng(newLng);
            }}
          />
        </div>
      </div>

      {/* 4. Issue Description & Urgency */}
      <div className={`${step===1?"":"hidden"} bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5`}>
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">
              4
            </span>
            รายละเอียดของปัญหาและความเร่งด่วน
          </h2>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">หัวข้อปัญหา (สั้น กระชับ) *</label>
          <input
            type="text"
            required
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="เช่น หลอดไฟทางเดินขาด, ท่อประปาใต้อ่างล้างหน้ารั่ว, แอร์ไม่เย็น"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">รายละเอียดเพิ่มเติมของอาการชำรุด *</label>
          <textarea
            required
            rows={3}
            maxLength={4000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="อธิบายอาการ เช่น เปิดสวิตช์แล้วไฟกระพริบ, มีน้ำหยดลงพื้นตลอดเวลา, ฯลฯ"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">ระดับความเร่งด่วน</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {[
              { id: "LOW", label: "ต่ำ (ไม่กระทบการใช้งาน)" },
              { id: "MEDIUM", label: "ปานกลาง (ใช้งานติดขัด)" },
              { id: "HIGH", label: "สูง (กระทบการเรียน/สอน)" },
              { id: "URGENT", label: "เร่งด่วนฉุกเฉิน (อันตราย)" },
            ].map((p) => (
              <label
                key={p.id}
                className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all text-xs font-medium ${
                  priority === p.id
                    ? "border-indigo-600 bg-indigo-50 text-indigo-900 font-semibold"
                    : "border-slate-200 hover:bg-slate-50 text-slate-600"
                }`}
              >
                <input
                  type="radio"
                  name="priority"
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
      </div>

      {/* Submit Button */}
      <div className="report-step-actions flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="text-xs text-slate-400">
          ผู้แจ้ง: <span className="font-semibold text-slate-700">{currentUserName}</span> • ระบบจะส่งเรื่องให้กองอาคารสถานที่ตรวจสอบทันที
        </div>

        <div className="flex w-full gap-3 sm:w-auto">
        {step>1&&<button type="button" onClick={()=>setStep(value=>value-1)} className="flex-1 rounded-xl border border-slate-300 px-6 py-3.5 font-semibold text-slate-700 sm:flex-none">ย้อนกลับ</button>}
        {step<3?<button type="button" onClick={goNext} className="flex-1 rounded-xl bg-indigo-600 px-8 py-3.5 font-bold text-white sm:flex-none">ถัดไป</button>:<button
          type="submit"
          disabled={submitting || readingImages}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
        >
          {submitting ? (
            <>กำลังส่งคำร้องเข้าระบบ...</>
          ) : (
            <>
              <Send className="w-4 h-4" />
              ส่งคำร้องแจ้งซ่อมทันที
            </>
          )}
        </button>}
        </div>
      </div>
    </form>
  );
}


