"use client";

import type { AdminCampusMapProps } from "./AdminCampusMap";
import dynamic from "next/dynamic";

const AdminCampusMap = dynamic(() => import("./AdminCampusMap"), {
  ssr: false,
  loading: () => (
    <div className="h-80 w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-xs text-slate-400">
      กำลังโหลดแผนที่ภาพรวมมหาวิทยาลัย...
    </div>
  ),
});

export default function AdminCampusMapWrapper(props: AdminCampusMapProps) {
  return <AdminCampusMap {...props} />;
}
