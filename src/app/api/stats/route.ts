import { NextResponse } from "next/server";
import { getSystemStats } from "@/lib/db-helpers";
import { getBaleMe, getBaleToken } from "@/lib/bale";
import { getGeminiApiKey } from "@/lib/gemini";

export async function GET() {
  try {
    const stats = await getSystemStats();
    const token = await getBaleToken();
    const geminiKey = await getGeminiApiKey();

    let baleBotInfo = null;
    let baleStatus = "disconnected";

    if (token) {
      try {
        const me = await getBaleMe();
        if (me.ok) {
          baleBotInfo = me.result;
          baleStatus = "connected";
        }
      } catch (e) {
        baleStatus = "error";
      }
    }

    return NextResponse.json({
      ...stats,
      baleStatus,
      baleBotInfo,
      geminiConfigured: Boolean(geminiKey),
      tokenConfigured: Boolean(token),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}
