"use client";

import { useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

export default function RegisterForm() {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    if (data.get("password") !== data.get("confirmPassword")) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน"); setBusy(false); return;
    }
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "สมัครสมาชิกไม่สำเร็จ");
      window.location.assign(result.redirectTo);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "เชื่อมต่อไม่ได้ กรุณาลองใหม่");
      setBusy(false);
    }
  }

  const input = "mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
  return <form onSubmit={submit} className="mt-8 space-y-5">
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-medium sm:col-span-2">ชื่อ–นามสกุล *<input className={input} name="name" maxLength={120} autoComplete="name" required disabled={busy}/></label>
      <label className="text-sm font-medium">อีเมล *<input className={input} type="email" name="email" maxLength={254} autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="name@bru.ac.th" required disabled={busy}/></label>
      <label className="text-sm font-medium">รหัสนักศึกษา / รหัสบุคลากร *<input className={input} name="studentId" maxLength={32} autoComplete="off" required disabled={busy}/></label>
      <label className="text-sm font-medium">เบอร์โทรศัพท์ *<input className={input} type="tel" name="phoneNumber" maxLength={20} autoComplete="tel" inputMode="tel" required disabled={busy}/></label>
      <label className="text-sm font-medium">คณะ / หน่วยงาน *<input className={input} name="faculty" maxLength={120} required disabled={busy}/></label>
      <label className="text-sm font-medium sm:col-span-2">สาขาวิชา / ฝ่ายงาน<input className={input} name="department" maxLength={120} disabled={busy}/></label>
      <label className="text-sm font-medium sm:col-span-2">รหัสผ่าน *<span className="relative mt-2 block"><input className={`${input} mt-0 pr-12`} type={visible ? "text" : "password"} name="password" minLength={12} maxLength={128} autoComplete="new-password" required disabled={busy}/><button type="button" onClick={()=>setVisible(!visible)} aria-label={visible?"ซ่อนรหัสผ่าน":"แสดงรหัสผ่าน"} className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-lg text-slate-500">{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></span><span className="mt-1 block text-xs font-normal text-slate-500">อย่างน้อย 12 ตัวอักษร</span></label>
      <label className="text-sm font-medium sm:col-span-2">ยืนยันรหัสผ่าน *<input className={input} type={visible ? "text" : "password"} name="confirmPassword" minLength={12} maxLength={128} autoComplete="new-password" required disabled={busy}/></label>
    </div>
    <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-3 rounded-xl bg-indigo-600 px-5 py-3.5 text-base font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{busy?"กำลังสร้างบัญชี…":"สมัครสมาชิก"}<ArrowRight size={18}/></button>
    <p className="text-center text-xs leading-relaxed text-slate-500">เมื่อสมัคร ระบบจะเข้าสู่ระบบและเปิดหน้าคำร้องของคุณทันที</p>
  </form>;
}
