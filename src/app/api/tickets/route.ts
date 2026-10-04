import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tickets, ticketMessages } from "@/db/schema";
import { createTicket } from "@/lib/db-helpers";
import { eq, desc, like, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = db.select().from(tickets);

    const allTickets = await db.select().from(tickets).orderBy(desc(tickets.id));

    let filtered = allTickets;

    if (status && status !== "all") {
      filtered = filtered.filter((t) => t.status === status);
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.ticketCode.toLowerCase().includes(q) ||
          t.userName?.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q)
      );
    }

    return NextResponse.json(filtered);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userBaleId, userName, subject, category } = body;

    if (!userBaleId || !subject) {
      return NextResponse.json({ error: "اطلاعات ناقص است" }, { status: 400 });
    }

    const ticket = await createTicket(userBaleId, userName || "کاربر وب", subject, category || "عمومی");
    return NextResponse.json(ticket);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
