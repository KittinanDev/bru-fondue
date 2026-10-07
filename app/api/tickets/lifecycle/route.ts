import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {getCurrentUser} from '@/lib/auth';
import {isAdmin,canReportTicket,latestAssignmentOrder} from '@/lib/permissions';
import {isClosedTicket} from '@/lib/ticket-workflow';
import {isSameOrigin} from '@/lib/session';
import {readBody,idField,textField,InputError,inputErrorResponse,limitMutation} from '@/lib/input-validation';
export async function POST(request:Request){
 if(!isSameOrigin(request))return NextResponse.json({error:'คำขอไม่ถูกต้อง'},{status:403});
 try{const user=await getCurrentUser();if(!user)throw new InputError('กรุณาเข้าสู่ระบบ',401);
 await limitMutation(user.id,'lifecycle');const body=await readBody(request);const ticketId=idField(body.ticketId);const reason=textField(body.reason,'เหตุผล',2000);
 if(!['cancel','reject','reopen'].includes(String(body.action)))throw new InputError('การดำเนินการไม่ถูกต้อง');
 const result=await prisma.$transaction(async tx=>{
 const ticket=await tx.ticket.findUnique({where:{id:ticketId},include:{assignments:{orderBy:latestAssignmentOrder,take:1},evaluation:true}});if(!ticket)throw new InputError('ไม่พบคำร้อง',404);
 const admin=isAdmin(user);const owner=canReportTicket(user)&&user.id===ticket.reporterId;
 if(!admin && !(owner&&body.action==='cancel'&&ticket.status==='PENDING'))throw new InputError('ไม่มีสิทธิ์ดำเนินการ',403);
 if(body.expectedUpdatedAt!==ticket.updatedAt.toISOString())throw new InputError('ข้อมูลเปลี่ยนแปลงแล้ว กรุณาโหลดหน้าใหม่',409);
 const closed=isClosedTicket(ticket.status);if(body.action==='reopen'?!closed:closed)throw new InputError('สถานะปัจจุบันไม่รองรับการดำเนินการนี้',409);
 const status=body.action==='reopen'?(ticket.assignments.length?'IN_PROGRESS':'PENDING'):body.action==='reject'?'REJECTED':'CANCELLED';
 if(body.action==='reopen'&&ticket.evaluation){const e=ticket.evaluation;await tx.ticketStatusLog.create({data:{ticketId,status:ticket.status,changedById:e.reporterId,note:`เก็บผลประเมินรอบก่อนเปิดงานใหม่: ${e.score} ดาว; ประเมินเมื่อ ${e.createdAt.toISOString()}; ความเห็น: ${e.comment||'-'}`}});await tx.evaluation.delete({where:{id:e.id}});}
 const updated=await tx.ticket.update({where:{id:ticketId},data:{status,resolvedAt:null,updatedAt:new Date(Math.max(Date.now(),ticket.updatedAt.getTime()+1))}});
 const label=body.action==='reopen'?'เปิดงานใหม่':body.action==='reject'?'ไม่รับดำเนินการ':'ยกเลิกคำร้อง';
 await tx.ticketStatusLog.create({data:{ticketId,status,changedById:user.id,note:`${label}: ${reason}`}});return updated;
 });return NextResponse.json({success:true,ticket:result});
 }catch(error){const r=inputErrorResponse(error);if(r)return r;console.error('Lifecycle error',error);return NextResponse.json({error:'บันทึกไม่สำเร็จ'},{status:500});}
}
