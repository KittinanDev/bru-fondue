"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { validCoordinates } from "@/lib/coordinates";
import { MapPin, X, ChevronRight, Layers, AlertCircle, Clock, Wrench } from "lucide-react";

export interface TicketItem {
  id: string;
  ticketCode: string;
  title: string;
  status: string;
  priority: string;
  latitude: number | null;
  longitude: number | null;
  building?: { name: string } | null;
  category?: { name: string } | null;
  reporter?: { name: string } | null;
  images?: { imageUrl: string; imageType: string }[];
  assignments?: { technician: { name: string } }[];
  createdAt?: Date | string;
  locationNote?: string | null;
  room?: string | null;
}

export interface AdminCampusMapProps {
  tickets: TicketItem[];
}

interface TicketCluster {
  id: string;
  latitude: number;
  longitude: number;
  left: number;
  top: number;
  buildingName: string;
  tickets: TicketItem[];
}

const bounds = {
  south: 14.984586356558806,
  west: 103.09295654296875,
  north: 14.995198836057886,
  east: 103.10394287109375,
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

const CLUSTER_THRESHOLD_PCT = 2.4; // Radius threshold in map percentage to merge overlapping pins

const getClusterStatus = (tickets: TicketItem[]) => {
  if (tickets.some((t) => t.status === "PENDING")) return "PENDING";
  if (tickets.some((t) => t.status === "IN_PROGRESS" || t.status === "WAITING_PARTS")) return "IN_PROGRESS";
  if (tickets.every((t) => t.status === "COMPLETED")) return "COMPLETED";
  if (tickets.every((t) => ["REJECTED", "CANCELLED"].includes(t.status))) return "CLOSED";
  return "PENDING";
};

const getClusterColor = (tickets: TicketItem[]) => {
  const status = getClusterStatus(tickets);
  switch (status) {
    case "PENDING":
      return "#ef4444"; // rose-500
    case "IN_PROGRESS":
      return "#f59e0b"; // amber-500
    case "COMPLETED":
      return "#10b981"; // emerald-500
    case "CLOSED":
      return "#64748b"; // slate-500
    default:
      return "#ef4444";
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "PENDING":
      return { label: "รอรับเรื่อง", bg: "bg-rose-50 text-rose-700 border-rose-200" };
    case "IN_PROGRESS":
      return { label: "กำลังดำเนินการ", bg: "bg-blue-50 text-blue-700 border-blue-200" };
    case "WAITING_PARTS":
      return { label: "รออะไหล่", bg: "bg-amber-50 text-amber-700 border-amber-200" };
    case "COMPLETED":
      return { label: "เสร็จสิ้น", bg: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    case "REJECTED":
      return { label: "ไม่รับดำเนินการ", bg: "bg-slate-50 text-slate-700 border-slate-200" };
    case "CANCELLED":
      return { label: "ยกเลิกแล้ว", bg: "bg-slate-50 text-slate-700 border-slate-200" };
    default:
      return { label: status, bg: "bg-slate-50 text-slate-700 border-slate-200" };
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "URGENT":
      return { label: "ด่วนที่สุด", bg: "bg-rose-100 text-rose-800" };
    case "HIGH":
      return { label: "ด่วน", bg: "bg-orange-100 text-orange-800" };
    case "LOW":
      return { label: "ต่ำ", bg: "bg-slate-100 text-slate-600" };
    default:
      return null;
  }
};

const formatThaiDate = (date?: Date | string) => {
  if (!date) return "";
  try {
    return new Date(date).toLocaleDateString("th-TH", {
      timeZone: "Asia/Bangkok",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const statusSortWeight: Record<string, number> = {
  PENDING: 1,
  WAITING_PARTS: 2,
  IN_PROGRESS: 3,
  COMPLETED: 4,
  REJECTED: 5,
  CANCELLED: 6,
};

export default function AdminCampusMap({ tickets }: AdminCampusMapProps) {
  const [selectedCluster, setSelectedCluster] = useState<TicketCluster | null>(null);

  const validTickets = useMemo(
    () => tickets.filter((t) => validCoordinates(t.latitude, t.longitude)),
    [tickets]
  );

  // Group tickets into clusters when they share coordinates or are close together
  const clusters = useMemo(() => {
    const list: TicketCluster[] = [];

    for (const ticket of validTickets) {
      const left = clamp((ticket.longitude! - bounds.west) / (bounds.east - bounds.west)) * 100;
      const top = clamp((bounds.north - ticket.latitude!) / (bounds.north - bounds.south)) * 100;

      // Find an existing cluster within threshold
      let found = list.find((c) => {
        const dx = c.left - left;
        const dy = c.top - top;
        return Math.hypot(dx, dy) <= CLUSTER_THRESHOLD_PCT;
      });

      if (found) {
        found.tickets.push(ticket);
      } else {
        list.push({
          id: ticket.id,
          latitude: ticket.latitude!,
          longitude: ticket.longitude!,
          left,
          top,
          buildingName: ticket.building?.name || ticket.locationNote || "จุดในมหาวิทยาลัย",
          tickets: [ticket],
        });
      }
    }

    return list;
  }, [validTickets]);

  // Keep selected cluster up-to-date if tickets change
  const activeCluster = useMemo(() => {
    if (!selectedCluster) return null;
    return clusters.find((c) => c.id === selectedCluster.id) || selectedCluster;
  }, [selectedCluster, clusters]);

  // Sort tickets inside the selected cluster: PENDING first, then IN_PROGRESS, then COMPLETED, etc.
  const sortedTickets = useMemo(() => {
    if (!activeCluster) return [];
    return [...activeCluster.tickets].sort((a, b) => {
      const wa = statusSortWeight[a.status] ?? 99;
      const wb = statusSortWeight[b.status] ?? 99;
      if (wa !== wb) return wa - wb;
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });
  }, [activeCluster]);

  const clusterCounts = useMemo(() => {
    if (!activeCluster) return { pending: 0, inProgress: 0, completed: 0, closed: 0 };
    return {
      pending: activeCluster.tickets.filter((t) => t.status === "PENDING").length,
      inProgress: activeCluster.tickets.filter(
        (t) => t.status === "IN_PROGRESS" || t.status === "WAITING_PARTS"
      ).length,
      completed: activeCluster.tickets.filter((t) => t.status === "COMPLETED").length,
      closed: activeCluster.tickets.filter((t) =>
        ["REJECTED", "CANCELLED"].includes(t.status)
      ).length,
    };
  }, [activeCluster]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      {/* Map Canvas Area */}
      <div
        className="relative mx-auto aspect-square w-full max-w-[42rem] bg-slate-100 select-none"
        onClick={() => setSelectedCluster(null)}
      >
        <img
          src="/campus-map.png"
          alt="แผนที่ภาพรวมมหาวิทยาลัยราชภัฏบุรีรัมย์"
          className="h-full w-full object-fill pointer-events-none"
          draggable={false}
        />

        {/* Map Markers / Clusters */}
        {clusters.map((cluster) => {
          const isSelected = activeCluster?.id === cluster.id;
          const count = cluster.tickets.length;
          const color = getClusterColor(cluster.tickets);
          const hasPending = cluster.tickets.some((t) => t.status === "PENDING");

          if (count === 1) {
            const ticket = cluster.tickets[0];
            return (
              <button
                key={cluster.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCluster(cluster);
                }}
                title={`${ticket.ticketCode}: ${ticket.title} (${cluster.buildingName})`}
                aria-label={`${ticket.ticketCode} ${ticket.title}`}
                className={`absolute grid h-7 w-7 -translate-x-1/2 -translate-y-full place-items-center rounded-full border-2 border-white text-white shadow-md transition-all hover:scale-125 focus:outline-none ${
                  isSelected
                    ? "scale-125 ring-2 ring-indigo-600 ring-offset-2 z-20"
                    : "z-10"
                }`}
                style={{
                  left: `${cluster.left}%`,
                  top: `${cluster.top}%`,
                  backgroundColor: color,
                }}
              >
                <span className="h-2 w-2 rounded-full bg-white shadow-xs" />
              </button>
            );
          }

          // Clustered Pin with Ticket Count
          return (
            <button
              key={cluster.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCluster(cluster);
              }}
              title={`พบ ${count} คำร้อง ณ ${cluster.buildingName} (คลิกเพื่อดูรายการทั้งหมด)`}
              aria-label={`พบ ${count} คำร้อง ณ ${cluster.buildingName}`}
              className={`group absolute -translate-x-1/2 -translate-y-full transition-all hover:scale-125 focus:outline-none ${
                isSelected ? "scale-125 z-20" : "z-10"
              }`}
              style={{ left: `${cluster.left}%`, top: `${cluster.top}%` }}
            >
              <div className="relative flex items-center justify-center">
                {hasPending && (
                  <span
                    className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping pointer-events-none"
                    style={{ backgroundColor: color }}
                  />
                )}
                {/* Visual stacked badge effect */}
                <div
                  className="absolute -bottom-0.5 -right-0.5 -z-10 h-8 w-8 rounded-full border border-white/80 opacity-60 pointer-events-none"
                  style={{ backgroundColor: color }}
                />
                <div
                  className={`relative grid h-8 w-8 place-items-center rounded-full border-2 border-white font-mono font-bold text-xs text-white shadow-lg transition-transform ${
                    isSelected ? "ring-2 ring-indigo-600 ring-offset-2" : ""
                  }`}
                  style={{ backgroundColor: color }}
                >
                  <span>{count}</span>
                </div>
              </div>
            </button>
          );
        })}

        {/* Selected Cluster Drawer / Popup */}
        {activeCluster && (
          <div
            className="absolute inset-x-2 bottom-2 sm:inset-auto sm:right-3 sm:top-3 sm:bottom-3 sm:w-[410px] max-h-[85%] sm:max-h-none z-30 flex flex-col rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/90 p-3.5 shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                  <h3 className="font-bold text-slate-900 text-sm line-clamp-1">
                    {activeCluster.buildingName}
                  </h3>
                  <span className="text-[11px] font-bold font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full shrink-0">
                    {activeCluster.tickets.length} คำร้อง
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 pl-5.5">
                  {activeCluster.tickets.length > 1
                    ? "รายการคำร้องทั้งหมดในจุดนี้ (คลิกเพื่อดูรายละเอียด)"
                    : "ข้อมูลคำร้องแจ้งซ่อมในจุดนี้"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCluster(null)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 p-1 rounded-lg transition-colors"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Status Stats if multiple tickets */}
            {activeCluster.tickets.length > 1 && (
              <div className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100/70 border-b border-slate-100 text-[11px] shrink-0 overflow-x-auto">
                <span className="text-slate-400 font-medium shrink-0">สถานะ:</span>
                {clusterCounts.pending > 0 && (
                  <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 shrink-0">
                    รอรับเรื่อง {clusterCounts.pending}
                  </span>
                )}
                {clusterCounts.inProgress > 0 && (
                  <span className="font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                    กำลังทำ {clusterCounts.inProgress}
                  </span>
                )}
                {clusterCounts.completed > 0 && (
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                    เสร็จสิ้น {clusterCounts.completed}
                  </span>
                )}
                {clusterCounts.closed > 0 && (
                  <span className="font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                    ปิดแล้ว {clusterCounts.closed}
                  </span>
                )}
              </div>
            )}

            {/* Scrollable list of tickets */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100">
              {sortedTickets.map((t) => {
                const badge = getStatusBadge(t.status);
                const priorityBadge = getPriorityBadge(t.priority);
                const beforeImg =
                  t.images?.find((img) => img.imageType === "BEFORE") || t.images?.[0];
                const assignedTech = t.assignments?.[0]?.technician?.name;

                return (
                  <div
                    key={t.id}
                    className="pt-2.5 first:pt-0 group/card rounded-xl hover:bg-slate-50/90 p-2 transition-colors border border-transparent hover:border-slate-200"
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail image */}
                      {beforeImg ? (
                        <img
                          src={beforeImg.imageUrl}
                          alt={t.title}
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 shrink-0">
                          ไม่มีรูป
                        </div>
                      )}

                      {/* Ticket Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono font-bold text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                            {t.ticketCode}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                          {priorityBadge && (
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${priorityBadge.bg}`}
                            >
                              {priorityBadge.label}
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-xs text-slate-900 group-hover/card:text-indigo-600 transition-colors line-clamp-1">
                          {t.title}
                        </h4>

                        <div className="text-[11px] text-slate-500 space-y-0.5">
                          <p className="line-clamp-1">
                            🔧 {t.category?.name || "ไม่ระบุหมวด"}
                            {t.room || t.locationNote ? ` · 📍 ${t.room || t.locationNote}` : ""}
                          </p>
                          <p className="line-clamp-1 text-[10px] text-slate-400">
                            👤 ผู้แจ้ง: {t.reporter?.name || "ไม่ระบุ"}
                            {assignedTech ? ` · 👷 ช่าง: ${assignedTech}` : ""}
                          </p>
                        </div>

                        <div className="pt-1 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400">
                            {formatThaiDate(t.createdAt)}
                          </span>
                          <Link
                            href={`/tickets/${t.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                          >
                            <span>ดูรายละเอียด</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Map Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 p-3 text-xs text-slate-600 bg-slate-50/50">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> รอรับเรื่อง
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> กำลังดำเนินการ / รออะไหล่
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> เสร็จสิ้น
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" /> ปิดแล้ว
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
          <span className="grid h-4 w-4 place-items-center rounded-full bg-slate-700 text-[10px] font-bold text-white">
            2
          </span>
          <span>ตัวเลข = หลายคำร้องซ้อนกันที่จุดเดียวกัน</span>
        </div>
      </div>

      <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-1">
        <span>💡 แตะที่หมุดเพื่อดูรายการคำร้องทั้งหมดที่จุดนั้น · เรียงลำดับคำร้องที่ต้องรับเรื่องก่อนเสมอ</span>
        <span>
          {tickets.length - validTickets.length > 0 &&
            `(ไม่แสดงรายการที่ไม่มีพิกัด ${tickets.length - validTickets.length} รายการ)`}
        </span>
      </div>
    </div>
  );
}
