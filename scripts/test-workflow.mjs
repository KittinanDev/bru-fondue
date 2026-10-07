import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
const db=new PrismaClient();const base='http://localhost:3107';const prefix=`workflow-${randomUUID()}`;const ids=[];let building,category;let checks=0;
const check=(v,m)=>{assert.ok(v,m);checks++;console.log('PASS '+m)};
const cookies={};
async function post(path,role,body){const r=await fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookies[role]},body:JSON.stringify(body)});return {status:r.status,data:await r.json()}}
try{
 building=await db.building.create({data:{code:prefix,name:prefix}});category=await db.category.create({data:{name:prefix}});
 for(const role of ['STUDENT','ADMIN','TECHNICIAN','TECHNICIAN2']){const u=await db.user.create({data:{name:prefix+role,role:role==='TECHNICIAN2'?'TECHNICIAN':role,credential:{create:{passwordHash:'test-session-only'}}}});ids.push(u.id);const token=randomBytes(32).toString('hex');await db.authSession.create({data:{tokenHash:createHash('sha256').update(token).digest('hex'),userId:u.id,expiresAt:new Date(Date.now()+3600000)}});cookies[role]=`bru_session=${token}`;}
 const body={title:prefix,description:'Temporary workflow test',location:'Test',buildingId:building.id,categoryId:category.id};
 const batch=await Promise.all(Array.from({length:8},()=>post('/api/tickets/create','STUDENT',body)));
 for(const r of batch)check(r.status===200,'concurrent create succeeds '+JSON.stringify(r.data.error));
 check(new Set(batch.map(r=>r.data.ticket.ticketCode)).size===8,'concurrent codes unique');
 const t=batch[0].data.ticket;const assignment={ticketId:t.id,technicianId:ids[2]};
 let r=await post('/api/technician/update-job','ADMIN',{ticketId:t.id,status:'COMPLETED'});check(r.status===409,'cannot close unassigned pending ticket');
 r=await post('/api/admin/tickets/assign','ADMIN',assignment);check(r.status===200 && r.data.ticket.status==='IN_PROGRESS','initial assignment starts work');
 const firstVersion=r.data.ticket.updatedAt;
 r=await post('/api/admin/tickets/assign','ADMIN',assignment);check(r.status===409,'duplicate assignment rejected');check(await db.ticketAssignment.count({where:{ticketId:t.id}})===1,'no duplicate history');
 r=await post('/api/technician/update-job','TECHNICIAN',{ticketId:t.id,status:'WAITING_PARTS',expectedUpdatedAt:firstVersion,note:'Waiting'});check(r.status===200,'wait for parts');
 r=await post('/api/technician/update-job','TECHNICIAN',{ticketId:t.id,status:'COMPLETED',expectedUpdatedAt:firstVersion});check(r.status===409,'stale edit rejected');
 r=await post('/api/admin/tickets/assign','ADMIN',{...assignment,technicianId:ids[3]});check(r.status===200 && r.data.ticket.status==='WAITING_PARTS','reassignment preserves waiting status');
 r=await post('/api/technician/update-job','TECHNICIAN',{ticketId:t.id,status:'COMPLETED'});check(r.status===403,'previous technician loses access');
 r=await post('/api/technician/update-job','TECHNICIAN2',{ticketId:t.id,status:'IN_PROGRESS'});check(r.status===200 && r.data.ticket.resolvedAt===null,'resume work clears completion date');
 const version=r.data.ticket.updatedAt;
 const race=await Promise.all([post('/api/technician/update-job','TECHNICIAN2',{ticketId:t.id,status:'COMPLETED',expectedUpdatedAt:version}),post('/api/technician/update-job','TECHNICIAN2',{ticketId:t.id,status:'WAITING_PARTS',expectedUpdatedAt:version})]);
 check(race.filter(x=>x.status===200).length===1 && race.filter(x=>x.status===409).length===1,'concurrent stale edit has one winner');
 const current=await db.ticket.findUnique({where:{id:t.id}});if(current.status!=='COMPLETED'){r=await post('/api/technician/update-job','TECHNICIAN2',{ticketId:t.id,status:'COMPLETED'});check(r.status===200,'complete after wait');}
 const snapshot=JSON.stringify(await db.ticket.findUnique({where:{id:t.id},include:{statusLogs:true,assignments:true}}));
 for(const status of ['IN_PROGRESS','WAITING_PARTS','COMPLETED']){r=await post('/api/technician/update-job','ADMIN',{ticketId:t.id,status});check(r.status===409,'closed ticket blocks '+status)}
 r=await post('/api/admin/tickets/assign','ADMIN',assignment);check(r.status===409,'closed ticket blocks reassignment');check(snapshot===JSON.stringify(await db.ticket.findUnique({where:{id:t.id},include:{statusLogs:true,assignments:true}})),'closed history and resolvedAt unchanged');
 const rejected=batch[1].data.ticket;await db.ticket.update({where:{id:rejected.id},data:{status:'REJECTED'}});r=await post('/api/admin/tickets/assign','ADMIN',{...assignment,ticketId:rejected.id});check(r.status===409,'rejected ticket blocks assignment');
 console.log(`SUCCESS ${checks} workflow checks`);
}finally{await db.ticket.deleteMany({where:{reporterId:{in:ids}}});await db.authLoginLimit.deleteMany({where:{OR:ids.map(id=>({key:{startsWith:'mutation:',endsWith:`:${id}`}}))}});await db.user.deleteMany({where:{id:{in:ids}}});if(category)await db.category.delete({where:{id:category.id}});if(building)await db.building.delete({where:{id:building.id}});await db.$disconnect();console.log('Fixtures cleaned');}

