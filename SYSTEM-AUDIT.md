# ผลตรวจระบบ BRU Fondue

วันที่ตรวจ: 7 ตุลาคม 2026

## ขอบเขตและข้อสรุป
ตรวจหน้าแอปทุกเส้นทาง, API ทั้ง 6 จุด, components, โครงสร้างฐานข้อมูล, domain layer, การตั้งค่า, seed และเอกสารโครงการ พร้อมรัน production build, lint ทั้งโครงการ และ HTTP smoke checks แบบอ่านอย่างเดียวกับ production server ในเครื่อง

ระบบมีโครงงานแจ้งซ่อมครบเส้นทางหลัก แต่ยังเป็นต้นแบบสาธิต ไม่พร้อมเปิดใช้กับข้อมูลจริง เนื่องจากการยืนยันตัวตน สิทธิ์รายคำร้อง และความปลอดภัยของข้อมูลยังมีข้อบกพร่องสำคัญ

รอบนี้ตรวจและจัดทำรายงาน ไม่ได้แก้โปรแกรมหรือเขียนข้อมูลทดสอบลงฐานข้อมูล ไม่ได้ทดสอบการโจมตีในเบราว์เซอร์ ไม่ได้ทำ load test หรือ audit dependency CVE จึงไม่ใช่การรับรองความปลอดภัยครบทุกกรณี

## สิ่งที่มีแล้ว
- ผู้แจ้ง: เลือกหมวดหมู่ ระบุสถานที่ ปักหมุด/ใช้ GPS แนบรูป เลือกความเร่งด่วน ส่งคำร้อง และดูประวัติของตน
- ผู้ดูแล: แผนที่คำร้อง ตารางค้นหาและกรองบางสถานะ เลือกช่างและมอบหมายงาน
- ช่าง: รายการงานที่เคยมอบหมาย อัปเดตสถานะ บันทึกข้อความ และภาพหลังซ่อม
- คำร้อง: รายละเอียด รูปก่อน/หลัง ประวัติสถานะ และประเมินดาว
- รายงาน: สถิติบางส่วนจากฐานข้อมูล ส่งออก CSV และพิมพ์หน้าเว็บเป็น PDF
- ฐานข้อมูล: users/buildings/categories/tickets/images/assignments/status logs/evaluations; มี transaction ในการเขียนหลายตาราง
- UI: landing page ใหม่และ navigation ร่วม; หน้าภายในยังเป็นรูปแบบเดิม

## P0 — ต้องแก้ก่อนเปิดใช้กับข้อมูลจริง

### A01 ไม่มีการล็อกอินจริง และสามารถเลือกเป็นผู้ดูแลได้
หลักฐาน: lib/auth.ts:6–20; app/api/auth/switch/route.ts:5–24; components/Navbar.tsx ส่ง allUsers เข้า RoleSwitcher
- เชื่อถือรหัสผู้ใช้ใน cookie โดยไม่มี session ที่ตรวจสอบได้
- ไม่มี cookie จะเข้าสู่บัญชีนักศึกษาคนแรกโดยอัตโนมัติ
- API switch ไม่มีการตรวจผู้เรียกหรือจำกัดโหมด demo และคืนข้อมูล user
- cookie กำหนด httpOnly:false ไม่ระบุ secure/sameSite อย่างชัดเจน
ผลทดสอบ: ส่ง cookie ที่มีเพียง ID ของ admin แล้วเข้าหน้าจัดการได้จริง
สิ่งที่ต้องทำ: authentication/session จริง, ยกเลิก default student, logout/revocation, ปิด demo switching ใน production และส่งข้อมูลบัญชีให้ client เท่าที่จำเป็น
เกณฑ์ผ่าน: request ที่ไม่ยืนยันตัวตนถูกปฏิเสธ; ปลอม user ID แล้วใช้สิทธิ์ไม่ได้

