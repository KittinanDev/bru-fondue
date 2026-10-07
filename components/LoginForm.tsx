"use client";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
export default function LoginForm({ returnTo }: { returnTo: string | null }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.get("email"), password: data.get("password"), next: returnTo }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "เข้าสู่ระบบไม่สำเร็จ");
      // A full navigation drops any previously cached account-specific UI.
      window.location.assign(result.redirectTo);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "เชื่อมต่อไม่ได้ กรุณาลองใหม่");
      setBusy(false);
    }
  }
  const inputStyle = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
  return <form onSubmit={submit} className="mt-8 space-y-5">
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div><label htmlFor="login-email" className="mb-2 block text-sm font-medium">อีเมล</label><input id="login-email" className={inputStyle} type="email" name="email" autoComplete="username" autoCapitalize="none" spellCheck={false} maxLength={254} required placeholder="name@bru.ac.th" disabled={busy}/></div>
    <div><label htmlFor="login-password" className="mb-2 block text-sm font-medium">รหัสผ่าน</label><div className="relative"><input id="login-password" className={`${inputStyle} pr-12`} type={visible ? "text" : "password"} name="password" autoComplete="current-password" maxLength={128} required disabled={busy}/><button type="button" onClick={()=>setVisible(!visible)} aria-label={visible?"ซ่อนรหัสผ่าน":"แสดงรหัสผ่าน"} aria-pressed={visible} className="absolute right-1 top-1 grid h-10 w-10 place-items-center rounded-lg text-slate-500">{visible?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
    <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-3 rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">{busy?"กำลังเข้าสู่ระบบ…":"เข้าสู่ระบบ"}<ArrowRight size={17}/></button>
    <p className="text-center text-xs leading-relaxed text-slate-500">ยังไม่มีบัญชีหรือลืมรหัสผ่าน?<br/>ติดต่อผู้ดูแลระบบเพื่อขอเปิดบัญชีหรือตั้งรหัสผ่านใหม่</p>
  </form>;
}
