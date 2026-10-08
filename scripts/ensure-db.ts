import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

const prisma = new PrismaClient();

async function main() {
  // Ensure default buildings
  const buildingCount = await prisma.building.count();
  if (buildingCount === 0) {
    console.log("Seeding default buildings...");
    await prisma.building.createMany({
      data: [
        { id: 1, name: "อาคาร 15 (อาคารเฉลิมพระเกียรติ 50 พรรษา มหาวชิราลงกรณ)", code: "BUILDING-15", defaultLat: 14.9928, defaultLng: 103.1025 },
        { id: 2, name: "อาคาร 22 (อาคารวิทยาศาสตร์และเทคโนโลยี)", code: "BUILDING-22", defaultLat: 14.9935, defaultLng: 103.1032 },
        { id: 3, name: "อาคาร 24 (อาคารนวัตกรรมและเทคโนโลยีสารสนเทศ)", code: "BUILDING-24", defaultLat: 14.9931, defaultLng: 103.1040 },
        { id: 4, name: "อาคารหอประชุมวิชชาอัตศาสตร์", code: "BUILDING-AUDITORIUM", defaultLat: 14.9922, defaultLng: 103.1018 },
        { id: 5, name: "โรงอาหารกลาง มหาวิทยาลัยราชภัฏบุรีรัมย์", code: "BUILDING-CANTEEN", defaultLat: 14.9918, defaultLng: 103.1030 },
      ],
    });
  }

  // Ensure default categories
  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    console.log("Seeding default categories...");
    await prisma.category.createMany({
      data: [
        { id: 1, name: "ระบบไฟฟ้าและแสงสว่าง", description: "หลอดไฟดับ, สวิตช์ไฟแตก, ปลั๊กไฟชำรุด, ไฟฟ้าลัดวงจร", icon: "Zap" },
        { id: 2, name: "เครื่องปรับอากาศ", description: "แอร์ไม่เย็น, แอร์มีน้ำรั่วซึม, รีโมตแอร์เสีย, มีเสียงดังผิดปกติ", icon: "Wind" },
        { id: 3, name: "ระบบประปาและสุขาภิบาล", description: "ท่อน้ำรั่วซึม, ก๊อกน้ำหัก, ชักโครกตัน, น้ำไม่ไหล", icon: "Droplets" },
        { id: 4, name: "โสตทัศนูปกรณ์และอุปกรณ์การสอน", description: "โปรเจกเตอร์ไม่แสดงภาพ, จอโปรเจกเตอร์เสีย, เครื่องเสียง/ไมโครโฟน", icon: "Tv" },
        { id: 5, name: "อาคารสถานที่และครุภัณฑ์", description: "ประตู/หน้าต่างชำรุด, ลูกบิดพัง, โต๊ะเก้าอี้แตกหัก, กระเบื้องหลุด", icon: "Hammer" },
      ],
    });
  }

  // Ensure default accounts
  const defaultAccounts = [
    {
      id: "user-admin-1",
      name: "admin ผู้ดูแลระบบ",
      email: "admin@bru.ac.th",
      role: "ADMIN",
      studentId: "ADMIN-001",
      phoneNumber: "044-611221",
      faculty: "กองอาคารสถานที่และยานพาหนะ",
      department: "งานบริหารจัดการระบบ",
      lineUserId: "line-admin-wilairat",
    },
    {
      id: "user-student-1",
      name: "นาย กิตตินันท์ ศิริยะ",
      email: "670112418002@bru.ac.th",
      role: "STUDENT",
      studentId: "670112418002",
      phoneNumber: "081-234-5678",
      faculty: "คณะวิทยาศาสตร์",
      department: "สาขาวิชาเทคโนโลยีสารสนเทศ",
      lineUserId: "line-user-kittinan",
    },
    {
      id: "user-student-2",
      name: "นาย ธีรเทพ ชัยวิทูอนุกุล",
      email: "670112418011@bru.ac.th",
      role: "STUDENT",
      studentId: "670112418011",
      phoneNumber: "089-876-5432",
      faculty: "คณะวิทยาศาสตร์",
      department: "สาขาวิชาเทคโนโลยีสารสนเทศ",
      lineUserId: "line-user-teerathep",
    },
    {
      id: "user-tech-1",
      name: "นายสมชาย บำรุงดี (ช่างระบบไฟฟ้า/แอร์)",
      email: "somchai.tech@bru.ac.th",
      role: "TECHNICIAN",
      studentId: "TECH-101",
      phoneNumber: "082-111-2233",
      faculty: "กองอาคารสถานที่",
      department: "ฝ่ายซ่อมบำรุงไฟฟ้าและสื่อสาร",
      lineUserId: "line-tech-somchai",
    },
    {
      id: "user-tech-2",
      name: "นายวีระ ช่างประปา (ช่างประปา/สุขาภิบาล)",
      email: "weera.tech@bru.ac.th",
      role: "TECHNICIAN",
      studentId: "TECH-102",
      phoneNumber: "083-444-5566",
      faculty: "กองอาคารสถานที่",
      department: "ฝ่ายซ่อมบำรุงประปาและกายภาพ",
      lineUserId: "line-tech-weera",
    },
  ];

  const defaultPasswordHash = "scrypt-v1:906236c326b9cbce9270e1f79d77e9ac:09c9c1f7fbfa770f0ddbf6742296d824c58eef5723497af07ead678b6efb7b8a309ae43276f8df121df9ddb4a6716a83854f407f3bfd513ada8e83d8585262e5";

  for (const acc of defaultAccounts) {
    const existing = await prisma.user.findUnique({ where: { id: acc.id } });
    if (!existing) {
      await prisma.user.create({ data: acc });
    }
    const cred = await prisma.authCredential.findUnique({ where: { userId: acc.id } });
    if (!cred) {
      await prisma.authCredential.create({
        data: {
          userId: acc.id,
          passwordHash: defaultPasswordHash,
        },
      });
    }
  }

  console.log("Database verification and initialization complete.");
}

main()
  .catch((e) => {
    console.error("Database init error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
