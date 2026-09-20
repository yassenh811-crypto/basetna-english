/* ============================================================
   🔑 ai-config.js — ملف المفاتيح بتاع الذكاء الاصطناعي
   ------------------------------------------------------------
   ده الملف الوحيد اللي هتعدّل فيه لما تيجي تزوّد مفاتيح أو موديلات.
   مش محتاج تفتح ai.js خالص.

   ⚠️ مهم جدًا:
   أي مفتاح بتحطه هنا الناس تقدر تشوفه لو فتحت كود الصفحة (F12).
   يعني: استخدم مفتاح مجاني / محدود، ومتحطش فيزا عليه،
   وافتح Restrictions في Google AI Studio على دومين موقعك بس.
   ولو عايز أمان 100% → الحل الصح هو Supabase Edge Function
   (مشروحة في README-SETUP.md).
   ============================================================ */

window.AI_CONFIG = {

  /* شغّال ولا لأ */
  enabled: true,

  /* مين يجرّب الأول؟ لو فشل ينتقل للي بعده أوتوماتيك */
  order: ["gemini", "openrouter", "groq"],

  providers: {

    /* ========== 1) Google Gemini (الأساسي) ==========
       المفاتيح من: https://aistudio.google.com/apikey
       حط أد ما تحب مفاتيح — لو واحد وقف يجرّب اللي بعده لوحده */
    gemini: {
      enabled: true,
      endpoint: "https://basetna-ai.onrender.com",
        // "مفتاح-احتياطي-2",
        // "مفتاح-احتياطي-3",
      
      /* الموديلات بالترتيب — لو الأول مزحوم ينزل للي تحته */
      models: [
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-1.5-flash",
      ],
      endpoint: "https://generativelanguage.googleapis.com/v1beta/models"
    },

    /* ========== 2) OpenRouter (احتياطي) ==========
       مفتاح من: https://openrouter.ai/keys */
    openrouter: {
      enabled: false,
      keys: [
        // "sk-or-v1-...",
      ],
      models: [
        "google/gemini-2.0-flash-exp:free",
        "meta-llama/llama-3.3-70b-instruct:free",
      ],
      endpoint: "https://openrouter.ai/api/v1/chat/completions"
    },

    /* ========== 3) Groq (سريع جدًا - احتياطي) ==========
       مفتاح من: https://console.groq.com/keys */
    groq: {
      enabled: false,
      keys: [
        // "gsk_...",
      ],
      models: [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
      ],
      endpoint: "https://api.groq.com/openai/v1/chat/completions"
    }
  },

  /* ========== إعدادات الرد ========== */
  temperature: 0.7,
  maxTokens: 900,
  historyLimit: 10,          // كام رسالة يفتكرها من المحادثة
  timeoutMs: 30000,

  /* ========== شخصية المساعد ========== */
  assistantName: "مسّاعد بسّطنا 🤖",
  greeting: "أهلاً! 👋 أنا مساعد «بسّطنا الإنجليزي».\nاسألني في أي حاجة في الإنجليزي: قواعد، ترجمة، تمارين، أو حتى مساعدة في استخدام الموقع.",

  systemPrompt: `أنت "مساعد بسّطنا الإنجليزي" — مساعد تعليمي على منصة تعليم لغة إنجليزية
بإشراف مس. شيرهان علي، وموجهة لطلاب المدارس في مصر والوطن العربي.

قواعد الرد:
- رد بالعامية المصرية البسيطة والودودة، إلا لو الطالب كتب بالإنجليزي أو طلب الفصحى.
- اشرح القاعدة في نقط قصيرة + مثال إنجليزي + ترجمته.
- لو الطالب غلط، صحّح له بلطف وقول له السبب.
- متكتبش ردود طويلة جدًا — خليك مركّز (5-12 سطر في الغالب).
- لو الطالب سأل عن الاشتراك أو الباقات أو مشكلة في الحساب: قول له يتواصل مع مس. شيرهان
  من زرار الواتساب أو من شات "الميس" في الموقع.
- متخترعش معلومات عن كورسات أو أسعار مش متأكد منها.
- استخدم إيموجي باعتدال 😊`,

  /* اقتراحات سريعة تظهر للطالب */
  quickPrompts: [
    "اشرحلي Present Perfect ببساطة",
    "صحّحلي الجملة دي",
    "اديني 5 تمارين على الـ Tenses",
    "ترجم الجملة دي للإنجليزي",
    "إزاي أحفظ كلمات جديدة بسرعة؟"
  ]
};
/* ============================================================
   🤖 ai.js — واجهة المساعد الذكي (الشات)
   ------------------------------------------------------------
   الملف ده مفيهوش أي مفتاح. هو بيبعت السؤال للسيرفر (server.js)
   والسيرفر هو اللي بيقرأ المفاتيح من ملف .env ويكلّم Gemini.

   يتحمّل في index.html قبل app.js:
       <script src="ai.js"></script>
   ============================================================ */
