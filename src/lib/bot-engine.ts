import {
  sendBaleMessage,
  sendBaleDocument,
  getBaleFileContent,
  getMainUserKeyboard,
  getAdminInlineKeyboard,
} from "./bale";
import {
  upsertUser,
  isUserAdmin,
  getUserState,
  setUserState,
  createTicket,
  addTicketMessage,
  exportDatabaseBackupJSON,
  importDatabaseRestoreJSON,
  getSystemStats,
  setSetting,
  getSetting,
  logBotAction,
} from "./db-helpers";
import { askGemini } from "./gemini";
import { db } from "@/db";
import { faqs, tickets, users, ticketMessages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function handleBaleUpdate(update: any) {
  try {
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }
  } catch (error: any) {
    console.error("Error processing Bale update:", error);
    await logBotAction("error", `Update error: ${error?.message || error}`, update);
  }
}

async function handleMessage(msg: any) {
  const chatId = String(msg.chat.id);
  const baleUserId = String(msg.from.id);
  const text = msg.text ? msg.text.trim() : "";
  const firstName = msg.from.first_name || "";
  const lastName = msg.from.last_name || "";
  const username = msg.from.username || "";

  // Register or update user
  await upsertUser(baleUserId, firstName, lastName, username);
  const isAdmin = await isUserAdmin(baleUserId);
  const userState = await getUserState(baleUserId);

  // Check state machine step
  if (userState.step !== "IDLE") {
    const handled = await handleStateStep(userState, msg, chatId, baleUserId, text, isAdmin);
    if (handled) return;
  }

  // Handle Document Uploads (e.g. for database restore by admin)
  if (msg.document) {
    if (isAdmin && (userState.step === "WAITING_BACKUP_UPLOAD" || text.toLowerCase().includes("backup"))) {
      await processDatabaseRestore(chatId, baleUserId, msg.document.file_id);
      await setUserState(baleUserId, "IDLE");
      return;
    }
  }

  // Global Commands & Buttons
  if (text === "/start" || text === "شروع" || text === "بازگشت به منوی اصلی 🏠") {
    await setUserState(baleUserId, "IDLE");
    const welcomeMsg = `<b>سلام ${firstName || "کاربر گرامی"} عزیز 👋</b>\n\nبه ربات رسمی پشتیبانی و پاسخ‌گویی آنلاین خوش آمدید.\nشما می‌توانید سوال خود را مطرح کنید، درخواست پشتیبانی جدید ثبت نمایید یا سوالات متداول را مطالعه فرمایید.`;
    await sendBaleMessage(chatId, welcomeMsg, getMainUserKeyboard(isAdmin));
    return;
  }

  if (text === "/admin" || text === "⚙️ پنل مدیریت ارشد (/admin)") {
    if (!isAdmin) {
      await sendBaleMessage(chatId, "❌ شما دسترسی لازم برای ورود به پنل مدیریت ارشد را ندارید.");
      return;
    }
    await setUserState(baleUserId, "IDLE");
    const stats = await getSystemStats();
    const adminMsg = `<b>⚙️ پنل مدیریت ارشد ربات پشتیبانی بله</b>\n\n📊 <b>خلاصه وضعیت سیستم:</b>\n👥 تعداد کاربران: ${stats.usersCount}\n📩 کل درخواست‌ها: ${stats.ticketsCount}\n⏳ در انتظار پاسخ: ${stats.pendingTicketsCount}\n✅ پاسخ داده شده: ${stats.answeredTicketsCount}\n❓ سوالات متداول: ${stats.faqsCount}\n\nلطفاً از دکمه‌های زیر عملیات مورد نظر خود را انتخاب کنید:`;
    await sendBaleMessage(chatId, adminMsg, getAdminInlineKeyboard());
    return;
  }

  if (text === "📝 ثبت درخواست جدید") {
    await setUserState(baleUserId, "WAITING_TICKET_SUBJECT");
    const categoriesKb = {
      inline_keyboard: [
        [{ text: "🏢 عمومی / راهنمایی", callback_data: "cat_عمومی" }, { text: "💻 فنی / سامانه", callback_data: "cat_فنی" }],
        [{ text: "💳 مالی / پرداخت", callback_data: "cat_مالی" }, { text: "📁 سایر موارد", callback_data: "cat_سایر" }],
      ],
    };
    await sendBaleMessage(chatId, "<b>📝 ثبت درخواست پشتیبانی جدید</b>\n\nلطفاً دسته‌بندی موضوع خود را انتخاب فرمایید یا شرح سوال/موضوع خود را به صورت متن ارسال کنید:", categoriesKb);
    return;
  }

  if (text === "❓ سوالات متداول") {
    await sendFaqsList(chatId);
    return;
  }

  if (text === "🔍 پیگیری درخواست‌ها") {
    await sendUserTicketsList(chatId, baleUserId);
    return;
  }

  if (text === "🤖 سوال از هوش مصنوعی (جمینای)") {
    await setUserState(baleUserId, "WAITING_GEMINI_PROMPT");
    await sendBaleMessage(chatId, "<b>🤖 پاسخ‌گویی هوشمند جمینای (Gemini AI)</b>\n\nلطفاً سوال یا ابهام خود را تایپ کرده و ارسال فرمایید تا هوش مصنوعی بلافاصله به شما پاسخ دهد:");
    return;
  }

  if (text === "📖 راهنمای ربات") {
    const helpMsg = `<b>📖 راهنمای استفاده از سامانه پشتیبانی بله</b>\n\n1. <b>ثبت درخواست:</b> با کلیک روی گزینه «ثبت درخواست جدید» می‌توانید سوال خود را مستقیم برای تیم پشتیبانی ارسال کنید.\n2. <b>سوالات متداول:</b> پاسخ سوالات پرکاربرد در بخش سوالات متداول قرار داده شده است.\n3. <b>هوش مصنوعی:</b> می‌توانید سوالات عمومی خود را از دکمه «سوال از هوش مصنوعی» بپرسید.\n4. <b>پیگیری:</b> پاسخ‌های داده شده توسط پشتیبانان را می‌توانید در بخش «پیگیری درخواست‌ها» مشاهده نمایید.`;
    await sendBaleMessage(chatId, helpMsg, getMainUserKeyboard(isAdmin));
    return;
  }

  // If user sends text while IDLE, suggest asking Gemini or creating ticket
  if (text) {
    // Quick auto-reply or ticket Creation prompt
    await sendBaleMessage(chatId, `پیام شما دریافت شد. برای ثبت درخواست پشتیبانی رسمی گزینه <b>«📝 ثبت درخواست جدید»</b> را بزنید یا برای پاسخ آنی از <b>«🤖 سوال از هوش مصنوعی»</b> استفاده نمایید.`, getMainUserKeyboard(isAdmin));
  }
}

