import { db } from "@/db";
import { botSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

const BALE_BASE = "https://tapi.bale.ai/bot";

export async function getBaleToken(): Promise<string> {
  // First priority: DB setting
  try {
    const setting = await db.select().from(botSettings).where(eq(botSettings.key, "BALE_BOT_TOKEN")).limit(1);
    if (setting.length > 0 && setting[0].value?.trim()) {
      return setting[0].value.trim();
    }
  } catch (err) {
    console.error("Error reading bot token from DB:", err);
  }
  // Second priority: Process env
  return process.env.BALE_BOT_TOKEN || process.env.BOT_TOKEN || "";
}

export async function baleFetch(method: string, body?: any) {
  const token = await getBaleToken();
  if (!token) {
    throw new Error("Bale Bot Token is missing. Please set BALE_BOT_TOKEN in settings or environment.");
  }

  const url = `${BALE_BASE}${token}/${method}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body || {}),
  });

  const data = await response.json();
  return data;
}

export async function sendBaleMessage(chatId: string | number, text: string, replyMarkup?: any) {
  return baleFetch("sendMessage", {
    chat_id: String(chatId),
    text,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  });
}

export async function sendBaleDocument(chatId: string | number, filename: string, content: string, caption?: string) {
  const token = await getBaleToken();
  if (!token) throw new Error("Token missing");

  // Create multipart form data boundary
  const boundary = "----WebKitFormBoundary" + Math.random().toString(36).substring(2);
  const url = `${BALE_BASE}${token}/sendDocument`;

  let body = "";
  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="chat_id"\r\n\r\n${chatId}\r\n`;

  if (caption) {
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`;
  }

  body += `--${boundary}\r\n`;
  body += `Content-Disposition: form-data; name="document"; filename="${filename}"\r\n`;
  body += `Content-Type: application/json\r\n\r\n`;
  body += content;
  body += `\r\n--${boundary}--\r\n`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  return response.json();
}

export async function getBaleFileContent(fileId: string): Promise<string | null> {
  const token = await getBaleToken();
  if (!token) return null;

  const res = await baleFetch("getFile", { file_id: fileId });
  if (!res.ok || !res.result?.file_path) return null;

  const downloadUrl = `https://tapi.bale.ai/file/bot${token}/${res.result.file_path}`;
  const fileRes = await fetch(downloadUrl);
  return await fileRes.text();
}

export async function setBaleWebhook(webhookUrl: string) {
  return baleFetch("setWebhook", { url: webhookUrl });
}

export async function deleteBaleWebhook() {
  return baleFetch("deleteWebhook");
}

export async function getBaleMe() {
  return baleFetch("getMe");
}

export async function getBaleUpdates(offset = 0) {
  return baleFetch("getUpdates", { offset, timeout: 5 });
}

// Standard Keyboards
export function getMainUserKeyboard(isAdmin = false) {
  const keyboard = [
    [{ text: "📝 ثبت درخواست جدید" }, { text: "❓ سوالات متداول" }],
    [{ text: "🔍 پیگیری درخواست‌ها" }, { text: "🤖 سوال از هوش مصنوعی (جمینای)" }],
    [{ text: "📖 راهنمای ربات" }],
  ];

  if (isAdmin) {
    keyboard.push([{ text: "⚙️ پنل مدیریت ارشد (/admin)" }]);
  }

  return {
    keyboard,
    resize_keyboard: true,
  };
}

export function getAdminInlineKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "📥 دریافت پشتیبان (دانلود دیتابیس)", callback_data: "admin_backup_download" },
        { text: "📤 ارسال پشتیبان (آپلود دیتابیس)", callback_data: "admin_backup_upload" },
      ],
      [
        { text: "➕ افزودن سوال متداول", callback_data: "admin_faq_add" },
        { text: "🗑️ مدیریت / حذف سوالات", callback_data: "admin_faq_manage" },
      ],
      [
        { text: "🔑 تنظیم API کلید جمینای", callback_data: "admin_gemini_key" },
        { text: "📩 لیست و پاسخ به درخواست‌ها", callback_data: "admin_tickets_list" },
      ],
      [
        { text: "📢 ارسال پیام همگانی", callback_data: "admin_broadcast" },
        { text: "📊 گزارش و آمار ربات", callback_data: "admin_stats" },
      ],
      [
        { text: "🔄 تازه‌سازی پنل", callback_data: "admin_refresh" },
      ],
    ],
  };
}
