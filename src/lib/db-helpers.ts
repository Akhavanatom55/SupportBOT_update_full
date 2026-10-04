import { db } from "@/db";
import { botSettings, users, tickets, ticketMessages, faqs, botLogs, userStates } from "@/db/schema";
import { eq, desc, count, sql } from "drizzle-orm";

export async function getSetting(key: string, defaultValue = ""): Promise<string> {
  try {
    const res = await db.select().from(botSettings).where(eq(botSettings.key, key)).limit(1);
    if (res.length > 0) return res[0].value;
  } catch (err) {
    console.error(`Error reading setting ${key}:`, err);
  }
  return defaultValue;
}

export async function setSetting(key: string, value: string, description?: string) {
  const existing = await db.select().from(botSettings).where(eq(botSettings.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(botSettings).set({ value, updatedAt: new Date(), ...(description ? { description } : {}) }).where(eq(botSettings.key, key));
  } else {
    await db.insert(botSettings).values({ key, value, description });
  }
}

export async function getAdminIds(): Promise<string[]> {
  const envAdmins = (process.env.ADMIN_IDS || process.env.ADMIN_ID || "101,102,admin").split(",").map(s => s.trim()).filter(Boolean);
  
  // Also get users with role = 'admin' from DB
  try {
    const dbAdmins = await db.select({ baleId: users.baleId }).from(users).where(eq(users.role, "admin"));
    const dbAdminIds = dbAdmins.map(u => u.baleId);
    return Array.from(new Set([...envAdmins, ...dbAdminIds]));
  } catch {
    return envAdmins;
  }
}

export async function isUserAdmin(baleId: string): Promise<boolean> {
  const adminIds = await getAdminIds();
  return adminIds.includes(String(baleId));
}

export async function upsertUser(baleId: string, firstName?: string, lastName?: string, username?: string) {
  const existing = await db.select().from(users).where(eq(users.baleId, String(baleId))).limit(1);
  const isAdmin = await isUserAdmin(baleId);

  if (existing.length > 0) {
    await db.update(users).set({
      firstName: firstName || existing[0].firstName,
      lastName: lastName || existing[0].lastName,
      username: username || existing[0].username,
      role: isAdmin ? "admin" : existing[0].role,
    }).where(eq(users.baleId, String(baleId)));
    return existing[0];
  } else {
    const [inserted] = await db.insert(users).values({
      baleId: String(baleId),
      firstName,
      lastName,
      username,
      role: isAdmin ? "admin" : "user",
    }).returning();
    return inserted;
  }
}

export async function getUserState(baleId: string) {
  const state = await db.select().from(userStates).where(eq(userStates.baleId, String(baleId))).limit(1);
  if (state.length > 0) return state[0];
  return { step: "IDLE", metaData: {} };
}

export async function setUserState(baleId: string, step: string, metaData: any = {}) {
  const existing = await db.select().from(userStates).where(eq(userStates.baleId, String(baleId))).limit(1);
  if (existing.length > 0) {
    await db.update(userStates).set({ step, metaData, updatedAt: new Date() }).where(eq(userStates.baleId, String(baleId)));
  } else {
    await db.insert(userStates).values({ baleId: String(baleId), step, metaData });
  }
}

export async function createTicket(userBaleId: string, userName: string, subject: string, category = "عمومی") {
  const code = "TK-" + Math.floor(100000 + Math.random() * 900000);
  const [ticket] = await db.insert(tickets).values({
    ticketCode: code,
    userBaleId: String(userBaleId),
    userName: userName || "کاربر بله",
    subject,
    category,
    status: "pending",
  }).returning();

  await db.insert(ticketMessages).values({
    ticketId: ticket.id,
    senderRole: "user",
    senderBaleId: String(userBaleId),
    senderName: userName,
    message: subject,
  });

  return ticket;
}

export async function addTicketMessage(ticketId: number, senderRole: string, senderBaleId: string, senderName: string, message: string) {
  const [msg] = await db.insert(ticketMessages).values({
    ticketId,
    senderRole,
    senderBaleId,
    senderName,
    message,
  }).returning();

  // Update ticket status & timestamp
  if (senderRole === "admin") {
    await db.update(tickets).set({ status: "answered", updatedAt: new Date() }).where(eq(tickets.id, ticketId));
  } else if (senderRole === "user") {
    await db.update(tickets).set({ status: "pending", updatedAt: new Date() }).where(eq(tickets.id, ticketId));
  }

  return msg;
}

// Database Export & Backup Function (as required: "دریافت دیتابیس، ارسال دیتابیس که اگه پشتیبانی داشتن بتونن دیتابیس رو ارسال کنن و تمام چیزهایی که ذخیره شده برگردن")
export async function exportDatabaseBackupJSON() {
  const allUsers = await db.select().from(users);
  const allTickets = await db.select().from(tickets);
  const allMessages = await db.select().from(ticketMessages);
  const allFaqs = await db.select().from(faqs);
  const allSettings = await db.select().from(botSettings);

  const backupData = {
    version: "1.0",
    timestamp: new Date().toISOString(),
    users: allUsers,
    tickets: allTickets,
    messages: allMessages,
    faqs: allFaqs,
    settings: allSettings,
  };

  return JSON.stringify(backupData, null, 2);
}

export async function importDatabaseRestoreJSON(jsonString: string) {
  let data: any;
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    throw new Error("فایل ارسال شده قالب JSON معتبر ندارد.");
  }

  let importedStats = { users: 0, faqs: 0, tickets: 0, settings: 0 };

  // Restore Settings
  if (Array.isArray(data.settings)) {
    for (const s of data.settings) {
      if (s.key && s.value !== undefined) {
        await setSetting(s.key, s.value, s.description);
        importedStats.settings++;
      }
    }
  }

  // Restore FAQs
  if (Array.isArray(data.faqs)) {
    for (const f of data.faqs) {
      if (f.title && f.answer) {
        const exist = await db.select().from(faqs).where(eq(faqs.title, f.title)).limit(1);
        if (exist.length === 0) {
          await db.insert(faqs).values({
            title: f.title,
            answer: f.answer,
            category: f.category || "عمومی",
            isPublished: f.isPublished ?? true,
          });
          importedStats.faqs++;
        }
      }
    }
  }

  // Restore Users
  if (Array.isArray(data.users)) {
    for (const u of data.users) {
      if (u.baleId) {
        await upsertUser(u.baleId, u.firstName, u.lastName, u.username);
        importedStats.users++;
      }
    }
  }

  // Restore Tickets
  if (Array.isArray(data.tickets)) {
    for (const t of data.tickets) {
      if (t.ticketCode && t.userBaleId) {
        const exist = await db.select().from(tickets).where(eq(tickets.ticketCode, t.ticketCode)).limit(1);
        if (exist.length === 0) {
          await db.insert(tickets).values({
            ticketCode: t.ticketCode,
            userBaleId: t.userBaleId,
            userName: t.userName || "کاربر",
            subject: t.subject || "درخواست پشتیبانی",
            category: t.category || "عمومی",
            status: t.status || "pending",
          });
          importedStats.tickets++;
        }
      }
    }
  }

  return importedStats;
}

export async function getSystemStats() {
  const [totalUsers] = await db.select({ val: count() }).from(users);
  const [totalTickets] = await db.select({ val: count() }).from(tickets);
  const [pendingTickets] = await db.select({ val: count() }).from(tickets).where(eq(tickets.status, "pending"));
  const [answeredTickets] = await db.select({ val: count() }).from(tickets).where(eq(tickets.status, "answered"));
  const [totalFaqs] = await db.select({ val: count() }).from(faqs);

  return {
    usersCount: totalUsers?.val || 0,
    ticketsCount: totalTickets?.val || 0,
    pendingTicketsCount: pendingTickets?.val || 0,
    answeredTicketsCount: answeredTickets?.val || 0,
    faqsCount: totalFaqs?.val || 0,
  };
}

export async function logBotAction(type: string, message: string, payload: any = null) {
  try {
    await db.insert(botLogs).values({ type, message, payload });
  } catch (e) {
    console.error("Error writing bot log:", e);
  }
}
