import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/db";
import { botSettings, faqs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getGeminiApiKey(): Promise<string> {
  try {
    const setting = await db.select().from(botSettings).where(eq(botSettings.key, "GEMINI_API_KEY")).limit(1);
    if (setting.length > 0 && setting[0].value?.trim()) {
      return setting[0].value.trim();
    }
  } catch (err) {
    console.error("Error reading GEMINI_API_KEY from DB:", err);
  }
  return process.env.GEMINI_API_KEY || "";
}

export async function askGemini(prompt: string, userContext?: string): Promise<string> {
  const apiKey = await getGeminiApiKey();
  if (!apiKey) {
    return "⚠️ کلید API جمینای (Gemini API Key) هنوز در سامانه تنظیم نشده است. لطفاً از طریق پنل مدیریت یا دستور /admin کلید معتبر جمینای را وارد کنید.";
  }

  try {
    // Fetch FAQs to provide system context
    const faqList = await db.select().from(faqs).where(eq(faqs.isPublished, true)).limit(20);
    const faqContext = faqList.map((f, idx) => `${idx + 1}. سوال: ${f.title}\n   پاسخ: ${f.answer}`).join("\n");

    const systemInstruction = `
شما دستیار هوشمند و موقر پشتیبانی کاربر هستید.
وظیفه شما پاسخ‌گویی دقیق، محترمانه و خلاصه به زبان فارسی است.

اطلاعات و سوالات متداول فعلی سیستم:
${faqContext || "هیچ سوال متداولی تعریف نشده است."}

راهنما:
1. اگر سوال کاربر مربوط به سوالات متداول بالا است، بر اساس آن پاسخ دهید.
2. اگر اطلاعات کافی ندارید، صمیمانه و کوتاه پاسخ دهید و کاربر را راهنمایی کنید تا درخواست پشتیبانی جدید ثبت کند تا کارشناسان انسانی بررسی نمایند.
3. لحن پاسخ‌گویی کاملاً محترمانه و حرفه‌ای به زبان فارسی باشد.
`;

    const genAI = new GoogleGenerativeAI(apiKey);
    // Try gemini-1.5-flash or gemini-2.0-flash or gemini-pro
    let modelName = "gemini-1.5-flash";
    try {
      const dbModel = await db.select().from(botSettings).where(eq(botSettings.key, "GEMINI_MODEL")).limit(1);
      if (dbModel.length > 0 && dbModel[0].value) {
        modelName = dbModel[0].value;
      }
    } catch (_) {}

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: systemInstruction,
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return text || "متأسفانه پاسخی از هوش مصنوعی دریافت نشد.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `❌ خطا در ارتباط با هوش مصنوعی جمینای: ${error?.message || "مشکل در کلید API یا اینترنت"}`;
  }
}
