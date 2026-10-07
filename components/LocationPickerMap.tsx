"use client";
import {useEffect,useRef,useState} from 'react';
import L from 'leaflet';
interface Props {initialLat?:number;initialLng?:number;onLocationSelect:(lat:number,lng:number)=>void}
const icon=L.divIcon({html:'<span style="display:block;width:20px;height:20px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 1px 4px #475569"></span>',className:'location-marker',iconSize:[20,20],iconAnchor:[10,10]});
export default function LocationPickerMap({initialLat=14.9928,initialLng=103.1025,onLocationSelect}:Props){
 const container=useRef<HTMLDivElement>(null);const map=useRef<L.Map|null>(null);const marker=useRef<L.Marker|null>(null);
 const initial=useRef([initialLat,initialLng] as [number,number]);const callback=useRef(onLocationSelect);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const alive=useRef(true);
 useEffect(()=>{callback.current=onLocationSelect;},[onLocationSelect]);
 useEffect(()=>{if(!container.current)return;alive.current=true;const m=L.map(container.current).setView(initial.current,17);map.current=m;
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap',maxZoom:19}).addTo(m);
 const pin=L.marker(initial.current,{icon,draggable:true,title:'ตำแหน่งแจ้งซ่อม'}).addTo(m);marker.current=pin;
 pin.on('dragend',()=>{const p=pin.getLatLng();callback.current(p.lat,p.lng);});
 m.on('click',(e:L.LeafletMouseEvent)=>callback.current(e.latlng.lat,e.latlng.lng));
 return ()=>{alive.current=false;m.remove();map.current=null;marker.current=null;};},[]);
 useEffect(()=>{marker.current?.setLatLng([initialLat,initialLng]);map.current?.panTo([initialLat,initialLng]);},[initialLat,initialLng]);
 function gps(){if(!navigator.geolocation){setError('เบราว์เซอร์ไม่รองรับ GPS');return;}setBusy(true);setError('');navigator.geolocation.getCurrentPosition(p=>{if(!alive.current)return;callback.current(p.coords.latitude,p.coords.longitude);setBusy(false);},()=>{if(!alive.current)return;setError('ระบุตำแหน่งไม่ได้ กรุณาปักหมุดบนแผนที่');setBusy(false);},{timeout:10000});}
 return <div className="space-y-3"><div className="flex flex-wrap items-center justify-between gap-3 text-xs"><span>ตำแหน่งบนแผนที่: <output>{initialLat.toFixed(6)}, {initialLng.toFixed(6)}</output></span><button type="button" disabled={busy} onClick={gps} className="rounded-lg border px-3 py-2">{busy?'กำลังหาตำแหน่ง…':'ใช้ตำแหน่งปัจจุบัน'}</button></div>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}<div ref={container} className="h-80 rounded-xl border"/><p className="text-xs text-slate-500">คลิกแผนที่หรือลากหมุดเพื่อระบุตำแหน่ง ภายในอาคารให้กรอกห้องและชั้นเพิ่มเติม</p></div>;
}
