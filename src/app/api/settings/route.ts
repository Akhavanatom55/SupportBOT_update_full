import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { botSettings } from "@/db/schema";
import { setSetting, getSetting } from "@/lib/db-helpers";

export async function GET() {
  try {
    const all = await db.select().from(botSettings);
    const settingsMap: Record<string, string> = {};
    for (const item of all) {
      settingsMap[item.key] = item.value;
    }

    // Default fallbacks from process env if empty
    if (!settingsMap.BALE_BOT_TOKEN) settingsMap.BALE_BOT_TOKEN = process.env.BALE_BOT_TOKEN || "";
    if (!settingsMap.GEMINI_API_KEY) settingsMap.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
    if (!settingsMap.ADMIN_IDS) settingsMap.ADMIN_IDS = process.env.ADMIN_IDS || "";

    return NextResponse.json(settingsMap);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.BALE_BOT_TOKEN !== undefined) {
      await setSetting("BALE_BOT_TOKEN", body.BALE_BOT_TOKEN, "توکن ربات بله");
    }
    if (body.GEMINI_API_KEY !== undefined) {
      await setSetting("GEMINI_API_KEY", body.GEMINI_API_KEY, "کلید API جمینای");
    }
    if (body.ADMIN_IDS !== undefined) {
      await setSetting("ADMIN_IDS", body.ADMIN_IDS, "شناسه‌های بله ادمین‌ها");
    }
    if (body.GEMINI_MODEL !== undefined) {
      await setSetting("GEMINI_MODEL", body.GEMINI_MODEL, "مدل جمینای");
    }

    return NextResponse.json({ ok: true, message: "تنظیمات با موفقیت ذخیره شدند" });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