async function handleStateStep(userState: any, msg: any, chatId: string, baleUserId: string, text: string, isAdmin: boolean) {
  const step = userState.step;
  const meta = userState.metaData || {};

  // User Step: Asking Gemini AI
  if (step === "WAITING_GEMINI_PROMPT") {
    await sendBaleMessage(chatId, "⏳ <i>در حال پردازش و استعلام از هوش مصنوعی جمینای... لطفاً چند لحظه شکیبا باشید.</i>");
    const aiAnswer = await askGemini(text);
    await sendBaleMessage(chatId, `<b>🤖 پاسخ هوش مصنوعی جمینای:</b>\n\n${aiAnswer}`, getMainUserKeyboard(isAdmin));
    await setUserState(baleUserId, "IDLE");
    return true;
  }

  // User Step: Submitting new Ticket Text
  if (step === "WAITING_TICKET_SUBJECT") {
    const category = meta.category || "عمومی";
    const userName = `${msg.from.first_name || ""} ${msg.from.last_name || ""}`.trim() || "کاربر بله";
    const ticket = await createTicket(baleUserId, userName, text, category);
    await setUserState(baleUserId, "IDLE");

    await sendBaleMessage(
      chatId,
      `✅ <b>درخواست شما با موفقیت ثبت شد!</b>\n\n📌 <b>کد پیگیری:</b> <code>${ticket.ticketCode}</code>\n📂 <b>دسته‌بندی:</b> ${category}\n\nکارشناسان ما به زودی درخواست شما را بررسی و پاسخ خواهند داد.`,
      getMainUserKeyboard(isAdmin)
    );

    // Try notifying admins
    try {
      const allAdmins = await db.select().from(users).where(eq(users.role, "admin"));
      for (const admin of allAdmins) {
        await sendBaleMessage(
          admin.baleId,
          `🔔 <b>درخواست پشتیبانی جدید ثبت شد!</b>\n\n👤 کاربر: ${userName} (<code>${baleUserId}</code>)\n🔖 کد: <code>${ticket.ticketCode}</code>\n📂 دسته: ${category}\n📝 متن: ${text}`
        );
      }
    } catch (_) {}

    return true;
  }

  // Admin Step: Setting Gemini API Key
  if (step === "ADMIN_WAITING_GEMINI_KEY" && isAdmin) {
    await setSetting("GEMINI_API_KEY", text, "کلید API هوش مصنوعی جمینای");
    await setUserState(baleUserId, "IDLE");
    await sendBaleMessage(chatId, "✅ <b>کلید API جمینای با موفقیت ثبت و ذخیره شد!</b>\nاز این پس ربات می‌تواند از هوش مصنوعی جمینای برای پاسخ‌گویی استفاده نماید.", getAdminInlineKeyboard());
    return true;
  }

  // Admin Step: FAQ Add Title
  if (step === "ADMIN_FAQ_TITLE" && isAdmin) {
    await setUserState(baleUserId, "ADMIN_FAQ_ANSWER", { title: text });
    await sendBaleMessage(chatId, `<b>ثبت سوال متداول جدید</b>\n\n📌 <b>عنوان سوال:</b> ${text}\n\nلطفاً اکنون <b>پاسخ کامل</b> این سوال متداول را وارد فرمایید:`);
    return true;
  }

  // Admin Step: FAQ Add Answer
  if (step === "ADMIN_FAQ_ANSWER" && isAdmin) {
    const faqTitle = meta.title;
    await db.insert(faqs).values({
      title: faqTitle,
      answer: text,
      category: "عمومی",
      isPublished: true,
    });
    await setUserState(baleUserId, "IDLE");
    await sendBaleMessage(chatId, `✅ <b>سوال متداول جدید با موفقیت اضافه شد!</b>\n\n<b>سوال:</b> ${faqTitle}\n<b>پاسخ:</b> ${text}`, getAdminInlineKeyboard());
    return true;
  }

  // Admin Step: Replying to a User Ticket
  if (step === "ADMIN_REPLYING_TICKET" && isAdmin) {
    const ticketId = meta.ticketId;
    const ticketObj = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);

    if (ticketObj.length > 0) {
      const t = ticketObj[0];
      await addTicketMessage(ticketId, "admin", baleUserId, "پشتیبان سیستم", text);
      await setUserState(baleUserId, "IDLE");

      // Notify User
      await sendBaleMessage(
        t.userBaleId,
        `📩 <b>پاسخ جدید به درخواست پشتیبانی شما (کد: <code>${t.ticketCode}</code>):</b>\n\n${text}\n\n---\n<i>در صورت نیاز می‌توانید مجدداً پیام ارسال کنید.</i>`
      );

      await sendBaleMessage(chatId, `✅ <b>پاسخ شما با موفقیت برای کاربر (کد درخواست: <code>${t.ticketCode}</code>) ارسال گردید.</b>`, getAdminInlineKeyboard());
    } else {
      await sendBaleMessage(chatId, "❌ درخواست مورد نظر پیدا نشد.", getAdminInlineKeyboard());
      await setUserState(baleUserId, "IDLE");
    }
    return true;
  }

  // Admin Step: Broadcast Message
  if (step === "ADMIN_WAITING_BROADCAST" && isAdmin) {
    await sendBaleMessage(chatId, "⏳ <i>در حال ارسال پیام همگانی به کلیه کاربران... لطفاً صبور باشید.</i>");
    const allUsersList = await db.select().from(users);
    let countSuccess = 0;
    for (const u of allUsersList) {
      try {
        await sendBaleMessage(u.baleId, `📢 <b>اطلاعیه عمومی پشتیبانی:</b>\n\n${text}`);
        countSuccess++;
      } catch (_) {}
    }
    await setUserState(baleUserId, "IDLE");
    await sendBaleMessage(chatId, `✅ <b>پیام همگانی با موفقیت برای ${countSuccess} کاربر ارسال گردید.</b>`, getAdminInlineKeyboard());
    return true;
  }

  return false;
}

