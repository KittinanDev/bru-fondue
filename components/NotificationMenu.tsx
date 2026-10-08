"use client";

import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import { statusLabels } from "@/lib/reporting";
import { useEffect, useRef, useState } from "react";

type Notice={id:string;ticketId:string;status:string;note:string|null;createdAt:Date;unread:boolean;ticket:{ticketCode:string;title:string}};

export default function NotificationMenu({unread,notices}:{unread:number;notices:Notice[]}){
 const [mounted,setMounted]=useState(false);
 const [open,setOpen]=useState(false);
 const closeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const show=()=>{if(closeTimer.current)clearTimeout(closeTimer.current);setMounted(true);requestAnimationFrame(()=>requestAnimationFrame(()=>setOpen(true)))};
 const hide=()=>{setOpen(false);if(closeTimer.current)clearTimeout(closeTimer.current);closeTimer.current=setTimeout(()=>setMounted(false),240)};
 const toggle=()=>open?hide():show();
 useEffect(()=>{if(!open)return;const close=(event:KeyboardEvent)=>{if(event.key==="Escape")hide()};document.addEventListener("keydown",close);return()=>document.removeEventListener("keydown",close)},[open]);
 useEffect(()=>()=>{if(closeTimer.current)clearTimeout(closeTimer.current)},[]);
 const statusTone=(status:string)=>status==="PENDING"?"status-red":status==="IN_PROGRESS"||status==="WAITING_PARTS"?"status-yellow":status==="COMPLETED"?"status-green":"status-gray";
 return <div className="notification-menu">
  <button type="button" aria-expanded={open} aria-controls="notification-preview" onClick={toggle} className="notification-trigger" aria-label={unread?`การแจ้งเตือนที่ยังไม่อ่าน ${unread} รายการ`:"การแจ้งเตือน"}>
   <Bell aria-hidden="true" size={21}/>
   {unread>0&&<><span className="notification-dot"/><span className="notification-count">{unread>99?"99+":unread}</span></>}
  </button>
  {mounted&&<div id="notification-preview" onMouseLeave={hide} className={`notification-card ${open?"is-open":"is-closing"}`}>
   <div className="notification-card-header"><div><strong>การแจ้งเตือน</strong><p>{unread>0?`ยังไม่อ่าน ${unread} รายการ`:"อ่านครบแล้ว"}</p></div><Link href="/notifications">ดูทั้งหมด</Link></div>
   {!notices.length?<p className="notification-empty">ยังไม่มีการแจ้งเตือน</p>:<ul>{notices.map(n=><li key={n.id} className={n.unread?"is-unread":""}>
    <Link href={`/tickets/${n.ticketId}`}>
     <span className="notice-icon"><i className={statusTone(n.status)}/></span>
     <span className="notice-copy"><strong>{n.ticket.ticketCode} · {n.ticket.title}</strong><span>{statusLabels[n.status]||n.status}{n.note?` · ${n.note}`:""}</span><time>{n.createdAt.toLocaleString("th-TH",{timeZone:"Asia/Bangkok",dateStyle:"short",timeStyle:"short"})}</time></span>
     <ChevronRight aria-hidden="true" size={17}/>
    </Link>
   </li>)}</ul>}
   <Link className="notification-footer" href="/notifications">เปิดศูนย์การแจ้งเตือน <ChevronRight aria-hidden="true" size={16}/></Link>
  </div>}
 </div>;
}