### A02 หน้ารายละเอียดคำร้องและรายงานพิมพ์ไม่มีการจำกัดสิทธิ์ข้อมูล
หลักฐาน: app/tickets/[id]/page.tsx:32–54; app/admin/reports/pdf/page.tsx:7–22
ผลทดสอบ: ไม่มี cookie ก็อ่านเนื้อหารายงานรวมและรายละเอียดได้; นักศึกษาคนอื่นอ่านรายละเอียดคำร้องได้
ผลกระทบ: รายละเอียดปัญหา ภาพ ชื่อผู้แจ้ง รหัสนักศึกษา/อีเมล และเบอร์ติดต่ออาจเปิดเผยแก่ผู้ไม่เกี่ยวข้อง
สิ่งที่ต้องทำ: ตรวจ role + reporterId + active assignment ก่อนดึง/แสดงข้อมูล; รายงานเฉพาะ admin

### A03 แผนที่ผู้ดูแลประกอบ HTML จากข้อมูลผู้ใช้โดยไม่ escape
หลักฐาน: components/AdminCampusMap.tsx:92–125
ชื่อปัญหาและ URL ภาพถูกต่อเป็น HTML string เข้า bindPopup โดยตรง ทำให้มีช่องทาง stored XSS ในหน้าผู้ดูแล
ยืนยันจาก code path; ไม่ได้ฉีด payload หรือรันทดสอบโจมตี
สิ่งที่ต้องทำ: สร้าง DOM ด้วย textContent / safe attributes, ตรวจ image URL และหลีกเลี่ยง HTML string จากข้อมูลผู้ใช้

## P1 — สิทธิ์และความถูกต้องของงาน

### A04 ช่างแก้งานที่ไม่ได้รับมอบหมายได้
app/api/technician/update-job/route.ts:7–25 ตรวจแค่ role; ไม่ตรวจ assignment ของ ticket นั้น
หน้ารายละเอียดแสดงแผงช่างให้ช่างทุกคนเช่นกัน
แก้ด้วย active assignment authorization ฝั่ง server ทุกครั้ง

### A05 ใครที่ระบบถือว่าล็อกอินแล้วก็ประเมินหรือเขียนทับคะแนนคนอื่นได้
app/api/tickets/evaluate/route.ts:7–48 ไม่มี reporterId ownership check และใช้ upsert
components/TicketEvaluationCard.tsx รับ canEvaluate แต่ไม่ได้นำไปควบคุมการแสดงผลหรือส่งฟอร์ม
ต้องกำหนดเจ้าของสิทธิ์และนโยบายการแก้คะแนน พร้อมตรวจที่ API ไม่ใช่ซ่อนปุ่มอย่างเดียว

### A06 ไม่ควบคุมลำดับสถานะและวันที่จบงาน
update-job รับ status ใดก็ได้ ไม่มี allowlist หรือ state-transition rules; เปิดงานที่เสร็จกลับเป็นกำลังทำได้ และ resolvedAt ไม่ถูกล้าง; กดเสร็จซ้ำเปลี่ยนวันจบงาน
assign API เปลี่ยนงานเป็น IN_PROGRESS โดยไม่ตรวจสถานะก่อนหน้า แม้ UI ซ่อนปุ่มสำหรับงานเสร็จ
ต้องกำหนด state machine และจัดการ concurrent updates

### A07 จ่ายงานซ้ำ / เปลี่ยนช่างไม่ยุติมอบหมายเดิม
assign API สร้าง assignment ใหม่เสมอ; schema ไม่มี active/end marker หรือเงื่อนไขป้องกันซ้ำ
รายการช่างอ่าน assignment ทุกอัน ทำให้งานยังอยู่กับช่างเก่าและอาจซ้ำ; สถิติช่างนับ assignment ไม่ใช่งานไม่ซ้ำ
หน้ารายละเอียดและรายงานใช้ assignments[0] โดยไม่ orderBy ต่างจากหน้าจัดการที่เรียงใหม่สุดแล้ว
ต้องแยกประวัติการมอบหมายกับผู้รับผิดชอบปัจจุบัน

