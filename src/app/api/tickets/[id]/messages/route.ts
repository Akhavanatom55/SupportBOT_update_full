import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tickets, ticketMessages } from "@/db/schema";
import { addTicketMessage } from "@/lib/db-helpers";
import { sendBaleMessage } from "@/lib/bale";
import { eq, asc } from "drizzle-orm";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ticketId = parseInt(id);

    const msgs = await db
      .select()
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(asc(ticketMessages.id));

    const ticketObj = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);

    return NextResponse.json({
      ticket: ticketObj[0] || null,
      messages: msgs,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ticketId = parseInt(id);
    const body = await req.json();
    const { senderRole, senderBaleId, senderName, message } = body;

    if (!message) {
      return NextResponse.json({ error: "متن پیام نمی‌تواند خالی باشد" }, { status: 400 });
    }

    const newMsg = await addTicketMessage(
      ticketId,
      senderRole || "admin",
      senderBaleId || "0",
      senderName || "پشتیبان وب",
      message
    );

    // If sender is admin, automatically send message to user in Bale!
    if (senderRole === "admin" || senderRole === "system") {
      const ticketObj = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);
      if (ticketObj.length > 0) {
        const userBaleId = ticketObj[0].userBaleId;
        const code = ticketObj[0].ticketCode;
        try {
          await sendBaleMessage(
            userBaleId,
            `📩 <b>پاسخ مدیریت پشتیبانی به درخواست شما (کد: <code>${code}</code>):</b>\n\n${message}`
          );
        } catch (baleErr) {
          console.error("Failed to send Bale notification to user:", baleErr);
        }
      }
    }

    return NextResponse.json(newMsg);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
