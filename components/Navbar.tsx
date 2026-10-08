import { recentNotifications, unreadNotifications } from "@/lib/notifications";
import Link from "next/link";
import { ArrowUpRight, Asterisk, ChevronDown, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { workspaceForRole } from "@/lib/auth-shared";
import { canReportTicket, isAdmin } from "@/lib/permissions";
import LogoutButton from "./LogoutButton";
import NotificationMenu from "./NotificationMenu";
import MobileBottomNav from "./MobileBottomNav";
import { NotificationProvider } from "./NotificationProvider";

export default async function Navbar() {
  const user = await getCurrentUser();
  const role = user?.role;
  const [unread,notices] = user ? await Promise.all([unreadNotifications(user),recentNotifications(user)]) : [0,[]];
  const reporter = canReportTicket(user);
  const roleLabel = role === "STUDENT" ? "นักศึกษา" : role === "STAFF" ? "บุคลากร" : role === "TECHNICIAN" ? "ช่างซ่อมบำรุง" : role === "SUPERADMIN" ? "ผู้ดูแลระบบสูงสุด" : "ผู้ดูแลระบบ";
  const actionHref = !user ? "/login" : reporter ? "/report" : workspaceForRole(user.role);
  const actionLabel = !user ? "เข้าสู่ระบบ" : reporter ? "แจ้งปัญหา" : isAdmin(user) ? "จัดการคำร้อง" : "งานของฉัน";

  return (
    <NotificationProvider initialUnread={unread} initialNotices={notices.map(notice=>({...notice,createdAt:notice.createdAt.toISOString()}))}>
    <header className="site-header">
      <nav className="section-container nav-inner" aria-label="เมนูหลัก">
        <Link href="/" className="brand" aria-label="BRU Fondue หน้าหลัก">
          <span className="brand-icon"><Asterisk size={28} /></span>
          <span>bru<span className="brand-light">fondue.</span><small>SMART CAMPUS, BETTER LIFE</small></span>
        </Link>
        <div className="nav-links">
          {!user && <Link href="/#features">รู้จัก BRU Fondue</Link>}
          {reporter && <Link href="/my-tickets">คำร้องของฉัน</Link>}
          {isAdmin(user) && <Link href="/admin/dashboard">สถิติและรายงาน</Link>}
          {isAdmin(user) && <Link href="/admin/settings">ข้อมูลพื้นฐาน</Link>}
          {isAdmin(user) && <Link href="/admin/users">ผู้ใช้งาน</Link>}
          <Link href="/#how-it-works">วิธีใช้งาน</Link>
        </div>
        <div className="nav-actions">
          {user && <NotificationMenu/>}
          <Link href={actionHref} className="button nav-cta">{actionLabel}<ArrowUpRight size={16} /></Link>
          {user && (
            <details className="account-menu">
              <summary aria-label="บัญชีผู้ใช้" className="account-trigger"><UserRound size={17} /><span>บัญชี</span><ChevronDown size={13} /></summary>
              <div className="account-panel">
                <div><p className="text-sm font-medium text-slate-900">{user.name}</p><p className="mt-1 text-xs text-slate-500">{roleLabel}</p><Link href="/profile" className="mt-3 block text-sm font-semibold text-indigo-600">แก้ไขโปรไฟล์</Link>{role==="TECHNICIAN"&&<Link href="/technician/history" className="mt-2 block text-sm font-semibold text-indigo-600">ประวัติการทำงาน</Link>}{isAdmin(user)&&<Link href="/admin/users" className="mt-2 block text-sm font-semibold text-indigo-600">จัดการผู้ใช้งาน</Link>}</div>
                <LogoutButton />
              </div>
            </details>
          )}
        </div>
      </nav>
    </header>
    {user&&<MobileBottomNav role={user.role}/>}
    </NotificationProvider>
  );
}
