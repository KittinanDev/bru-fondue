"use client";

import { useState, useEffect } from "react";
import {
  coordinatesToPercent,
  percentToCoordinates,
  clamp,
} from "@/lib/coordinates";

interface Props {
  initialLat?: number;
  initialLng?: number;
  onLocationSelect: (lat: number, lng: number) => void;
}

export default function LocationPickerMap({
  initialLat = 14.9928,
  initialLng = 103.1025,
  onLocationSelect,
}: Props) {
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Sync state if props change (e.g. user selected another building)
  useEffect(() => {
    setLat(initialLat);
    setLng(initialLng);
  }, [initialLat, initialLng]);

  const select = (nextLat: number, nextLng: number) => {
    setLat(nextLat);
    setLng(nextLng);
    setError("");
    onLocationSelect(nextLat, nextLng);
  };

  const selectFromMap = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width);
    const y = clamp((event.clientY - rect.top) / rect.height);
    const coords = percentToCoordinates(x, y);
    select(coords.lat, coords.lng);
  };

  const useCurrentLocation = () => {
    if (!window.isSecureContext || !navigator.geolocation) {
      setError("อุปกรณ์นี้ไม่รองรับ GPS กรุณาแตะเลือกจุดบนแผนที่");
      return;
    }
    setBusy(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        select(coords.latitude, coords.longitude);
        setBusy(false);
      },
      (reason) => {
        setError(
          reason.code === reason.PERMISSION_DENIED
            ? "กรุณาอนุญาตตำแหน่ง หรือแตะเลือกจุดบนแผนที่"
            : "ระบุตำแหน่งไม่ได้ กรุณาแตะเลือกจุดบนแผนที่"
        );
        setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  };

  const pos = coordinatesToPercent(lat, lng);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span>
          ตำแหน่ง: <output className="font-mono font-medium">{lat.toFixed(6)}, {lng.toFixed(6)}</output>
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={useCurrentLocation}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold hover:bg-slate-50 disabled:opacity-50 text-xs transition-colors"
        >
          {busy ? "กำลังหาตำแหน่ง…" : "ใช้ตำแหน่งปัจจุบัน"}
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={selectFromMap}
        className="relative block aspect-square w-full max-w-[40rem] overflow-hidden rounded-xl border border-slate-300 bg-slate-100 p-0 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        aria-label="แตะบนแผนที่เพื่อเลือกตำแหน่ง"
      >
        <img
          src="/campus-map.png"
          alt="แผนที่มหาวิทยาลัยราชภัฏบุรีรัมย์"
          className="h-full w-full object-fill pointer-events-none"
          draggable={false}
        />
        <span
          className="absolute h-6 w-6 -translate-x-1/2 -translate-y-full rounded-full border-[5px] border-white bg-indigo-600 shadow-lg pointer-events-none transition-all duration-75"
          style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
          aria-hidden="true"
        />
      </button>

      <p className="text-sm text-slate-600">
        แตะตำแหน่งบนแผนที่เพื่อวางหมุด ระบบจะบันทึกละติจูดและลองจิจูดให้อัตโนมัติ
      </p>
    </div>
  );
}
