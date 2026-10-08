"use client";
import {useRef,useState} from "react";
import {useRouter} from "next/navigation";

type Profile={name:string;email:string|null;studentId:string|null;phoneNumber:string|null;faculty:string|null;department:string|null;updatedAt:string};
export default function ProfileForm({profile}:{profile:Profile}){
 const router=useRouter(),lock=useRef(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [error,setError]=useState("");
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError("");setMessage("");const form=new FormData(event.currentTarget);
  try{const response=await fetch("/api/profile",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(form))});const data=await response.json();if(!response.ok)throw Error(data.error||"บันทึกไม่สำเร็จ");setMessage("บันทึกข้อมูลโปรไฟล์แล้ว");router.refresh();}catch(e){setError(e instanceof Error?e.message:"บันทึกไม่สำเร็จ");}finally{lock.current=false;setBusy(false);}}
 const input="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3";
 return <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7"><input type="hidden" name="expected" value={profile.updatedAt}/><div className="grid gap-5 sm:grid-cols-2">
  <label className="font-semibold text-slate-700">ชื่อ–นามสกุล *<input required maxLength={120} name="name" defaultValue={profile.name} className={input}/></label>
  <label className="font-semibold text-slate-700">อีเมล<input value={profile.email||""} disabled className={input+" bg-slate-100"}/><span className="mt-1 block text-sm font-normal text-slate-500">ใช้อีเมลนี้เข้าสู่ระบบ จึงแก้ไขจากหน้านี้ไม่ได้</span></label>
  <label className="font-semibold text-slate-700">รหัสนักศึกษา/บุคลากร<input maxLength={32} name="studentId" defaultValue={profile.studentId||""} className={input}/></label>
  <label className="font-semibold text-slate-700">เบอร์โทรศัพท์ *<input required maxLength={20} name="phoneNumber" defaultValue={profile.phoneNumber||""} className={input}/></label>
  <label className="font-semibold text-slate-700">คณะ/หน่วยงาน<input maxLength={120} name="faculty" defaultValue={profile.faculty||""} className={input}/></label>
  <label className="font-semibold text-slate-700">สาขา/ฝ่ายงาน<input maxLength={120} name="department" defaultValue={profile.department||""} className={input}/></label>
 </div>{error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}{message&&<p role="status" className="rounded-xl bg-emerald-50 p-3 text-emerald-700">{message}</p>}<button disabled={busy} className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white disabled:opacity-50">{busy?"กำลังบันทึก…":"บันทึกโปรไฟล์"}</button></form>;
}
