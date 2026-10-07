import assert from 'node:assert/strict';
import {reportFilter,reportMetrics} from '../lib/reporting.ts';
import {validCoordinates} from '../lib/coordinates.ts';
let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++;};
const f=reportFilter({from:'2026-10-08',to:'2026-10-08',status:'WAITING_PARTS',buildingId:'2'});
check(f.where.createdAt.gte.toISOString()==='2026-10-07T17:00:00.000Z','Thai start');check(f.where.createdAt.lt.toISOString()==='2026-10-08T17:00:00.000Z','Thai exclusive end');
for(const params of [{from:'2026-02-30'},{from:'2026-11-01',to:'2026-10-01'},{status:'BOGUS'},{buildingId:'-1'},{categoryId:'1.5'},{status:['PENDING','COMPLETED']}]){assert.throws(()=>reportFilter(params));checks++;}
const createdAt=new Date('2026-10-01T00:00:00Z');const ticket=(hours,score)=>({status:'COMPLETED',createdAt,resolvedAt:hours===null?null:new Date(createdAt.getTime()+hours*3600000),evaluation:score===null?null:{score}});
const m=reportMetrics([ticket(12,2),ticket(36,4),ticket(null,null),ticket(-1,null)]);check(m.avgHours==='24.0' && m.durationCount===2,'exclude missing and negative durations');check(m.avgRating==='3.0' && m.ratedCount===2,'actual score');check(reportMetrics([]).avgRating==='ยังไม่มีคะแนน','no invented score');check(reportMetrics([]).avgHours===null,'no invented time');check(validCoordinates(0,0),'zero coords valid');check(!validCoordinates(null,103),'missing coords invalid');check(!validCoordinates(NaN,103),'NaN invalid');check(!validCoordinates(91,103),'bounds');console.log(`SUCCESS ${checks} reporting unit checks`);
