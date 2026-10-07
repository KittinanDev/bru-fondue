"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, CheckCircle2, Send, Sparkles } from "lucide-react";

interface EvaluationData {
  score: number;
  comment: string | null;
  createdAt: string | Date;
}

interface TicketEvaluationCardProps {
  ticketId: string;
  status: string;
  evaluation: EvaluationData | null;
  canEvaluate: boolean;
}

export default function TicketEvaluationCard({
  ticketId,
  status,
  evaluation,
  canEvaluate,
}: TicketEvaluationCardProps) {
  const router = useRouter();

  const [score, setScore] = useState<number>(5);
  const [hoverScore, setHoverScore] = useState<number | null>(null);
  const [comment, setComment] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const starLabels: { [key: number]: string } = {
    1: "ต้องปรับปรุง (1 ดาว)",
    2: "พอใช้ (2 ดาว)",
    3: "ปานกลาง (3 ดาว)",
    4: "ดีมาก (4 ดาว)",
    5: "ยอดเยี่ยม รวดเร็วประทับใจ (5 ดาว)",
  };

  const handleEvaluateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEvaluate) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/tickets/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          score,
          comment: comment.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "บันทึกการประเมินไม่สำเร็จ");
      }

      setSubmitted(true);
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setSubmitting(false);
    }
  };

  // Case 1: Already evaluated
  if (evaluation || submitted) {
    const finalScore = evaluation?.score || score;
    const finalComment = evaluation?.comment || comment;

    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 text-white rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950">
                ผลการประเมินความพึงพอใจการให้บริการ
              </h3>
              <p className="text-xs text-emerald-700">
                ผู้แจ้งได้ตรวจรับงานและให้คะแนนการซ่อมแซมเรียบร้อยแล้ว
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-emerald-200/80 text-emerald-900 px-3 py-1 rounded-full self-start sm:self-auto">
            ตรวจรับงานสมบูรณ์
          </span>
        </div>

        <div className="bg-white/80 rounded-2xl p-4 border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= finalScore
                      ? "text-amber-400 fill-amber-400"
                      : "text-slate-200"
                  }`}
                />
              ))}
              <span className="ml-2 font-bold text-slate-800 text-sm">
                {finalScore} เต็ม 5 ดาว ({starLabels[finalScore]})
              </span>
            </div>
            {finalComment && (
              <p className="text-xs text-slate-600 italic mt-1">
                &ldquo;{finalComment}&rdquo;
              </p>
            )}
          </div>

          <div className="text-[11px] text-slate-400 shrink-0">
            {evaluation?.createdAt
              ? new Date(evaluation.createdAt).toLocaleDateString("th-TH", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "วันนี้"}
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Not completed yet
  if (status !== "COMPLETED") {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center text-xs text-slate-500 space-y-1">
        <div className="font-semibold text-slate-700">ระบบประเมินความพึงพอใจการให้บริการ</div>
        <p>
          ระบบจะเปิดให้ท่านตรวจรับงานและให้คะแนนความพึงพอใจ (1 - 5 ดาว) หลังจากช่างซ่อมบำรุงดำเนินการเสร็จสิ้นเรียบร้อยแล้ว
        </p>
      </div>
    );
  }

  if (!canEvaluate) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-600">
        เฉพาะผู้แจ้งคำร้องนี้เท่านั้นที่ให้คะแนนประเมินได้
      </div>
    );
  }

  // Case 3: Completed & Ready for Evaluation
  return (
    <div className="bg-gradient-to-r from-amber-50/80 via-yellow-50/50 to-orange-50/80 border-2 border-amber-300 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5 animate-in fade-in">
      <div className="flex items-center gap-2.5 border-b border-amber-200/80 pb-3">
        <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-amber-950 text-base">
            ตรวจรับงานและประเมินความพึงพอใจการซ่อมแซม
          </h3>
          <p className="text-xs text-amber-800">
            ช่างซ่อมแซมเสร็จสิ้นแล้ว โปรดตรวจสอบภาพเปรียบเทียบ Before/After และให้คะแนนการให้บริการ
          </p>
        </div>
      </div>

      <form onSubmit={handleEvaluateSubmit} className="space-y-4">
        {/* Star Rating Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-amber-950 block">
            1. ให้คะแนนความพึงพอใจการให้บริการ (คลิกเลือกดาว):
          </label>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white p-2.5 rounded-2xl border border-amber-200 shadow-2xs">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverScore ?? score) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverScore(star)}
                    onMouseLeave={() => setHoverScore(null)}
                    onClick={() => setScore(star)}
                    className="p-1 hover:scale-125 transition-transform"
                    title={`${star} ดาว`}
                  >
                    <Star
                      className={`w-7 h-7 sm:w-8 sm:h-8 transition-colors ${
                        isFilled
                          ? "text-amber-400 fill-amber-400"
                          : "text-slate-200 hover:text-amber-200"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <div className="text-xs font-bold text-amber-900 bg-amber-100/70 px-3 py-2 rounded-xl">
              {starLabels[hoverScore ?? score]}
            </div>
          </div>
        </div>

        {/* Comment field */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-amber-950 block">
            2. ข้อเสนอแนะเพิ่มเติม / คำชมเชยทีมช่าง (ไม่บังคับ):
          </label>
          <input
            type="text"
            maxLength={2000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="เช่น ช่างมาซ่อมรวดเร็วมากครับ, ทำงานเรียบร้อยสะอาดตา ขอบคุณครับ"
            className="w-full bg-white border border-amber-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 font-medium"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-1 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-900 font-semibold text-xs sm:text-sm rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting ? "กำลังส่งคะแนน..." : "ยืนยันผลการตรวจรับงานและส่งคะแนนประเมิน"}
          </button>
        </div>
      </form>
    </div>
  );
}

