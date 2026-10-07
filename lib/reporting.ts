import type { Prisma } from '@prisma/client';
export const statusLabels: Record<string,string> = {PENDING:'รอรับเรื่อง',IN_PROGRESS:'กำลังดำเนินการ',WAITING_PARTS:'รออะไหล่',COMPLETED:'เสร็จสิ้น',REJECTED:'ไม่รับดำเนินการ',CANCELLED:'ยกเลิกแล้ว'};
export type ReportParams = Record<string,string|string[]|undefined>;
export function reportFilter(params:ReportParams) {
 const values:Record<string,string>={}; const where:Prisma.TicketWhereInput={};
 for(const key of ['from','to','status','buildingId','categoryId']){const v=params[key];if(Array.isArray(v))throw Error('ตัวกรองซ้ำ กรุณาเลือกใหม่');values[key]=v||'';}
 for(const key of ['from','to']){const v=values[key];if(v && (!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T00:00:00Z'))||new Date(v+'T00:00:00Z').toISOString().slice(0,10)!==v))throw Error('วันที่ไม่ถูกต้อง');}
 if(values.from && values.to && values.from>values.to)throw Error('วันที่เริ่มต้นต้องไม่เกินวันที่สิ้นสุด');
 if(values.from||values.to)where.createdAt={...(values.from?{gte:new Date(values.from+'T00:00:00+07:00')}:{ }),...(values.to?{lt:new Date(Date.parse(values.to+'T00:00:00+07:00')+86400000)}:{})};
 if(values.status){if(!Object.hasOwn(statusLabels, values.status))throw Error('สถานะไม่ถูกต้อง');where.status=values.status;}
 for(const key of ['buildingId','categoryId'] as const){if(values[key]){if(!/^[1-9]\d*$/.test(values[key])||!Number.isSafeInteger(Number(values[key])))throw Error('อาคารหรือหมวดหมู่ไม่ถูกต้อง');where[key]=Number(values[key]);}}
 const query=new URLSearchParams(Object.entries(values).filter(([,v])=>v)).toString();
 return {values,where,query};
}
export interface MetricTicket {status:string;createdAt:Date;resolvedAt:Date|null;evaluation:{score:number}|null}
export function reportMetrics(tickets:MetricTicket[]){
 const completed=tickets.filter(t=>t.status==='COMPLETED');
 const durations=completed.filter(t=>t.resolvedAt && t.resolvedAt>=t.createdAt).map(t=>(t.resolvedAt!.getTime()-t.createdAt.getTime())/3600000);
 const rated=tickets.filter(t=>t.evaluation && t.evaluation.score>=1 && t.evaluation.score<=5);
 return {total:tickets.length,completed:completed.length,resolutionRate:tickets.length?Math.round(completed.length/tickets.length*100):0,avgRating:rated.length?(rated.reduce((sum,t)=>sum+t.evaluation!.score,0)/rated.length).toFixed(1):'ยังไม่มีคะแนน',ratedCount:rated.length,avgHours:durations.length?(durations.reduce((a,b)=>a+b,0)/durations.length).toFixed(1):null,durationCount:durations.length};
}
export const thaiDate=(date:Date)=>date.toLocaleDateString('th-TH',{timeZone:'Asia/Bangkok'});
