"use client";
import Link from "next/link";
export default function ErrorPage({reset}:{reset:()=>void}){return <section role="alert" className="mx-auto max-w-lg space-y-5 px-6 py-16"><h1 className="text-2xl font-semibold">เปิดข้อมูลไม่สำเร็จ</h1><p className="text-slate-600">กรุณาลองอีกครั้ง หากเพิ่งส่งข้อมูล ให้ตรวจรายการก่อนส่งซ้ำ</p><button className="rounded-lg bg-slate-900 px-5 py-3 text-white" onClick={reset}>ลองอีกครั้ง</button><Link className="ml-4 underline" href="/">กลับหน้าหลัก</Link></section>;}