### A08 รหัสคำร้องอาจชนเมื่อส่งพร้อมกัน
app/api/tickets/create/route.ts:36 สร้างรหัสจาก count()+1 ก่อน transaction
คำร้องพร้อมกันอาจใช้รหัสเดียวกันและรายการหนึ่งล้มเหลวจาก unique constraint ไม่ใช่ถูกบันทึกซ้ำเงียบ ๆ
ต้องใช้ sequence/unique generator ที่รองรับ concurrency และ retry ตามเหมาะสม

### A09 ตรวจ input ฝั่ง server ไม่ครบ
- create API ตรวจเพียง truthiness: ไม่จำกัดความยาว/trim/type/priority/พิกัด/จำนวนภาพ และไม่จำกัด role เหมือนหน้า report
- evaluate ไม่บังคับ score เป็น integer number; ชนิดผิดอาจไปล้มที่ฐานข้อมูล
- IDs ที่ไม่ถูกต้องบางเส้นทางกลายเป็น 500 แทน 400/404
- ไม่มี application rate limit ในโค้ดที่ตรวจ
ต้องมี schema validation กลาง, body limits และ error responses ที่สม่ำเสมอ

### A10 ระบบรูปภาพยังเป็น Base64 ในฐานข้อมูล
TicketCreateForm จำกัด 4 รูปเฉพาะ client; API ไม่บังคับจำนวน/ขนาด/ชนิด/URL; TechnicianActionConsole ไม่จำกัดขนาด
ไม่ย่อภาพ ไม่มีสถานะรออ่านไฟล์หรือจัดการ FileReader error; กดส่งก่อนอ่านภาพจบอาจส่งไม่ครบ
ต้องมีการตรวจไฟล์ server-side, จำกัดขนาด, thumbnail และ storage ที่เหมาะสม พร้อมจัดการสิทธิ์เข้าถึง/การลบ

### A11 แผนที่ไม่ขยับตามปุ่มเลือกอาคาร
TicketCreateForm เปลี่ยน lat/lng แต่ LocationPickerMap ใช้ initialLat/initialLng เฉพาะตอน mount และ effect []
หมุดที่เห็นจึงอาจไม่ตรงกับพิกัดที่จะส่ง
ต้อง sync prop changes กับ marker/map/ข้อความพิกัด และทดสอบเปลี่ยนอาคารหลังเลื่อนหมุด

### A12 อาคารอ้างอิงอาจผิดเมื่อพิมพ์สถานที่เอง
selectedBuilding เริ่มที่อาคารแรก; การพิมพ์สถานที่หรือย้ายหมุดไม่ได้เปลี่ยนอาคารอ้างอิง
จึงนับสถิติแยกอาคารผิดได้ ต้องให้เลือกอาคารอย่างชัดเจนหรือมีค่าไม่ทราบอาคาร

### A13 UI แจ้งว่าส่ง LINE แล้ว แต่ไม่มีการส่งจริง
components/AdminTicketTable.tsx:115–117 แสดงข้อความสำเร็จ LINE โดยไม่มีผลส่งจาก API
lib/domain/patterns.ts LineNotificationObserver มีเพียง console.log และไม่พบการใช้งาน domain layer จาก app/components
ต้องแก้ข้อความก่อน และเชื่อมระบบส่งจริงพร้อมผลส่ง/การลองใหม่หากต้องการฟีเจอร์นี้

### A14 สถิติสำคัญไม่ใช่ค่าที่วัดจริง
app/admin/dashboard/page.tsx:182 แสดง <24 ชม. แบบตายตัว; ค่าเฉลี่ยไม่มีคะแนนใช้ 5.0 ทั้ง dashboard/รายงาน/รายช่าง
ต้องคำนวณจาก timestamp จริง แยก SLA target/เวลาตอบรับ/เวลาซ่อม และแสดงยังไม่มีข้อมูลเมื่อไม่มีคะแนน

