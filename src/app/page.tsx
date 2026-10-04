"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  LayoutDashboard,
  MessageSquare,
  HelpCircle,
  Users,
  Settings,
  Database,
  Terminal,
  Download,
  Moon,
  Sun,
  Send,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Search,
  Sparkles,
  Zap,
  Shield,
  Key,
  Globe,
  Radio,
  FileJson,
  Upload,
  ChevronRight,
  UserCheck,
  UserX,
  MessageCircleCheck,
  Cpu,
  ArrowUpRight,
  ExternalLink
} from "lucide-react";

export default function AdminDashboard() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Stats state
  const [stats, setStats] = useState<any>({
    usersCount: 0,
    ticketsCount: 0,
    pendingTicketsCount: 0,
    answeredTicketsCount: 0,
    faqsCount: 0,
    baleStatus: "checking",
    baleBotInfo: null,
    geminiConfigured: false,
    tokenConfigured: false,
  });

  const [loadingStats, setLoadingStats] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketFilter, setTicketFilter] = useState("all");
  const [ticketSearch, setTicketSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [ticketMessages, setTicketMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // FAQs state
  const [faqs, setFaqs] = useState<any[]>([]);
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [newFaq, setNewFaq] = useState({ title: "", answer: "", category: "عمومی" });

  // Users state
  const [usersList, setUsersList] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [directMsgUser, setDirectMsgUser] = useState<any>(null);
  const [directMsgText, setDirectMsgText] = useState("");

  // Settings state
  const [settings, setSettings] = useState<any>({
    BALE_BOT_TOKEN: "",
    GEMINI_API_KEY: "",
    ADMIN_IDS: "",
    GEMINI_MODEL: "gemini-1.5-flash",
  });
  const [webhookUrl, setWebhookUrl] = useState("");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Simulator State
  const [simMessages, setSimMessages] = useState<Array<{ sender: string; text: string; source?: string }>>([
    { sender: "bot", text: "سلام! من شبیه‌ساز پشتیبانی ربات بله هستم. پیام خود را بنویسید تا نحوه پاسخ ربات و هوش مصنوعی جمینای را تست کنید." },
  ]);
  const [simInput, setSimText] = useState("");
  const [simLoading, setSimLoading] = useState(false);

  // Backup & Restore
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    fetchTickets();
    fetchFaqs();
    fetchUsers();
    fetchSettings();
  }, []);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/stats");
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/tickets");
      const data = await res.json();
      if (Array.isArray(data)) setTickets(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFaqs = async () => {
    try {
      const res = await fetch("/api/faqs");
      const data = await res.json();
      if (Array.isArray(data)) setFaqs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (Array.isArray(data)) setUsersList(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadTicketDetails = async (t: any) => {
    setSelectedTicket(t);
    try {
      const res = await fetch(`/api/tickets/${t.id}/messages`);
      const data = await res.json();
      if (data.messages) setTicketMessages(data.messages);
    } catch (e) {
      console.error(e);
    }
  };

  const sendTicketReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderRole: "admin",
          senderName: "پشتیبان وب",
          message: replyText,
        }),
      });
      if (res.ok) {
        setReplyText("");
        await loadTicketDetails(selectedTicket);
        fetchTickets();
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSendingReply(false);
    }
  };

  const handleCreateFaq = async () => {
    if (!newFaq.title || !newFaq.answer) return;
    try {
      const res = await fetch("/api/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFaq),
      });
      if (res.ok) {
        setFaqModalOpen(false);
        setNewFaq({ title: "", answer: "", category: "عمومی" });
        fetchFaqs();
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteFaq = async (id: number) => {
    if (!confirm("آیا از حذف این سوال متداول اطمینان دارید؟")) return;
    try {
      const res = await fetch(`/api/faqs?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchFaqs();
        fetchStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async () => {
    setSaveStatus("در حال ذخیره...");
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSaveStatus("✅ تنظیمات با موفقیت ذخیره شد!");
        fetchStats();
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (e) {
      setSaveStatus("❌ خطا در ذخیره تنظیمات");
    }
  };

  const handleSetWebhook = async () => {
    if (!webhookUrl) return alert("لطفاً آدرس دامنه وب‌هوک را وارد کنید.");
    try {
      const res = await fetch("/api/bale/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_webhook", webhookUrl }),
      });
      const data = await res.json();
      alert(data.ok ? "✅ Webhook با موفقیت ثبت شد!" : `❌ خطا: ${data.description || "ناموفق"}`);
      fetchStats();
    } catch (e) {
      alert("خطا در ارتباط با سرور");
    }
  };

  const handleSendSimulator = async () => {
    if (!simInput.trim()) return;
    const userMsg = simInput;
    setSimMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setSimText("");
    setSimLoading(true);

    try {
      const res = await fetch("/api/test-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, mode: "auto" }),
      });
      const data = await res.json();
      setSimMessages((prev) => [
        ...prev,
        { sender: "bot", text: data.reply || "پاسخی دریافت نشد.", source: data.source },
      ]);
    } catch (e) {
      setSimMessages((prev) => [...prev, { sender: "bot", text: "❌ خطا در دریافت پاسخ." }]);
    } finally {
      setSimLoading(false);
    }
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setRestoreStatus("در حال بازیابی اطلاعات دیتابیس...");
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: text,
      });
      const data = await res.json();
      if (res.ok) {
        setRestoreStatus(`✅ بازیابی کامل شد! (${data.stats.users} کاربر، ${data.stats.tickets} درخواست، ${data.stats.faqs} سوال)`);
        fetchStats();
        fetchTickets();
        fetchFaqs();
        fetchUsers();
      } else {
        setRestoreStatus(`❌ خطا: ${data.error}`);
      }
    } catch (err) {
      setRestoreStatus("❌ فایل آپلود شده نامعتبر است.");
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (ticketFilter !== "all" && t.status !== ticketFilter) return false;
    if (ticketSearch) {
      const q = ticketSearch.toLowerCase();
      return (
        t.ticketCode.toLowerCase().includes(q) ||
        t.userName?.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredUsers = usersList.filter((u) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return (
      u.baleId.includes(q) ||
      u.firstName?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    );
  });

  const isDark = theme === "dark";

  return (
    <div
      dir="rtl"
      className={`min-h-screen font-sans transition-colors duration-300 ${
        isDark ? "bg-[#090d16] text-slate-100" : "bg-slate-50 text-slate-800"
      }`}
    >
      {/* Background Neon Glowing Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className={`absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl opacity-20 ${
            isDark ? "bg-cyan-500" : "bg-blue-300"
          }`}
        />
        <div
          className={`absolute top-1/3 -left-40 w-96 h-96 rounded-full blur-3xl opacity-20 ${
            isDark ? "bg-purple-600" : "bg-indigo-300"
          }`}
        />
        <div
          className={`absolute -bottom-40 right-1/3 w-96 h-96 rounded-full blur-3xl opacity-20 ${
            isDark ? "bg-emerald-500" : "bg-teal-300"
          }`}
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* TOP HEADER */}
        <header
          className={`sticky top-0 backdrop-blur-xl border-b px-6 py-4 flex items-center justify-between transition-colors ${
            isDark
              ? "bg-[#0f172a]/80 border-slate-800/80 text-white"
              : "bg-white/80 border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 shadow-lg shadow-cyan-500/20 text-white">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
                <span>پنل مدیریتی سامانه بله</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-mono">
                  v2.0 PRO
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                مدیریت ربات پشتیبانی، پاسخ‌گویی به کاربران و هوش مصنوعی جمینای
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Download Zip Header Button */}
            <a
              href="/api/download-zip"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Download className="w-4 h-4 animate-bounce" />
              <span>دانلود فایل Zip (دیپلوی بلمو / گیت‌هاب)</span>
            </a>

            {/* Dark/Light mode toggle */}
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className={`p-2.5 rounded-xl border transition-all ${
                isDark
                  ? "bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-slate-700"
                  : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
              }`}
              title="تغییر پوسته"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* MAIN BODY LAYOUT */}
        <div className="flex-1 flex flex-col md:flex-row">
          {/* SIDEBAR NAVIGATION */}
          <aside
            className={`w-full md:w-72 p-4 border-b md:border-b-0 md:border-l flex flex-col gap-2 shrink-0 ${
              isDark ? "bg-[#0b1329]/60 border-slate-800/80" : "bg-white/60 border-slate-200"
            }`}
          >
            <div className="text-xs font-bold text-slate-400 px-3 pt-2 pb-1">منوی مدیریت</div>

            <NavItem
              icon={<LayoutDashboard className="w-5 h-5" />}
              label="داشبورد و آمار سیستم"
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              badge={stats.pendingTicketsCount > 0 ? `${stats.pendingTicketsCount} جدید` : undefined}
              badgeColor="bg-rose-500"
              isDark={isDark}
            />

            <NavItem
              icon={<MessageSquare className="w-5 h-5" />}
              label="مدیریت درخواست‌ها"
              active={activeTab === "tickets"}
              onClick={() => setActiveTab("tickets")}
              badge={tickets.length}
              isDark={isDark}
            />

            <NavItem
              icon={<HelpCircle className="w-5 h-5" />}
              label="سوالات متداول (FAQ)"
              active={activeTab === "faqs"}
              onClick={() => setActiveTab("faqs")}
              badge={faqs.length}
              isDark={isDark}
            />

            <NavItem
              icon={<Users className="w-5 h-5" />}
              label="کاربران ربات بله"
              active={activeTab === "users"}
              onClick={() => setActiveTab("users")}
              badge={usersList.length}
              isDark={isDark}
            />

            <NavItem
              icon={<Settings className="w-5 h-5" />}
              label="تنظیمات ربات و API"
              active={activeTab === "settings"}
              onClick={() => setActiveTab("settings")}
              isDark={isDark}
            />

            <NavItem
              icon={<Database className="w-5 h-5" />}
              label="پشتیبان‌گیری و بازگردانی"
              active={activeTab === "backup"}
              onClick={() => setActiveTab("backup")}
              isDark={isDark}
            />

            <NavItem
              icon={<Terminal className="w-5 h-5" />}
              label="تست‌کننده و شبیه‌ساز"
              active={activeTab === "simulator"}
              onClick={() => setActiveTab("simulator")}
              isDark={isDark}
            />

            <NavItem
              icon={<Download className="w-5 h-5 text-emerald-400" />}
              label="سورس‌کد و راهنمای دیپلوی"
              active={activeTab === "download"}
              onClick={() => setActiveTab("download")}
              highlight
              isDark={isDark}
            />

            {/* BOT STATUS WIDGET IN SIDEBAR */}
            <div
              className={`mt-auto p-4 rounded-2xl border flex flex-col gap-2.5 text-xs ${
                isDark
                  ? "bg-slate-900/90 border-slate-800"
                  : "bg-slate-100/90 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                  وضعیت اتصالات
                </span>
                <button onClick={fetchStats} className="p-1 hover:rotate-180 transition-transform">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span>ربات بله:</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    stats.tokenConfigured
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {stats.tokenConfigured ? "متصل / آماده" : "توکن تنظیم نشده"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>هوش مصنوعی (Gemini):</span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    stats.geminiConfigured
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {stats.geminiConfigured ? "فعال" : "غیرفعال"}
                </span>
              </div>
            </div>
          </aside>

          {/* TAB CONTENT AREA */}
          <main className="flex-1 p-6 overflow-y-auto">
            <AnimatePresence mode="wait">
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-[#090d16] space-y-6"
                >
                  {/* ZIP DOWNLOAD ALERT BANNER */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-cyan-900/40 via-indigo-900/40 to-purple-900/40 border border-cyan-500/30 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
                        <Sparkles className="w-8 h-8 animate-spin-slow" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          نسخه جدید آماده دیپلوی در بلمو (Belmu) و دپلکس / داکر
                        </h3>
                        <p className="text-xs text-slate-300 mt-1">
                          می‌توانید تمامی کدهای کامل پروژه به همراه فایل‌های پایتون (`python_app`) و داکر را مستقیماً به صورت فایل Zip دریافت کنید و در گیت‌هاب یا بلمو آپلود فرمایید.
                        </p>
                      </div>
                    </div>
                    <a
                      href="/api/download-zip"
                      className="shrink-0 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/30 flex items-center gap-2 transition-transform transform hover:scale-105"
                    >
                      <Download className="w-4 h-4" />
                      <span>دانلود فایل کامل ZIP پروژه</span>
                    </a>
                  </div>

                  {/* GLOWING STAT CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      title="کل کاربران ربات"
                      value={stats.usersCount}
                      icon={<Users className="w-6 h-6 text-cyan-400" />}
                      gradient="from-cyan-500/20 via-blue-500/10 to-transparent"
                      borderColor="border-cyan-500/30"
                      isDark={isDark}
                    />
                    <StatCard
                      title="درخواست‌های جدید (در انتظار)"
                      value={stats.pendingTicketsCount}
                      icon={<Clock className="w-6 h-6 text-amber-400" />}
                      gradient="from-amber-500/20 via-orange-500/10 to-transparent"
                      borderColor="border-amber-500/30"
                      isDark={isDark}
                      alert={stats.pendingTicketsCount > 0}
                    />
                    <StatCard
                      title="پاسخ داده شده"
                      value={stats.answeredTicketsCount}
                      icon={<MessageCircleCheck className="w-6 h-6 text-emerald-400" />}
                      gradient="from-emerald-500/20 via-teal-500/10 to-transparent"
                      borderColor="border-emerald-500/30"
                      isDark={isDark}
                    />
                    <StatCard
                      title="سوالات متداول (FAQ)"
                      value={stats.faqsCount}
                      icon={<HelpCircle className="w-6 h-6 text-purple-400" />}
                      gradient="from-purple-500/20 via-pink-500/10 to-transparent"
                      borderColor="border-purple-500/30"
                      isDark={isDark}
                    />
                  </div>

                  {/* QUICK ACTIONS & BOT INFO */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* RECENT TICKETS PREVIEW */}
                    <div
                      className={`lg:col-span-2 p-5 rounded-2xl border backdrop-blur-xl flex flex-col gap-4 ${
                        isDark ? "bg-[#0d1527]/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-cyan-400" />
                          آخرین درخواست‌های پشتیبانی
                        </h3>
                        <button
                          onClick={() => setActiveTab("tickets")}
                          className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          مشاهده همه ({tickets.length})
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      {tickets.length === 0 ? (
                        <div className="text-center py-10 text-slate-500 text-xs">
                          هنوز هیچ درخواستی ثبت نشده است.
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-800/50">
                          {tickets.slice(0, 5).map((t) => (
                            <div
                              key={t.id}
                              onClick={() => {
                                setSelectedTicket(t);
                                loadTicketDetails(t);
                                setActiveTab("tickets");
                              }}
                              className="py-3 flex items-center justify-between hover:bg-slate-800/30 px-2 rounded-xl transition-colors cursor-pointer"
                            >
                              <div>
                                <div className="font-bold text-xs flex items-center gap-2">
                                  <span className="font-mono text-cyan-400">{t.ticketCode}</span>
                                  <span>{t.userName}</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-1 truncate max-w-xs md:max-w-md">
                                  {t.subject}
                                </div>
                              </div>
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  t.status === "pending"
                                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                    : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                }`}
                              >
                                {t.status === "pending" ? "در انتظار پاسخ" : "پاسخ داده شده"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* BALE BOT & GEMINI STATUS PANEL */}
                    <div
                      className={`p-5 rounded-2xl border backdrop-blur-xl flex flex-col gap-4 ${
                        isDark ? "bg-[#0d1527]/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                      }`}
                    >
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-purple-400" />
                        اطلاعات ربات بله
                      </h3>

                      {stats.baleBotInfo ? (
                        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">نام ربات:</span>
                            <span className="font-bold">{stats.baleBotInfo.first_name}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">نام کاربری:</span>
                            <span className="font-mono text-cyan-400">@{stats.baleBotInfo.username}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">شناسه ربات:</span>
                            <span className="font-mono text-slate-300">{stats.baleBotInfo.id}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                          اطلاعات ربات بله دریافت نشد. لطفاً BALE_BOT_TOKEN را در تنظیمات بررسی کنید.
                        </div>
                      )}

                      <div className="mt-auto space-y-2">
                        <button
                          onClick={() => setActiveTab("settings")}
                          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-2 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <span>مدیریت تنظیمات و کلیدهای API</span>
                        </button>

                        <button
                          onClick={() => setActiveTab("simulator")}
                          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-600/20"
                        >
                          <Zap className="w-4 h-4" />
                          <span>تست آنی پاسخ ربات (شبیه‌ساز)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: TICKETS CENTER */}
              {activeTab === "tickets" && (
                <motion.div
                  key="tickets"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold">مدیریت درخواست‌های پشتیبانی</h2>
                      <p className="text-xs text-slate-400">
                        مشاهده، بررسی و پاسخ‌گویی مستقیم به پیام‌های کاربران ربات بله
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="relative flex-1 sm:w-64">
                        <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          placeholder="جستجو بر اساس کد، نام یا متن..."
                          value={ticketSearch}
                          onChange={(e) => setTicketSearch(e.target.value)}
                          className={`w-full pr-9 pl-4 py-2 text-xs rounded-xl border outline-none ${
                            isDark
                              ? "bg-slate-900 border-slate-700 focus:border-cyan-500"
                              : "bg-white border-slate-300 focus:border-cyan-500"
                          }`}
                        />
                      </div>

                      <select
                        value={ticketFilter}
                        onChange={(e) => setTicketFilter(e.target.value)}
                        className={`px-3 py-2 text-xs rounded-xl border outline-none ${
                          isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-300"
                        }`}
                      >
                        <option value="all">همه وضعیت‌ها</option>
                        <option value="pending">در انتظار پاسخ</option>
                        <option value="answered">پاسخ داده شده</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* TICKETS LIST TABLE */}
                    <div
                      className={`lg:col-span-1 rounded-2xl border p-4 overflow-hidden backdrop-blur-xl ${
                        isDark ? "bg-[#0d1527]/80 border-slate-800" : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="font-bold text-xs pb-3 border-b border-slate-800 flex items-center justify-between">
                        <span>لیست درخواست‌ها ({filteredTickets.length})</span>
                        <button onClick={fetchTickets} className="p-1 hover:rotate-180 transition-transform">
                          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                        </button>
                      </div>

                      <div className="divide-y divide-slate-800/40 max-h-[600px] overflow-y-auto mt-2">
                        {filteredTickets.length === 0 ? (
                          <div className="text-center py-8 text-xs text-slate-500">هیچ درخواستی یافت نشد.</div>
                        ) : (
                          filteredTickets.map((t) => (
                            <div
                              key={t.id}
                              onClick={() => loadTicketDetails(t)}
                              className={`p-3 rounded-xl transition-all cursor-pointer ${
                                selectedTicket?.id === t.id
                                  ? "bg-cyan-500/20 border border-cyan-500/30"
                                  : "hover:bg-slate-800/40"
                              }`}
                            >
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-mono font-bold text-cyan-400">{t.ticketCode}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    t.status === "pending"
                                      ? "bg-amber-500/20 text-amber-400"
                                      : "bg-emerald-500/20 text-emerald-400"
                                  }`}
                                >
                                  {t.status === "pending" ? "در انتظار" : "پاسخ داده شده"}
                                </span>
                              </div>
                              <div className="font-bold text-xs truncate">{t.userName}</div>
                              <div className="text-[11px] text-slate-400 truncate mt-0.5">{t.subject}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* TICKET CONVERSATION CHAT DRAWER */}
                    <div
                      className={`lg:col-span-2 rounded-2xl border p-5 flex flex-col backdrop-blur-xl ${
                        isDark ? "bg-[#0d1527]/80 border-slate-800" : "bg-white border-slate-200"
                      }`}
                      style={{ minHeight: "500px" }}
                    >
                      {selectedTicket ? (
                        <>
                          {/* Chat Header */}
                          <div className="pb-4 border-b border-slate-800 flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-cyan-400 font-bold text-sm">
                                  {selectedTicket.ticketCode}
                                </span>
                                <h3 className="font-bold text-sm">{selectedTicket.userName}</h3>
                                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                  دسته‌بندی: {selectedTicket.category}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-1">
                                شناسه بله کاربر: <code>{selectedTicket.userBaleId}</code>
                              </p>
                            </div>
                          </div>

                          {/* Chat Messages */}
                          <div className="flex-1 py-4 overflow-y-auto space-y-3 min-h-[300px] max-h-[400px]">
                            {ticketMessages.map((m) => {
                              const isAdminRole = m.senderRole === "admin";
                              return (
                                <div
                                  key={m.id}
                                  className={`flex flex-col ${isAdminRole ? "items-start" : "items-end"}`}
                                >
                                  <div
                                    className={`max-w-md p-3 rounded-2xl text-xs space-y-1 shadow-md ${
                                      isAdminRole
                                        ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none"
                                        : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
                                    }`}
                                  >
                                    <div className="font-bold text-[10px] text-cyan-200">
                                      {m.senderName || (isAdminRole ? "پشتیبان" : "کاربر بله")}
                                    </div>
                                    <div className="leading-relaxed whitespace-pre-wrap">{m.message}</div>
                                    <div className="text-[9px] text-slate-300 text-left dir-ltr opacity-70">
                                      {new Date(m.createdAt).toLocaleTimeString("fa-IR", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Reply Input Box */}
                          <div className="pt-3 border-t border-slate-800 flex gap-2">
                            <textarea
                              rows={2}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="پاسخ خود را بنویسید (مستقیماً در بله برای کاربر ارسال خواهد شد)..."
                              className={`flex-1 p-3 text-xs rounded-xl border outline-none resize-none ${
                                isDark
                                  ? "bg-slate-900 border-slate-700 focus:border-cyan-500"
                                  : "bg-white border-slate-300 focus:border-cyan-500"
                              }`}
                            />
                            <button
                              onClick={sendTicketReply}
                              disabled={sendingReply || !replyText.trim()}
                              className="px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 transition-all"
                            >
                              <Send className="w-4 h-4" />
                              <span>ارسال</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                          <MessageSquare className="w-12 h-12 text-slate-600" />
                          <span>جهت مشاهده گفتگو و ارسال پاسخ، یک درخواست از لیست انتخاب کنید.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: FAQ MANAGER */}
              {activeTab === "faqs" && (
                <motion.div
                  key="faqs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold">مدیریت سوالات متداول (FAQ)</h2>
                      <p className="text-xs text-slate-400">
                        تعریف سوالات پرکاربرد جهت پاسخ‌گویی خودکار در ربات بله
                      </p>
                    </div>

                    <button
                      onClick={() => setFaqModalOpen(true)}
                      className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>ثبت سوال متداول جدید</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {faqs.map((f) => (
                      <div
                        key={f.id}
                        className={`p-4 rounded-2xl border flex flex-col justify-between backdrop-blur-xl relative overflow-hidden group ${
                          isDark ? "bg-[#0d1527]/80 border-slate-800" : "bg-white border-slate-200 shadow-sm"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              {f.category}
                            </span>
                            <button
                              onClick={() => handleDeleteFaq(f.id)}
                              className="p-1.5 text-rose-400 hover:bg-rose-500/20 rounded-lg transition-colors"
                              title="حذف سوال"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <h3 className="font-bold text-sm text-slate-100 mb-2">{f.title}</h3>
                          <p className="text-xs text-slate-300 leading-relaxed">{f.answer}</p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                          <span>تعداد بازدید: {f.viewCount || 0}</span>
                          <span>تاریخ ثبت: {new Date(f.createdAt).toLocaleDateString("fa-IR")}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* FAQ MODAL */}
                  {faqModalOpen && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                      <div
                        className={`w-full max-w-md p-6 rounded-2xl border space-y-4 shadow-2xl ${
                          isDark ? "bg-[#0f172a] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                        }`}
                      >
                        <h3 className="font-bold text-base">افزودن سوال متداول جدید</h3>

                        <div>
                          <label className="text-xs text-slate-400 block mb-1">عنوان سوال:</label>
                          <input
                            type="text"
                            value={newFaq.title}
                            onChange={(e) => setNewFaq({ ...newFaq, title: e.target.value })}
                            placeholder="مثلاً: نحوه ثبت نام به چه صورت است؟"
                            className={`w-full p-2.5 text-xs rounded-xl border outline-none ${
                              isDark ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-300"
                            }`}
                          />
                        </div>

                        <div>
                          <label className="text-xs text-slate-400 block mb-1">پاسخ سوال:</label>
                          <textarea
                            rows={4}
                            value={newFaq.answer}
                            onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                            placeholder="پاسخ کامل و جامع سوال را تایپ نمایید..."
                            className={`w-full p-2.5 text-xs rounded-xl border outline-none ${
                              isDark ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-300"
                            }`}
                          />
                        </div>

                        <div className="flex gap-2 justify-end pt-2">
                          <button
                            onClick={() => setFaqModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs border border-slate-700 text-slate-400 hover:bg-slate-800"
                          >
                            انصراف
                          </button>
                          <button
                            onClick={handleCreateFaq}
                            className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950"
                          >
                            ثبت و ذخیره
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 4: USERS MANAGEMENT */}
              {activeTab === "users" && (
                <motion.div
                  key="users"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold">کاربران ربات بله</h2>
                      <p className="text-xs text-slate-400">
                        لیست کلیه کاربرانی که با ربات تعامل داشته‌اند
                      </p>
                    </div>

                    <div className="relative w-64">
                      <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="جستجو بر اساس نام یا Bale ID..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className={`w-full pr-9 pl-4 py-2 text-xs rounded-xl border outline-none ${
                          isDark ? "bg-slate-900 border-slate-700" : "bg-white border-slate-300"
                        }`}
                      />
                    </div>
                  </div>

                  <div
                    className={`rounded-2xl border overflow-hidden backdrop-blur-xl ${
                      isDark ? "bg-[#0d1527]/80 border-slate-800" : "bg-white border-slate-200"
                    }`}
                  >
                    <table className="w-full text-right text-xs">
                      <thead className={`border-b ${isDark ? "bg-slate-900/80 border-slate-800 text-slate-400" : "bg-slate-100 border-slate-200"}`}>
                        <tr>
                          <th className="p-3">نام کاربر</th>
                          <th className="p-3">شناسه بله (Bale ID)</th>
                          <th className="p-3">نام کاربری</th>
                          <th className="p-3">نقش</th>
                          <th className="p-3">وضعیت</th>
                          <th className="p-3 text-center">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-3 font-bold">{u.firstName} {u.lastName}</td>
                            <td className="p-3 font-mono text-cyan-400">{u.baleId}</td>
                            <td className="p-3 font-mono text-slate-400">@{u.username || "---"}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.role === "admin"
                                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                    : "bg-slate-800 text-slate-400"
                                }`}
                              >
                                {u.role === "admin" ? "مدیر ارشد" : "کاربر عادی"}
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  u.isBlocked
                                    ? "bg-rose-500/20 text-rose-400"
                                    : "bg-emerald-500/20 text-emerald-400"
                                }`}
                              >
                                {u.isBlocked ? "مسدود شده" : "فعال"}
                              </span>
                            </td>
                            <td className="p-3 flex items-center justify-center gap-2">
                              <button
                                onClick={() => setDirectMsgUser(u)}
                                className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 text-[10px] font-bold flex items-center gap-1"
                              >
                                <Send className="w-3 h-3" />
                                <span>پیام مستقیم</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* DIRECT MSG MODAL */}
                  {directMsgUser && (
                    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                      <div
                        className={`w-full max-w-md p-6 rounded-2xl border space-y-4 shadow-2xl ${
                          isDark ? "bg-[#0f172a] border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
                        }`}
                      >
                        <h3 className="font-bold text-base">ارسال پیام مستقیم به کاربر بله</h3>
                        <p className="text-xs text-slate-400">
                          گیرنده: {directMsgUser.firstName} (Bale ID: {directMsgUser.baleId})
                        </p>

                        <textarea
                          rows={4}
                          value={directMsgText}
                          onChange={(e) => setDirectMsgText(e.target.value)}
                          placeholder="متن پیام خصوصی را تایپ فرمایید..."
                          className={`w-full p-2.5 text-xs rounded-xl border outline-none ${
                            isDark ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-300"
                          }`}
                        />

                        <div className="flex gap-2 justify-end pt-2">
                          <button
                            onClick={() => setDirectMsgUser(null)}
                            className="px-4 py-2 rounded-xl text-xs border border-slate-700 text-slate-400 hover:bg-slate-800"
                          >
                            انصراف
                          </button>
                          <button
                            onClick={async () => {
                              if (!directMsgText.trim()) return;
                              await fetch("/api/users", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  action: "send_direct_message",
                                  baleId: directMsgUser.baleId,
                                  message: directMsgText,
                                }),
                              });
                              alert("پیام ارسال شد!");
                              setDirectMsgUser(null);
                              setDirectMsgText("");
                            }}
                            className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                          >
                            ارسال پیام
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 5: BOT SETTINGS */}
              {activeTab === "settings" && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 max-w-3xl"
                >
                  <div>
                    <h2 className="text-lg font-bold">تنظیمات ربات بله و کلیدهای API</h2>
                    <p className="text-xs text-slate-400">
                      پیکربندی اتصال به پیام‌رسان بله، API جمینای و شناسه‌های مدیران
                    </p>
                  </div>

                  <div
                    className={`p-6 rounded-2xl border space-y-5 backdrop-blur-xl ${
                      isDark ? "bg-[#0d1527]/80 border-slate-800" : "bg-white border-slate-200"
                    }`}
                  >
                    {/* BALE BOT TOKEN */}
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center gap-2">
                        <Key className="w-4 h-4 text-cyan-400" />
                        توکن ربات بله (Bale Bot Token):
                      </label>
                      <input
                        type="text"
                        value={settings.BALE_BOT_TOKEN || ""}
                        onChange={(e) => setSettings({ ...settings, BALE_BOT_TOKEN: e.target.value })}
                        placeholder="bot123456789:ABCdefGHIjklMNO..."
                        className={`w-full p-3 font-mono text-xs rounded-xl border outline-none ${
                          isDark ? "bg-slate-900 border-slate-700 focus:border-cyan-500" : "bg-slate-50 border-slate-300"
                        }`}
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        توکن دریافتی از BotFather پیام‌رسان بله
                      </span>
                    </div>

                    {/* GEMINI API KEY */}
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        کلید API هوش مصنوعی جمینای (Gemini API Key):
                      </label>
                      <input
                        type="password"
                        value={settings.GEMINI_API_KEY || ""}
                        onChange={(e) => setSettings({ ...settings, GEMINI_API_KEY: e.target.value })}
                        placeholder="AIzaSy..."
                        className={`w-full p-3 font-mono text-xs rounded-xl border outline-none ${
                          isDark ? "bg-slate-900 border-slate-700 focus:border-cyan-500" : "bg-slate-50 border-slate-300"
                        }`}
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        کلید معتبر جهت پاسخ‌گویی هوشمند به سوالات کاربران با Gemini 1.5 Flash
                      </span>
                    </div>

                    {/* ADMIN USER IDS */}
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-emerald-400" />
                        شناسه‌های بله ادمین‌ها (ADMIN_IDS):
                      </label>
                      <input
                        type="text"
                        value={settings.ADMIN_IDS || ""}
                        onChange={(e) => setSettings({ ...settings, ADMIN_IDS: e.target.value })}
                        placeholder="101,102,98765432"
                        className={`w-full p-3 font-mono text-xs rounded-xl border outline-none ${
                          isDark ? "bg-slate-900 border-slate-700 focus:border-cyan-500" : "bg-slate-50 border-slate-300"
                        }`}
                      />
                      <span className="text-[10px] text-slate-500 mt-1 block">
                        شناسه‌های عددی ادمین در بله (با کاما جدا کنید). این ادمین‌ها با زدن /admin در بله به پنل دسترسی خواهند داشت.
                      </span>
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      {saveStatus && <span className="text-xs font-bold text-cyan-400">{saveStatus}</span>}
                      <button
                        onClick={handleSaveSettings}
                        className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 mr-auto"
                      >
                        ذخیره تنظیمات
                      </button>
                    </div>
                  </div>

                  {/* WEBHOOK REGISTER CARD */}
                  <div
                    className={`p-6 rounded-2xl border space-y-4 backdrop-blur-xl ${
                      isDark ? "bg-[#0d1527]/80 border-slate-800" : "bg-white border-slate-200"
                    }`}
                  >
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-400" />
                      تنظیم Webhook دپلکس / بلمو روی سرور بله
                    </h3>

                    <div>
                      <label className="text-xs text-slate-400 block mb-1">آدرس دامنه دیپلوی شده (HTTPS):</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          placeholder="https://my-app.bale.site/api/bale/webhook"
                          className={`flex-1 p-2.5 font-mono text-xs rounded-xl border outline-none ${
                            isDark ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-300"
                          }`}
                        />
                        <button
                          onClick={handleSetWebhook}
                          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                        >
                          ثبت Webhook
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 6: BACKUP & RESTORE */}
              {activeTab === "backup" && (
                <motion.div
                  key="backup"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 max-w-3xl"
                >
                  <div>
                    <h2 className="text-lg font-bold">پشتیبان‌گیری و بازگردانی دیتابیس</h2>
                    <p className="text-xs text-slate-400">
                      دریافت خروجی کامل فایل پشتیبان یا آپلود فایل جهت بازیابی اطلاعات ذخیره شده
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* EXPORT BACKUP */}
                    <div
                      className={`p-6 rounded-2xl border flex flex-col justify-between backdrop-blur-xl ${
                        isDark ? "bg-[#0d1527]/80 border-slate-800" : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="p-3 w-fit rounded-xl bg-cyan-500/20 text-cyan-400">
                          <FileJson className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-sm">دانلود نسخه پشتیبان (Export Database)</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          با کلیک روی دکمه زیر، فایل پشتیبان حاوی کلیه درخواست‌ها، کاربران، سوالات متداول و تنظیمات به صورت JSON دانلود می‌شود.
                        </p>
                      </div>

                      <a
                        href="/api/backup"
                        download
                        className="mt-6 w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                      >
                        <Download className="w-4 h-4" />
                        <span>دریافت فایل بکاپ دیتابیس (JSON)</span>
                      </a>
                    </div>

                    {/* IMPORT RESTORE */}
                    <div
                      className={`p-6 rounded-2xl border flex flex-col justify-between backdrop-blur-xl ${
                        isDark ? "bg-[#0d1527]/80 border-slate-800" : "bg-white border-slate-200"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="p-3 w-fit rounded-xl bg-emerald-500/20 text-emerald-400">
                          <Upload className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-sm">بازگردانی اطلاعات پشتیبان (Import Database)</h3>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          اگر فایل پشتیبان JSON قبلی را دارید، آن را انتخاب کنید تا تمام دیتاهای قبلی بلافاصله بازگردانده شوند.
                        </p>
                      </div>

                      <div className="mt-6">
                        <label className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer border border-slate-700">
                          <Upload className="w-4 h-4" />
                          <span>انتخاب و آپلود فایل JSON</span>
                          <input type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
                        </label>
                      </div>
                    </div>
                  </div>

                  {restoreStatus && (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-cyan-400 text-center">
                      {restoreStatus}
                    </div>
                  )}
                </motion.div>
              )}

              {/* TAB 7: BOT SIMULATOR */}
              {activeTab === "simulator" && (
                <motion.div
                  key="simulator"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 max-w-3xl"
                >
                  <div>
                    <h2 className="text-lg font-bold">شبیه‌ساز و تست زنده ربات</h2>
                    <p className="text-xs text-slate-400">
                      تست آنی الگوریتم‌های هوش مصنوعی جمینای و تطبیق سوالات متداول
                    </p>
                  </div>

                  <div
                    className={`p-5 rounded-2xl border flex flex-col backdrop-blur-xl ${
                      isDark ? "bg-[#0d1527]/80 border-slate-800" : "bg-white border-slate-200"
                    }`}
                    style={{ minHeight: "500px" }}
                  >
                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[420px] p-2">
                      {simMessages.map((m, idx) => (
                        <div
                          key={idx}
                          className={`flex flex-col ${m.sender === "user" ? "items-start" : "items-end"}`}
                        >
                          <div
                            className={`max-w-md p-3.5 rounded-2xl text-xs space-y-1 shadow-md ${
                              m.sender === "user"
                                ? "bg-cyan-500 text-slate-950 rounded-tr-none font-medium"
                                : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
                            }`}
                          >
                            <div className="leading-relaxed whitespace-pre-wrap">{m.text}</div>
                            {m.source && (
                              <div className="text-[9px] text-cyan-400 font-mono mt-1">
                                منبع پاسخ: {m.source === "faq" ? "سوالات متداول" : "هوش مصنوعی جمینای"}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {simLoading && (
                        <div className="flex items-center gap-2 text-xs text-cyan-400 animate-pulse">
                          <Sparkles className="w-4 h-4" />
                          <span>در حال دریافت پاسخ از هوش مصنوعی...</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex gap-2">
                      <input
                        type="text"
                        value={simInput}
                        onChange={(e) => setSimText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendSimulator()}
                        placeholder="سوال تست خود را بپرسید..."
                        className={`flex-1 p-3 text-xs rounded-xl border outline-none ${
                          isDark ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-300"
                        }`}
                      />
                      <button
                        onClick={handleSendSimulator}
                        disabled={simLoading}
                        className="px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TAB 8: SOURCE CODE & DEPLOYMENT GUIDE */}
              {activeTab === "download" && (
                <motion.div
                  key="download"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6 max-w-4xl"
                >
                  <div>
                    <h2 className="text-lg font-bold">دانلود فایل ZIP کامل سورس کد و راهنمای دیپلوی</h2>
                    <p className="text-xs text-slate-400">
                      دانلود فایل سورس پروژه جهت آپلود مستقیم در گیت‌هاب، بلمو (Belmu) و دپلکس / داکر
                    </p>
                  </div>

                  {/* PROMINENT DOWNLOAD BOX */}
                  <div className="p-8 rounded-3xl bg-gradient-to-br from-cyan-900/60 via-slate-900/90 to-purple-900/60 border border-cyan-500/40 shadow-2xl space-y-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                          <Zap className="w-4 h-4" />
                          آماده آپلود و دیپلوی آنی
                        </div>
                        <h3 className="text-2xl font-black text-white">پکیج کامل پروژه SupportBOT</h3>
                        <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                          این فایل زیپ شامل تمامی فایل‌های سورس پروژه، ساختار پایتون (`python_app/main.py`) برای بلمو، داکر (`Dockerfile`) برای دپلکس، پنل وب Next.js و دیتابیس Drizzle ORM می‌باشد.
                        </p>
                      </div>

                      <a
                        href="/api/download-zip"
                        className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 hover:from-emerald-300 hover:to-cyan-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 flex items-center gap-3 transition-transform transform hover:scale-105 active:scale-95 shrink-0"
                      >
                        <Download className="w-6 h-6 animate-bounce" />
                        <span>دانلود فایل زیپ final (`SupportBOT_Bale_FullProject.zip`)</span>
                      </a>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800 text-xs">
                      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                        <h4 className="font-bold text-cyan-400 flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          راهنمای دیپلوی در بلمو (Belmu - فریمورک پایتون):
                        </h4>
                        <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                          <li>فایل ZIP فوق را دانلود نموده و آن را آنزیپ کنید.</li>
                          <li>پروژه را در ریپوزیتوری گیت‌هاب خود آپلود فرمایید.</li>
                          <li>در پنل Belmu پروژه جدید ایجاد نموده و فریمورک را Python انتخاب کنید.</li>
                          <li>متغیرهای `BALE_BOT_TOKEN` و `GEMINI_API_KEY` را در بخش Env بلمو تنظیم نمایید.</li>
                        </ol>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                        <h4 className="font-bold text-purple-400 flex items-center gap-2">
                          <ExternalLink className="w-4 h-4" />
                          راهنمای دیپلوی در دپلکس / لیارا (Docker):
                        </h4>
                        <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                          <li>کد زیپ دانلود شده را در گیت‌هاب push فرمایید.</li>
                          <li>در دپلکس سرویس داکر انتخاب کرده و به گیت‌هاب متصل نمایید.</li>
                          <li>`DATABASE_URL` دیتابیس PostgreSQL و توکن بله را وارد کنید.</li>
                          <li>پس از ساخت، لینک HTTPS دامنه خود را در بخش Webhook پنل ثبت فرمایید.</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

// HELPER COMPONENTS
function NavItem({
  icon,
  label,
  active,
  onClick,
  badge,
  badgeColor = "bg-cyan-500",
  highlight,
  isDark,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string | number;
  badgeColor?: string;
  highlight?: boolean;
  isDark: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3.5 py-3 rounded-2xl text-xs font-bold flex items-center justify-between transition-all ${
        active
          ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
          : highlight
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
          : isDark
          ? "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <span>{label}</span>
      </div>
      {badge !== undefined && (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${badgeColor}`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function StatCard({
  title,
  value,
  icon,
  gradient,
  borderColor,
  isDark,
  alert,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  borderColor: string;
  isDark: boolean;
  alert?: boolean;
}) {
  return (
    <div
      className={`p-5 rounded-3xl border bg-gradient-to-br ${gradient} backdrop-blur-xl flex flex-col justify-between shadow-lg relative overflow-hidden ${
        isDark ? "bg-[#0d1527]/90" : "bg-white"
      } ${borderColor}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-slate-400">{title}</span>
        <div className="p-2.5 rounded-2xl bg-slate-900/50 border border-slate-800">{icon}</div>
      </div>
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-black font-mono tracking-tight">{value}</span>
        {alert && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
            نیازمند اقدام
          </span>
        )}
      </div>
    </div>
  );
}
