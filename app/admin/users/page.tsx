import { requireCurrentUser } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import AccessDenied from "@/components/AccessDenied";
import UserManager from "@/components/UserManager";

export const metadata = { title: "จัดการผู้ใช้ | BRU Fondue" };

export default async function AdminUsersPage() {
  const currentUser = await requireCurrentUser("/admin/users");
  if (!isAdmin(currentUser)) return <AccessDenied message="การจัดการบัญชีสำหรับผู้ดูแลระบบเท่านั้น" />;
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, studentId: true, phoneNumber: true,
      faculty: true, department: true, createdAt: true, updatedAt: true,
      credential: { select: { disabledAt: true } },
      _count: { select: { reportedTickets: true, assignedJobs: true } },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-10">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-3xl font-semibold">จัดการบัญชีผู้ใช้</h1><p className="mt-3 text-sm leading-6 text-slate-500">เพิ่มบัญชีช่าง แก้ไขข้อมูล เปลี่ยนบทบาท ตั้งรหัสผ่านใหม่ และเปิด–ปิดการใช้งาน</p></div>
    </header>
    <UserManager currentUserId={currentUser.id} users={users.map(user=>({...user,createdAt:user.createdAt.toISOString(),updatedAt:user.updatedAt.toISOString(),disabledAt:user.credential?.disabledAt?.toISOString()??null}))}/>
  </main>;
}
