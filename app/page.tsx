import Link from "next/link";
import { ArrowUpRight, ArrowRight, Check, MapPin, ScanLine, Route, MessageSquare, Building2 } from "lucide-react";
import ProductPreview from "@/components/ProductPreview";

const features = [
  { icon: ScanLine, number: "01", title: "พบปัญหา แจ้งได้ทันที", description: "ถ่ายภาพ ระบุตำแหน่ง และบอกเราเล็กน้อย ส่งเรื่องถึงทีมดูแลได้ในที่เดียว", tag: "ง่ายตั้งแต่ขั้นตอนแรก" },
  { icon: Route, number: "02", title: "ทุกขั้นตอน มองเห็นได้", description: "ติดตามตั้งแต่รับเรื่อง มอบหมายช่าง จนซ่อมเสร็จ ไม่ต้องคอยถามความคืบหน้า", tag: "ชัดเจนทุกความเคลื่อนไหว" },
  { icon: MessageSquare, number: "03", title: "เสียงของคุณ มีความหมาย", description: "ประเมินงานซ่อมและแบ่งปันความคิดเห็น เพื่อให้พื้นที่ของเราดีขึ้นทุกวัน", tag: "ร่วมพัฒนามหาวิทยาลัย" },
];

export default function Home() {
  return (
    <div className="landing">
      <section className="hero section-container">
        <div className="hero-copy">
          <div className="eyebrow"><span className="status-dot" /> A BETTER CAMPUS, TOGETHER</div>
          <h1>เรื่องซ่อม ให้เป็น<br />เรื่อง<span className="accent-word">ง่าย.</span></h1>
          <p className="hero-description">พื้นที่ที่ดี เริ่มจากการดูแลเล็ก ๆ<br />แจ้งปัญหา ติดตามงานซ่อม และร่วมสร้างมหาวิทยาลัย<br className="desktop-break" />ที่น่าอยู่ขึ้น ด้วย BRU Fondue</p>
          <div className="hero-actions"><Link className="button button-primary" href="/report">แจ้งปัญหาใหม่ <ArrowUpRight size={18} /></Link><a className="button button-text" href="#how-it-works">ดูวิธีการใช้งาน <ArrowRight size={17} /></a></div>
          <div className="hero-reassurance"><span><Check size={14} /> สำหรับนักศึกษาและบุคลากร BRU</span><span><Check size={14} /> ไม่มีค่าใช้จ่าย</span></div>
        </div>
        <ProductPreview />
      </section>
      <section className="campus-strip section-container" aria-label="เกี่ยวกับแพลตฟอร์ม">
        <div className="university"><Building2 size={29} strokeWidth={1.4}/><div><strong>มหาวิทยาลัยราชภัฏบุรีรัมย์</strong><span>BURIRAM RAJABHAT UNIVERSITY</span></div></div>
        <div><strong>หนึ่งพื้นที่กลาง</strong><span>เชื่อมต่อทุกเรื่องแจ้งซ่อม</span></div><div><strong>ทุกขั้นตอน</strong><span>ติดตามสถานะได้ด้วยตัวเอง</span></div><div><strong>เพื่อชาว BRU</strong><span>นักศึกษา · บุคลากร · ทีมช่าง</span></div>
      </section>
      <section id="features" className="features-section section-container">
        <div className="section-heading"><div><div className="eyebrow">LESS FRICTION. MORE CARE.</div><h2>ดูแลทุกปัญหา<br />ให้คุณกลับไปโฟกัสสิ่งสำคัญ</h2></div><p>ลดขั้นตอนที่ยุ่งยาก เพิ่มความชัดเจน<br />ให้การดูแลมหาวิทยาลัยเป็นเรื่องของทุกคน</p></div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">{features.map(({icon: Icon, ...feature}) => <article className="feature-card" key={feature.number}><div className="feature-top"><span className="feature-icon"><Icon size={23} strokeWidth={1.5}/></span><span>{feature.number}</span></div><h3>{feature.title}</h3><p>{feature.description}</p><div className="feature-tag"><span />{feature.tag}</div></article>)}</div>
      </section>
      <section id="how-it-works" className="workflow-section section-container"><div className="section-heading"><div><div className="eyebrow">FROM REPORT TO RESOLVED</div><h2>สามขั้นตอน สู่พื้นที่ที่ดีขึ้น</h2></div><Link href="/report" className="text-link">เริ่มแจ้งปัญหา <ArrowUpRight size={18}/></Link></div><div className="workflow-grid">{[{title:"บอกเราว่าเกิดอะไรขึ้น",text:"เลือกประเภทปัญหา แนบภาพ และปักหมุดตำแหน่ง",icon:MapPin},{title:"ให้ทีมดูแลจัดการต่อ",text:"เจ้าหน้าที่รับเรื่องและมอบหมายช่างที่เหมาะสม",icon:Route},{title:"รับงาน พร้อมให้ความเห็น",text:"ตรวจสอบผลการซ่อมและประเมินความพึงพอใจ",icon:Check}].map((step,index)=><article key={step.title}><div className="step-number">0{index+1}<step.icon size={20}/></div><h3>{step.title}</h3><p>{step.text}</p></article>)}</div></section>
      <section className="closing-section section-container"><div><div className="eyebrow">SMALL ACTIONS. BETTER SPACES.</div><h2>มหาวิทยาลัยน่าอยู่<br />เริ่มต้นที่เรา</h2><p>พบอุปกรณ์ชำรุดหรือพื้นที่ที่ต้องการการดูแล? บอกเราได้เลย</p></div><Link href="/report" className="button button-primary">แจ้งปัญหาใหม่ <ArrowUpRight size={18}/></Link></section>
      <footer className="site-footer section-container"><Link href="/" className="footer-brand">bru<span>fondue.</span></Link><p>ร่วมดูแลพื้นที่ของเราให้ดีขึ้น ในทุก ๆ วัน</p><Link href="/my-tickets">ติดตามเรื่องของฉัน <ArrowUpRight size={14}/></Link><span>© {new Date().getFullYear()} BRU Fondue</span></footer>
    </div>
  );
}
