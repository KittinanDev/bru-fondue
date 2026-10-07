"use client";

import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PrintReportButton() {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="print:hidden bg-slate-900 text-white px-6 py-3 sticky top-0 z-50 shadow-md flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          กลับไปหน้า Dashboard
        </Link>
        <span className="text-slate-600">|</span>
        <span className="text-xs text-slate-300">
          ตัวอย่างเอกสารรายงานราชการ (Print Preview)
        </span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400 hidden sm:inline">
          💡 เลือกเครื่องพิมพ์เป็น <b>Save as PDF</b> หรือ <b>Microsoft Print to PDF</b>
        </span>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>พิมพ์เอกสาร / บันทึกเป็น PDF</span>
        </button>
      </div>
    </div>
  );
}
