import { NextRequest, NextResponse } from "next/server";
import { exportDatabaseBackupJSON, importDatabaseRestoreJSON } from "@/lib/db-helpers";

export async function GET() {
  try {
    const jsonStr = await exportDatabaseBackupJSON();
    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="support_bot_backup_${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const bodyText = await req.text();
    const stats = await importDatabaseRestoreJSON(bodyText);
    return NextResponse.json({ ok: true, stats, message: "اطلاعات با موفقیت بازیابی شد" });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "فایل پشتیبان معتبر نیست" }, { status: 400 });
  }
}
