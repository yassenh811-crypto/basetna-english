/* ============================================================
   🤖 ai.js — محرك الذكاء الاصطناعي + واجهة الشات
   بسّطنا الإنجليزي — v1.0
   ------------------------------------------------------------
   الملف ده مش محتاج تعدّل فيه.
   كل المفاتيح والإعدادات في ملف ai-config.js
   ------------------------------------------------------------
   يتحمّل قبل app.js في index.html:
     <script src="ai-config.js"></script>
     <script src="ai.js"></script>
     <script src="app.js"></script>
   ============================================================ */
(function () {
  "use strict";

  /* ============================================================
     0) الإعدادات + الحماية لو ai-config.js مش موجود
     ============================================================ */
  const DEFAULTS = {
    enabled: true,
    order: ["gemini"],
    providers: {},
    temperature: 0.7,
    maxTokens: 900,
    historyLimit: 10,
    timeoutMs: 30000,
    assistantName: "المساعد الذكي 🤖",
    greeting: "أهلاً! اسألني في أي حاجة 👋",
    systemPrompt: "أنت مساعد تعليمي للغة الإنجليزية. رد بالعربي البسيط.",
    quickPrompts: []
  };

  const CFG = Object.assign({}, DEFAULTS, window.AI_CONFIG || {});
  const LS_KEY = "basetna_ai_key";      // مفتاح يدوي يتحفظ في المتصفح
  const LS_HISTORY = "basetna_ai_chat";

  /* مفتاح مكتوب يدويًا من الواجهة (لو المطوّر مش عايز يحطه في الملف) */
  function manualKey() {
    try { return localStorage.getItem(LS_KEY) || ""; } catch (e) { return ""; }
  }
  function setManualKey(k) {
    try { k ? localStorage.setItem(LS_KEY, k) : localStorage.removeItem(LS_KEY); } catch (e) {}
  }

  function isPlaceholder(k) {
    return !k || /ضع|PASTE|YOUR|xxx|\.\.\./i.test(k) || k.length < 15;
  }

  /* كل المحاولات الممكنة: provider × key × model */
  function buildAttempts() {
    const out = [];
    const mk = manualKey();

    (CFG.order || []).forEach(name => {
      const p = (CFG.providers || {})[name];
      if (!p || p.enabled === false) return;

      let keys = (p.keys || []).filter(k => !isPlaceholder(k));
      /* المفتاح اليدوي بيتضاف لجيميناي (الأشهر) */
      if (mk && name === "gemini" && !keys.includes(mk)) keys = [mk, ...keys];
      if (!keys.length) return;

      (p.models || []).forEach(model => {
        keys.forEach(key => out.push({ provider: name, key, model, cfg: p }));
      });
    });

    /* لو مفيش أي provider متظبّط بس فيه مفتاح يدوي → جيميناي افتراضي */
    if (!out.length && mk) {
      out.push({
        provider: "gemini", key: mk, model: "gemini-2.0-flash",
        cfg: { endpoint: "https://generativelanguage.googleapis.com/v1beta/models" }
      });
    }
    return out;
  }

  function hasKey() { return buildAttempts().length > 0; }

  /* ============================================================
     1) نداء الـ APIs
     ============================================================ */
  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))
    ]);
  }

  async function callGemini(att, messages) {
    const base = att.cfg.endpoint || "https://generativelanguage.googleapis.com/v1beta/models";
    const url = `${base}/${att.model}:generateContent?key=${encodeURIComponent(att.key)}`;

    const contents = messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

    const body = {
      contents,
      systemInstruction: { parts: [{ text: CFG.systemPrompt }] },
      generationConfig: {
        temperature: CFG.temperature,
        maxOutputTokens: CFG.maxTokens
      }
    };

    const res = await withTimeout(fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }), CFG.timeoutMs);

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`gemini ${res.status}: ${t.slice(0, 180)}`);
    }
    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts || [])
      .map(p => p.text || "").join("").trim();
    if (!text) throw new Error("gemini: رد فاضي");
    return text;
  }

  async function callOpenAICompatible(att, messages) {
    const headers = {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + att.key
    };
    if (att.provider === "openrouter") {
      headers["HTTP-Referer"] = location.origin;
      headers["X-Title"] = "Basetna English";
    }

    const res = await withTimeout(fetch(att.cfg.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: att.model,
        temperature: CFG.temperature,
        max_tokens: CFG.maxTokens,
        messages: [{ role: "system", content: CFG.systemPrompt }, ...messages]
      })
    }), CFG.timeoutMs);

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`${att.provider} ${res.status}: ${t.slice(0, 180)}`);
    }
    const data = await res.json();
    const text = (data.choices?.[0]?.message?.content || "").trim();
    if (!text) throw new Error(att.provider + ": رد فاضي");
    return text;
  }

  /* الدالة الرئيسية — بتجرّب كل المفاتيح لحد ما واحد ينجح */
  async function ask(userText, history) {
    if (CFG.enabled === false) throw new Error("الذكاء الاصطناعي متقفول من الإعدادات");

    const attempts = buildAttempts();
    if (!attempts.length) throw new Error("NO_KEY");

    const msgs = [...(history || []).slice(-CFG.historyLimit), { role: "user", content: userText }];
    const errors = [];

    for (const att of attempts) {
      try {
        const out = att.provider === "gemini"
          ? await callGemini(att, msgs)
          : await callOpenAICompatible(att, msgs);
        console.log(`✅ [AI] ${att.provider} / ${att.model}`);
        return out;
      } catch (e) {
        console.warn(`⚠️ [AI] فشل ${att.provider}/${att.model}:`, e.message);
        errors.push(e.message);
      }
    }
    throw new Error("كل المفاتيح فشلت — " + errors[0]);
  }

  /* ============================================================
     2) الستايل
     ============================================================ */
  const CSS = `
  .ai-fab{width:48px;height:48px;border-radius:50%;border:none;color:#fff;font-size:22px;
    display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;position:relative;
    background:linear-gradient(135deg,#6C5CE7,#3B2FA8);box-shadow:0 8px 20px rgba(60,40,180,.45);
    transition:transform .18s ease, box-shadow .18s ease;}
  .ai-fab:hover{transform:scale(1.1) translateY(-2px);box-shadow:0 12px 28px rgba(60,40,180,.6);}
  .ai-fab::after{content:"";position:absolute;inset:-4px;border-radius:50%;
    border:2px solid rgba(108,92,231,.45);animation:aiPulse 2.4s ease-out infinite;}
  @keyframes aiPulse{0%{transform:scale(.9);opacity:.9}70%{transform:scale(1.35);opacity:0}100%{opacity:0}}
  .ai-fab .fab-label{position:absolute;inset-inline-end:58px;background:rgba(11,29,56,.94);color:#fff;
    font-size:12.5px;font-weight:700;padding:5px 11px;border-radius:999px;white-space:nowrap;
    opacity:0;pointer-events:none;transition:opacity .18s ease;}
  .ai-fab:hover .fab-label{opacity:1;}

  .ai-overlay{position:fixed;inset:0;background:rgba(11,29,56,.55);backdrop-filter:blur(4px);
    z-index:90;display:none;align-items:flex-end;justify-content:center;padding:0;}
  .ai-overlay.open{display:flex;}

  .ai-panel{width:min(460px,100%);height:min(86vh,720px);background:var(--paper,#FAF6EE);
    border-radius:22px 22px 0 0;display:flex;flex-direction:column;overflow:hidden;
    box-shadow:0 -20px 60px rgba(11,29,56,.35);animation:aiUp .28s cubic-bezier(.22,1,.36,1);}
  @keyframes aiUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}
  @media(min-width:720px){
    .ai-overlay{align-items:center;padding:24px;}
    .ai-panel{border-radius:22px;height:min(80vh,680px);}
  }

  .ai-head{background:linear-gradient(135deg,#3B2FA8,#6C5CE7);color:#fff;padding:16px 18px;
    display:flex;align-items:center;gap:12px;flex-shrink:0;}
  .ai-head .ai-ava{width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.18);
    display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;}
  .ai-head h3{margin:0;font-size:16px;font-weight:800;}
  .ai-head p{margin:2px 0 0;font-size:12px;opacity:.82;}
  .ai-head .ai-x{margin-inline-start:auto;background:rgba(255,255,255,.16);border:none;color:#fff;
    width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;flex-shrink:0;}
  .ai-head .ai-x:hover{background:rgba(255,255,255,.3);}

  .ai-body{flex:1;overflow-y:auto;padding:18px;display:flex;flex-direction:column;gap:12px;
    background:linear-gradient(180deg,#FAF6EE,#F1EADC);}
  .ai-msg{max-width:86%;padding:11px 15px;border-radius:16px;font-size:14.5px;line-height:1.75;
    white-space:pre-wrap;word-wrap:break-word;animation:aiIn .2s ease;}
  @keyframes aiIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
  .ai-msg.bot{background:#fff;color:var(--ink,#1B1B1B);align-self:flex-start;
    border-start-start-radius:5px;box-shadow:0 3px 12px rgba(11,29,56,.09);}
  .ai-msg.me{background:linear-gradient(135deg,#6C5CE7,#3B2FA8);color:#fff;align-self:flex-end;
    border-end-end-radius:5px;box-shadow:0 4px 14px rgba(60,40,180,.3);}
  .ai-msg.err{background:#FDECEA;color:#8B2A18;align-self:flex-start;border:1px solid #F3C4BC;font-size:13.5px;}
  .ai-msg b{font-weight:800;}
  .ai-msg code{background:rgba(11,29,56,.08);padding:1px 6px;border-radius:5px;
    font-family:ui-monospace,Menlo,monospace;font-size:13px;direction:ltr;display:inline-block;}
  .ai-msg .en{direction:ltr;text-align:left;display:inline-block;}

  .ai-typing{align-self:flex-start;background:#fff;padding:13px 18px;border-radius:16px;
    border-start-start-radius:5px;display:flex;gap:5px;box-shadow:0 3px 12px rgba(11,29,56,.09);}
  .ai-typing span{width:7px;height:7px;border-radius:50%;background:#6C5CE7;animation:aiDot 1.3s infinite;}
  .ai-typing span:nth-child(2){animation-delay:.18s}
  .ai-typing span:nth-child(3){animation-delay:.36s}
  @keyframes aiDot{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-5px)}}

  .ai-quick{display:flex;gap:8px;padding:10px 14px 0;flex-wrap:wrap;flex-shrink:0;background:#F1EADC;}
  .ai-quick button{background:#fff;border:1px solid var(--line,#E6DEC9);color:var(--navy,#122A4D);
    border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:700;cursor:pointer;
    transition:all .15s ease;font-family:inherit;}
  .ai-quick button:hover{background:#6C5CE7;color:#fff;border-color:#6C5CE7;transform:translateY(-1px);}

  .ai-foot{display:flex;gap:9px;padding:12px 14px;background:#F1EADC;
    border-top:1px solid var(--line,#E6DEC9);flex-shrink:0;align-items:flex-end;}
  .ai-foot textarea{flex:1;border:1.5px solid var(--line,#E6DEC9);border-radius:18px;padding:11px 15px;
    font-family:inherit;font-size:14.5px;resize:none;max-height:110px;min-height:44px;background:#fff;
    line-height:1.6;outline:none;transition:border-color .15s ease, box-shadow .15s ease;}
  .ai-foot textarea:focus{border-color:#6C5CE7;box-shadow:0 0 0 4px rgba(108,92,231,.12);}
  .ai-send{width:44px;height:44px;border-radius:50%;border:none;flex-shrink:0;cursor:pointer;
    background:linear-gradient(135deg,#6C5CE7,#3B2FA8);color:#fff;font-size:17px;
    display:flex;align-items:center;justify-content:center;transition:transform .15s ease;}
  .ai-send:hover{transform:scale(1.08);}
  .ai-send:disabled{opacity:.45;cursor:not-allowed;transform:none;}

  .ai-keybox{margin:0;padding:14px 16px;background:#FFF8E6;border-top:1px solid #F0DFB0;font-size:13px;}
  .ai-keybox b{color:var(--navy-deep,#0B1D38);}
  .ai-keybox input{width:100%;margin-top:8px;padding:10px 12px;border:1.5px solid #E6DEC9;
    border-radius:10px;font-family:ui-monospace,monospace;font-size:12.5px;direction:ltr;}
  .ai-keybox button{margin-top:8px;width:100%;padding:10px;border:none;border-radius:10px;
    background:linear-gradient(135deg,#6C5CE7,#3B2FA8);color:#fff;font-weight:700;
    cursor:pointer;font-family:inherit;}
  `;

  function injectCSS() {
    if (document.getElementById("ai-styles")) return;
    const s = document.createElement("style");
    s.id = "ai-styles";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ============================================================
     3) الواجهة
     ============================================================ */
  let HISTORY = [];
  let BUSY = false;

  function loadHistory() {
    try { HISTORY = JSON.parse(localStorage.getItem(LS_HISTORY) || "[]"); }
    catch (e) { HISTORY = []; }
  }
  function saveHistory() {
    try { localStorage.setItem(LS_HISTORY, JSON.stringify(HISTORY.slice(-30))); } catch (e) {}
  }

  function esc(s) {
    return String(s || "").replace(/[&<>"']/g, c =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ماركداون بسيط + لف الإنجليزي عشان الاتجاه يبقى مظبوط في RTL */
  function render(text) {
    let h = esc(text);
    h = h.replace(/```([\s\S]*?)```/g, (m, c) => `<code class="en">${c.trim()}</code>`);
    h = h.replace(/`([^`\n]+)`/g, '<code class="en">$1</code>');
    h = h.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>");
    h = h.replace(/(^|[\s(])([A-Za-z][A-Za-z'’\-]*(?:\s+[A-Za-z'’\-]+){1,})/g,
      (m, p, w) => `${p}<span class="en">${w}</span>`);
    return h;
  }

  function buildUI() {
    if (document.getElementById("ai-overlay")) return;
    injectCSS();

    /* الزرار — بيتحط جوّه مجموعة أزرار الدعم لو موجودة */
    const fab = document.createElement("button");
    fab.className = "ai-fab";
    fab.id = "ai-fab";
    fab.title = CFG.assistantName;
    fab.innerHTML = `<span>🤖</span><span class="fab-label">مساعد ذكي</span>`;
    fab.onclick = openPanel;

    const host = document.getElementById("support-fabs");
    if (host) {
      host.insertBefore(fab, host.firstChild);
    } else {
      fab.style.cssText += ";position:fixed;bottom:92px;inset-inline-end:24px;z-index:55;";
      document.body.appendChild(fab);
    }

    const ov = document.createElement("div");
    ov.className = "ai-overlay";
    ov.id = "ai-overlay";
    ov.innerHTML = `
      <div class="ai-panel" role="dialog" aria-label="${esc(CFG.assistantName)}">
        <div class="ai-head">
          <div class="ai-ava">🤖</div>
          <div>
            <h3>${esc(CFG.assistantName)}</h3>
            <p id="ai-status">جاهز للمساعدة</p>
          </div>
          <button class="ai-x" id="ai-close" aria-label="إغلاق">✕</button>
        </div>
        <div class="ai-body" id="ai-body"></div>
        <div class="ai-quick" id="ai-quick"></div>
        <div class="ai-keybox" id="ai-keybox" hidden>
          <b>⚠️ محتاج مفتاح Gemini عشان المساعد يشتغل</b><br>
          خده مجانًا من <span class="en">aistudio.google.com/apikey</span> والصقه هنا:
          <input type="text" id="ai-key-input" placeholder="AIza..." autocomplete="off">
          <button id="ai-key-save">حفظ وتشغيل</button>
        </div>
        <div class="ai-foot">
          <textarea id="ai-input" rows="1" placeholder="اكتب سؤالك هنا..."></textarea>
          <button class="ai-send" id="ai-send" aria-label="إرسال">➤</button>
        </div>
      </div>`;
    document.body.appendChild(ov);

    ov.addEventListener("click", e => { if (e.target === ov) closePanel(); });
    document.getElementById("ai-close").onclick = closePanel;
    document.getElementById("ai-send").onclick = send;

    const inp = document.getElementById("ai-input");
    inp.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
    });
    inp.addEventListener("input", () => {
      inp.style.height = "auto";
      inp.style.height = Math.min(inp.scrollHeight, 110) + "px";
    });

    document.getElementById("ai-key-save").onclick = () => {
      const v = document.getElementById("ai-key-input").value.trim();
      if (!v) return;
      setManualKey(v);
      document.getElementById("ai-keybox").hidden = true;
      addMsg("bot", "✅ تمام! المفتاح اتحفظ. اسألني أي حاجة 😊");
    };

    /* الاقتراحات السريعة */
    const q = document.getElementById("ai-quick");
    q.innerHTML = (CFG.quickPrompts || []).map(p =>
      `<button type="button">${esc(p)}</button>`).join("");
    q.querySelectorAll("button").forEach(b => {
      b.onclick = () => { document.getElementById("ai-input").value = b.textContent; send(); };
    });

    /* الرسايل القديمة */
    loadHistory();
    if (HISTORY.length) {
      HISTORY.forEach(m => addMsg(m.role === "user" ? "me" : "bot", m.content, true));
    } else {
      addMsg("bot", CFG.greeting, true);
    }
    if (!hasKey()) document.getElementById("ai-keybox").hidden = false;
  }

  function addMsg(kind, text, silent) {
    const body = document.getElementById("ai-body");
    if (!body) return;
    const d = document.createElement("div");
    d.className = "ai-msg " + kind;
    d.innerHTML = kind === "me" ? esc(text) : render(text);
    body.appendChild(d);
    if (!silent) body.scrollTop = body.scrollHeight;
    else setTimeout(() => { body.scrollTop = body.scrollHeight; }, 30);
  }

  function typing(on) {
    const body = document.getElementById("ai-body");
    const old = document.getElementById("ai-typing");
    if (old) old.remove();
    if (on && body) {
      const d = document.createElement("div");
      d.className = "ai-typing";
      d.id = "ai-typing";
      d.innerHTML = "<span></span><span></span><span></span>";
      body.appendChild(d);
      body.scrollTop = body.scrollHeight;
    }
  }

  async function send() {
    if (BUSY) return;
    const inp = document.getElementById("ai-input");
    const text = inp.value.trim();
    if (!text) return;

    inp.value = "";
    inp.style.height = "auto";
    addMsg("me", text);
    HISTORY.push({ role: "user", content: text });

    BUSY = true;
    document.getElementById("ai-send").disabled = true;
    document.getElementById("ai-status").textContent = "بيفكر...";
    typing(true);

    try {
      const reply = await ask(text, HISTORY.slice(0, -1));
      typing(false);
      addMsg("bot", reply);
      HISTORY.push({ role: "assistant", content: reply });
      saveHistory();
    } catch (e) {
      typing(false);
      if (e.message === "NO_KEY") {
        addMsg("err", "⚠️ المساعد لسه مش متظبّط. محتاج مفتاح Gemini.");
        const kb = document.getElementById("ai-keybox");
        if (kb) kb.hidden = false;
      } else {
        addMsg("err", "⚠️ حصلت مشكلة: " + e.message + "\nجرّب تاني بعد شوية.");
      }
    } finally {
      BUSY = false;
      const b = document.getElementById("ai-send");
      if (b) b.disabled = false;
      const s = document.getElementById("ai-status");
      if (s) s.textContent = "جاهز للمساعدة";
    }
  }

  function openPanel() {
    buildUI();
    document.getElementById("ai-overlay").classList.add("open");
    setTimeout(() => {
      const i = document.getElementById("ai-input");
      if (i && window.innerWidth > 720) i.focus();
    }, 220);
  }
  function closePanel() {
    const o = document.getElementById("ai-overlay");
    if (o) o.classList.remove("open");
  }
  function clearChat() {
    HISTORY = [];
    saveHistory();
    const b = document.getElementById("ai-body");
    if (b) { b.innerHTML = ""; addMsg("bot", CFG.greeting, true); }
  }

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") closePanel();
  });

  /* ============================================================
     4) التشغيل + الواجهة البرمجية العامة
     ============================================================ */
  function boot() {
    if (CFG.enabled === false) return;
    buildUI();
    console.log(hasKey()
      ? "🤖 [AI] جاهز — " + buildAttempts().length + " محاولة متاحة"
      : "🤖 [AI] شغّال بس من غير مفتاح — حط مفتاح في ai-config.js");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  /* تقدر تستخدمها من أي مكان في app.js:
       const r = await AI.ask("اشرحلي كذا");            */
  window.AI = {
    ask: (t, h) => ask(t, h || []),
    open: openPanel,
    close: closePanel,
    clear: clearChat,
    hasKey,
    setKey: setManualKey,
    config: CFG,
    attempts: buildAttempts
  };
})();