(function () {
  "use strict";

  /* ============================================================
     ⚙️ الإعدادات (الحاجة الوحيدة اللي ممكن تعدّلها هنا)
     ============================================================ */

  /* فاضي = السيرفر هو نفسه اللي بيقدّم الموقع (الوضع العادي).
     لو الموقع على GitHub Pages والسيرفر على استضافة تانية،
     اكتب رابط السيرفر هنا، مثال:  "https://basetna-ai.onrender.com"  */
  const API_URL = "";

  const UI = {
    assistantName: "مساعد بسّطنا 🤖",
    greeting: "أهلاً! 👋 أنا مساعد «بسّطنا الإنجليزي».\nاسألني في أي حاجة في الإنجليزي: قواعد، ترجمة، تمارين، أو حتى مساعدة في استخدام الموقع.",
    quickPrompts: [
      "اشرحلي Present Perfect ببساطة",
      "صحّحلي الجملة دي",
      "اديني 5 تمارين على الـ Tenses",
      "ترجم الجملة دي للإنجليزي",
      "إزاي أحفظ كلمات جديدة بسرعة؟",
    ],
    historyLimit: 10,     // كام رسالة يفتكرها المساعد من المحادثة
    timeoutMs: 45000,
  };

  const LS_HISTORY = "basetna_ai_chat";

  /* ============================================================
     1) الاتصال بالسيرفر
     ============================================================ */
  class AIError extends Error {
    constructor(code, message) { super(message); this.code = code; }
  }

  /* لو الطالب مسجّل دخول بنبعت التوكن (السيرفر بيستخدمه بس لو REQUIRE_LOGIN=true) */
  async function authToken() {
    try {
      if (typeof supabaseClient !== "undefined" && supabaseClient && supabaseClient.auth) {
        const r = await supabaseClient.auth.getSession();
        return (r && r.data && r.data.session && r.data.session.access_token) || "";
      }
    } catch (e) { /* عادي */ }
    return "";
  }

  async function ask(history, text) {
    const messages = history.slice(-UI.historyLimit).concat([{ role: "user", content: text }]);
    const headers = { "Content-Type": "application/json" };
    const token = await authToken();
    if (token) headers.Authorization = "Bearer " + token;

    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), UI.timeoutMs);
    let res;
    try {
      res = await fetch(API_URL.replace(/\/+$/, "") + "/api/ai", {
        method: "POST",
        headers,
        body: JSON.stringify({ messages }),
        signal: ac.signal,
      });
    } catch (e) {
      throw new AIError("NETWORK", e.name === "AbortError"
        ? "الرد اتأخر أوي، جرّب تاني."
        : "مش قادر أوصل للسيرفر. اتأكد إنه شغّال (node server.js).");
    } finally {
      clearTimeout(timer);
    }

    let data = null;
    try { data = await res.json(); } catch (e) { /* مش JSON */ }

    if (!res.ok) {
      /* سيرفرنا بيرد دايمًا بـ JSON فيه code. أي رد تاني (404/405/501 HTML...)
         معناه إن الموقع على استضافة ملفات بس ومفيش سيرفر للمساعد. */
      if (!data || !data.code) {
        throw new AIError("NO_SERVER", "سيرفر المساعد مش شغّال. شغّل node server.js، أو لو الموقع على استضافة ملفات بس اكتب رابط السيرفر في API_URL جوه ai.js.");
      }
      throw new AIError(data.code, data.error || "حصلت مشكلة (" + res.status + ")");
    }
    if (!data || !data.reply) throw new AIError("EMPTY", "الرد جه فاضي، جرّب تاني.");
    return data.reply;
  }

  /* ============================================================
     2) الستايل
     ============================================================ */
  const CSS = `
  .bai-fab{width:48px;height:48px;border-radius:50%;border:none;color:#fff;font-size:22px;
    display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;position:relative;
    background:linear-gradient(135deg,#6C5CE7,#3B2FA8);box-shadow:0 8px 20px rgba(60,40,180,.45);
    transition:transform .18s ease, box-shadow .18s ease;}
  .bai-fab:hover{transform:scale(1.1) translateY(-2px);box-shadow:0 12px 28px rgba(60,40,180,.6);}
  .bai-fab::after{content:"";position:absolute;inset:-4px;border-radius:50%;
    border:2px solid rgba(108,92,231,.45);animation:baiPulse 2.4s ease-out infinite;pointer-events:none;}
  @keyframes baiPulse{0%{transform:scale(.9);opacity:.9}70%{transform:scale(1.35);opacity:0}100%{opacity:0}}
  .bai-fab .bai-label{position:absolute;inset-inline-end:58px;background:rgba(11,29,56,.94);color:#fff;
    font-size:12.5px;font-weight:700;padding:5px 11px;border-radius:999px;white-space:nowrap;
    opacity:0;pointer-events:none;transition:opacity .18s ease;}
  .bai-fab:hover .bai-label{opacity:1;}

  .bai-overlay{position:fixed;inset:0;background:rgba(11,29,56,.55);backdrop-filter:blur(4px);
    z-index:90;display:none;align-items:flex-end;justify-content:center;padding:0;}
  .bai-overlay.open{display:flex;}

  .bai-panel{width:min(460px,100%);height:min(86vh,720px);background:var(--paper,#FAF6EE);
    border-radius:22px 22px 0 0;display:flex;flex-direction:column;overflow:hidden;
    box-shadow:0 -20px 60px rgba(11,29,56,.35);animation:baiUp .28s cubic-bezier(.22,1,.36,1);}
  @keyframes baiUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
  @media(min-width:720px){
    .bai-overlay{align-items:center;padding:24px;}
    .bai-panel{border-radius:22px;height:min(80vh,680px);}
  }

  .bai-head{background:linear-gradient(135deg,#3B2FA8,#6C5CE7);color:#fff;padding:16px 18px;
    display:flex;align-items:center;gap:12px;flex-shrink:0;}
  .bai-head .bai-ava{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.18);
    display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
  .bai-head h3{margin:0;font-size:16px;font-weight:800;}
  .bai-head p{margin:2px 0 0;font-size:12px;opacity:.82;}
  .bai-head .bai-tools{margin-inline-start:auto;display:flex;gap:8px;}
  .bai-head .bai-tools button{background:rgba(255,255,255,.16);border:none;color:#fff;
    width:32px;height:32px;border-radius:50%;font-size:15px;cursor:pointer;flex-shrink:0;}
  .bai-head .bai-tools button:hover{background:rgba(255,255,255,.3);}

  .bai-body{flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:12px;
    background:linear-gradient(180deg,#FAF6EE,#F1EADC);}
  .bai-msg{max-width:86%;padding:11px 15px;border-radius:16px;font-size:14.5px;line-height:1.75;
    white-space:pre-wrap;word-wrap:break-word;animation:baiIn .2s ease;}
  @keyframes baiIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  .bai-msg.bot{background:#fff;color:var(--ink,#1B1B1B);align-self:flex-start;
    border-start-start-radius:5px;box-shadow:0 3px 12px rgba(11,29,56,.09);}
  .bai-msg.me{background:linear-gradient(135deg,#6C5CE7,#3B2FA8);color:#fff;align-self:flex-end;
    border-end-end-radius:5px;box-shadow:0 4px 14px rgba(60,40,180,.3);}
  .bai-msg.err{background:#FDECEA;color:#8B2A18;align-self:flex-start;border:1px solid #F3C4BC;font-size:13.5px;}
  .bai-msg b{font-weight:800;}
  .bai-msg code{background:rgba(11,29,56,.08);padding:1px 6px;border-radius:5px;
    font-family:ui-monospace,Menlo,monospace;font-size:13px;direction:ltr;display:inline-block;}
  .bai-msg .en{direction:ltr;text-align:left;display:inline-block;}

  .bai-typing{align-self:flex-start;background:#fff;padding:13px 18px;border-radius:16px;
    border-start-start-radius:5px;display:flex;gap:5px;box-shadow:0 3px 12px rgba(11,29,56,.09);}
  .bai-typing span{width:7px;height:7px;border-radius:50%;background:#6C5CE7;animation:baiDot 1.3s infinite;}
  .bai-typing span:nth-child(2){animation-delay:.18s}
  .bai-typing span:nth-child(3){animation-delay:.36s}
  @keyframes baiDot{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-5px)}}

  .bai-quick{display:flex;gap:8px;padding:10px 14px 0;flex-wrap:wrap;flex-shrink:0;background:#F1EADC;}
  .bai-quick button{background:#fff;border:1px solid var(--line,#E6DEC9);color:var(--navy,#122A4D);
    border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:700;cursor:pointer;
    transition:all .15s ease;font-family:inherit;}
  .bai-quick button:hover{background:#6C5CE7;color:#fff;border-color:#6C5CE7;transform:translateY(-1px);}

  .bai-foot{display:flex;gap:9px;padding:12px 14px;background:#F1EADC;
    border-top:1px solid var(--line,#E6DEC9);flex-shrink:0;align-items:flex-end;}
  .bai-foot textarea{flex:1;border:1.5px solid var(--line,#E6DEC9);border-radius:18px;padding:11px 15px;
    font-family:inherit;font-size:14.5px;resize:none;max-height:110px;min-height:44px;background:#fff;
    line-height:1.6;outline:none;transition:border-color .15s ease, box-shadow .15s ease;}
  .bai-foot textarea:focus{border-color:#6C5CE7;box-shadow:0 0 0 4px rgba(108,92,231,.12);}
  .bai-send{width:44px;height:44px;border-radius:50%;border:none;flex-shrink:0;cursor:pointer;
    background:linear-gradient(135deg,#6C5CE7,#3B2FA8);color:#fff;font-size:17px;
    display:flex;align-items:center;justify-content:center;transition:transform .15s ease;}
  .bai-send:hover{transform:scale(1.08);}
  .bai-send:disabled{opacity:.45;cursor:not-allowed;transform:none;}
  @media(max-width:720px){.bai-fab{width:44px;height:44px;font-size:19px;}}
  @media print{.bai-fab,.bai-overlay{display:none !important;}}
  `;

  function injectCSS() {
    if (document.getElementById("bai-styles")) return;
    const s = document.createElement("style");
    s.id = "bai-styles";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ============================================================
     3) الواجهة
     ============================================================ */
  let HISTORY = [];
  let BUSY = false;

  function loadHistory() {
    try {
      const h = JSON.parse(localStorage.getItem(LS_HISTORY) || "[]");
      HISTORY = Array.isArray(h) ? h.filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant")) : [];
    } catch (e) { HISTORY = []; }
  }
  function saveHistory() {
    try { localStorage.setItem(LS_HISTORY, JSON.stringify(HISTORY.slice(-30))); } catch (e) { /* عادي */ }
  }

  /* الاقتباس المفرد (') بنسيبه زي ما هو عشان don't و it's يفضلوا كلمة واحدة */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  /* ماركداون بسيط + لف الإنجليزي عشان الاتجاه يبقى مظبوط في RTL */
  function render(text) {
    let h = esc(text);
    h = h.replace(/```([\s\S]*?)```/g, (m, c) => '<code class="en">' + c.trim() + "</code>");
    h = h.replace(/`([^`\n]+)`/g, '<code class="en">$1</code>');
    h = h.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>");
    /* الجمل الإنجليزي بره الأكواد بتتلف في span اتجاهه LTR */
    h = h.split(/(<code class="en">[\s\S]*?<\/code>)/).map((seg, i) => i % 2 ? seg :
      seg.replace(/(^|[\s(])([A-Za-z][\w'’.\-]*(?:[ \t]+[A-Za-z0-9][\w'’.\-]*)+)/g,
        (m, p, w) => p + '<span class="en">' + w + "</span>")).join("");
    return h;
  }

  function el(id) { return document.getElementById(id); }

  function buildUI() {
    if (el("bai-overlay")) return;
    injectCSS();

    /* الزرار — بيتحط فوق أزرار الدعم */
    const fab = document.createElement("button");
    fab.className = "bai-fab";
    fab.id = "bai-fab";
    fab.type = "button";
    fab.title = UI.assistantName;
    fab.setAttribute("aria-label", UI.assistantName);
    fab.innerHTML = '<span>🤖</span><span class="bai-label">مساعد ذكي</span>';
    fab.onclick = openPanel;

    const host = el("support-fabs");
    if (host) {
      host.insertBefore(fab, host.firstChild);
    } else {
      fab.style.cssText += ";position:fixed;bottom:92px;inset-inline-end:24px;z-index:55;";
      document.body.appendChild(fab);
    }

    const ov = document.createElement("div");
    ov.className = "bai-overlay";
    ov.id = "bai-overlay";
    ov.innerHTML =
      '<div class="bai-panel" role="dialog" aria-label="' + esc(UI.assistantName) + '">' +
        '<div class="bai-head">' +
          '<div class="bai-ava">🤖</div>' +
          "<div><h3>" + esc(UI.assistantName) + '</h3><p id="bai-status">جاهز للمساعدة</p></div>' +
          '<div class="bai-tools">' +
            '<button type="button" id="bai-clear" title="محادثة جديدة" aria-label="محادثة جديدة">🗑</button>' +
            '<button type="button" id="bai-close" title="إغلاق" aria-label="إغلاق">✕</button>' +
          "</div>" +
        "</div>" +
        '<div class="bai-body" id="bai-body"></div>' +
        '<div class="bai-quick" id="bai-quick"></div>' +
        '<div class="bai-foot">' +
          '<textarea id="bai-input" rows="1" placeholder="اكتب سؤالك هنا..."></textarea>' +
          '<button class="bai-send" id="bai-send" type="button" aria-label="إرسال">➤</button>' +
        "</div>" +
      "</div>";
    document.body.appendChild(ov);

    ov.addEventListener("click", (e) => { if (e.target === ov) closePanel(); });
    el("bai-close").onclick = closePanel;
    el("bai-clear").onclick = clearChat;
    el("bai-send").onclick = send;

    const inp = el("bai-input");
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
    });
    inp.addEventListener("input", () => {
      inp.style.height = "auto";
      inp.style.height = Math.min(inp.scrollHeight, 110) + "px";
    });

    /* الاقتراحات السريعة */
    const q = el("bai-quick");
    q.innerHTML = (UI.quickPrompts || []).map((p) => '<button type="button">' + esc(p) + "</button>").join("");
    q.querySelectorAll("button").forEach((b) => {
      b.onclick = () => { inp.value = b.textContent; send(); };
    });

    /* الرسايل القديمة */
    loadHistory();
    if (HISTORY.length) HISTORY.forEach((m) => addMsg(m.role === "user" ? "me" : "bot", m.content, true));
    else addMsg("bot", UI.greeting, true);
  }

  function addMsg(kind, text, silent) {
    const body = el("bai-body");
    if (!body) return;
    const d = document.createElement("div");
    d.className = "bai-msg " + kind;
    d.innerHTML = kind === "me" ? esc(text) : render(text);
    body.appendChild(d);
    if (silent) setTimeout(() => { body.scrollTop = body.scrollHeight; }, 30);
    else body.scrollTop = body.scrollHeight;
  }

  function typing(on) {
    const old = el("bai-typing");
    if (old) old.remove();
    const body = el("bai-body");
    if (on && body) {
      const d = document.createElement("div");
      d.className = "bai-typing";
      d.id = "bai-typing";
      d.innerHTML = "<span></span><span></span><span></span>";
      body.appendChild(d);
      body.scrollTop = body.scrollHeight;
    }
  }

  async function send() {
    if (BUSY) return;
    const inp = el("bai-input");
    const text = (inp.value || "").trim();
    if (!text) return;

    inp.value = "";
    inp.style.height = "auto";
    addMsg("me", text);

    const before = HISTORY.slice();
    BUSY = true;
    el("bai-send").disabled = true;
    el("bai-status").textContent = "بيفكر...";
    typing(true);

    try {
      const reply = await ask(before, text);
      typing(false);
      addMsg("bot", reply);
      HISTORY.push({ role: "user", content: text }, { role: "assistant", content: reply });
      saveHistory();
    } catch (e) {
      typing(false);
      addMsg("err", "⚠️ " + (e && e.message ? e.message : "حصلت مشكلة، جرّب تاني."));
    } finally {
      BUSY = false;
      const b = el("bai-send");
      if (b) b.disabled = false;
      const s = el("bai-status");
      if (s) s.textContent = "جاهز للمساعدة";
    }
  }

  function openPanel() {
    buildUI();
    el("bai-overlay").classList.add("open");
    setTimeout(() => {
      const i = el("bai-input");
      if (i && window.innerWidth > 720) i.focus();
    }, 220);
  }
  function closePanel() {
    const o = el("bai-overlay");
    if (o) o.classList.remove("open");
  }
  function clearChat() {
    HISTORY = [];
    saveHistory();
    const b = el("bai-body");
    if (b) { b.innerHTML = ""; addMsg("bot", UI.greeting, true); }
  }

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePanel(); });

  /* ============================================================
     4) التشغيل + واجهة برمجية تقدر تستخدمها من app.js
     ============================================================ */
  function boot() { buildUI(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  /*  const r = await AI.ask("اشرحلي كذا");   AI.open();   AI.clear();  */
  window.AI = {
    ask: (t) => ask([], String(t || "")),
    open: openPanel,
    close: closePanel,
    clear: clearChat,
  };
})();
