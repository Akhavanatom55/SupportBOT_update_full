import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { faqs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const faqList = await db.select().from(faqs).orderBy(desc(faqs.id));
    return NextResponse.json(faqList);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, answer, category, isPublished } = body;

    if (!title || !answer) {
      return NextResponse.json({ error: "عنوان و پاسخ الزامی هستند" }, { status: 400 });
    }

    const [inserted] = await db
      .insert(faqs)
      .values({
        title,
        answer,
        category: category || "عمومی",
        isPublished: isPublished ?? true,
      })
      .returning();

    return NextResponse.json(inserted);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "شناسه نامشخص" }, { status: 400 });

    await db.delete(faqs).where(eq(faqs.id, parseInt(id)));
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
