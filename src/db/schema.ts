import { pgTable, serial, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const botSettings = pgTable("bot_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  baleId: text("bale_id").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  username: text("username"),
  phone: text("phone"),
  role: text("role").default("user").notNull(), // 'user' | 'admin'
  isBlocked: boolean("is_blocked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketCode: text("ticket_code").notNull().unique(),
  userBaleId: text("user_bale_id").notNull(),
  userName: text("user_name"),
  subject: text("subject").notNull(),
  category: text("category").default("عمومی").notNull(),
  status: text("status").default("pending").notNull(), // 'pending', 'in_progress', 'answered', 'closed'
  priority: text("priority").default("medium").notNull(), // 'low', 'medium', 'high'
  aiHandled: boolean("ai_handled").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ticketMessages = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id, { onDelete: "cascade" }).notNull(),
  senderRole: text("sender_role").notNull(), // 'user', 'admin', 'ai', 'system'
  senderBaleId: text("sender_bale_id"),
  senderName: text("sender_name"),
  message: text("message").notNull(),
  mediaType: text("media_type"), // 'photo', 'document', 'voice'
  mediaFileId: text("media_file_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  answer: text("answer").notNull(),
  category: text("category").default("عمومی").notNull(),
  isPublished: boolean("is_published").default(true).notNull(),
  viewCount: integer("view_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const botLogs = pgTable("bot_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'info', 'warning', 'error', 'command'
  message: text("message").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userStates = pgTable("user_states", {
  id: serial("id").primaryKey(),
  baleId: text("bale_id").notNull().unique(),
  step: text("step").default("IDLE").notNull(), // e.g., 'WAITING_TICKET_CATEGORY', 'WAITING_TICKET_MSG', 'WAITING_FAQ_TITLE', etc.
  metaData: jsonb("meta_data"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
