export interface MapPopupTicket {
  id: string; ticketCode: string; title: string; status: string;
  building: { name: string }; reporter: { name: string };
  images: { imageUrl: string }[];
  assignments: { technician: { name: string } }[];
}
export function safePreviewSource(value: string): string | null {
  if (/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return value;
  try { const url = new URL(value); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function buildTicketPopup(ticket: MapPopupTicket): HTMLElement {
  const root = document.createElement("div");
  root.className = "ticket-map-popup";
  const addText = (tag: string, value: string, className = "") => {
    const element = document.createElement(tag); element.textContent = value; element.className = className; root.append(element); return element;
  };
  addText("strong", ticket.ticketCode, "ticket-map-code");
  const labels: Record<string,string> = { PENDING: "รอรับเรื่อง", IN_PROGRESS: "กำลังดำเนินการ", WAITING_PARTS: "รออะไหล่", COMPLETED: "เสร็จสิ้น", REJECTED: "ไม่รับดำเนินการ", CANCELLED: "ยกเลิกแล้ว" };
  addText("p", labels[ticket.status] || "ไม่ทราบสถานะ", "ticket-map-status");
  addText("h3", ticket.title);
  const imageSource = ticket.images[0]?.imageUrl && safePreviewSource(ticket.images[0].imageUrl);
  if (imageSource) {
    const image = document.createElement("img"); image.src = imageSource; image.alt = "ภาพประกอบคำร้อง"; image.referrerPolicy = "no-referrer"; image.loading = "lazy"; root.append(image);
  }
  addText("p", `สถานที่: ${ticket.building.name}`);
  addText("p", `ผู้แจ้ง: ${ticket.reporter.name}`);
  addText("p", ticket.assignments[0] ? `ช่าง: ${ticket.assignments[0].technician.name}` : "ยังไม่ได้มอบหมายงาน");
  const link = document.createElement("a"); link.href = `/tickets/${encodeURIComponent(ticket.id)}`; link.textContent = "เปิดดูคำร้อง →"; root.append(link);
  return root;
}
