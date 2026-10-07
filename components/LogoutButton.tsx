"use client";
import { useState } from "react";
export default function LogoutButton() {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function logout(){
    if(busy) return;
    setBusy(true); setError("");
    try {
      const response=await fetch("/api/auth/logout",{method:"POST"});
      if(!response.ok) throw new Error("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่");
      // Drop the client router cache so the previous account's pages are not reused.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/login");
    } catch(cause){setError(cause instanceof Error?cause.message:"เชื่อมต่อไม่ได้");setBusy(false);}
  }
  return <div><button onClick={logout} disabled={busy} className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">{busy?"กำลังออกจากระบบ…":"ออกจากระบบ"}</button>{error&&<p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}</div>;
}
