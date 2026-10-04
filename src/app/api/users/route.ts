import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { sendBaleMessage } from "@/lib/bale";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const userList = await db.select().from(users).orderBy(desc(users.id));
    return NextResponse.json(userList);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, baleId, message, role } = body;

    if (action === "toggle_block") {
      const u = await db.select().from(users).where(eq(users.baleId, String(baleId))).limit(1);
      if (u.length > 0) {
        const nextState = !u[0].isBlocked;
        await db.update(users).set({ isBlocked: nextState }).where(eq(users.baleId, String(baleId)));
        return NextResponse.json({ ok: true, isBlocked: nextState });
      }
    }

    if (action === "update_role") {
      await db.update(users).set({ role }).where(eq(users.baleId, String(baleId)));
      return NextResponse.json({ ok: true });
    }

    if (action === "send_direct_message") {
      if (!message || !baleId) {
        return NextResponse.json({ error: "پیام و شناسه بله الزامی است" }, { status: 400 });
      }
      const res = await sendBaleMessage(baleId, `📩 <b>پیام اختصاصی از طرف مدیریت:</b>\n\n${message}`);
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: "عملیات نامعتبر" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