### A15 CSV ยังขาดการป้องกันสูตรและ escaping ที่สม่ำเสมอ
app/api/admin/export-excel/route.ts:44–79 quote บางฟิลด์ แต่ไม่จัดการ spreadsheet formula prefix และบางฟิลด์ไม่ escape quotes
ต้องใช้ serializer กลางพร้อมป้องกัน formula injection; ทดสอบ comma, quote, newline และข้อความขึ้นต้นเป็นสูตร
ไม่ได้เปิดไฟล์โจมตีใน spreadsheet ระหว่างการตรวจ

## P2 — ฟังก์ชันที่ยังขาดหรือไม่สมบูรณ์

### A16 กระบวนการงานยังไม่มีหลายสถานะที่จำเป็น
ยังไม่พบ flow ปฏิเสธพร้อมเหตุผล/ยกเลิก/ส่งข้อมูลเพิ่ม/เปิดงานซ้ำ/ผู้แจ้งยืนยันรับงานแยกจากการให้คะแนน
REJECTED มีในคำอธิบาย schema แต่หลายหน้าตีความเป็น PENDING และ domain type ไม่รวมสถานะนี้
กำหนดนโยบายธุรกิจก่อนเพิ่ม ไม่จำเป็นต้องมีทุกสถานะหากไม่อยู่ในขอบเขตโครงการ

### A17 งานรออะไหล่มีเพียงสถานะและข้อความ
ไม่มีรายการอะไหล่ จำนวน ราคา ผู้อนุมัติ วันคาดว่าจะได้ หรือประวัติการจัดซื้อ
ถ้าจะใช้จัดการซ่อมจริงควรกำหนดว่าระบบนี้รับผิดชอบขั้นตอนใด และเชื่อมระบบอื่นอย่างไร

### A18 ไม่มีหน้าจัดการข้อมูลหลัก
ไม่พบ UI/API เพิ่มแก้ไขอาคาร หมวดหมู่ ผู้ใช้ ช่าง ความเชี่ยวชาญ หรือระงับบัญชี; ปัจจุบันมีข้อมูลจาก seed

### A19 ไม่มีระบบแจ้งเตือนและติดตามเกินกำหนดที่ใช้งานจริง
ไม่พบ notification center, unread state, การส่ง LINE/email จริง, background queue, overdue reminders หรือ SLA scheduler
โค้ด AutoCategoryAssignmentStrategy เลือกช่างคนแรก ไม่ได้ตรวจความเชี่ยวชาญ และยังไม่ถูกใช้ใน flow

### A20 การค้นหา/กรอง/แบ่งหน้าไม่ครบ
ตาราง admin กรองใน browser หลังดึงข้อมูลทั้งหมด; มี categoryFilter state แต่ไม่มีตัวเลือกเรียกเปลี่ยนค่า
ไม่มี tab WAITING_PARTS และไม่พบ filter ช่วงวัน/อาคาร/ช่าง/priority ที่ครบ; ประวัติผู้แจ้งและรายการช่างไม่มีการแบ่งหน้า
ควรค้นหา/กรอง/แบ่งหน้าที่ server และให้ export ใช้เงื่อนไขเดียวกับหน้าจอ

### A21 รายงานยังเป็นต้นแบบ
CSV ไม่ใช่ไฟล์ .xlsx; PDF เป็นหน้า HTML ที่ใช้ window.print
รายงานแสดงปีการศึกษา 2569 ตายตัว แต่ query ดึงทุกปี; ไม่มีตัวกรองช่วงเวลา
คำแนะนำ preventive maintenance ผูกกับลำดับหมวดหมู่ idx จึงอาจผิดเมื่อเปลี่ยนข้อมูล
WAITING_PARTS ใน PDF/map popup ถูกแสดงเป็นรอรับเรื่อง; REJECTED ไม่รองรับสม่ำเสมอ
Navbar ใหม่ยังไม่ซ่อนตอน print; ต้องตรวจ page breaks, หัวตารางหลายหน้า และขนาดกระดาษด้วย browser print จริง

