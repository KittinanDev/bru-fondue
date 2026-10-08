"use client";
import Link from "next/link";
import { BarChart3, Bell, ClipboardList, Home, PlusCircle, Wrench } from "lucide-react";
import { usePathname } from "next/navigation";
import { useNotifications } from "./NotificationProvider";

type Item={href:string;label:string;icon:typeof Home};
export default function MobileBottomNav({role}:{role:string}){
 const pathname=usePathname();
 const {unread}=useNotifications();
 const items:Item[]=role==="STUDENT"||role==="STAFF"?[
  {href:"/",label:"หน้าหลัก",icon:Home},{href:"/report",label:"แจ้งปัญหา",icon:PlusCircle},{href:"/my-tickets",label:"คำร้อง",icon:ClipboardList},{href:"/notifications",label:"แจ้งเตือน",icon:Bell}
 ]:role==="TECHNICIAN"?[
  {href:"/",label:"หน้าหลัก",icon:Home},{href:"/technician/jobs",label:"งานของฉัน",icon:Wrench},{href:"/notifications",label:"แจ้งเตือน",icon:Bell},{href:"/#how-it-works",label:"วิธีใช้",icon:ClipboardList}
 ]:[
  {href:"/",label:"หน้าหลัก",icon:Home},{href:"/admin/tickets",label:"คำร้อง",icon:ClipboardList},{href:"/admin/dashboard",label:"รายงาน",icon:BarChart3},{href:"/notifications",label:"แจ้งเตือน",icon:Bell}
 ];
 return <nav className="mobile-bottom-nav" aria-label="เมนูมือถือ">{items.map(({href,label,icon:Icon},index)=>{const active=href==="/"?pathname===href:pathname.startsWith(href);return <Link key={`${href}-${index}`} href={href} className={active?"is-active":""}><span className="mobile-nav-icon"><Icon size={21}/>{label==="แจ้งเตือน"&&unread>0&&<i>{unread>9?"9+":unread}</i>}</span><span>{label}</span></Link>})}</nav>;
}
