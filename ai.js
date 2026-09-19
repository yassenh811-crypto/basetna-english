/* ============================================================
   🤖 ai.js — مساعد بسّطنا الذكي (ملف واحد شامل)
   ============================================================
   - الإعدادات + المحرك + الواجهة في ملف واحد
   - بدون مفاتيح API (بستخدم Supabase Edge Function)
   - تدوير مفاتيح تلقائي (بيحصل في السيرفر)
   ============================================================ */

(function () {
  "use strict";

  /* ============================================================
     ⚙️ الإعدادات
     ============================================================ */
  const CONFIG = {
    // 🔗 رابط Edge Function (بيخفي المفاتيح)
    EDGE_FUNCTION_URL: "https://wgostqkywpybmzgbyzeo.supabase.co/functions/v1/ai-chat",

    // 🔑 Supabase Anon Key (مصمم يبقى في Frontend)
    SUPABASE_ANON_KEY: "sb_publishable_zx0zeWR2bpbmyO90oN-4ow_FxZCSPl8",

    // ⚙️ إعدادات عامة
    MAX_TOKENS: 2048,
    TEMPERATURE: 0.7,
    CACHE_TTL: 5 * 60 * 1000,

    // 🔒 كلمات محظورة
    BLOCKED_TOPICS: [
      "owner account",
      "حساب الأونر",
      "حساب المالك",
      "billing",
      "supabase key",
      "api key",
      "server password",
      "database password",
    ],

    STATS_KEY: "basetna_ai_stats",
  };

  /* ============================================================
     🧠 System Prompt — شخصية الـ AI
     ============================================================ */
  const SYSTEM_PROMPT = `
أنت "مساعد بسّطنا الإنجليزي" — مساعد ذكي، ودود، ومحترف جوه منصة تعليمية اسمها "بسّطنا الإنجليزي".

🎯 **مهمتك الأساسية:**
- تساعد الطلاب في فهم الكورسات، الدروس، والفيديوهات
- تشرح مفاهيم الإنجليزي بطريقة بسيطة
- توجّه الطلاب للباقات المناسبة حسب مرحلتهم
- تجاوب على أسئلة عن المنصة
- تساعد في كتابة رسائل للميس أو الدعم

🎨 **أسلوبك:**
- ودود ومشجع (استخدم إيموجي باعتدال)
- بتتكلم مصري بسيط لما يكون السياق عامي
- بتتكلم فصحى مبسطة لما يكون السؤال أكاديمي
- بتختصر وبتدخل في الموضوع على طول
- لو مش متأكد، بتقول "مش متأكد" وبتقترح تسأل الميس

🚫 **ممنوع تماماً:**
- الكلام عن بيانات المالك أو حساب الأونر
- كشف مفاتيح API أو كلمات المرور
- الكلام في مواضيع سياسية أو دينية جدلية
- أي محتوى غير لائق أو مسيء
- الوصول لبيانات المستخدمين التانيين

📚 **بيانات المنصة هتوصلك في السياق.** استخدمها للإجابة.
`;

  /* ============================================================
     💬 محرك المحادثة
     ============================================================ */
  const ChatEngine = {
    history: [],
    contextCache: null,
    cacheTime: 0,

    /* ---------- بناء سياق المنصة ---------- */
    async buildContext() {
      if (this.contextCache && Date.now() - this.cacheTime < CONFIG.CACHE_TTL) {
        return this.contextCache;
      }

      const sb = window.supabaseClient;
      if (!sb) return "";

      const parts = [];

      try {
        // المراحل
        const { data: levels } = await sb.from("grade_levels")
          .select("name_ar, name_en").order("sort_order");
        if (levels?.length) {
          parts.push(`📚 **المراحل الدراسية (${levels.length}):**\n` +
            levels.map((l, i) => `${i + 1}. ${l.name_ar} (${l.name_en})`).join("\n"));
        }

        // الكورسات
        const { data: courses } = await sb.from("courses")
          .select("title_ar, description_ar, grade_levels(name_ar)")
          .order("sort_order");
        if (courses?.length) {
          parts.push(`\n🎬 **الكورسات (${courses.length}):**\n` +
            courses.map(c => `- ${c.title_ar} | المرحلة: ${c.grade_levels?.name_ar || "—"}` +
              (c.description_ar ? `\n  ${c.description_ar}` : "")).join("\n"));
        }

        // الباقات
        const { data: pkgs } = await sb.from("packages")
          .select("name_ar, price, duration_days, grade_levels(name_ar)")
          .eq("is_active", true);
        if (pkgs?.length) {
          parts.push(`\n💰 **الباقات:**\n` +
            pkgs.map(p => `- ${p.name_ar} | ${p.price} ج.م | ${p.duration_days} يوم | المرحلة: ${p.grade_levels?.name_ar || "—"}`).join("\n"));
        }

        // عدد الفيديوهات
        const { data: lessons } = await sb.from("lessons").select("course_id");
        if (lessons?.length) {
          const counts = {};
          lessons.forEach(l => { counts[l.course_id] = (counts[l.course_id] || 0) + 1; });
          parts.push(`\n📹 **إجمالي الفيديوهات:** ${lessons.length} فيديو على ${Object.keys(counts).length} كورس`);
        }

        // معلومات الطالب الحالي
        const profile = window.CURRENT_PROFILE?.();
        if (profile && profile.role === "student") {
          const { data: sub } = await sb.from("subscriptions")
            .select("status, end_date")
            .eq("student_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          parts.push(`\n👤 **الطالب الحالي:**\n- الاسم: ${profile.full_name}\n- المرحلة: ${profile.grade_level_id || "غير محددة"}\n- الاشتراك: ${sub ? (sub.status === "active" ? `فعّال حتى ${sub.end_date}` : "غير فعّال") : "لا يوجد"}`);
        }

        parts.push(`\n🔒 **ملاحظة:** بيانات المالك/الأونر وبيانات API محجوبة تماماً.`);
      } catch (err) {
        console.error("❌ خطأ في بناء السياق:", err);
      }

      const ctx = parts.join("\n\n");
      this.contextCache = ctx;
      this.cacheTime = Date.now();
      return ctx;
    },

    /* ---------- فلترة المحظور ---------- */
    isBlocked(msg) {
      const lower = msg.toLowerCase();
      return CONFIG.BLOCKED_TOPICS.some(t => lower.includes(t.toLowerCase()));
    },

    /* ---------- إرسال رسالة ---------- */
    async send(userMessage) {
      // فلتر الأمان
      if (this.isBlocked(userMessage)) {
        return {
          ok: false,
          text: "🚫 آسف، مش مسموح لي أتكلم عن الموضوع ده. لو محتاج مساعدة تانية، أنا موجود! 💛",
        };
      }

      // ضيف للتاريخ
      this.history.push({ role: "user", parts: [{ text: userMessage }] });
      if (this.history.length > 20) {
        this.history = this.history.slice(-20);
      }

      // جهّز السياق
      const context = await this.buildContext();
      const fullSystemPrompt = SYSTEM_PROMPT + "\n\n=== بيانات المنصة الحالية ===\n" + context;

      try {
        const res = await fetch(CONFIG.EDGE_FUNCTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
            "apikey": CONFIG.SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            message: userMessage,
            history: this.history.slice(0, -1),
            systemPrompt: fullSystemPrompt,
          }),
        });

        const data = await res.json();

        if (!res.ok || data.error) {
          return {
            ok: false,
            text: "⚠️ " + (data.error || `HTTP ${res.status}`),
          };
        }

        this.history.push({ role: "model", parts: [{ text: data.text }] });
        this.logStats(data.usedKey);
        return { ok: true, text: data.text };

      } catch (err) {
        console.error("❌ خطأ:", err);
        return {
          ok: false,
          text: "⚠️ مشكلة في الاتصال بالسيرفر. تأكد إن Edge Function شغالة.",
        };
      }
    },

    logStats(keyIndex) {
      try {
        const stats = JSON.parse(localStorage.getItem(CONFIG.STATS_KEY) || "{}");
        stats[keyIndex] = (stats[keyIndex] || 0) + 1;
        stats._total = (stats._total || 0) + 1;
        stats._last = Date.now();
        localStorage.setItem(CONFIG.STATS_KEY, JSON.stringify(stats));
      } catch (e) {}
    },

    getStats() {
      try {
        return JSON.parse(localStorage.getItem(CONFIG.STATS_KEY) || "{}");
      } catch (e) { return {}; }
    },

    clearHistory() { this.history = []; },
  };

  /* ============================================================
     🎨 واجهة المستخدم
     ============================================================ */
  const UI = {
    isOpen: false,
    isTyping: false,

    init() {
      // لو موجود قبل كده، ما تعملوش تاني
      if (document.getElementById("ai-fab")) return;

      // 🎯 الزرار العائم
      const fab = document.createElement("button");
      fab.id = "ai-fab";
      fab.className = "ai-fab";
      fab.innerHTML = `<span class="ai-fab-emoji">🤖</span><span class="ai-fab-pulse"></span>`;
      fab.title = "مساعد بسّطنا الذكي";
      fab.onclick = () => this.toggle();
      document.body.appendChild(fab);

      // 🎯 النافذة
      const panel = document.createElement("div");
      panel.id = "ai-panel";
      panel.className = "ai-panel";
      panel.innerHTML = `
        <div class="ai-head">
          <div class="ai-head-info">
            <div class="ai-avatar">🤖</div>
            <div>
              <div class="ai-title">مساعد بسّطنا</div>
              <div class="ai-status" id="ai-status">● متصل</div>
            </div>
          </div>
          <div class="ai-head-actions">
            <button class="ai-icon-btn" id="ai-clear" title="محادثة جديدة">🗑️</button>
            <button class="ai-icon-btn" id="ai-close" title="إغلاق">✕</button>
          </div>
        </div>
        <div class="ai-messages" id="ai-messages"></div>
        <div class="ai-suggestions" id="ai-suggestions">
          <button onclick="window.AI.quickAsk('إيه الكورسات المتاحة في مرحلتي؟')">📚 كورسات مرحلتي</button>
          <button onclick="window.AI.quickAsk('اشرحلي الفرق بين الأزمنة في الإنجليزي')">📝 شرح الأزمنة</button>
          <button onclick="window.AI.quickAsk('إيه الباقات المتاحة وأسعارها؟')">💰 الباقات</button>
          <button onclick="window.AI.quickAsk('اعملي خطة مذاكرة إنجليزي أسبوعية')">📅 خطة مذاكرة</button>
        </div>
        <div class="ai-input-row">
          <textarea id="ai-input" placeholder="اكتب سؤالك هنا..." rows="1"></textarea>
          <button class="ai-send-btn" id="ai-send">➤</button>
        </div>
      `;
      document.body.appendChild(panel);

      // ربط الأحداث
      document.getElementById("ai-close").onclick = () => this.close();
      document.getElementById("ai-clear").onclick = () => this.clear();
      document.getElementById("ai-send").onclick = () => this.handleSend();

      const input = document.getElementById("ai-input");
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.handleSend();
        }
      });
      input.addEventListener("input", () => {
        input.style.height = "auto";
        input.style.height = Math.min(input.scrollHeight, 120) + "px";
      });

      // رسالة ترحيب
      this.addMessage("ai", "أهلاً بيك! 👋 أنا مساعد بسّطنا الذكي.\nاسألني عن أي حاجة تخص المنصة أو الإنجليزي 💛");
    },

    toggle() { this.isOpen ? this.close() : this.open(); },

    open() {
      this.isOpen = true;
      document.getElementById("ai-panel")?.classList.add("open");
      document.getElementById("ai-fab")?.classList.add("active");
      setTimeout(() => document.getElementById("ai-input")?.focus(), 300);
    },

    close() {
      this.isOpen = false;
      document.getElementById("ai-panel")?.classList.remove("open");
      document.getElementById("ai-fab")?.classList.remove("active");
    },

    clear() {
      ChatEngine.clearHistory();
      const box = document.getElementById("ai-messages");
      if (box) box.innerHTML = "";
      this.addMessage("ai", "بدأنا من جديد ✨ اسألني أي حاجة!");
    },

    addMessage(who, text) {
      const box = document.getElementById("ai-messages");
      if (!box) return;
      const msg = document.createElement("div");
      msg.className = "ai-msg " + (who === "user" ? "ai-msg-user" : "ai-msg-bot");

      const formatted = this.formatText(text);
      msg.innerHTML = who === "bot"
        ? `<div class="ai-msg-avatar">🤖</div><div class="ai-msg-bubble">${formatted}</div>`
        : `<div class="ai-msg-bubble">${formatted}</div>`;

      box.appendChild(msg);
      box.scrollTop = box.scrollHeight;
    },

    formatText(t) {
      return String(t)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`(.+?)`/g, "<code>$1</code>")
        .replace(/\n/g, "<br>");
    },

    showTyping() {
      const box = document.getElementById("ai-messages");
      if (!box) return;
      const typing = document.createElement("div");
      typing.className = "ai-msg ai-msg-bot";
      typing.id = "ai-typing";
      typing.innerHTML = `<div class="ai-msg-avatar">🤖</div><div class="ai-msg-bubble ai-typing"><span></span><span></span><span></span></div>`;
      box.appendChild(typing);
      box.scrollTop = box.scrollHeight;
    },

    hideTyping() {
      document.getElementById("ai-typing")?.remove();
    },

    async handleSend() {
      if (this.isTyping) return;
      const input = document.getElementById("ai-input");
      if (!input) return;

      const text = input.value.trim();
      if (!text) return;

      this.addMessage("user", text);
      input.value = "";
      input.style.height = "auto";

      this.isTyping = true;
      this.showTyping();

      const result = await ChatEngine.send(text);
      this.hideTyping();
      this.addMessage("bot", result.text);
      this.isTyping = false;
    },

    async quickAsk(text) {
      const input = document.getElementById("ai-input");
      if (!input) return;
      input.value = text;
      await this.handleSend();
    },
  };

  /* ============================================================
     🚀 التصدير العام
     ============================================================ */
  window.AI = {
    init: () => UI.init(),
    ask: async (text) => (await ChatEngine.send(text)).text,
    quickAsk: (text) => UI.quickAsk(text),
    open: () => UI.open(),
    close: () => UI.close(),
    clear: () => UI.clear(),
    getStats: () => ChatEngine.getStats(),
    config: CONFIG,
  };

  /* ============================================================
     🎬 التشغيل التلقائي
     ============================================================ */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => UI.init());
  } else {
    UI.init();
  }

  console.log("✅ AI Assistant loaded successfully 🤖");
})();