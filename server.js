/* ============================================================
   🖥️ server.js — سيرفر المساعد الذكي (بدون مكتبات خارجية)
   ------------------------------------------------------------
   - بيستخدم fetch مباشر للـ Gemini API
   - بيدعم أكتر من مفتاح (Key Rotation)
   - بيقرأ المفاتيح من .env
   ============================================================ */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

/* ============================================================
   🔑 جمع كل المفاتيح من .env
   ============================================================ */
function loadApiKeys() {
  const keys = [];
  let i = 1;
  while (true) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (!key) break;
    if (key.trim() && !key.includes('...')) keys.push(key.trim());
    i++;
  }
  /* دعم للمفتاح القديم GEMINI_API_KEY (لو موجود) */
  if (process.env.GEMINI_API_KEY && !keys.includes(process.env.GEMINI_API_KEY)) {
    keys.unshift(process.env.GEMINI_API_KEY);
  }
  return keys;
}

const API_KEYS = loadApiKeys();
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

if (API_KEYS.length === 0) {
  console.error('❌ خطأ: مفيش أي مفتاح Gemini في ملف .env');
  process.exit(1);
}

console.log(`🔑 عدد المفاتيح: ${API_KEYS.length}`);
console.log(`🤖 الموديل: ${MODEL_NAME}`);

/* ============================================================
   🔄 مدير المفاتيح
   ============================================================ */
class KeyManager {
  constructor(keys) {
    this.keys = keys;
    this.currentIndex = 0;
    this.status = keys.map(() => ({ valid: true, failCount: 0, lastFail: null }));
  }
  current() { return this.keys[this.currentIndex]; }
  next() {
    let tries = 0;
    do {
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      tries++;
      if (tries > this.keys.length) return null;
    } while (!this.status[this.currentIndex].valid);
    return this.current();
  }
  markFailed(reason) {
    const s = this.status[this.currentIndex];
    s.failCount++;
    s.lastFail = reason;
    if (s.failCount >= 3) {
      s.valid = false;
      console.log(`⚠️  المفتاح #${this.currentIndex + 1} معطّل (${reason})`);
    }
  }
  markSuccess() {
    this.status[this.currentIndex].failCount = 0;
  }
  allFailed() { return this.status.every(s => !s.valid); }
  getStatus() {
    return this.status.map((s, i) => ({
      index: i + 1, valid: s.valid, failCount: s.failCount, lastFail: s.lastFail,
    }));
  }
}

const keyManager = new KeyManager(API_KEYS);

/* ============================================================
   📝 System Prompt
   ============================================================ */
const SYSTEM_PROMPT = `أنت "مساعد بسّطنا الإنجليزي" — مساعد ذكي متخصص في تعليم اللغة الإنجليزية للناطقين بالعربية.

مهمتك:
- شرح قواعد اللغة الإنجليزية ببساطة ووضوح
- تصحيح الجمل وتوضيح الأخطاء
- ترجمة عربي ↔ إنجليزي
- اقتراح تمارين وأمثلة
- مساعدة الطلاب في استخدام الموقع

قواعد الرد:
- رد بالعربية أولاً، ثم الإنجليزية عند الحاجة
- كن ودوداً ومشجعاً
- استخدم أمثلة عملية
- لو السؤال مش واضح، اسأل للتوضيح`;

/* ============================================================
   🤖 دالة إرسال الطلب لـ Gemini (fetch مباشر)
   ============================================================ */
async function askGemini(messages) {
  if (keyManager.allFailed()) throw new Error('ALL_KEYS_FAILED');

  /* تحويل الرسائل لصيغة Gemini */
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content || '') }]
  }));

  /* إضافة System Prompt في البداية */
  contents.unshift({
    role: 'user',
    parts: [{ text: SYSTEM_PROMPT }]
  });
  contents.splice(1, 0, {
    role: 'model',
    parts: [{ text: 'تمام، أنا جاهز أساعدك في الإنجليزي.' }]
  });

  let lastError = null;
  let attempts = 0;
  const maxAttempts = API_KEYS.length;

  while (attempts < maxAttempts) {
    const apiKey = keyManager.current();
    const keyNum = keyManager.currentIndex + 1;

    try {
      console.log(`🔄 محاولة بـ المفتاح #${keyNum}...`);

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        const errMsg = data?.error?.message || `HTTP ${response.status}`;
        throw new Error(errMsg);
      }

      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!reply) throw new Error('EMPTY_RESPONSE');

      keyManager.markSuccess();
      console.log(`✅ نجح بـ المفتاح #${keyNum}`);
      return reply;

    } catch (err) {
      lastError = err;
      const msg = err.message || '';
      console.log(`❌ فشل المفتاح #${keyNum}: ${msg.substring(0, 120)}`);

      if (
        msg.includes('API_KEY') ||
        msg.includes('API key') ||
        msg.includes('403') ||
        msg.includes('429') ||
        msg.includes('quota') ||
        msg.includes('rate') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('PERMISSION_DENIED')
      ) {
        keyManager.markFailed(msg.substring(0, 80));
        const nextKey = keyManager.next();
        if (!nextKey) break;
        attempts++;
        continue;
      }

      throw err;
    }
  }

  throw lastError || new Error('ALL_KEYS_FAILED');
}

/* ============================================================
   🛣️ مسار /api/ai
   ============================================================ */
app.post('/api/ai', async (req, res) => {
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ code: 'BAD_REQUEST', error: 'لازم تبعت messages (array)' });
    }
    const reply = await askGemini(messages);
    res.json({ reply });
  } catch (err) {
    console.error('❌ [AI Error]', err.message);

    if (err.message === 'ALL_KEYS_FAILED') {
      return res.status(503).json({
        code: 'ALL_KEYS_FAILED',
        error: 'كل المفاتيح خلصت أو معطلة. ضيف مفتاح جديد في .env'
      });
    }
    if (err.message?.includes('API key') || err.message?.includes('403')) {
      return res.status(500).json({ code: 'BAD_KEY', error: 'مفتاح Gemini غلط أو منتهي' });
    }
    if (err.message?.includes('429') || err.message?.includes('quota')) {
      return res.status(429).json({ code: 'RATE_LIMIT', error: 'الحد المسموح خلص، جرب بعد شوية' });
    }
    res.status(500).json({ code: 'SERVER_ERROR', error: err.message || 'حصلت مشكلة في السيرفر' });
  }
});

/* ============================================================
   🏥 فحص الحالة
   ============================================================ */
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'basetna-ai',
    model: MODEL_NAME,
    totalKeys: API_KEYS.length,
    currentKey: keyManager.currentIndex + 1,
    keysStatus: keyManager.getStatus(),
    time: new Date().toISOString()
  });
});

/* ============================================================
   🚀 تشغيل السيرفر
   ============================================================ */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('==============================================');
  console.log('🖥️  بسّطنا الإنجليزي — السيرفر شغال');
  console.log('==============================================');
  console.log(`🌐 الموقع:    http://localhost:${PORT}`);
  console.log(`🤖 المساعد:   http://localhost:${PORT}/api/ai`);
  console.log(`🏥 الحالة:    http://localhost:${PORT}/api/health`);
  console.log(`🔑 المفاتيح:  ${API_KEYS.length} مفتاح`);
  console.log(`🤖 الموديل:   ${MODEL_NAME}`);
  console.log('==============================================');
});