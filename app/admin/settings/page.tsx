import {requireCurrentUser} from '@/lib/auth';
import {isAdmin} from '@/lib/permissions';
import {prisma} from '@/lib/prisma';
import AccessDenied from '@/components/AccessDenied';
import MasterDataManager from '@/components/MasterDataManager';
export default async function SettingsPage(){
 const user=await requireCurrentUser('/admin/settings');if(!isAdmin(user))return <AccessDenied message="ข้อมูลอาคารและหมวดหมู่สำหรับผู้ดูแลระบบเท่านั้น"/>;
 const [buildings,categories]=await Promise.all([prisma.building.findMany({orderBy:{name:'asc'}}),prisma.category.findMany({orderBy:{name:'asc'}})]);
 return <main className="mx-auto max-w-6xl space-y-8 px-4 py-10"><header><h1 className="text-3xl font-semibold">อาคารและหมวดหมู่</h1><p className="mt-3 text-sm leading-6 text-slate-500">จัดการตัวเลือกในหน้าแจ้งซ่อมและรายงาน การเปลี่ยนชื่อจะมีผลกับคำร้องเดิมที่อ้างอิงรายการนี้ด้วย</p></header><MasterDataManager buildings={buildings} categories={categories}/></main>;
}
