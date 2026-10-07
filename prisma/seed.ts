import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.ALLOW_DESTRUCTIVE_SEED !== "YES_DELETE_LOCAL_DATA") throw new Error("Seed deletes all data. Use only a disposable database with ALLOW_DESTRUCTIVE_SEED=YES_DELETE_LOCAL_DATA.");
  console.log("Seeding database...");

  // 1. Clear existing data
  await prisma.evaluation.deleteMany();
  await prisma.ticketStatusLog.deleteMany();
  await prisma.ticketAssignment.deleteMany();
  await prisma.ticketImage.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.category.deleteMany();
  await prisma.building.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Users
  const student = await prisma.user.create({
    data: {
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
  });

  const student2 = await prisma.user.create({
    data: {
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
  });

  const admin = await prisma.user.create({
    data: {
      id: "user-admin-1",
      name: "ผศ. ดร.วิไลรัตน์ ยาทองไชย (เจ้าหน้าที่กองอาคาร)",
      email: "wilairat.y@bru.ac.th",
      role: "ADMIN",
      studentId: "ADMIN-001",
      phoneNumber: "044-611221",
      faculty: "กองอาคารสถานที่และยานพาหนะ",
      department: "งานบริหารจัดการระบบ",
      lineUserId: "line-admin-wilairat",
    },
  });

  const technician1 = await prisma.user.create({
    data: {
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
  });

  const technician2 = await prisma.user.create({
    data: {
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
  });

  // 3. Seed Buildings (BRU Campus)
  const buildings = await Promise.all([
    prisma.building.create({
      data: {
        id: 1,
        name: "อาคาร 15 (อาคารเฉลิมพระเกียรติ 50 พรรษา มหาวชิราลงกรณ)",
        code: "BUILDING-15",
        defaultLat: 14.9928,
        defaultLng: 103.1025,
      },
    }),
    prisma.building.create({
      data: {
        id: 2,
        name: "อาคาร 22 (อาคารวิทยาศาสตร์และเทคโนโลยี)",
        code: "BUILDING-22",
        defaultLat: 14.9935,
        defaultLng: 103.1032,
      },
    }),
    prisma.building.create({
      data: {
        id: 3,
        name: "อาคาร 24 (อาคารนวัตกรรมและเทคโนโลยีสารสนเทศ)",
        code: "BUILDING-24",
        defaultLat: 14.9931,
        defaultLng: 103.1040,
      },
    }),
    prisma.building.create({
      data: {
        id: 4,
        name: "อาคารหอประชุมวิชชาอัตศาสตร์",
        code: "BUILDING-AUDITORIUM",
        defaultLat: 14.9922,
        defaultLng: 103.1018,
      },
    }),
    prisma.building.create({
      data: {
        id: 5,
        name: "โรงอาหารกลาง มหาวิทยาลัยราชภัฏบุรีรัมย์",
        code: "BUILDING-CANTEEN",
        defaultLat: 14.9918,
        defaultLng: 103.1030,
      },
    }),
  ]);

  // 4. Seed Categories
  const catElectric = await prisma.category.create({
    data: {
      id: 1,
      name: "ระบบไฟฟ้าและแสงสว่าง",
      description: "หลอดไฟดับ, สวิตช์ไฟแตก, ปลั๊กไฟชำรุด, ไฟฟ้าลัดวงจร",
      icon: "Zap",
    },
  });

  const catAir = await prisma.category.create({
    data: {
      id: 2,
      name: "เครื่องปรับอากาศ",
      description: "แอร์ไม่เย็น, แอร์มีน้ำรั่วซึม, รีโมตแอร์เสีย, มีเสียงดังผิดปกติ",
      icon: "Wind",
    },
  });

  const catPlumbing = await prisma.category.create({
    data: {
      id: 3,
      name: "ระบบประปาและสุขาภิบาล",
      description: "ท่อน้ำรั่วซึม, ก๊อกน้ำหัก, ชักโครกตัน, น้ำไม่ไหล",
      icon: "Droplets",
    },
  });

  const catMedia = await prisma.category.create({
    data: {
      id: 4,
      name: "โสตทัศนูปกรณ์และอุปกรณ์การสอน",
      description: "โปรเจกเตอร์ไม่แสดงภาพ, จอโปรเจกเตอร์เสีย, เครื่องเสียง/ไมโครโฟน",
      icon: "Tv",
    },
  });

  const catBuilding = await prisma.category.create({
    data: {
      id: 5,
      name: "อาคารสถานที่และครุภัณฑ์",
      description: "ประตู/หน้าต่างชำรุด, ลูกบิดพัง, โต๊ะเก้าอี้แตกหัก, กระเบื้องหลุด",
      icon: "Hammer",
    },
  });

  // 5. Seed Sample Tickets
  const ticket1 = await prisma.ticket.create({
    data: {
      id: "ticket-seed-1",
      ticketCode: "BRU-2601-0001",
      title: "เครื่องปรับอากาศห้องปฏิบัติการ IT 1502 มีน้ำหยดลงโต๊ะคอมพิวเตอร์",
      description: "เปิดแอร์เบอร์ 25 องศาแล้วน้ำแอร์หยดลงบนโต๊ะคอมพิวเตอร์ตัวที่ 4 เกรงว่าจะเกิดไฟฟ้าลัดวงจร",
      status: "IN_PROGRESS",
      priority: "HIGH",
      buildingId: buildings[0].id,
      floor: "ชั้น 5",
      room: "ห้อง 1502 (Lab IT)",
      locationNote: "โต๊ะเครื่องที่ 4 แถวติดหน้าต่าง",
      latitude: 14.99285,
      longitude: 103.10255,
      reporterId: student.id,
      categoryId: catAir.id,
    },
  });

  // Image for ticket 1
  await prisma.ticketImage.create({
    data: {
      ticketId: ticket1.id,
      imageUrl: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80",
      imageType: "BEFORE",
      uploadedById: student.id,
    },
  });

  // Assign to technician 1
  await prisma.ticketAssignment.create({
    data: {
      ticketId: ticket1.id,
      technicianId: technician1.id,
      assignedById: admin.id,
    },
  });

  // Status log
  await prisma.ticketStatusLog.create({
    data: {
      ticketId: ticket1.id,
      status: "PENDING",
      note: "ผู้ใช้นักศึกษาส่งคำร้องเข้าระบบ",
      changedById: student.id,
    },
  });

  await prisma.ticketStatusLog.create({
    data: {
      ticketId: ticket1.id,
      status: "IN_PROGRESS",
      note: "กองอาคารสถานที่มอบหมายงานให้ ช่างสมชาย บำรุงดี ตรวจเช็กท่อน้ำทิ้งแอร์",
      changedById: admin.id,
    },
  });

  // Ticket 2: Completed sample
  const ticket2 = await prisma.ticket.create({
    data: {
      id: "ticket-seed-2",
      ticketCode: "BRU-2601-0002",
      title: "หลอดไฟทางเดินชั้น 2 อาคาร 22 ดับ 2 หลอด",
      description: "ทางเดินหน้าห้องปฏิบัติการเคมีมืดมากในเวลากลางคืน รบกวนช่วยเปลี่ยนหลอดไฟ",
      status: "COMPLETED",
      priority: "MEDIUM",
      buildingId: buildings[1].id,
      floor: "ชั้น 2",
      room: "โถงทางเดินหน้าห้อง 2204",
      locationNote: "ตรงข้ามบันไดขึ้นชั้น 3",
      latitude: 14.99352,
      longitude: 103.10321,
      reporterId: student2.id,
      categoryId: catElectric.id,
      resolvedAt: new Date(),
    },
  });

  await prisma.ticketImage.create({
    data: {
      ticketId: ticket2.id,
      imageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80",
      imageType: "BEFORE",
      uploadedById: student2.id,
    },
  });

  await prisma.ticketImage.create({
    data: {
      ticketId: ticket2.id,
      imageUrl: "https://images.unsplash.com/photo-1517999144091-3d9dca6d1e43?auto=format&fit=crop&w=600&q=80",
      imageType: "AFTER",
      uploadedById: technician1.id,
    },
  });

  await prisma.ticketStatusLog.create({
    data: {
      ticketId: ticket2.id,
      status: "COMPLETED",
      note: "ช่างสมชาย เปลี่ยนหลอด LED T8 18W เรียบร้อย แสงสว่างปกติ",
      changedById: technician1.id,
    },
  });

  await prisma.evaluation.create({
    data: {
      ticketId: ticket2.id,
      reporterId: student2.id,
      score: 5,
      comment: "ซ่อมรวดเร็วมากครับ วันเดียวสว่างเลย ขอบคุณทีมงานช่างครับ",
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
