import Link from "next/link";
import { redirect } from "next/navigation";
import RegisterForm from "@/components/RegisterForm";
import { getCurrentUser } from "@/lib/auth";
import { workspaceForRole } from "@/lib/auth-shared";

export const metadata = { title: "สมัครสมาชิก | BRU Fondue" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(workspaceForRole(user.role));
  return <section className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-6 sm:py-16">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-9">
      <p className="text-[11px] font-semibold tracking-[.16em] text-indigo-600">CREATE YOUR ACCOUNT</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">สมัครสมาชิก</h1>
      <p className="mt-2 text-base leading-relaxed text-slate-500">สร้างบัญชีผู้แจ้งเพื่อแจ้งปัญหาและติดตามสถานะงานซ่อม</p>
      <RegisterForm />
    </div>
    <p className="mt-6 text-center text-sm text-slate-500">มีบัญชีแล้ว? <Link href="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">เข้าสู่ระบบ</Link></p>
  </section>;
}
