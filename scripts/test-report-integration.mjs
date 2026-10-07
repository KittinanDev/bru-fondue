import assert from 'node:assert/strict';import {randomUUID,randomBytes,createHash} from 'node:crypto';import {PrismaClient} from '@prisma/client';
const db=new PrismaClient();const base='http://localhost:3107';const prefix='report-'+randomUUID();const ids=[];let building,category;let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++;console.log('PASS '+m)};
try{
 building=await db.building.create({data:{name:prefix,code:prefix}});category=await db.category.create({data:{name:prefix}});
 for(const role of ['ADMIN','STUDENT','TECHNICIAN','TECHNICIAN']){const u=await db.user.create({data:{name:prefix+'-'+ids.length,role,credential:{create:{passwordHash:'test-session-only'}}}});ids.push(u.id);}
 const token=randomBytes(32).toString('hex');await db.authSession.create({data:{tokenHash:createHash('sha256').update(token).digest('hex'),userId:ids[0],expiresAt:new Date(Date.now()+3600000)}});
 const headers={Cookie:'bru_session='+token};const get=async(path)=>{const r=await fetch(base+path,{headers});return {status:r.status,text:await r.text()}};
 const rows=[];for(let i=0;i<4;i++){rows.push(await db.ticket.create({data:{ticketCode:prefix+'TICKET'+i,title:prefix+'TITLE'+i,description:'report fixture',buildingId:building.id,categoryId:category.id,reporterId:ids[1],createdAt:new Date(['2026-10-07T16:59:59Z','2026-10-07T17:00:00Z','2026-10-08T16:59:59Z','2026-10-08T17:00:00Z'][i]),status:i===2?'WAITING_PARTS':'COMPLETED',resolvedAt:i===1?new Date('2026-10-08T17:00:00Z'):null}}));}
 for(const [n,tech] of [[0,ids[2]],[1,ids[2]],[2,ids[3]]])await db.ticketAssignment.create({data:{ticketId:rows[1].id,technicianId:tech,assignedById:ids[0],assignedAt:new Date(1700000000000+n*1000)}});
 await db.evaluation.create({data:{ticketId:rows[1].id,reporterId:ids[1],score:3}});
 const query=`?from=2026-10-08&to=2026-10-08&categoryId=${category.id}&buildingId=${building.id}`;
 for(const path of ['/admin/dashboard','/admin/reports/pdf','/api/admin/export-excel']){const r=await get(path+query);check(r.status===200,path+' available');for(let i=0;i<4;i++)check(r.text.includes(rows[i].ticketCode)===[1,2].includes(i),path+' date boundary '+i);check(r.text.includes('รออะไหล่'),path+' waiting status correct');if(path!=='/admin/dashboard'){check(r.text.includes(prefix+'-3'),path+' latest tech included');check(!r.text.includes(prefix+'-2'),path+' old tech excluded');}}
 const dash=await get('/admin/dashboard'+query);check(dash.text.includes('24.0'),'actual duration');check(dash.text.includes('3.0'),'actual score');check(dash.text.includes('categoryId%3D')||dash.text.includes('categoryId='),'export filters retained');
 const empty=await get('/admin/dashboard'+query+'&status=REJECTED');check(empty.text.includes('ไม่พบคำร้องตามตัวกรองนี้')&&empty.text.includes('ยังไม่มีคะแนน'),'empty state honest');
 for(const path of ['/admin/dashboard','/admin/reports/pdf','/api/admin/export-excel']){const r=await get(path+query+'&status=COMPLETED');check(r.text.includes(rows[1].ticketCode)&&!r.text.includes(rows[2].ticketCode),path+' status filter');}
 for(const q of ['?from=2026-02-30','?buildingId=-1','?status=PENDING&status=COMPLETED'])check((await get('/api/admin/export-excel'+q)).status===400,'invalid filters rejected');
 console.log(`SUCCESS ${checks} report integration checks`);
}finally{await db.ticket.deleteMany({where:{reporterId:{in:ids}}});await db.user.deleteMany({where:{id:{in:ids}}});if(category)await db.category.delete({where:{id:category.id}});if(building)await db.building.delete({where:{id:building.id}});await db.$disconnect();console.log('Report fixtures cleaned');}

