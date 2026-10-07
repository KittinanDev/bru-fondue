import assert from 'node:assert/strict';
import { randomUUID, randomBytes, scryptSync, createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
const base = new URL(process.env.TEST_BASE_URL || 'http://127.0.0.1:3107');
if (!['127.0.0.1','localhost'].includes(base.hostname)) throw new Error('Local server required');
const db = new PrismaClient();
const prefix = `auth-test-${randomUUID()}`;
const users = [];
const emails = [];
let checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;console.log(`PASS ${label}`);};
const hash=(value)=>createHash('sha256').update(value).digest('hex');
async function req(path,{cookie,body,origin=base.origin,method}={}) {
 const res=await fetch(new URL(path,base),{method:method||(body?'POST':'GET'),redirect:'manual',headers:{Origin:origin,...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const text=await res.text();
 let json;try{json=JSON.parse(text)}catch{}
 return {status:res.status,text,json,headers:res.headers,cookie:res.headers.getSetCookie().find(c=>c.startsWith('bru_session='))?.split(';')[0]};
}
async function makeUser(role, credential=true) {
 const email=`${prefix}-${users.length}@example.test`;emails.push(email);
 const password=randomBytes(18).toString('base64url');
 const salt=randomBytes(16).toString('hex');
 const digest=scryptSync(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024}).toString('hex');
 const user=await db.user.create({data:{name:email,email,role,...(credential?{credential:{create:{passwordHash:`scrypt-v1:${salt}:${digest}`}}}:{})}});
 users.push(user.id);return {...user,password};
}
try {
 const student=await makeUser('STUDENT');
 const admin=await makeUser('ADMIN');
 const tech=await makeUser('TECHNICIAN');
 const staff=await makeUser('STAFF');
 const superadmin=await makeUser('SUPERADMIN');
 const noPassword=await makeUser('STUDENT',false);
 const disabled=await makeUser('STUDENT');
 await db.authCredential.update({where:{userId:disabled.id},data:{disabledAt:new Date()}});
 for(const page of ['/report','/my-tickets','/admin/tickets','/admin/dashboard','/admin/reports/pdf','/technician/jobs','/tickets/unknown']) {
  const r=await req(page);check(r.status===307&&r.headers.get('location')?.startsWith('/login?next='),`anonymous ${page} redirects to login`);
 }
 for(const cookie of [`bru_auth_user_id=${admin.id}`,`bru_session=${admin.id}`,`bru_session=${'a'.repeat(64)}`]) {
  const r=await req('/admin/tickets',{cookie});check(r.status===307,'forged/legacy cookie rejected');
 }
 const root=await req('/');check(!root.text.includes(student.id)&&!root.text.includes(admin.email),'anonymous homepage does not serialize account directory');
 check((await req('/api/auth/switch',{body:{userId:admin.id}})).status===410,'demo switch permanently disabled');
 check((await req('/api/tickets/create',{body:{}})).status===401,'anonymous create rejected');
 check((await req('/api/tickets/evaluate',{body:{}})).status===401,'anonymous evaluate rejected');
 check((await req('/api/technician/update-job',{body:{}})).status===401,'anonymous update rejected');
 const bad=await req('/api/auth/login',{body:{email:student.email,password:'wrong-password'}});
 const unknownEmail=`${prefix}-unknown@example.test`;emails.push(unknownEmail);
 const unknown=await req('/api/auth/login',{body:{email:unknownEmail,password:'wrong-password'}});
 check(bad.status===401&&unknown.status===401&&bad.json.error===unknown.json.error,'wrong and unknown credentials return same error');
 check(!bad.cookie&&!unknown.cookie,'failed login creates no session cookie');
 for(const user of [disabled,noPassword]) check((await req('/api/auth/login',{body:{email:user.email,password:user.password}})).status===401,'disabled/unprovisioned account denied');
 check((await req('/api/auth/login',{body:{email:student.email,password:student.password},origin:'https://unrelated.example'})).status===403,'cross-origin login blocked');
 check((await req('/api/auth/login',{body:{email:student.email,password:student.password},origin:''})).status===403,'missing-origin login blocked');
 check((await req('/api/auth/login',{body:{email:student.email,password:'a'.repeat(5000)}})).status===400,'oversized login body rejected');
 for(const [user,path] of [[student,'/my-tickets'],[staff,'/my-tickets'],[tech,'/technician/jobs'],[admin,'/admin/tickets'],[superadmin,'/admin/tickets']]) {
  const r=await req('/api/auth/login',{body:{email:user.email.toUpperCase(),password:user.password,role:'SUPERADMIN'}});
  check(r.status===200&&r.json.redirectTo===path,`${user.role} login uses database role and normalized email`);
  check(!!r.cookie,'successful login sets session');
  check(!r.text.includes('passwordHash')&&!r.text.includes(user.password),'login response contains no credential');
  const page=await req(path,{cookie:r.cookie});check(page.status===200,`${user.role} workspace accessible`);
 }
 const login=await req('/api/auth/login',{body:{email:student.email,password:student.password,next:'/report'}});
 check(login.json.redirectTo==='/report','safe return path preserved');
 const setCookie=login.headers.getSetCookie().find(c=>c.startsWith('bru_session='));
 check(setCookie.includes('HttpOnly')&&/SameSite=lax/i.test(setCookie)&&setCookie.includes('Max-Age=28800'),'session cookie HttpOnly SameSite and eight-hour expiry');
 const token=login.cookie.split('=')[1];
 check(token.length===64&&!token.includes(student.id),'session token is random, not user ID');
 const stored=await db.authSession.findUnique({where:{tokenHash:hash(token)}});
 check(stored?.userId===student.id&&stored.tokenHash!==token,'database stores only session hash');
 check((await req('/api/auth/logout',{method:'POST',cookie:login.cookie,origin:'https://unrelated.example'})).status===403,'cross-origin logout blocked');
 check((await req('/my-tickets',{cookie:login.cookie})).status===200,'rejected logout leaves session intact');
 const rotated=await req('/api/auth/login',{cookie:login.cookie,body:{email:student.email,password:student.password,next:'//unrelated.example'}});
 check(rotated.json.redirectTo==='/my-tickets','external return URL rejected');
 check(rotated.cookie!==login.cookie,'relogin rotates session token');
 check((await req('/my-tickets',{cookie:login.cookie})).status===307,'previous session revoked on relogin');
 check((await req('/api/admin/tickets/assign',{cookie:rotated.cookie,body:{ticketId:'missing',technicianId:tech.id}})).status===403,'student remains unable to dispatch');
 check((await req('/api/admin/export-excel',{cookie:rotated.cookie})).status===403,'student remains unable to export');
 const logout=await req('/api/auth/logout',{method:'POST',cookie:rotated.cookie});
 check(logout.status===200&&logout.headers.getSetCookie().some(c=>c.includes('Max-Age=0')),'logout clears cookie');
 check((await req('/my-tickets',{cookie:rotated.cookie})).status===307,'replaying logged-out cookie rejected');
 const expiring=await req('/api/auth/login',{body:{email:student.email,password:student.password}});
 await db.authSession.update({where:{tokenHash:hash(expiring.cookie.split('=')[1])},data:{expiresAt:new Date(Date.now()-1000)}});
 check((await req('/my-tickets',{cookie:expiring.cookie})).status===307,'expired session rejected');
 const disableSession=await req('/api/auth/login',{body:{email:student.email,password:student.password}});
 await db.authCredential.update({where:{userId:student.id},data:{disabledAt:new Date()}});
 check((await req('/my-tickets',{cookie:disableSession.cookie})).status===307,'disabling account blocks existing session');
 const limitEmail=`${prefix}-limited@example.test`;emails.push(limitEmail);
 for(let i=0;i<5;i++) check((await req('/api/auth/login',{body:{email:limitEmail,password:'wrong-password'}})).status===401,`failed attempt ${i+1}`);
 const limited=await req('/api/auth/login',{body:{email:limitEmail,password:'wrong-password'}});
 check(limited.status===429&&limited.headers.has('retry-after'),'sixth attempt blocked by persisted rate limit');
 await db.authLoginLimit.update({where:{key:hash(limitEmail)},data:{resetsAt:new Date(Date.now()-1000)}});
 check((await req('/api/auth/login',{body:{email:limitEmail,password:'wrong-password'}})).status===401,'attempt limit resets after cooldown');
 console.log(`SUCCESS: ${checks} authentication checks passed`);
} finally {
 await db.user.deleteMany({where:{id:{in:users}}});
 await db.authLoginLimit.deleteMany({where:{key:{in:emails.map(hash)}}});
 await db.$disconnect();
 console.log('Authentication fixtures removed');
}