async function handleCallbackQuery(cb: any) {
  const chatId = String(cb.message.chat.id);
  const baleUserId = String(cb.from.id);
  const data = cb.data;
  const isAdmin = await isUserAdmin(baleUserId);

  // Category Selected for new Ticket
  if (data.startsWith("cat_")) {
    const category = data.replace("cat_", "");
    await setUserState(baleUserId, "WAITING_TICKET_SUBJECT", { category });
    await sendBaleMessage(chatId, `دسته‌بندی <b>«${category}»</b> انتخاب شد.\n\nلطفاً شرح کامل سوال یا درخواست پشتیبانی خود را تایپ کرده و ارسال فرمایید:`);
    return;
  }

  // View FAQ detail
  if (data.startsWith("faq_show_")) {
    const faqId = parseInt(data.replace("faq_show_", ""));
    const faqItem = await db.select().from(faqs).where(eq(faqs.id, faqId)).limit(1);
    if (faqItem.length > 0) {
      const f = faqItem[0];
      await db.update(faqs).set({ viewCount: f.viewCount + 1 }).where(eq(faqs.id, faqId));
      await sendBaleMessage(chatId, `<b>❓ ${f.title}</b>\n\n${f.answer}`);
    }
    return;
  }

  // Admin Action: Download Database Backup
  if (data === "admin_backup_download" && isAdmin) {
    await sendBaleMessage(chatId, "⏳ <i>در حال تهیه نسخه پشتیبان دیتابیس (JSON Data)...</i>");
    const jsonBackup = await exportDatabaseBackupJSON();
    const filename = `backup_support_bot_${new Date().toISOString().slice(0, 10)}.json`;
    await sendBaleDocument(chatId, filename, jsonBackup, "📥 <b>فایل کامل نسخه پشتیبان دیتابیس ربات پشتیبانی بله</b>\nشما می‌توانید این فایل را در هر زمان برای بازگردانی دیتابیس استفاده کنید.");
    return;
  }

  // Admin Action: Upload Database Backup (Prompting document)
  if (data === "admin_backup_upload" && isAdmin) {
    await setUserState(baleUserId, "WAITING_BACKUP_UPLOAD");
    await sendBaleMessage(chatId, "<b>📤 بازگردانی دیتابیس پشتیبان</b>\n\nلطفاً فایل پشتیبان با پسوند <code>.json</code> را که قبلاً دریافت کرده‌اید همین الان در همین چت آپلود فرمایید:");
    return;
  }

  // Admin Action: Add FAQ
  if (data === "admin_faq_add" && isAdmin) {
    await setUserState(baleUserId, "ADMIN_FAQ_TITLE");
    await sendBaleMessage(chatId, "<b>➕ ثبت سوال متداول جدید</b>\n\nلطفاً <b>عنوان سوال</b> را تایپ و ارسال فرمایید:");
    return;
  }

  // Admin Action: Manage / Delete FAQs
  if (data === "admin_faq_manage" && isAdmin) {
    const faqList = await db.select().from(faqs).orderBy(desc(faqs.id));
    if (faqList.length === 0) {
      await sendBaleMessage(chatId, "هیچ سوال متداولی وجود ندارد.", getAdminInlineKeyboard());
      return;
    }
    const buttons = faqList.map(f => [{ text: `🗑️ حذف: ${f.title.slice(0, 25)}...`, callback_data: `admin_faq_del_${f.id}` }]);
    await sendBaleMessage(chatId, "<b>🗑️ جهت حذف هر یک از سوالات متداول، روی گزینه مربوطه کلیک نمایید:</b>", { inline_keyboard: buttons });
    return;
  }

  // Admin Action: Delete specific FAQ
  if (data.startsWith("admin_faq_del_") && isAdmin) {
    const faqId = parseInt(data.replace("admin_faq_del_", ""));
    await db.delete(faqs).where(eq(faqs.id, faqId));
    await sendBaleMessage(chatId, `✅ سوال متداول با موفقیت حذف گردید.`, getAdminInlineKeyboard());
    return;
  }

  // Admin Action: Set Gemini Key
  if (data === "admin_gemini_key" && isAdmin) {
    const currentKey = await getSetting("GEMINI_API_KEY");
    await setUserState(baleUserId, "ADMIN_WAITING_GEMINI_KEY");
    await sendBaleMessage(chatId, `<b>🔑 تنظیم API کلید جمینای (Gemini AI)</b>\n\nکلید فعلی: <code>${currentKey ? currentKey.slice(0, 8) + "..." : "تنظیم نشده"}</code>\n\nلطفاً کلید جدید API جمینای خود را جهت ذخیره‌سازی ارسال نمایید:`);
    return;
  }

  // Admin Action: List pending tickets to reply
  if (data === "admin_tickets_list" && isAdmin) {
    const pending = await db.select().from(tickets).where(eq(tickets.status, "pending")).orderBy(desc(tickets.id)).limit(10);
    if (pending.length === 0) {
      await sendBaleMessage(chatId, "✅ هیچ درخواست پشتیبانی در انتظار پاسخی یافت نشد.", getAdminInlineKeyboard());
      return;
    }
    const buttons = pending.map(t => [{ text: `💬 پاسخ به کد ${t.ticketCode} (${t.userName})`, callback_data: `admin_reply_tk_${t.id}` }]);
    await sendBaleMessage(chatId, `<b>📩 درخواست‌های پشتیبانی در انتظار پاسخ (${pending.length} مورد):</b>`, { inline_keyboard: buttons });
    return;
  }

  // Admin Action: Reply to specific ticket
  if (data.startsWith("admin_reply_tk_") && isAdmin) {
    const ticketId = parseInt(data.replace("admin_reply_tk_", ""));
    const ticketItem = await db.select().from(tickets).where(eq(tickets.id, ticketId)).limit(1);

    if (ticketItem.length > 0) {
      const t = ticketItem[0];
      await setUserState(baleUserId, "ADMIN_REPLYING_TICKET", { ticketId: t.id });
      await sendBaleMessage(chatId, `<b>💬 پاسخ به درخواست کد <code>${t.ticketCode}</code></b>\n\n👤 کاربر: ${t.userName}\n📝 شرح: ${t.subject}\n\nلطفاً متن پاسخ خود را تایپ کرده و ارسال فرمایید:`);
    }
    return;
  }

  // Admin Action: Broadcast
  if (data === "admin_broadcast" && isAdmin) {
    await setUserState(baleUserId, "ADMIN_WAITING_BROADCAST");
    await sendBaleMessage(chatId, "<b>📢 ارسال پیام همگانی</b>\n\nلطفاً متن پیام یا اطلاعیه‌ای که قرار است برای کلیه کاربران ربات بله ارسال شود را تایپ نمایید:");
    return;
  }

  // Admin Action: Stats
  if (data === "admin_stats" && isAdmin) {
    const stats = await getSystemStats();
    await sendBaleMessage(chatId, `<b>📊 گزارش و آمار لحظه‌ای ربات پشتیبانی:</b>\n\n👥 کل کاربران: ${stats.usersCount}\n📩 کل درخواست‌ها: ${stats.ticketsCount}\n⏳ در انتظار پاسخ: ${stats.pendingTicketsCount}\n✅ پاسخ داده شده: ${stats.answeredTicketsCount}\n❓ تعداد سوالات متداول: ${stats.faqsCount}`, getAdminInlineKeyboard());
    return;
  }

  if (data === "admin_refresh" && isAdmin) {
    await sendBaleMessage(chatId, "🔄 پنل بروزرسانی گردید.", getAdminInlineKeyboard());
    return;
  }
}

