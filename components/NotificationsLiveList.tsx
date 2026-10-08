"use client";

import { useCallback, useEffect, useState } from "react";
import { statusLabels } from "@/lib/reporting";
import type { NotificationNotice } from "./NotificationProvider";

export default function NotificationsLiveList({initialNotices}:{initialNotices:NotificationNotice[]}){
 const [notices,setNotices]=useState(initialNotices);
 const refresh=useCallback(async()=>{try{const response=await fetch('/api/notifications?take=100',{cache:'no-store'});if(response.ok){const data=await response.json();if(Array.isArray(data.notices))setNotices(data.notices)}}catch{/* Retry automatically. */}},[]);
 useEffect(()=>{const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh()},10000);const visible=()=>{if(document.visibilityState==='visible')void refresh()};window.addEventListener('focus',visible);window.addEventListener('bru-notifications-refresh',visible);document.addEventListener('visibilitychange',visible);return()=>{window.clearInterval(timer);window.removeEventListener('focus',visible);window.removeEventListener('bru-notifications-refresh',visible);document.removeEventListener('visibilitychange',visible)}},[refresh]);
 if(!notices.length)return <p className="rounded-xl border bg-white p-6">ยังไม่มีการแจ้งเตือน</p>;
 return <ul className="divide-y rounded-2xl border bg-white">{notices.map(notice=><li key={notice.id} className="p-5"><a className="block space-y-2" href={'/tickets/'+notice.ticketId}><div className="flex flex-wrap gap-3 text-xs text-slate-500">{notice.unread&&<strong className="text-indigo-700">ยังไม่อ่าน</strong>}<span>{new Date(notice.createdAt).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'})}</span><span>{statusLabels[notice.status]||notice.status}</span></div><h2 className="font-medium">{notice.ticket.ticketCode} · {notice.ticket.title}</h2><p className="whitespace-pre-wrap text-sm text-slate-600">{notice.note}</p></a></li>)}</ul>;
}
