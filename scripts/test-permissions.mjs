// Run only against this workspace's local production server (npm run start -- --port 3107).
// Creates uniquely named fixtures and deletes only those fixtures in finally.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, scryptSync, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const base = new URL(process.env.TEST_BASE_URL || 'http://127.0.0.1:3107');
if (!['127.0.0.1', 'localhost'].includes(base.hostname)) throw new Error('Local test server required');
const db = new PrismaClient();
const prefix = `permission-test-${randomUUID()}`;
const userIds = [];
const emails = [];
const sessions = new Map();
const ticketIds = [];
let buildingId;
let categoryId;
let checks = 0;
const check = (condition, label) => { assert.ok(condition, label); checks++; console.log(`PASS ${label}`); };

async function request(path, user, body) {
  const response = await fetch(new URL(path, base), {
    method: body ? 'POST' : 'GET',
    headers: { Origin: base.origin, ...(user ? { Cookie: sessions.get(user.id) } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, text: await response.text() };
}
async function snapshot(id) {
  return JSON.stringify(await db.ticket.findUnique({where:{id},include:{images:true,statusLogs:true,evaluation:true}}));
}
async function deniedUpdate(ticket, user, expected = 403) {
  const before = await snapshot(ticket.id);
  const result = await request('/api/technician/update-job', user, {ticketId:ticket.id,status:'COMPLETED',note:'Must not persist',afterImage:'must-not-persist'});
  check(result.status === expected, `update denied for ${user.role}`);
  check(await snapshot(ticket.id) === before, 'denied update does not change ticket, images or logs');
}
async function deniedEvaluation(ticket, user, expected = 403) {
  const before = await snapshot(ticket.id);
  const result = await request('/api/tickets/evaluate', user, {ticketId:ticket.id,score:1,comment:'Must not persist'});
  check(result.status === expected, `evaluation denied for ${user.role}`);
  check(await snapshot(ticket.id) === before, 'denied evaluation does not change score or logs');
}

try {
  await fetch(base);
  const building = await db.building.create({data:{name:prefix,code:prefix}}); buildingId = building.id;
  const category = await db.category.create({data:{name:prefix}}); categoryId = category.id;
  const roles = ['STUDENT','STUDENT','STAFF','TECHNICIAN','TECHNICIAN','ADMIN','SUPERADMIN'];
  const users = [];
  for (let i=0;i<roles.length;i++) {
    const email = `${prefix}-${i}@example.test`;
    emails.push(email);
    const password = randomBytes(18).toString('base64url');
    const salt = randomBytes(16).toString('hex');
    const hash = scryptSync(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex');
    const user = await db.user.create({data:{name:`${prefix}-user-${i}`,role:roles[i],email,credential:{create:{passwordHash:`scrypt-v1:${salt}:${hash}`}}}});
    userIds.push(user.id);
    const login = await fetch(new URL('/api/auth/login',base),{method:'POST',headers:{Origin:base.origin,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    assert.equal(login.status,200,'fixture login');
    sessions.set(user.id,login.headers.getSetCookie().find(c=>c.startsWith('bru_session=')).split(';')[0]);
    users.push(user);
  }
  const [owner,other,staff,oldTech,currentTech,admin,superadmin] = users;
  const makeTicket = async (reporter, status) => {
    const ticket = await db.ticket.create({data:{ticketCode:`${prefix}-ticket-${ticketIds.length}`,title:`${prefix}-private`,description:'Temporary permission test',reporterId:reporter.id,buildingId,categoryId,status}});
    ticketIds.push(ticket.id); return ticket;
  };
  const active = await makeTicket(owner,'IN_PROGRESS');
  const complete = await makeTicket(owner,'COMPLETED');
  const staffComplete = await makeTicket(staff,'COMPLETED');
  const pending = await makeTicket(owner,'PENDING');
  for (const ticket of [active,complete]) {
    await db.ticketAssignment.create({data:{ticketId:ticket.id,technicianId:oldTech.id,assignedById:admin.id,assignedAt:new Date('2026-01-01T00:00:00Z')}});
    await db.ticketAssignment.create({data:{ticketId:ticket.id,technicianId:currentTech.id,assignedById:admin.id,assignedAt:new Date('2026-01-02T00:00:00Z')}});
  }
  for (const user of [owner,currentTech,admin,superadmin]) {
    const result = await request(`/tickets/${active.id}`,user);
    check(result.text.includes(active.ticketCode), `${user.role} can read authorized ticket`);
  }
  for (const user of [other,staff,oldTech]) {
    const result = await request(`/tickets/${active.id}`,user);
    check(result.text.includes('คุณไม่มีสิทธิ์เข้าถึงหน้านี้'), `${user.role} sees access denial`);
    check(!result.text.includes(active.ticketCode) && !result.text.includes(active.description), 'private ticket content absent from entire response');
  }
  const oldJobs = await request('/technician/jobs',oldTech);
  const currentJobs = await request('/technician/jobs',currentTech);
  check(!oldJobs.text.includes(active.ticketCode), 'old technician no longer lists reassigned job');
  check(currentJobs.text.includes(active.ticketCode), 'current technician lists job');

  for (const user of [owner,other,staff,oldTech,currentTech]) {
    const result = await request('/admin/reports/pdf',user);
    check(result.text.includes('คุณไม่มีสิทธิ์เข้าถึงหน้านี้') && !result.text.includes(active.ticketCode), `${user.role} denied report content`);
  }
  for (const user of [admin,superadmin]) {
    const result = await request('/admin/reports/pdf',user);
    check(result.text.includes(active.ticketCode), `${user.role} can read report`);
  }
  for (const user of [owner,other,staff,oldTech]) await deniedUpdate(active,user);
  await deniedUpdate(pending,currentTech);
  for (const user of [currentTech,admin,superadmin]) {
    const result = await request('/api/technician/update-job',user,{ticketId:active.id,status:'IN_PROGRESS',note:'Authorized fixture update'});
    check(result.status===200, `${user.role} can update authorized job`);
    const log = await db.ticketStatusLog.findFirst({where:{ticketId:active.id,changedById:user.id}});
    check(!!log, 'authorized update records actor');
  }
  for (const user of [other,staff,currentTech,admin,superadmin]) await deniedEvaluation(complete,user);
  await deniedEvaluation(pending,owner,400);
  const adminDetail = await request(`/tickets/${complete.id}`,admin);
  check(!adminDetail.text.includes('ยืนยันผลการตรวจรับงานและส่งคะแนนประเมิน'), 'admin cannot see evaluation submit button');
  const ownerDetail = await request(`/tickets/${complete.id}`,owner);
  check(ownerDetail.text.includes('ยืนยันผลการตรวจรับงานและส่งคะแนนประเมิน'), 'owner sees evaluation form');
  for (const [ticket,user] of [[complete,owner],[staffComplete,staff]]) {
    const result = await request('/api/tickets/evaluate',user,{ticketId:ticket.id,score:4,comment:'Fixture evaluation'});
    check(result.status===200, `${user.role} owner can evaluate completed ticket`);
    const evaluation = await db.evaluation.findUnique({where:{ticketId:ticket.id}});
    check(evaluation?.reporterId===user.id && evaluation.score===4, 'evaluation has correct owner and score');
    await deniedEvaluation(ticket,user,409);
  }
  for (const user of [admin,superadmin,currentTech]) {
    const count = await db.ticket.count();
    const result = await request('/api/tickets/create',user,{title:'Not allowed'});
    check(result.status===403 && await db.ticket.count()===count, `${user.role} cannot create reporter ticket`);
  }
  console.log(`SUCCESS: ${checks} checks passed`);
} finally {
  // Delete precisely the UUID-backed fixtures created in this run, never seed/reset the database.
  await db.evaluation.deleteMany({where:{ticketId:{in:ticketIds}}});
  await db.ticket.deleteMany({where:{id:{in:ticketIds}}});
  await db.authLoginLimit.deleteMany({where:{OR:userIds.map(id=>({key:{startsWith:"mutation:",endsWith:`:${id}`}}))}});
  await db.user.deleteMany({where:{id:{in:userIds}}});
  await db.authLoginLimit.deleteMany({where:{key:{in:emails.map(email=>createHash('sha256').update(email).digest('hex'))}}});
  if (categoryId) await db.category.delete({where:{id:categoryId}});
  if (buildingId) await db.building.delete({where:{id:buildingId}});
  await db.$disconnect();
  console.log('Temporary fixtures removed');
}




