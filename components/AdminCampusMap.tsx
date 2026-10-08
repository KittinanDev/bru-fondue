"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { validCoordinates } from "@/lib/coordinates";
import { buildTicketPopup } from "@/lib/map-popup";

interface TicketItem {
  id: string;
  ticketCode: string;
  title: string;
  status: string;
  priority: string;
  latitude: number | null;
  longitude: number | null;
  building: { name: string };
  category: { name: string };
  reporter: { name: string };
  images: { imageUrl: string; imageType: string }[];
  assignments: { technician: { name: string } }[];
}

export interface AdminCampusMapProps {
  tickets: TicketItem[];
}

export default function AdminCampusMap({ tickets }: AdminCampusMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Markers colored by status
  const getMarkerIcon = (status: string) => {
    let color = ["REJECTED", "CANCELLED"].includes(status) ? "#64748b" : "#ef4444"; // Red for PENDING
    if (status === "IN_PROGRESS" || status === "WAITING_PARTS") {
      color = "#f59e0b"; // Amber for IN_PROGRESS
    } else if (status === "COMPLETED") {
      color = "#10b981"; // Emerald for COMPLETED
    }

    const svgIcon = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
        <path fill="${color}" stroke="#ffffff" stroke-width="1.5" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
      </svg>
    `;

    return L.divIcon({
      html: svgIcon,
      className: "custom-map-marker",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        scrollWheelZoom: true,
        dragging: true,
        keyboard: true,
      }).setView([14.9928, 103.1025], 16);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Leaflet can measure the container before the responsive layout settles.
      // Recalculate after paint and whenever the desktop content width changes.
      requestAnimationFrame(() => map.invalidateSize());
      const refresh = () => map.invalidateSize({ pan: false });
      if (typeof ResizeObserver !== "undefined") {
        const resizeObserver = new ResizeObserver(refresh);
        resizeObserver.observe(mapContainerRef.current);
        map.on("unload", () => resizeObserver.disconnect());
      } else {
        window.addEventListener("resize", refresh, { once: true });
      }
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers if any
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add markers for tickets with coordinates
    const markerCoordinates: L.LatLngExpression[] = [];
    tickets.forEach((t) => {
      if (!validCoordinates(t.latitude, t.longitude)) return;
      const lat = t.latitude!;
      const lng = t.longitude!;
      markerCoordinates.push([lat, lng]);

      const marker = L.marker([lat, lng], {
        icon: getMarkerIcon(t.status),
        title: t.ticketCode,
        alt: t.ticketCode,
      }).addTo(map);

      marker.bindPopup(buildTicketPopup(t));
    });

    if (markerCoordinates.length > 1) {
      map.fitBounds(L.latLngBounds(markerCoordinates), { padding: [36, 36], maxZoom: 17 });
    } else if (markerCoordinates.length === 1) {
      map.setView(markerCoordinates[0], 17);
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [tickets]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs">
      <div
        ref={mapContainerRef}
        className="w-full h-80 sm:h-96 bg-slate-100"
        style={{ minHeight: "320px" }}
        aria-label="แผนที่คำร้องแจ้งซ่อม ลากเพื่อเลื่อน ใช้ปุ่มบวกและลบเพื่อซูม"
      />
      {tickets.length === 0 && <div className="pointer-events-none absolute inset-x-4 top-1/2 z-10 -translate-y-1/2 text-center"><span className="inline-block rounded-xl border border-slate-200 bg-white/95 px-4 py-3 text-sm font-medium text-slate-600 shadow-sm">ยังไม่มีคำร้องบนแผนที่ เมื่อมีผู้แจ้งปัญหา หมุดจะแสดงที่นี่</span></div>}
      <p className="bg-white p-3 text-xs text-slate-600">ไม่แสดงหมุดสำหรับคำร้องที่ไม่มีพิกัดหรือพิกัดไม่ถูกต้อง {tickets.filter(t => !validCoordinates(t.latitude, t.longitude)).length} รายการ</p>
      {/* Map Legend */}
      <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-slate-200 shadow-sm text-xs space-y-1.5 pointer-events-auto">
        <div className="text-slate-600">● สีเทา: ยกเลิก / ไม่รับดำเนินการ</div>
        <div className="font-bold text-slate-800 text-[11px] mb-1">สัญลักษณ์หมุดบนแผนที่</div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0"></span>
          <span className="text-slate-600">รอรับเรื่อง / ยังไม่จ่ายงาน</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></span>
          <span className="text-slate-600">กำลังดำเนินการ (จ่ายงานแล้ว)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
          <span className="text-slate-600">ซ่อมเสร็จสิ้นสมบูรณ์</span>
        </div>
      </div>
    </div>
  );
}


