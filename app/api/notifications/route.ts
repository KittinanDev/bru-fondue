import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { recentNotifications, unreadNotifications } from "@/lib/notifications";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const requested = Number(new URL(request.url).searchParams.get("take") || 5);
  const take = requested === 100 ? 100 : 5;
  const [unread, notices] = await Promise.all([unreadNotifications(user), recentNotifications(user, take)]);
  return NextResponse.json({ unread, notices }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
