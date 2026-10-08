import {requireCurrentUser} from '@/lib/auth';
import {isAdmin} from '@/lib/permissions';
import {prisma} from '@/lib/prisma';
import AccessDenied from '@/components/AccessDenied';
import MasterDataManager from '@/components/MasterDataManager';
import Link from 'next/link';
export default async function SettingsPage(){
 const user=await requireCurrentUser('/admin/settings');if(!isAdmin(user))return <AccessDenied message="ข้อมูลอาคารและหมวดหมู่สำหรับผู้ดูแลระบบเท่านั้น"/>;
 const [buildings,categories,technicians]=await Promise.all([prisma.building.findMany({orderBy:{name:'asc'}}),prisma.category.findMany({orderBy:{name:'asc'}}),prisma.user.findMany({where:{role:'TECHNICIAN',credential:{disabledAt:null}},select:{id:true,name:true,department:true},orderBy:{name:'asc'}})]);
 return <main className="mx-auto max-w-6xl space-y-8 px-4 py-10"><header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-semibold">อาคารและหมวดหมู่</h1><p className="mt-3 text-sm leading-6 text-slate-500">จัดการตัวเลือกในหน้าแจ้งซ่อมและรายงาน การเปลี่ยนชื่อจะมีผลกับคำร้องเดิมที่อ้างอิงรายการนี้ด้วย</p></div><Link href="/admin/users" className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800">จัดการบัญชีผู้ใช้</Link></header><MasterDataManager buildings={buildings} categories={categories} technicians={technicians}/></main>;
}
