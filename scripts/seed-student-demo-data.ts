import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

const students = [
  ["670112418001", "นายภรวิชญ์ ธรรมมา"],
  ["670112418002", "นายกิตตินันท์ ศิริยะ"],
  ["670112418003", "นายไกรตะวัน ออมโรสง"],
  ["670112418004", "นายจิรายุ เสงี่ยมศักดิ์"],
  ["670112418005", "นายเฉลิมวงศ์ ศรีเมาศ"],
  ["670112418006", "นายชนนันท์ ช้างทรัพย์"],
  ["670112418007", "นายณัฐกรณ์ ศรีวัน"],
  ["670112418008", "นายณัฐวุฒิ บุญประโคน"],
  ["670112418009", "นายทศพล ใยดี"],
  ["670112418010", "นายธนิตพงศ์ โภคภาพาณิชย์สกุล"],
  ["670112418011", "นายธีรเทพ ชัยวิทูอนุกุล"],
  ["670112418012", "นายธีรินทร์ จันทร์ประโคน"],
  ["670112418013", "นายปฏิพัทธ์ โพธิ์ศรีดี"],
  ["670112418014", "นายปริญญา กระจ่างจิต"],
  ["670112418015", "นายพลพล ประทุมวงศ์"],
  ["670112418016", "นายพานเพชร พลคนนอก"],
  ["670112418017", "นายพีรภัทร ป๊อดตะมา"],
  ["670112418018", "นายภาคภูมิ สมสวย"],
  ["670112418019", "นายภูมภัส ชูกชม"],
  ["670112418020", "นายรณกร ผิวสุข"],
  ["670112418021", "นายวรธันย์ นะรินรัมย์"],
  ["670112418022", "นายวีรพงศ์ วสุงคคาพจน์"],
  ["670112418023", "นายสรวิชญ์ แพงเจริญ"],
  ["670112418024", "นายสุจิวักรณ์ ทองเปรียบ"],
  ["670112418025", "นายอดิศร นนศิริ"],
  ["670112418026", "นายอริยะ การเพียร"],
  ["670112418027", "นายอานันดา สะอาดรัมย์"],
  ["670112418028", "นางสาวณัฐรดา จุฬาลี"],
  ["670112418029", "นางสาวนันทกานต์ สีนาคสุข"],
  ["670112418030", "นางสาวเพียงตา จันทร์ประโคน"],
  ["670112418031", "นางสาวสุวรรณา ศรีประชัย"],
  ["670112418032", "นายกิตติทัต สมบุตร"],
  ["670112418033", "นายกิตติศักดิ์ ดิมอนรัมย์"],
  ["670112418034", "นายขุมทรัพย์ เจริญยิ่ง"],
  ["670112418035", "นายจิรวัฒน์ มีชำนาญ"],
  ["670112418036", "นายชนสิทธิ์ คมประโคน"],
  ["670112418037", "นายณัฏฐกิตติ์ รุ่งโรโคก"],
  ["670112418038", "นายณัฐปศส์ งามประโคน"],
  ["670112418039", "นายอนุสรณ์ สุดตาชาย"],
  ["670112418040", "นายทีปกร สุทาบุญ"],
  ["670112418041", "นายธัญเทพ สุนทอง"],
  ["670112418042", "นายธีระเดช จะแรดรัมย์"],
  ["670112418043", "นายบุญยชน เกรัมย์"],
  ["670112418044", "นายปณชัย ศรีรุ่ง"],
  ["670112418045", "นายปยวัฒน์ ป้องกัน"],
  ["670112418046", "นายพัชรพล กมลวิจิตร"],
  ["670112418047", "นายพีรพัฒน์ แข็ง"],
  ["670112418048", "นายภัคพล แก้วศิลา"],
  ["670112418049", "นายภาณุพงศ์ ศิลาจันทร์"],
  ["670112418050", "นายยุทธกรณ์ แข่นประโคน"],
] as const;

