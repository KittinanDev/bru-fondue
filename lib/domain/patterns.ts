/**
 * ============================================================================
 * BRU FONDUE - OBJECT-ORIENTED DESIGN PATTERNS
 * สาขาวิชาเทคโนโลยีสารสนเทศ มหาวิทยาลัยราชภัฏบุรีรัมย์
 * ============================================================================
 * รวม Design Patterns สำคัญที่ใช้ในโครงงาน:
 * 1. Factory Pattern (สร้าง Ticket ตามเงื่อนไข)
 * 2. Observer Pattern (แจ้งเตือนเมื่อ Ticket เปลี่ยนสถานะ)
 * 3. Strategy Pattern (กำหนดกลยุทธ์การมอบหมายงานให้ช่าง)
 */

import { BaseTicket, EmergencyTicket, StandardTicket, ITicketProps } from "./ticket";

/**
 * ----------------------------------------------------------------------------
 * 1. FACTORY PATTERN (การสร้างอ็อบเจกต์คำร้อง)
 * ----------------------------------------------------------------------------
 */
export class TicketFactory {
  public static createTicket(props: ITicketProps): BaseTicket {
    if (props.priority === "URGENT") {
      return new EmergencyTicket(props);
    }
    return new StandardTicket(props);
  }
}

/**
 * ----------------------------------------------------------------------------
 * 2. OBSERVER PATTERN (ระบบแจ้งเตือนแบบกระจายตัว)
 * ----------------------------------------------------------------------------
 */
export interface ITicketObserver {
  onStatusChanged(ticket: BaseTicket, newStatus: string): void;
}

// Observer 1: ส่งแจ้งเตือนผ่าน LINE Bot (Flex Message)
export class LineNotificationObserver implements ITicketObserver {
  public onStatusChanged(ticket: BaseTicket, newStatus: string): void {
    console.log(
      `[LINE Bot Observer] ส่ง Flex Message แจ้งเตือน: คำร้อง ${ticket.ticketCode} เปลี่ยนสถานะเป็น "${newStatus}"`
    );
  }
}

// Observer 2: บันทึก Audit Log ลงฐานข้อมูล
export class AuditLogObserver implements ITicketObserver {
  public onStatusChanged(ticket: BaseTicket, newStatus: string): void {
    console.log(
      `[Audit Log Observer] บันทึกประวัติ: ${ticket.ticketCode} Status -> ${newStatus} เวลา ${new Date().toISOString()}`
    );
  }
}

// Subject ผู้ดูแลการกระจายการแจ้งเตือน
export class TicketSubject {
  private observers: ITicketObserver[] = [];

  public attach(observer: ITicketObserver): void {
    this.observers.push(observer);
  }

  public detach(observer: ITicketObserver): void {
    this.observers = this.observers.filter((obs) => obs !== observer);
  }

  public notify(ticket: BaseTicket, newStatus: string): void {
    for (const observer of this.observers) {
      observer.onStatusChanged(ticket, newStatus);
    }
  }
}

/**
 * ----------------------------------------------------------------------------
 * 3. STRATEGY PATTERN (กลยุทธ์การจ่ายงาน)
 * ----------------------------------------------------------------------------
 */
export interface IAssignmentStrategy {
  assign(ticket: BaseTicket, availableTechnicians: string[]): string;
}

// กลยุทธ์ 1: จ่ายงานตามหมวดหมู่ความเชี่ยวชาญอัตโนมัติ (Auto Match)
export class AutoCategoryAssignmentStrategy implements IAssignmentStrategy {
  public assign(ticket: BaseTicket, availableTechnicians: string[]): string {
    // เลือกช่างคนแรกที่ตรงกับสายงาน
    return availableTechnicians[0] || "ช่างเวรประจำวัน";
  }
}

// กลยุทธ์ 2: เจ้าหน้าที่กองอาคารเลือกเอง (Manual Dispatch)
export class ManualAssignmentStrategy implements IAssignmentStrategy {
  private selectedTechnicianId: string;

  constructor(technicianId: string) {
    this.selectedTechnicianId = technicianId;
  }

  public assign(_ticket: BaseTicket, _availableTechnicians: string[]): string {
    return this.selectedTechnicianId;
  }
}
