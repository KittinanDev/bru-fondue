import { unreadNotifications } from "@/lib/notifications";
import Link from "next/link";
import { ArrowUpRight, Asterisk, ChevronDown, UserRound } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { workspaceForRole } from "@/lib/auth-shared";
import { canReportTicket, isAdmin } from "@/lib/permissions";
import LogoutButton from "./LogoutButton";

export default async function Navbar() {
  const user = await getCurrentUser();
  const role = user?.role;
  const unread = user ? await unreadNotifications(user) : 0;
  const reporter = canReportTicket(user);
  const roleLabel = role === "STUDENT" ? "นักศึกษา" : role === "STAFF" ? "บุคลากร" : role === "TECHNICIAN" ? "ช่างซ่อมบำรุง" : role === "SUPERADMIN" ? "ผู้ดูแลระบบสูงสุด" : "ผู้ดูแลระบบ";
  const actionHref = !user ? "/login" : reporter ? "/report" : workspaceForRole(user.role);
  const actionLabel = !user ? "เข้าสู่ระบบ" : reporter ? "แจ้งปัญหา" : isAdmin(user) ? "จัดการคำร้อง" : "งานของฉัน";

  return (
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
          {user && <Link href="/notifications">แจ้งเตือน{unread > 0 ? ` (${unread > 99 ? "99+" : unread})` : ""}</Link>}
          <Link href="/#how-it-works">วิธีใช้งาน</Link>
        </div>
        <div className="nav-actions">
          <Link href={actionHref} className="button nav-cta">{actionLabel}<ArrowUpRight size={16} /></Link>
          {user && (
            <details className="account-menu">
              <summary aria-label="บัญชีผู้ใช้" className="account-trigger"><UserRound size={17} /><span>บัญชี</span><ChevronDown size={13} /></summary>
              <div className="account-panel">
                <div><p className="text-sm font-medium text-slate-900">{user.name}</p><p className="mt-1 text-xs text-slate-500">{roleLabel}</p></div>
                <LogoutButton />
              </div>
            </details>
          )}
        </div>
      </nav>
    </header>
  );
}
