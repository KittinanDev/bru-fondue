import {NextResponse} from 'next/server';
import {Prisma} from '@prisma/client';
import {getCurrentUser} from '@/lib/auth';
import {isAdmin} from '@/lib/permissions';
import {isSameOrigin} from '@/lib/session';
import {prisma} from '@/lib/prisma';
import {readBody,textField,positiveId,coordinates,InputError,inputErrorResponse,limitMutation} from '@/lib/input-validation';
export async function POST(request:Request){
 if(!isSameOrigin(request))return NextResponse.json({error:'คำขอไม่ถูกต้อง'},{status:403});
 try{
 const user=await getCurrentUser();if(!user)return NextResponse.json({error:'กรุณาเข้าสู่ระบบ'},{status:401});if(!isAdmin(user))return NextResponse.json({error:'เฉพาะผู้ดูแลระบบเท่านั้น'},{status:403});
 await limitMutation(user.id,'master-data');const body=await readBody(request);
 if(body.kind!=='building'&&body.kind!=='category')throw new InputError('ประเภทข้อมูลไม่ถูกต้อง');
 const id=body.id===undefined?undefined:positiveId(body.id,'รายการ');
 const name=textField(body.name,'ชื่อ',160).normalize('NFC');
 const result=await prisma.$transaction(async tx=>{
 if(body.kind==='building'){
 const code=textField(body.code,'รหัสอาคาร',32).toUpperCase();if(!/^[A-Z0-9_-]+$/.test(code))throw new InputError('รหัสอาคารใช้ตัวอักษรอังกฤษ ตัวเลข ขีดกลาง หรือขีดล่าง');
 const coords=coordinates(body.defaultLat,body.defaultLng);const data={name,code,defaultLat:coords.latitude,defaultLng:coords.longitude};
 const current=id?await tx.building.findUnique({where:{id}}):null;if(id&&!current)throw new InputError('ไม่พบอาคาร',404);
 if(current && body.expected!==JSON.stringify(current))throw new InputError('ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดหน้าใหม่',409);
 const all=await tx.building.findMany();if(all.some(x=>x.id!==id && (x.code.toUpperCase()===code||x.name.normalize('NFC').toLowerCase()===name.toLowerCase())))throw new InputError('ชื่อหรือรหัสอาคารนี้มีอยู่แล้ว',409);
 return id?tx.building.update({where:{id},data}):tx.building.create({data});
 }
 const description=textField(body.description,'คำอธิบาย',500,true)||null;
 const defaultTechnicianId=body.defaultTechnicianId===null||body.defaultTechnicianId===''?null:textField(body.defaultTechnicianId,'ช่างประจำหมวดหมู่',80);
 if(defaultTechnicianId){const technician=await tx.user.findUnique({where:{id:defaultTechnicianId},select:{role:true,credential:{select:{disabledAt:true}}}});if(!technician||technician.role!=='TECHNICIAN'||technician.credential?.disabledAt)throw new InputError('ไม่พบบัญชีช่างที่พร้อมใช้งาน',404);}
 const current=id?await tx.category.findUnique({where:{id}}):null;if(id&&!current)throw new InputError('ไม่พบหมวดหมู่',404);
 if(current && body.expected!==JSON.stringify(current))throw new InputError('ข้อมูลถูกแก้ไขแล้ว กรุณาโหลดหน้าใหม่',409);
 const all=await tx.category.findMany();if(all.some(x=>x.id!==id && x.name.normalize('NFC').toLowerCase()===name.toLowerCase()))throw new InputError('ชื่อหมวดหมู่นี้มีอยู่แล้ว',409);
 return id?tx.category.update({where:{id},data:{name,description,defaultTechnicianId}}):tx.category.create({data:{name,description,defaultTechnicianId}});
 });
 return NextResponse.json({success:true,item:result});
 }catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')return NextResponse.json({error:'ชื่อหรือรหัสนี้มีอยู่แล้ว'},{status:409});const response=inputErrorResponse(error);if(response)return response;console.error('Master data update failed',error);return NextResponse.json({error:'บันทึกไม่สำเร็จ กรุณาลองใหม่'},{status:500});}
}
