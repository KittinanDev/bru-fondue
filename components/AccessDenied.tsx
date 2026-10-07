import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function AccessDenied({ message }: { message: string }) {
  return (
    <section className="mx-auto my-16 max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <ShieldAlert aria-hidden="true" className="mx-auto mb-4 h-9 w-9 text-slate-500" />
      <h1 className="text-xl font-semibold text-slate-900">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{message}</p>
      <Link href="/" className="mt-6 inline-flex rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white">
        กลับหน้าหลัก
      </Link>
    </section>
  );
}
