import assert from 'node:assert/strict';import {randomUUID,randomBytes,createHash} from 'node:crypto';import {PrismaClient} from '@prisma/client';
const db=new PrismaClient();const base='http://localhost:3107';const prefix='master-'+randomUUID();const ids=[];const buildingIds=[];const categoryIds=[];const cookies={};let checks=0;
const check=(v,m)=>{assert.ok(v,m);checks++;console.log('PASS '+m)};
async function post(role,body,origin=base){const r=await fetch(base+'/api/admin/master-data',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookies[role]?{Cookie:cookies[role]}:{})},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};}
try{
for(const role of ['ADMIN','SUPERADMIN','STUDENT','TECHNICIAN']){const u=await db.user.create({data:{name:prefix+role,role,credential:{create:{passwordHash:'test-session-only'}}}});ids.push(u.id);const token=randomBytes(32).toString('hex');await db.authSession.create({data:{tokenHash:createHash('sha256').update(token).digest('hex'),userId:u.id,expiresAt:new Date(Date.now()+3600000)}});cookies[role]='bru_session='+token;}
const building={kind:'building',name:prefix,code:'T'+randomBytes(6).toString('hex'),defaultLat:0,defaultLng:0};
for(const role of ['GUEST','STUDENT','TECHNICIAN'])check((await post(role,building)).status===(role==='GUEST'?401:403),'denied '+role);
check((await post('ADMIN',building,'https://example.test')).status===403,'cross origin denied');
let r=await post('ADMIN',building);check(r.status===200,'create building');const b=r.data.item;buildingIds.push(b.id);check(b.defaultLat===0&&b.defaultLng===0,'zero coordinates preserved');check((await post('ADMIN',building)).status===409,'duplicate rejected');
for(const change of [{defaultLat:91},{defaultLng:null},{name:''},{code:'bad code'}])check((await post('ADMIN',{...building,...change,name:change.name??prefix+'new'})).status===400,'invalid input rejected');
r=await post('SUPERADMIN',{...building,id:b.id,name:prefix+' revised',expected:JSON.stringify(b)});check(r.status===200,'superadmin edit');check((await post('ADMIN',{...building,id:b.id,expected:JSON.stringify(b)})).status===409,'stale edit blocked');
const catBody={kind:'category',name:prefix+'cat',description:'test'};r=await post('ADMIN',catBody);check(r.status===200,'create category');const cat=r.data.item;categoryIds.push(cat.id);check((await post('ADMIN',{...catBody,name:catBody.name.toUpperCase()})).status===409,'case-insensitive category duplicate');
r=await post('ADMIN',{...catBody,id:cat.id,description:'updated',expected:JSON.stringify(cat)});check(r.status===200&&r.data.item.description==='updated','edit category');
const ticket=await db.ticket.create({data:{ticketCode:prefix,title:'fixture',description:'fixture',buildingId:b.id,categoryId:cat.id,reporterId:ids[2],latitude:1,longitude:2}});
const latest=await db.building.findUnique({where:{id:b.id}});r=await post('ADMIN',{...building,id:b.id,defaultLat:14,defaultLng:103,expected:JSON.stringify(latest)});check(r.status===200,'edit referenced building');const saved=await db.ticket.findUnique({where:{id:ticket.id}});check(saved.latitude===1&&saved.longitude===2&&saved.buildingId===b.id,'old ticket coordinates and references preserved');
for(const role of ['ADMIN','STUDENT','TECHNICIAN']){const page=await fetch(base+'/admin/settings',{headers:{Cookie:cookies[role]}});const text=await page.text();check(role==='ADMIN'?text.includes(b.code):!text.includes(b.code),'page access '+role);}
const report=await fetch(base+'/report',{headers:{Cookie:cookies.STUDENT}});const html=await report.text();check(html.includes(catBody.name)&&html.includes(prefix),'new options in report');
console.log(`SUCCESS ${checks} master-data checks`);
}finally{await db.ticket.deleteMany({where:{reporterId:{in:ids}}});await db.building.deleteMany({where:{id:{in:buildingIds}}});await db.category.deleteMany({where:{id:{in:categoryIds}}});await db.authLoginLimit.deleteMany({where:{OR:ids.map(id=>({key:{startsWith:'mutation:',endsWith:`:${id}`}}))}});await db.user.deleteMany({where:{id:{in:ids}}});await db.$disconnect();console.log('Fixtures cleaned');}

