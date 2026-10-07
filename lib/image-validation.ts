import sharp from "sharp";
import { InputError } from "@/lib/input-validation";
import { MAX_IMAGE_BYTES } from "@/lib/upload-policy";
export async function normalizeImage(value: unknown): Promise<string> {
  if (typeof value !== "string") throw new InputError("ข้อมูลรูปภาพไม่ถูกต้อง");
  if (value.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 64) throw new InputError("รูปภาพต้องมีขนาดไม่เกิน 5 MB ต่อรูป", 413);
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) throw new InputError("รองรับเฉพาะไฟล์รูป JPG, PNG และ WebP ไม่รองรับลิงก์หรือ SVG");
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.toString("base64") !== match[2]) throw new InputError("ไฟล์รูปภาพไม่สมบูรณ์");
  if (bytes.length > MAX_IMAGE_BYTES) throw new InputError("รูปภาพต้องมีขนาดไม่เกิน 5 MB ต่อรูป", 413);
  try {
    const image = sharp(bytes, { limitInputPixels: 24000000, failOn: "warning" });
    const metadata = await image.metadata();
    if (metadata.format !== match[1] || (metadata.pages ?? 1) > 1) throw new InputError("ชนิดรูปภาพไม่ตรงกับไฟล์ หรือเป็นภาพเคลื่อนไหวที่ไม่รองรับ");
    const output = await image.rotate().resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).timeout({ seconds: 3 }).toBuffer();
    if (output.length > MAX_IMAGE_BYTES) throw new InputError("รูปภาพมีขนาดใหญ่เกินกำหนด", 413);
    // Re-encoding strips original metadata and trailing payloads; no original file is persisted.
    return `data:image/webp;base64,${output.toString("base64")}`;
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError("อ่านรูปภาพไม่ได้ ไฟล์อาจเสียหายหรือมีความละเอียดเกิน 24 ล้านพิกเซล");
  }
}