### A22 หน้าภายในยังไม่ได้ redesign ทั้งระบบ
หน้า report, my-tickets, ticket detail, admin, technician ยังมี styles เดิมหลายชุด สีสถานะไม่สม่ำเสมอ ตัวอักษรเล็ก และ gradient/border หนา
ควรสร้าง shared Button/Input/Badge/Table/Dialog/Empty/Error components แล้วใช้ design tokens เดียวกัน
CTA แจ้งปัญหาใน navigation/landing ยังปรากฏแก่ admin/technician แม้หน้า report ไม่อนุญาตบทบาทเหล่านั้น

### A23 Accessibility และการจัดการข้อผิดพลาดยังไม่ครบ
ฟอร์มหลายช่องมี label ไม่ผูก htmlFor/id; category/status buttons ไม่ประกาศ selection ให้ screen reader
หน้าต่างมอบหมายงานไม่มี dialog semantics/focus trap/Escape handling; ปุ่มปิดบางจุดไม่มี accessible name
หลายจุดใช้ alert; RoleSwitcher ล้มเหลวเงียบเมื่อ HTTP ไม่สำเร็จ
ไม่พบ app error.tsx/loading.tsx/not-found.tsx เฉพาะผลิตภัณฑ์; มีเพียง dynamic-map loading และ default Next error/not-found
ต้องตรวจ keyboard, contrast, 200% zoom และ responsive ด้วย browser จริงเพิ่มเติม

### A24 ยังไม่มี draft/แก้คำร้อง/สนทนาติดตาม
ผู้แจ้งไม่มีแก้ไข/ยกเลิกคำร้องจาก UI, บันทึกร่าง, ส่งข้อความโต้ตอบหรือแนบรูปเพิ่มเติมหลังสร้าง
พิจารณาเพิ่มตามขั้นตอนใช้งานจริง โดยแยกข้อความที่ผู้แจ้งเห็นกับบันทึกภายใน

## P2 — โครงสร้างและความพร้อมดูแลระบบ

### A25 ยังไม่มี automated tests หรือ CI ที่พบใน repository
ไม่พบ test files/scripts, Playwright/Vitest config หรือ CI workflows จากการสำรวจไฟล์
ต้องมี authorization matrix, lifecycle, concurrency, upload validation และ end-to-end ของทุกบทบาทก่อน release

### A26 lint ทั้งโครงการไม่ผ่าน
17 errors / 58 warnings; ส่วนใหญ่ JSX quotes, explicit any, unused symbols, hook dependencies และ image warnings
ดู audit-lint.log; targeted lint ของหน้าที่ออกแบบใหม่ผ่านในรอบก่อน ไม่ได้หมายความว่าทั้งโครงการผ่าน

### A27 migration/backup/restore/deployment ยังไม่เป็นระบบใน repository
มี schema และ SQLite dev.db แต่ไม่พบ migration history, backup/restore scripts หรือ runbook
SQLite ไม่ใช่ปัญหาโดยตัวมันเอง แต่ต้องกำหนด persistent storage, concurrency/load targets และการสำรองข้อมูลให้เหมาะกับโฮสต์จริง
schema ใช้ตำแหน่ง dev.db ตายตัว; .gitignore ไม่ยกเว้นไฟล์ฐานข้อมูล
สถานะโครงสร้างพื้นฐานภายนอกไม่สามารถยืนยันจาก repository นี้

