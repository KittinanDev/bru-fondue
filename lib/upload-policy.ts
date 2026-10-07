export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGES = 4;
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const IMAGE_HELP = "JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB ต่อรูป (สูงสุด 4 รูป)";
export async function readImageFile(file: File): Promise<string> {
  if (!IMAGE_ACCEPT.split(",").includes(file.type)) throw new Error("รองรับเฉพาะรูป JPG, PNG และ WebP");
  if (!file.size || file.size > MAX_IMAGE_BYTES) throw new Error("รูปภาพต้องมีขนาดไม่เกิน 5 MB ต่อรูป");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("อ่านรูปภาพไม่สำเร็จ"));
    reader.onerror = () => reject(new Error("อ่านรูปภาพไม่สำเร็จ กรุณาเลือกรูปใหม่"));
    reader.onabort = () => reject(new Error("การอ่านรูปถูกยกเลิก กรุณาเลือกรูปใหม่"));
    reader.readAsDataURL(file);
  });
}