const issueSubjects = [
  ["หลอดไฟกะพริบบริเวณหน้าห้อง", "หลอดไฟกะพริบต่อเนื่องและแสงสว่างไม่เพียงพอในช่วงเย็น"],
  ["ปลั๊กไฟใช้งานไม่ได้", "เสียบอุปกรณ์แล้วไม่มีไฟและพบว่าหน้ากากปลั๊กเริ่มหลวม"],
  ["สวิตช์ไฟกดไม่ติด", "สวิตช์ไฟไม่ตอบสนองและต้องกดซ้ำหลายครั้ง"],
  ["เครื่องปรับอากาศไม่เย็น", "เปิดเครื่องปรับอากาศแล้วมีแต่ลมและอุณหภูมิห้องไม่ลดลง"],
  ["เครื่องปรับอากาศมีน้ำหยด", "มีน้ำหยดจากตัวเครื่องลงบริเวณโต๊ะเรียนเมื่อเปิดใช้งาน"],
  ["เครื่องปรับอากาศมีเสียงดัง", "ตัวเครื่องมีเสียงสั่นผิดปกติรบกวนการเรียนการสอน"],
  ["ก๊อกน้ำปิดไม่สนิท", "น้ำไหลตลอดแม้ปิดก๊อกจนสุดและพื้นเริ่มเปียก"],
  ["ท่อน้ำใต้อ่างรั่ว", "พบน้ำซึมจากข้อต่อใต้อ่างล้างมือทำให้พื้นลื่น"],
  ["ชักโครกกดน้ำไม่ลง", "กดชำระแล้วน้ำระบายช้าและมีระดับน้ำสูงกว่าปกติ"],
  ["โปรเจกเตอร์ไม่แสดงภาพ", "เปิดโปรเจกเตอร์ได้แต่ไม่พบสัญญาณภาพจากคอมพิวเตอร์"],
  ["สาย HDMI ส่งสัญญาณไม่เสถียร", "ภาพบนจอขาดหายเมื่อขยับสายเชื่อมต่อ"],
  ["ไมโครโฟนไม่มีเสียง", "เครื่องรับสัญญาณทำงานแต่ไม่มีเสียงออกจากลำโพง"],
  ["โต๊ะเรียนโยกและขาไม่มั่นคง", "ขาโต๊ะด้านหนึ่งหลวมและอาจเกิดอันตรายระหว่างใช้งาน"],
  ["เก้าอี้พนักพิงแตก", "พนักพิงแตกร้าวและไม่ปลอดภัยสำหรับนั่งเรียน"],
  ["ลูกบิดประตูหลวม", "ลูกบิดหมุนฟรีและล็อกประตูไม่ได้ตามปกติ"],
  ["บานหน้าต่างปิดไม่สนิท", "หน้าต่างมีช่องว่างและมีน้ำฝนสาดเข้าห้อง"],
  ["กระเบื้องพื้นแตกร้าว", "กระเบื้องยกตัวและมีขอบคมเสี่ยงต่อการสะดุด"],
  ["พัดลมระบายอากาศไม่ทำงาน", "พัดลมไม่หมุนและภายในห้องอากาศถ่ายเทไม่สะดวก"],
  ["ไฟทางเดินดับ", "บริเวณทางเดินมืดหลายจุดและไม่ปลอดภัยในช่วงกลางคืน"],
  ["ฝ้าเพดานมีรอยน้ำซึม", "พบคราบน้ำขยายตัวหลังฝนตกและมีหยดน้ำเป็นบางครั้ง"],
] as const;

const rooms = ["1501", "1502", "1503", "2201", "2203", "2205", "2401", "2403", "ห้องประชุม 1", "โถงชั้นล่าง"];
const statuses = ["PENDING", "PENDING", "IN_PROGRESS", "IN_PROGRESS", "WAITING_PARTS", "COMPLETED"];
const priorities = ["LOW", "MEDIUM", "MEDIUM", "HIGH", "URGENT"];

