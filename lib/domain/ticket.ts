/**
 * ============================================================================
 * BRU FONDUE - DOMAIN MODELS & OBJECT-ORIENTED PROGRAMMING (OOP)
 * สาขาวิชาเทคโนโลยีสารสนเทศ มหาวิทยาลัยราชภัฏบุรีรัมย์
 * ============================================================================
 * คลาสโครงสร้างข้อมูลเชิงวัตถุ (Domain Model Layer)
 * แสดงหลักการ:
 * 1. Abstraction (คลาสนามธรรมและ Interface)
 * 2. Encapsulation (การห่อหุ้มและการเข้าถึงข้อมูลผ่าน Getter/Setter/Methods)
 * 3. Inheritance (การสืบทอดคุณสมบัติของ Ticket)
 * 4. Polymorphism (การทำงานหลากหลายรูปแบบของ calculateSLAHours())
 */

export interface ITicketProps {
  id: string;
  ticketCode: string;
  title: string;
  description: string;
  category: string;
  location: string;
  reporterName: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "PENDING" | "IN_PROGRESS" | "WAITING_PARTS" | "COMPLETED";
  createdAt: Date;
}

/**
 * 1. Base Class: Ticket (คลาสแม่เชิงนามธรรม)
 */
export abstract class BaseTicket {
  protected _id: string;
  protected _ticketCode: string;
  protected _title: string;
  protected _description: string;
  protected _category: string;
  protected _location: string;
  protected _reporterName: string;
  protected _priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  protected _status: "PENDING" | "IN_PROGRESS" | "WAITING_PARTS" | "COMPLETED";
  protected _createdAt: Date;

  constructor(props: ITicketProps) {
    this._id = props.id;
    this._ticketCode = props.ticketCode;
    this._title = props.title;
    this._description = props.description;
    this._category = props.category;
    this._location = props.location;
    this._reporterName = props.reporterName;
    this._priority = props.priority;
    this._status = props.status;
    this._createdAt = props.createdAt;
  }

  // Encapsulation: Getters
  public get id(): string { return this._id; }
  public get ticketCode(): string { return this._ticketCode; }
  public get title(): string { return this._title; }
  public get priority(): string { return this._priority; }
  public get status(): string { return this._status; }
  public get location(): string { return this._location; }

  // State Transition Methods
  public assign(technicianName: string): void {
    if (this._status === "COMPLETED") {
      throw new Error("ไม่สามารถมอบหมายงานที่เสร็จสิ้นแล้วได้");
    }
    this._status = "IN_PROGRESS";
  }

  public complete(): void {
    this._status = "COMPLETED";
  }

  // Polymorphic Method: แต่ละประเภทรองรับเวลา SLA แตกต่างกัน
  public abstract calculateSLAHours(): number;
}

/**
 * 2. Inherited Class: EmergencyTicket (การสืบทอดสำหรับกรณีเหตุฉุกเฉิน)
 */
export class EmergencyTicket extends BaseTicket {
  constructor(props: ITicketProps) {
    super({ ...props, priority: "URGENT" });
  }

  // Polymorphism: คำนวณ SLA งานฉุกเฉินต้องแก้ไขภายใน 2 ชั่วโมง
  public override calculateSLAHours(): number {
    return 2; // 2 ชั่วโมง สำหรับงานฉุกเฉิน (เช่น ไฟฟ้าลัดวงจร, ท่อเมนแตก)
  }
}

/**
 * 3. Inherited Class: StandardTicket (การสืบทอดสำหรับคำร้องทั่วไป)
 */
export class StandardTicket extends BaseTicket {
  constructor(props: ITicketProps) {
    super(props);
  }

  // Polymorphism: คำนวณ SLA ทั่วไปตาม Priority
  public override calculateSLAHours(): number {
    switch (this._priority) {
      case "HIGH":
        return 12; // 12 ชม.
      case "MEDIUM":
        return 24; // 24 ชม.
      case "LOW":
        return 48; // 48 ชม.
      default:
        return 24;
    }
  }
}
