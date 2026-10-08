import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeReturnPath, workspaceForRole } from "@/lib/auth-shared";
import LoginForm from "@/components/LoginForm";
export const metadata = { title: "เข้าสู่ระบบ | BRU Fondue" };
export default async function LoginPage({searchParams}:{searchParams:Promise<{next?:string}>}) {
  const user=await getCurrentUser();
  const returnTo=safeReturnPath((await searchParams).next);
  if(user) redirect(returnTo || workspaceForRole(user.role));
  return <section className="mx-auto w-full max-w-md px-6 py-14 sm:py-20"><div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-9"><p className="text-[10px] font-semibold tracking-[.18em] text-indigo-600">YOUR CAMPUS, CONNECTED</p><h1 className="mt-4 text-3xl font-semibold tracking-tight">ยินดีต้อนรับกลับ</h1><p className="mt-3 text-sm leading-relaxed text-slate-500">เข้าสู่ระบบเพื่อแจ้งปัญหา ติดตามงาน<br/>และดูแลพื้นที่ของเราไปด้วยกัน</p><LoginForm returnTo={returnTo} googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET)} lineEnabled={Boolean(process.env.LINE_CHANNEL_ID&&process.env.LINE_CHANNEL_SECRET)}/></div><Link href="/" className="mt-6 block text-center text-xs text-slate-500 hover:text-indigo-600">กลับหน้าหลัก BRU Fondue</Link></section>;
}
