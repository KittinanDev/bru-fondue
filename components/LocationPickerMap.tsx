"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";

interface Props { initialLat?: number; initialLng?: number; onLocationSelect: (lat: number, lng: number) => void }

const markerIcon = L.divIcon({
  html: '<span class="location-marker-dot"></span>', className: "location-marker", iconSize: [40, 40], iconAnchor: [20, 20],
});

export default function LocationPickerMap({ initialLat = 14.9928, initialLng = 103.1025, onLocationSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const callbackRef = useRef(onLocationSelect);
  const initialRef = useRef<[number, number]>([initialLat, initialLng]);
  const aliveRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tileError, setTileError] = useState(false);

  useEffect(() => { callbackRef.current = onLocationSelect; }, [onLocationSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;
    aliveRef.current = true;
    const map = L.map(container, { scrollWheelZoom: true, touchZoom: true, dragging: true, keyboard: true, zoomControl: true }).setView(initialRef.current, 17);
    mapRef.current = map;
    const tiles = L.tileLayer("/api/tiles/{z}/{x}/{y}", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>', maxZoom: 19,
    }).addTo(map);
    tiles.on("tileerror", (event) => {
      const tile = event.tile as HTMLImageElement;
      const fallback = tile.dataset.fallbackTile;
      if (!fallback) {
        tile.dataset.fallbackTile = "carto";
        tile.src = `https://a.basemaps.cartocdn.com/light_all/${event.coords.z}/${event.coords.x}/${event.coords.y}.png`;
      } else if (fallback === "carto") {
        tile.dataset.fallbackTile = "osm";
        tile.src = `https://tile.openstreetmap.org/${event.coords.z}/${event.coords.x}/${event.coords.y}.png`;
      } else if (aliveRef.current) setTileError(true);
    });
    tiles.on("load", () => aliveRef.current && setTileError(false));

    const marker = L.marker(initialRef.current, { icon: markerIcon, draggable: true, title: "ตำแหน่งแจ้งซ่อม", alt: "หมุดตำแหน่งแจ้งซ่อม" }).addTo(map);
    markerRef.current = marker;
    const select = (position: L.LatLng) => {
      marker.setLatLng(position); callbackRef.current(position.lat, position.lng); setError("");
    };
    marker.on("dragend", () => select(marker.getLatLng()));
    map.on("click", (event: L.LeafletMouseEvent) => select(event.latlng));

    const refresh = () => map.invalidateSize({ pan: false });
    const timers = [50, 250, 600].map((delay) => window.setTimeout(refresh, delay));
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") { observer = new ResizeObserver(refresh); observer.observe(container); }
    else window.addEventListener("resize", refresh);

    return () => {
      aliveRef.current = false; timers.forEach(window.clearTimeout); observer?.disconnect(); window.removeEventListener("resize", refresh);
      map.remove(); mapRef.current = null; markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const position = L.latLng(initialLat, initialLng); markerRef.current?.setLatLng(position); mapRef.current?.panTo(position);
  }, [initialLat, initialLng]);

  function useMapCenter() {
    const center = mapRef.current?.getCenter(); if (!center) return;
    markerRef.current?.setLatLng(center); callbackRef.current(center.lat, center.lng); setError("");
  }

  function useCurrentLocation() {
    if (!window.isSecureContext) { setError("GPS ใช้ได้เมื่อเปิดผ่าน HTTPS เท่านั้น กรุณาปักหมุดบนแผนที่แทน"); return; }
    if (!navigator.geolocation) { setError("เบราว์เซอร์นี้ไม่รองรับ GPS กรุณาปักหมุดบนแผนที่แทน"); return; }
    setBusy(true); setError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!aliveRef.current) return;
        const position = L.latLng(coords.latitude, coords.longitude); markerRef.current?.setLatLng(position); mapRef.current?.setView(position, 18);
        callbackRef.current(position.lat, position.lng); setBusy(false);
      },
      (reason) => {
        if (!aliveRef.current) return;
        const message = reason.code === reason.PERMISSION_DENIED
          ? "ไม่ได้รับสิทธิ์ตำแหน่ง กรุณาอนุญาต Location ในเบราว์เซอร์ หรือปักหมุดเอง"
          : reason.code === reason.TIMEOUT ? "ค้นหาตำแหน่งนานเกินไป กรุณาลองใหม่หรือปักหมุดเอง" : "ระบุตำแหน่งไม่ได้ กรุณาปักหมุดบนแผนที่";
        setError(message); setBusy(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  }

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <span>ตำแหน่ง: <output>{initialLat.toFixed(6)}, {initialLng.toFixed(6)}</output></span>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={useMapCenter} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold hover:bg-slate-50">วางหมุดตรงกลาง</button>
        <button type="button" disabled={busy} onClick={useCurrentLocation} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold hover:bg-slate-50 disabled:opacity-50">{busy ? "กำลังหาตำแหน่ง…" : "ใช้ตำแหน่งปัจจุบัน"}</button>
      </div>
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    {tileError && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">ภาพแผนที่โหลดไม่ครบ แต่ยังลากหรือวางหมุดและบันทึกพิกัดได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่</p>}
    <div className="relative">
      <div ref={containerRef} className="location-picker-map h-80 rounded-xl border border-slate-300 bg-slate-100" aria-label="แผนที่เลือกตำแหน่ง แตะบนแผนที่ ลากหมุด หรือใช้ปุ่มวางหมุดตรงกลาง" />
      <span className="pointer-events-none absolute left-1/2 top-1/2 z-[400] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-indigo-600 shadow" aria-hidden="true" />
    </div>
    <p className="text-sm text-slate-600">แตะบนแผนที่ ลากหมุด หรือเลื่อนแผนที่แล้วกด “วางหมุดตรงกลาง” หากใช้ GPS ไม่ได้</p>
  </div>;
}
