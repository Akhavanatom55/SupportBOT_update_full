import { NextRequest, NextResponse } from "next/server";
import { setBaleWebhook, deleteBaleWebhook, getBaleMe, getBaleUpdates } from "@/lib/bale";
import { handleBaleUpdate } from "@/lib/bot-engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action; // 'set_webhook', 'delete_webhook', 'get_me', 'poll_once'

    if (action === "set_webhook") {
      const webhookUrl = body.webhookUrl;
      if (!webhookUrl) {
        return NextResponse.json({ error: "آدرس Webhook مشخص نشده است." }, { status: 400 });
      }
      const res = await setBaleWebhook(webhookUrl);
      return NextResponse.json(res);
    }

    if (action === "delete_webhook") {
      const res = await deleteBaleWebhook();
      return NextResponse.json(res);
    }

    if (action === "get_me") {
      const res = await getBaleMe();
      return NextResponse.json(res);
    }

    if (action === "poll_once") {
      const updatesRes = await getBaleUpdates(body.offset || 0);
      if (updatesRes.ok && Array.isArray(updatesRes.result)) {
        for (const upd of updatesRes.result) {
          await handleBaleUpdate(upd);
        }
      }
      return NextResponse.json(updatesRes);
    }

    return NextResponse.json({ error: "دستور نامعتبر است" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "خطای سرور" }, { status: 500 });
  }
}
