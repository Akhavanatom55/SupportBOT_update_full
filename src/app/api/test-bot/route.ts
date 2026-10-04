import { NextRequest, NextResponse } from "next/server";
import { askGemini } from "@/lib/gemini";
import { db } from "@/db";
import { faqs } from "@/db/schema";
import { like, eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, mode } = body; // mode: 'gemini' | 'faq' | 'auto'

    if (!message) {
      return NextResponse.json({ error: "پیام نمی‌تواند خالی باشد" }, { status: 400 });
    }

    // 1. Check FAQ matching
    const allFaqs = await db.select().from(faqs).where(eq(faqs.isPublished, true));
    const matchedFaq = allFaqs.find(
      (f) =>
        f.title.toLowerCase().includes(message.toLowerCase()) ||
        message.toLowerCase().includes(f.title.toLowerCase())
    );

    if (mode === "faq" || (mode === "auto" && matchedFaq)) {
      if (matchedFaq) {
        return NextResponse.json({
          reply: `<b>❓ سوال متداول پیدا شد: ${matchedFaq.title}</b>\n\n${matchedFaq.answer}`,
          source: "faq",
        });
      }
    }

    // 2. Query Gemini
    const aiReply = await askGemini(message);
    return NextResponse.json({
      reply: aiReply,
      source: "gemini",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