### A28 seed ล้างข้อมูลทั้งหมดโดยไม่มี environment guard
prisma/seed.ts:9–16 deleteMany ทุกตารางก่อนสร้างตัวอย่าง
ต้องแยก seed สำหรับ dev อย่างชัดเจน ป้องกันชี้ไป production และมีแผนสำรองก่อน migration
ไม่ได้รัน seed ในการตรวจครั้งนี้

### A29 monitoring และนโยบายข้อมูลยังไม่ปรากฏในโครงการ
มี console logging และ status logs จริง แต่ยังไม่พบ error monitoring/health endpoint/notification delivery logs/audit การเข้าใช้หรือ export
ยังไม่พบหน้าความเป็นส่วนตัว ขั้นตอนกำหนดระยะเก็บรูป/ข้อมูลหรือการลบข้อมูลตามนโยบายองค์กร
ข้อสังเกตนี้เป็นช่องว่างของผลิตภัณฑ์และการดำเนินงาน ไม่ใช่ข้อวินิจฉัยการปฏิบัติตามกฎหมาย

### A30 เอกสารและ domain code ไม่สอดคล้องกับระบบจริง
README ยังเป็นค่าเริ่มต้น Next.js ไม่มีวิธีตั้ง DB/seed/accounts/deploy/test/backup
Domain OOP/Factory/Observer/SLA/Strategy เป็นตัวอย่างที่ไม่เชื่อม API จริง จึงยังไม่นับเป็นฟีเจอร์ที่เสร็จ
ต้องลด logic ซ้ำและรวม status/priority/authorization/metrics ในส่วนกลาง

## ผลตรวจการรัน
| การตรวจ | ผล |
|---|---|
| Production build และ TypeScript ระหว่าง build | ผ่าน |
| ESLint ทั้งโครงการ | ไม่ผ่าน: 17 errors, 58 warnings |
| GET / | 200 |
| GET /report ไม่มี cookie | 200 และพบฟอร์มแจ้งซ่อม |
| GET /admin/reports/pdf ไม่มี cookie | 200 และพบรายงานรวม — ไม่ควรอนุญาต |
| GET /admin/tickets ไม่มี cookie | 200 แต่เป็นหน้าปฏิเสธสิทธิ์ ไม่ได้แสดงตาราง admin |
| GET /api/admin/export-excel ไม่มี cookie | 403 — role guard มีผลในกรณีนี้ |
| GET /admin/tickets ใช้ unsigned user-ID cookie ของ admin | 200 และพบหน้าจัดการ — ยืนยัน auth bypass |
| GET /tickets/[id] ไม่มี cookie | 200 และพบรายละเอียด/timeline |
| GET /tickets/[id] cookie ของนักศึกษาคนอื่น | 200 และพบรายละเอียด/timeline |

HTTP checks อ่านข้อมูลเท่านั้น ไม่เรียก API ที่สร้างคำร้อง จ่ายงาน อัปเดตสถานะ หรือประเมิน

## ลำดับงานแนะนำ
1. ปิดช่อง auth/สิทธิ์/แผนที่ HTML และการเปิดเผยข้อมูลก่อน
2. แก้ state transitions, assignment, evaluation ownership, validation, ticket numbering และไฟล์แนบ
3. แก้พิกัด/อาคาร/สถิติ/ข้อความ LINE เพื่อให้ข้อมูลที่แสดงตรงความจริง
4. เติมฟังก์ชันที่ตกลงในขอบเขต: จัดการข้อมูลหลัก, notification, lifecycle, filters และรายงาน
5. ใช้ design system ให้ครบหน้าภายใน พร้อม accessibility และ browser QA
6. ทำ automated tests, CI, migrations, backup/restore, monitoring และคู่มือติดตั้ง

เกณฑ์ release ขั้นต่ำ: P0/P1 ปิดครบ, role/ownership tests ผ่าน, end-to-end ทุกบทบาทผ่าน, metrics ตรงข้อมูล, restore จาก backup ได้ และระบุขอบเขตฟีเจอร์สาธิตอย่างชัดเจน
