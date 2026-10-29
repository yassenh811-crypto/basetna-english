/* ============================================================
   🚀 main.jsx — نقطة بداية التطبيق
   ============================================================ */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

/* ترتيب الـ CSS مهم: كل ملف بيكسب على اللي قبله */
import './styles/globals.css';
import './styles/components.css';
import './styles/dashboard.css';
import './styles/ai.css';
import './styles/print.css';
import './styles/legacy.css';
import './styles/theme-pro.css';   /* ✨ التحسينات الأساسية */
import './styles/theme-chat.css';  /* 💬 الدعم والشات */
import './styles/theme-pay.css';   /* 💳 الدفع والتحويلات (الجديد) */
import './styles/theme-i18n.css';
import './styles/theme-dark.css';  /* لازم يكون آخر واحد */

import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);