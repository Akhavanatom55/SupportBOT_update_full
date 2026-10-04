import { NextRequest, NextResponse } from "next/server";
import { handleBaleUpdate } from "@/lib/bot-engine";

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    // Non-blocking processing
    handleBaleUpdate(update).catch((err) => {
      console.error("Unhandled error in webhook background job:", err);
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Bale Webhook POST error:", error);
    return NextResponse.json({ error: error?.message || "Invalid payload" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Bale Webhook Handler Active" });
}
