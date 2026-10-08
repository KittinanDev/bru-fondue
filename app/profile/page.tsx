import {requireCurrentUser} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import ProfileForm from "@/components/ProfileForm";
export default async function ProfilePage(){const user=await requireCurrentUser("/profile");const profile=await prisma.user.findUniqueOrThrow({where:{id:user.id},select:{name:true,email:true,studentId:true,phoneNumber:true,faculty:true,department:true,updatedAt:true}});return <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6"><header><p className="font-semibold text-indigo-600">บัญชีของฉัน</p><h1 className="mt-2 text-3xl font-semibold">แก้ไขข้อมูลโปรไฟล์</h1><p className="mt-2 text-slate-500">ข้อมูลนี้ใช้ติดต่อและแสดงในคำร้องของคุณ</p></header><ProfileForm profile={{...profile,updatedAt:profile.updatedAt.toISOString()}}/></div>}