async function main() {
  const completedDemoTickets = await prisma.ticket.count({
    where: { ticketCode: { startsWith: "BRU-DEMO-" } },
  });
  if (completedDemoTickets >= students.length) {
    console.log(`ชุดข้อมูลสาธิตมีครบ ${completedDemoTickets} รายการแล้ว ข้ามการนำเข้า`);
    return;
  }

  const [buildings, categories, admin, technicians] = await Promise.all([
    prisma.building.findMany({ orderBy: { id: "asc" } }),
    prisma.category.findMany({ orderBy: { id: "asc" } }),
    prisma.user.findFirst({ where: { role: "ADMIN" } }),
    prisma.user.findMany({ where: { role: "TECHNICIAN" }, orderBy: { id: "asc" } }),
  ]);
  if (!buildings.length || !categories.length) throw new Error("ต้องมีข้อมูลอาคารและหมวดหมู่ก่อนนำเข้าข้อมูลจำลอง");

  const passwordHash = await hashPassword("changeme123");
  let createdUsers = 0;
  let createdTickets = 0;

  for (let index = 0; index < students.length; index++) {
    const [studentId, name] = students[index];
    const email = `${studentId}@bru.ac.th`;
    const existing = await prisma.user.findUnique({ where: { email } });
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, studentId, role: "STUDENT", faculty: "คณะวิทยาศาสตร์", department: "สาขาวิชาเทคโนโลยีสารสนเทศ" },
      create: { name, email, studentId, role: "STUDENT", faculty: "คณะวิทยาศาสตร์", department: "สาขาวิชาเทคโนโลยีสารสนเทศ" },
    });
    if (!existing) createdUsers++;
    await prisma.authCredential.upsert({
      where: { userId: user.id },
      update: { passwordHash, disabledAt: null },
      create: { userId: user.id, passwordHash },
    });

    const ticketCode = `BRU-DEMO-${studentId.slice(-3)}`;
    if (await prisma.ticket.findUnique({ where: { ticketCode } })) continue;

    const building = buildings[index % buildings.length];
    const category = categories[index % categories.length];
    const [subject, detail] = issueSubjects[index % issueSubjects.length];
    const room = rooms[index % rooms.length];
    const status = statuses[index % statuses.length];
    const ticket = await prisma.ticket.create({
      data: {
        ticketCode,
        title: `${subject} ห้อง ${room}`,
        description: `${detail} ผู้แจ้งตรวจพบระหว่างการใช้งานประจำวัน รายการจำลองลำดับที่ ${index + 1}`,
        status,
        priority: priorities[index % priorities.length],
        buildingId: building.id,
        floor: `ชั้น ${(index % 5) + 1}`,
        room,
        locationNote: `จุดตรวจหมายเลข ${(index % 12) + 1} ใกล้ทางเดินหลัก`,
        latitude: building.defaultLat ? building.defaultLat + ((index % 5) - 2) * 0.00003 : null,
        longitude: building.defaultLng ? building.defaultLng + ((index % 7) - 3) * 0.00003 : null,
        reporterId: user.id,
        categoryId: category.id,
        resolvedAt: status === "COMPLETED" ? new Date(Date.now() - index * 86_400_000) : null,
        createdAt: new Date(Date.now() - (50 - index) * 43_200_000),
      },
    });
    await prisma.ticketStatusLog.create({
      data: { ticketId: ticket.id, status: "PENDING", note: "ผู้ใช้ส่งคำร้องจำลองเข้าระบบ", changedById: user.id },
    });
    if (status !== "PENDING" && admin) {
      await prisma.ticketStatusLog.create({
        data: { ticketId: ticket.id, status, note: "อัปเดตสถานะสำหรับชุดข้อมูลสาธิต", changedById: admin.id },
      });
    }
    if (["IN_PROGRESS", "WAITING_PARTS", "COMPLETED"].includes(status) && admin && technicians.length) {
      await prisma.ticketAssignment.create({
        data: { ticketId: ticket.id, technicianId: technicians[index % technicians.length].id, assignedById: admin.id },
      });
    }
    createdTickets++;
  }

  console.log(`พร้อมใช้งาน: ผู้ใช้ใหม่ ${createdUsers} บัญชี, คำร้องใหม่ ${createdTickets} รายการ, ผู้ใช้ทั้งหมดในชุด ${students.length} บัญชี`);
}

main()
  .catch((error) => {
    console.error("นำเข้าข้อมูลจำลองไม่สำเร็จ", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
