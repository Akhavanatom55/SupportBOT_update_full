import os
import json
import asyncio
import requests
import uvicorn
from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="SupportBot Bale Python Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Environment variables
BALE_BOT_TOKEN = os.getenv("BALE_BOT_TOKEN", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
BALE_API_BASE = "https://tapi.bale.ai/bot"

# Simple memory/JSON persistence fallback for standalone python run
DB_FILE = "support_db.json"

def load_db():
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "users": {},
        "faqs": [
            {"id": 1, "title": "چگونه درخواست جدید ثبت کنم؟", "answer": "کافیست در ربات دکمه ثبت درخواست جدید را انتخاب نموده و موضوع خود را تایپ نمایید.", "category": "عمومی"},
            {"id": 2, "title": "زمان پاسخ‌گویی پشتیبانان چقدر است؟", "answer": "معمولاً بین ۱۵ دقیقه تا ۲ ساعت پاسخ شما داده می‌شود.", "category": "عمومی"}
        ],
        "tickets": [],
        "settings": {"GEMINI_API_KEY": GEMINI_API_KEY, "BALE_BOT_TOKEN": BALE_BOT_TOKEN}
    }

def save_db(data):
    with open(DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

db_store = load_db()

def send_bale_message(chat_id, text, reply_markup=None):
    token = os.getenv("BALE_BOT_TOKEN", db_store["settings"].get("BALE_BOT_TOKEN", ""))
    if not token:
        print("[Python Bot] Token not set!")
        return None
    url = f"{BALE_API_BASE}{token}/sendMessage"
    payload = {
        "chat_id": str(chat_id),
        "text": text,
        "parse_mode": "HTML",
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        res = requests.post(url, json=payload, timeout=10)
        return res.json()
    except Exception as e:
        print("[Python Bot] Error sending message:", e)
        return None

def ask_gemini_python(prompt):
    key = os.getenv("GEMINI_API_KEY", db_store["settings"].get("GEMINI_API_KEY", ""))
    if not key:
        return "⚠️ کلید API جمینای تنظیم نشده است."
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}"
        payload = {
            "contents": [{
                "parts": [{"text": f"پاسخ‌گوی پشتیبانی به زبان فارسی باشید: {prompt}"}]
            }]
        }
        res = requests.post(url, json=payload, timeout=15)
        data = res.json()
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except Exception as e:
        return f"❌ خطا در پاسخ هوش مصنوعی: {str(e)}"

@app.get("/")
def index():
    return HTMLResponse("<h1>🚀 SupportBOT Python Framework Backend is Running for Belmu & Deplexo!</h1><p>Bale Bot Endpoint: /webhook/bale</p>")

@app.get("/api/health")
def health():
    return {"status": "ok", "framework": "python-fastapi", "bot_configured": bool(os.getenv("BALE_BOT_TOKEN"))}

@app.post("/webhook/bale")
async def bale_webhook(request: Request):
    update = await request.json()
    # Process update logic
    if "message" in update:
        msg = update["message"]
        chat_id = msg["chat"]["id"]
        text = msg.get("text", "")
        
        if text in ["/start", "شروع"]:
            kb = {
                "keyboard": [
                    [{"text": "📝 ثبت درخواست جدید"}, {"text": "❓ سوالات متداول"}],
                    [{"text": "🤖 سوال از هوش مصنوعی (جمینای)"}]
                ],
                "resize_keyboard": True
            }
            send_bale_message(chat_id, "سلام! به ربات پشتیبانی پایتون خوش آمدید 👋", kb)
        elif text == "❓ سوالات متداول":
            faq_text = "<b>❓ سوالات متداول:</b>\n\n"
            for f in db_store["faqs"]:
                faq_text += f"🔹 <b>{f['title']}</b>\n{f['answer']}\n\n"
            send_bale_message(chat_id, faq_text)
        elif text == "🤖 سوال از هوش مصنوعی (جمینای)":
            send_bale_message(chat_id, "لطفاً سوال خود از جمینای را بنویسید:")
        else:
            send_bale_message(chat_id, f"پیام شما دریافت شد: {text}")

    return {"ok": True}

# Background Polling task for Belmu / Deplexo
async function_polling_loop():
    offset = 0
    token = os.getenv("BALE_BOT_TOKEN", "")
    if not token:
        print("No token provided for polling loop.")
        return
    print("Starting Bale Bot Polling Loop in Python...")
    while True:
        try:
            url = f"{BALE_API_BASE}{token}/getUpdates?offset={offset}&timeout=10"
            res = requests.get(url, timeout=12)
            data = res.json()
            if data.get("ok") and data.get("result"):
                for upd in data["result"]:
                    offset = upd["update_id"] + 1
                    # process update
                    print("Received update ID:", upd["update_id"])
        except Exception as e:
            await asyncio.sleep(5)
        await asyncio.sleep(2)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