async function processDatabaseRestore(chatId: string, baleUserId: string, fileId: string) {
  try {
    await sendBaleMessage(chatId, "⏳ <i>در حال دریافت و بازیابی دیتابیس از فایل ارسال شده...</i>");
    const jsonContent = await getBaleFileContent(fileId);
    if (!jsonContent) {
      await sendBaleMessage(chatId, "❌ خطایی در خواندن فایل رخ داد یا فایل منقضی شده است.");
      return;
    }

    const res = await importDatabaseRestoreJSON(jsonContent);
    await sendBaleMessage(
      chatId,
      `✅ <b>بازیابی دیتابیس با موفقیت انجام شد!</b>\n\n📊 <b>آمار بازیابی:</b>\n👥 کاربران: ${res.users}\n❓ سوالات متداول: ${res.faqs}\n📩 درخواست‌ها: ${res.tickets}\n⚙️ تنظیمات: ${res.settings}`,
      getAdminInlineKeyboard()
    );
  } catch (err: any) {
    await sendBaleMessage(chatId, `❌ <b>خطا در بازیابی دیتابیس:</b>\n${err?.message || err}`);
  }
}

async function sendFaqsList(chatId: string) {
  const faqList = await db.select().from(faqs).where(eq(faqs.isPublished, true)).orderBy(desc(faqs.id));
  if (faqList.length === 0) {
    await sendBaleMessage(chatId, "در حال حاضر هیچ سوال متداولی ثبت نشده است.");
    return;
  }

  const inlineKeyboard = faqList.map(f => [{ text: `❓ ${f.title}`, callback_data: `faq_show_${f.id}` }]);
  await sendBaleMessage(chatId, "<b>❓ سوالات متداول</b>\nلطفاً سوال مورد نظر خود را از لیست زیر انتخاب کنید تا پاسخ آن نمایش داده شود:", { inline_keyboard: inlineKeyboard });
}

async function sendUserTicketsList(chatId: string, baleUserId: string) {
  const userTickets = await db.select().from(tickets).where(eq(tickets.userBaleId, baleUserId)).orderBy(desc(tickets.id)).limit(10);
  if (userTickets.length === 0) {
    await sendBaleMessage(chatId, "شما هنوز هیچ درخواست پشتیبانی ثبت نکرده‌اید.");
    return;
  }

  let text = "<b>🔍 لیست درخواست‌های ثبت شده شما:</b>\n\n";
  for (const t of userTickets) {
    const statusText = t.status === "pending" ? "⏳ در انتظار پاسخ" : t.status === "answered" ? "✅ پاسخ داده شده" : "🔒 بسته شده";
    text += `🔖 <b>کد:</b> <code>${t.ticketCode}</code>\n📂 <b>دسته:</b> ${t.category}\n📝 <b>موضوع:</b> ${t.subject}\n📊 <b>وضعیت:</b> ${statusText}\n\n`;
  }

  await sendBaleMessage(chatId, text);
}
