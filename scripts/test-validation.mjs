import assert from 'node:assert/strict';
import { randomUUID,randomBytes,scryptSync,createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
const base=new URL(process.env.TEST_BASE_URL||'http://localhost:3107');
if(!['localhost','127.0.0.1'].includes(base.hostname))throw new Error('Local server required');
const db=new PrismaClient(); const prefix=`validation-${randomUUID()}`;const users=[];const cookies=new Map();let buildingId,categoryId,checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;};
async function request(path,user,body,contentType='application/json'){
 const r=await fetch(new URL(path,base),{method:'POST',headers:{Origin:base.origin,Cookie:cookies.get(user.id),'Content-Type':contentType},body:typeof body==='string'?body:JSON.stringify(body)});
 return{status:r.status,json:await r.json()};
}
async function snapshot(){return JSON.stringify(await db.ticket.findMany({where:{reporterId:{in:users.map(u=>u.id)}},include:{images:true,statusLogs:true,assignments:true,evaluation:true},orderBy:{id:'asc'}}));}
async function denied(path,user,body,status=400,type){
 await db.authLoginLimit.deleteMany({where:{key:{startsWith:'mutation:',endsWith:`:${user.id}`}}});
 const before=await snapshot();const r=await request(path,user,body,type);check(r.status===status,`${path} expected ${status}, got ${r.status}: ${JSON.stringify(r.json)}`);check(await snapshot()===before,'rejection must not alter fixture data');
}
try{
 const building=await db.building.create({data:{name:prefix,code:prefix}});buildingId=building.id;
 const category=await db.category.create({data:{name:prefix}});categoryId=category.id;
 for(const role of ['STUDENT','TECHNICIAN','ADMIN']){
  const salt=randomBytes(16).toString('hex');const password=randomBytes(18).toString('base64url');
  const digest=scryptSync(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex');
  const user=await db.user.create({data:{name:`${prefix}-${role}`,email:`${prefix}-${role.toLowerCase()}@example.test`,role,credential:{create:{passwordHash:`scrypt-v1:${salt}:${digest}`}}}});users.push(user);
  const r=await fetch(new URL('/api/auth/login',base),{method:'POST',headers:{Origin:base.origin,'Content-Type':'application/json'},body:JSON.stringify({email:user.email,password})});check(r.status===200,'fixture login');cookies.set(user.id,r.headers.getSetCookie().find(c=>c.startsWith('bru_session=')).split(';')[0]);
 }
 const [student,tech,admin]=users;
 const create='/api/tickets/create',update='/api/technician/update-job',evaluate='/api/tickets/evaluate',assign='/api/admin/tickets/assign';
 const valid={title:' Test issue ',description:' Test description ',location:' Test room ',categoryId,buildingId,priority:'MEDIUM',latitude:0,longitude:0,images:[]};
 const fixture=await db.ticket.create({data:{ticketCode:prefix,title:'Fixture',description:'Fixture',reporterId:student.id,categoryId,buildingId,status:'IN_PROGRESS',assignments:{create:{technicianId:tech.id,assignedById:admin.id}}}});
 for(const body of ['{','null','[]','true'])await denied(create,student,body);
 await denied(create,student,valid,415,'text/plain');
 for(const patch of [{title:'  '},{title:123},{title:'x'.repeat(161)},{description:'x'.repeat(4001)},{location:'x'.repeat(241)},{priority:'ADMIN'},{categoryId:'1'},{categoryId:-1},{buildingId:0},{latitude:91},{longitude:181},{latitude:'0'},{latitude:null,longitude:3},{images:{}},{images:Array(5).fill('x')}])await denied(create,student,{...valid,...patch});
 await denied(create,student,{...valid,buildingId:2147483647},404);
 await denied(create,student,{...valid,categoryId:2147483647},404);
 const svg='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64');
 for(const img of ['https://example.test/photo.png',svg,'data:image/png;base64,bm90IGFuIGltYWdl','data:image/png;base64,%%%','javascript:alert(1)'])await denied(create,student,{...valid,images:[img]});
 const large='data:image/png;base64,'+Buffer.alloc(5*1024*1024+1).toString('base64');
 await denied(create,student,{...valid,images:[large]},413);
 await denied(evaluate,student,'x'.repeat(17000),413);
 const png=await sharp({create:{width:2500,height:1200,channels:3,background:'#987abc'}}).png().withMetadata({orientation:6}).toBuffer();
 const jpeg=await sharp(png).jpeg().toBuffer();const webp=await sharp(png).webp().toBuffer();
 await denied(create,student,{...valid,images:['data:image/png;base64,'+jpeg.toString('base64')]});
 const xssTitle='<img src=x onerror="document.body.dataset.validationXss=1">';
 const created=await request(create,student,{...valid,title:xssTitle,images:[['png',png],['jpeg',jpeg],['webp',webp]].map(([type,buffer])=>`data:image/${type};base64,${buffer.toString('base64')}`)});
 check(created.status===200,'valid images accepted');
 const saved=await db.ticket.findUnique({where:{id:created.json.ticket.id},include:{images:true}});
 check(saved.latitude===0&&saved.longitude===0,'zero coordinates preserved');check(saved.description==='Test description','text trimmed');check(saved.title===xssTitle,'markup preserved as plain data');check(saved.images.length===3,'all valid attachments saved');
 for(const image of saved.images){check(image.imageUrl.startsWith('data:image/webp;base64,'),'server stores regenerated webp');const metadata=await sharp(Buffer.from(image.imageUrl.split(',')[1],'base64')).metadata();check(Math.max(metadata.width,metadata.height)<=1920,'dimensions reduced');check(!metadata.exif&&!metadata.orientation,'metadata stripped');}
 for(const patch of [{status:'NOT_A_STATUS'},{status:{}},{note:'x'.repeat(2001)},{ticketId:[]},{afterImage:svg},{afterImage:'data:image/png;base64,bm90IGFuIGltYWdl'}])await denied(update,tech,{ticketId:fixture.id,status:'IN_PROGRESS',...patch});
 await denied(update,tech,{ticketId:'missing-ticket',status:'IN_PROGRESS'},404);
 const updated=await request(update,tech,{ticketId:fixture.id,status:'COMPLETED',afterImage:'data:image/png;base64,'+png.toString('base64')});check(updated.status===200,'valid after-image accepted');
 const after=await db.ticketImage.findFirst({where:{ticketId:fixture.id,imageType:'AFTER'}});check(after?.imageUrl.startsWith('data:image/webp;base64,'),'after image normalized');
 for(const patch of [{score:0},{score:6},{score:2.5},{score:'4'},{comment:{}},{comment:'x'.repeat(2001)},{ticketId:[]}])await denied(evaluate,student,{ticketId:fixture.id,score:4,...patch});
 for(const patch of [{priority:'BAD'},{adminNote:'x'.repeat(2001)},{technicianId:[]},{ticketId:[]}])await denied(assign,admin,{ticketId:fixture.id,technicianId:tech.id,priority:'MEDIUM',...patch});
 await denied(assign,admin,{ticketId:'missing-ticket',technicianId:tech.id},404);
 const formula='=SUM(1,2)';await db.ticket.update({where:{id:fixture.id},data:{title:formula}});
 const csvResponse=await fetch(new URL('/api/admin/export-excel',base),{headers:{Cookie:cookies.get(admin.id)}});const csv=await csvResponse.text();check(csv.includes('"\'=SUM(1,2)"'),'CSV formula prefixed as text');check(csvResponse.headers.get('cache-control')==='private, no-store','CSV not cached');
 await db.authLoginLimit.deleteMany({where:{key:`mutation:evaluate:${student.id}`}});
 for(let i=0;i<30;i++){const r=await request(evaluate,student,{ticketId:fixture.id,score:0});check(r.status===400,'invalid input still counted toward rate limit');}
 const limited=await request(evaluate,student,{ticketId:fixture.id,score:4});check(limited.status===429,'31st mutation rejected');check(!await db.evaluation.findUnique({where:{ticketId:fixture.id}}),'rate-limited evaluation not saved');
 console.log(`SUCCESS: ${checks} input, image, CSV and request-limit checks passed`);
}finally{
 const userIds=users.map(u=>u.id);const owned=await db.ticket.findMany({where:{reporterId:{in:userIds}},select:{id:true}});const ticketIds=owned.map(t=>t.id);
 await db.evaluation.deleteMany({where:{ticketId:{in:ticketIds}}});await db.ticket.deleteMany({where:{id:{in:ticketIds}}});
 await db.authLoginLimit.deleteMany({where:{OR:[...userIds.map(id=>({key:{endsWith:`:${id}`}})),{key:{in:users.map(u=>createHash('sha256').update(u.email).digest('hex'))}}]}});
 await db.user.deleteMany({where:{id:{in:userIds}}});if(categoryId)await db.category.delete({where:{id:categoryId}});if(buildingId)await db.building.delete({where:{id:buildingId}});await db.$disconnect();console.log('Validation fixtures removed');
}
