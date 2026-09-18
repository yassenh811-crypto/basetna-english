/* ============================================================
   بسّطنا الإنجليزي — app.js v25 (كامل)
   ============================================================ */
(function(){
  function makeMem(){
    const m = {};
    return {
      getItem:(k)=>(k in m?m[k]:null), setItem:(k,v)=>{m[k]=String(v);},
      removeItem:(k)=>{delete m[k];}, clear:()=>{Object.keys(m).forEach(k=>delete m[k]);},
      key:(i)=>Object.keys(m)[i]||null, get length(){return Object.keys(m).length;}
    };
  }
  function test(s){try{s.setItem("__t__","1");s.removeItem("__t__");return true;}catch(e){return false;}}
  if(!test(window.localStorage)){try{Object.defineProperty(window,"localStorage",{configurable:true,value:makeMem()});}catch(e){window.localStorage=makeMem();}}
  if(!test(window.sessionStorage)){try{Object.defineProperty(window,"sessionStorage",{configurable:true,value:makeMem()});}catch(e){window.sessionStorage=makeMem();}}
})();

const SUPABASE_URL = "https://wgostqkywpybmzgbyzeo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zx0zeWR2bpbmyO90oN-4ow_FxZCSPl8";
const OWNER_USERNAME_MAP = {"yassen":"yassenq14232@gmail.com","shere":"shere@basetna-english.com"};
const SERIAL_MAP = {"yassen":"serial-2.2.2-yassen","shere":"serial_1.1.1_shere"};
const STORAGE_BUCKET = "course-files";
const ADMIN_ROLES = ["superadmin","owner","support"];
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let CURRENT_LEVELS = [];
let CURRENT_PROFILE = null;
let ALL_CONTACTS = [];
let VIEW_MODE = localStorage.getItem("basetna_view_mode") || null;
let ALL_COURSES_CACHE = [];
let LESSONS_PROGRESS = {};

let USER_GENDER = (function(){
  try { const g = localStorage.getItem("basetna_gender"); if(g === "female" || g === "male") return g; } catch(e){}
  try { const m = document.cookie.match(/basetna_gender=(female|male)/); if(m) return m[1]; } catch(e){}
  return null;
})();

/* ============================================================
   🌙 Dark Mode + 🎨 Themes
   ============================================================ */
function applyDarkMode(isDark){
  document.body.classList.toggle("dark-mode", !!isDark);
  localStorage.setItem("basetna_dark", isDark ? "1" : "0");
  document.querySelectorAll(".theme-btn").forEach(b => b.textContent = isDark ? "☀️" : "🌙");
}
function toggleDarkMode(){
  const current = localStorage.getItem("basetna_dark") === "1";
  applyDarkMode(!current);
}
window.toggleDarkMode = toggleDarkMode;

function applyStudentTheme(theme){
  document.body.classList.remove("theme-pink","theme-blue","theme-green","theme-purple");
  if(theme && theme !== "default") document.body.classList.add("theme-" + theme);
  localStorage.setItem("basetna_theme", theme || "default");
}
window.applyStudentTheme = applyStudentTheme;

/* ============================================================
   Toast + Errors
   ============================================================ */
function ensureToastEl(){let el=document.getElementById("global-toast");if(!el){el=document.createElement("div");el.id="global-toast";el.className="global-toast";document.body.appendChild(el);}return el;}
function showToast(msg,type="error",duration=6000){const el=ensureToastEl();el.className="global-toast show "+type;el.textContent=msg;clearTimeout(window.__toastTimer);window.__toastTimer=setTimeout(()=>el.classList.remove("show"),duration);}
function friendlyError(err){
  if(!err)return "خطأ غير معروف";
  const msg=err.message||err.error_description||err.details||err.hint||String(err);
  if(/Invalid login credentials/i.test(msg))return "الإيميل أو كلمة المرور غلط";
  if(/Email not confirmed/i.test(msg))return "الإيميل مش متأكد منه";
  if(/User already registered/i.test(msg))return "الإيميل مسجل قبل كده";
  if(/Password should be at least/i.test(msg))return "كلمة المرور قصيرة";
  if(/JWT|token/i.test(msg))return "انتهت الجلسة";
  if(/row-level security|RLS|permission denied/i.test(msg))return "مش مسموح بالوصول";
  if(/relation .* does not exist/i.test(msg))return "الجدول مش موجود";
  if(/column .* does not exist/i.test(msg))return "عمود مفقود";
  if(/function .* does not exist/i.test(msg))return "الدالة مش موجودة";
  if(/Failed to fetch|NetworkError|Load failed/i.test(msg))return "مشكلة في الاتصال";
  if(/duplicate key/i.test(msg))return "البيان موجود بالفعل";
  return msg;
}
function logError(ctx,err){console.error(`❌ [${ctx}]`,err);showToast(`⚠️ ${ctx}: ${friendlyError(err)}`,"error");}
function logOk(ctx,msg){console.log(`✅ [${ctx}]`,msg||"");if(msg)showToast(`✅ ${msg}`,"ok",3500);}
function escapeHtml(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

/* ============================================================
   🌍 Countries
   ============================================================ */
const ARAB_COUNTRIES = [
  {dial:"20",ar:"مصر",en:"Egypt"},{dial:"966",ar:"السعودية",en:"Saudi Arabia"},
  {dial:"971",ar:"الإمارات",en:"UAE"},{dial:"965",ar:"الكويت",en:"Kuwait"},
  {dial:"974",ar:"قطر",en:"Qatar"},{dial:"973",ar:"البحرين",en:"Bahrain"},
  {dial:"968",ar:"عُمان",en:"Oman"},{dial:"962",ar:"الأردن",en:"Jordan"},
  {dial:"961",ar:"لبنان",en:"Lebanon"},{dial:"963",ar:"سوريا",en:"Syria"},
  {dial:"964",ar:"العراق",en:"Iraq"},{dial:"970",ar:"فلسطين",en:"Palestine"},
  {dial:"967",ar:"اليمن",en:"Yemen"},{dial:"249",ar:"السودان",en:"Sudan"},
  {dial:"218",ar:"ليبيا",en:"Libya"},{dial:"216",ar:"تونس",en:"Tunisia"},
  {dial:"213",ar:"الجزائر",en:"Algeria"},{dial:"212",ar:"المغرب",en:"Morocco"},
  {dial:"222",ar:"موريتانيا",en:"Mauritania"},{dial:"252",ar:"الصومال",en:"Somalia"},
  {dial:"253",ar:"جيبوتي",en:"Djibouti"},{dial:"269",ar:"جزر القمر",en:"Comoros"}
];
function fillCountrySelect(selectedDial){
  const sel=document.getElementById("set-country");if(!sel)return;
  const lang=localStorage.getItem("basetna_lang")||"ar";
  sel.innerHTML=ARAB_COUNTRIES.map(c=>`<option value="${c.dial}" ${String(c.dial)===String(selectedDial)?"selected":""}>+${c.dial} — ${lang==="ar"?c.ar:c.en}</option>`).join("");
}
function composeFullPhone(dial,local){const l=String(local||"").replace(/\D/g,"").replace(/^0+/,"");return l?String(dial)+l:"";}
function splitFullPhone(full){
  const c=String(full||"").replace(/\D/g,"");
  const sorted=[...ARAB_COUNTRIES].sort((a,b)=>b.dial.length-a.dial.length);
  for(const x of sorted){if(c.startsWith(x.dial))return{dial:x.dial,local:c.slice(x.dial.length)};}
  return{dial:"20",local:c};
}

/* ============================================================
   🌐 Language
   ============================================================ */
function applyLanguage(lang){
  document.documentElement.lang=lang;
  document.documentElement.dir=lang==="ar"?"rtl":"ltr";
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const text=el.getAttribute(lang==="ar"?"data-ar":"data-en");
    if(text!==null)el.textContent=text;
  });
  document.querySelectorAll(".lang-switch").forEach(btn=>btn.textContent=lang==="ar"?"English":"العربية");
  localStorage.setItem("basetna_lang",lang);
}
function toggleLanguage(){const cur=localStorage.getItem("basetna_lang")||"ar";applyLanguage(cur==="ar"?"en":"ar");}

/* ============================================================
   Views
   ============================================================ */
function showView(view){
  document.getElementById("view-public").hidden=view!=="public";
  document.getElementById("view-owner").hidden=view!=="owner";
  document.getElementById("view-student").hidden=view!=="student";
}
function hideSupportFabsForRole(){document.querySelectorAll(".support-fab").forEach(b=>{b.style.display="flex";});}
function showMsg(el,text,type){el.textContent=text;el.className="form-msg "+type;}

/* ============================================================
   👋 Welcome
   ============================================================ */
function pickGender(gender){
  USER_GENDER = gender;
  try { localStorage.setItem("basetna_gender", gender); } catch(e){}
  try { document.cookie = "basetna_gender=" + gender + "; max-age=31536000; path=/; SameSite=Lax"; } catch(e){}
  const overlay = document.getElementById("welcome-overlay");
  if(overlay) overlay.classList.remove("open");
  if(CURRENT_PROFILE){
    supabaseClient.from("profiles").update({gender}).eq("id",CURRENT_PROFILE.id).then(()=>{
      CURRENT_PROFILE.gender = gender;
    });
  }
  updateWelcomeText();
  showToast(gender === "female" ? "👸 أهلاً بيكِ يا عزيزة 💛" : "🤵 أهلاً بيك يا عزيز 💛", "ok", 2500);
}
window.pickGender = pickGender;

function updateWelcomeText(){
  const isFemale = USER_GENDER === "female";
  const greetWord = isFemale ? "عزيزة" : "عزيز";
  const greetEmoji = isFemale ? "👸" : "🤵";
  const welcomeMsg = document.getElementById("welcome-msg");
  if(welcomeMsg && CURRENT_PROFILE){
    welcomeMsg.textContent = `${greetEmoji} أهلاً بيك${isFemale ? "ِ" : ""} يا ${greetWord} ${CURRENT_PROFILE.full_name}`;
  }
  const heroTitle = document.getElementById("hero-title");
  if(heroTitle && !CURRENT_PROFILE && USER_GENDER){
    heroTitle.textContent = isFemale ? "الإنجليزي يبقى سهل وبسيط يا عزيزة 💛" : "الإنجليزي يبقى سهل وبسيط يا عزيز 💛";
  }
}

function showWelcomeModalIfNeeded(){
  const storedGender = (function(){
    try { const g = localStorage.getItem("basetna_gender"); if(g === "female" || g === "male") return g; } catch(e){}
    try { const m = document.cookie.match(/basetna_gender=(female|male)/); if(m) return m[1]; } catch(e){}
    return null;
  })();
  if(storedGender){
    USER_GENDER = storedGender;
    const overlay = document.getElementById("welcome-overlay");
    if(overlay) overlay.classList.remove("open");
    updateWelcomeText();
    return false;
  }
  const overlay = document.getElementById("welcome-overlay");
  if(overlay) overlay.classList.add("open");
  return true;
}

function showWelcomePickerAgain(){
  const overlay = document.getElementById("welcome-overlay");
  if(overlay) overlay.classList.add("open");
}
window.showWelcomePickerAgain = showWelcomePickerAgain;

/* ============================================================
   Video Helpers
   ============================================================ */
function extractYouTubeId(url){
  if(!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/
  ];
  for(const p of patterns){const m=url.match(p);if(m)return m[1];}
  return null;
}
function getVideoThumbnail(type, url){
  if(type === "youtube"){const id = extractYouTubeId(url);return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;}
  if(type === "drive"){const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([A-Za-z0-9_-]+)/);return m ? `https://drive.google.com/thumbnail?id=${m[1]}&sz=w800` : null;}
  return null;
}
function getYouTubeId(url){return extractYouTubeId(url);}
function getVideoInfo(course){
  const url=(course?.content_url||"").trim();
  if(!url)return null;
  const ytId=extractYouTubeId(url);
  if(ytId)return{kind:"youtube",thumbnail:`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,watchUrl:`https://www.youtube.com/watch?v=${ytId}`};
  if(/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url))return{kind:"video-file",thumbnail:null,watchUrl:url};
  const gd=url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([A-Za-z0-9_-]+)/);
  if(gd)return{kind:"drive",thumbnail:`https://drive.google.com/thumbnail?id=${gd[1]}&sz=w800`,watchUrl:`https://drive.google.com/file/d/${gd[1]}/view`};
  return null;
}

/* ============================================================
   Role Picker
   ============================================================ */
function showRolePicker(){
  if(!CURRENT_PROFILE) return;
  const modal = document.getElementById("role-picker-overlay");
  if(!modal) return;
  modal.classList.add("open");
}
window.showRolePicker = showRolePicker;

function pickRole(role){
  document.getElementById("role-picker-overlay").classList.remove("open");
  if(role === "logout"){localStorage.removeItem("basetna_view_mode");logout();return;}
  VIEW_MODE = role;
  localStorage.setItem("basetna_view_mode", role);
  showToast(role === "superadmin" ? "👑 تم التبديل لواجهة المدير" : "🛠️ تم التبديل لواجهة الدعم", "ok", 1500);
  setTimeout(() => window.location.reload(), 700);
}
window.pickRole = pickRole;

function applyRoleMode(){
  const isYassen = CURRENT_PROFILE && CURRENT_PROFILE.full_name && (CURRENT_PROFILE.full_name.includes("Yassen") || CURRENT_PROFILE.full_name.includes("ياسين"));
  if(isYassen && VIEW_MODE){CURRENT_PROFILE.effectiveRole = VIEW_MODE;}
  else{CURRENT_PROFILE.effectiveRole = CURRENT_PROFILE.role;}
  updateRoleUI();
}
function updateRoleUI(){
  const role = CURRENT_PROFILE?.effectiveRole || CURRENT_PROFILE?.role;
  const badge = document.getElementById("current-role-badge");
  const toggleBtn = document.getElementById("role-toggle-btn");
  const isYassen = CURRENT_PROFILE && CURRENT_PROFILE.full_name && (CURRENT_PROFILE.full_name.includes("Yassen") || CURRENT_PROFILE.full_name.includes("ياسين"));
  if(badge){
    if(role === "superadmin"){badge.className = "role-badge superadmin";badge.innerHTML = "👑 المدير الأعلى";badge.style.display = "inline-flex";}
    else if(role === "support"){badge.className = "role-badge support";badge.innerHTML = "🛠️ الدعم الفني";badge.style.display = "inline-flex";}
    else {badge.style.display = "none";}
  }
  if(toggleBtn){
    if(isYassen){toggleBtn.style.display = "flex";toggleBtn.textContent = role === "superadmin" ? "🛠️ التبديل لواجهة الدعم" : "👑 التبديل لواجهة المدير";}
    else {toggleBtn.style.display = "none";}
  }
}

/* ============================================================
   Auth
   ============================================================ */
async function handleLogin(e){
  e.preventDefault();
  const msg=document.getElementById("login-msg");
  const rawInput=document.getElementById("li-username").value.trim();
  const password=document.getElementById("li-password").value;
  const serial=document.getElementById("li-serial")?.value.trim();
  if(!rawInput||!password){showMsg(msg,"من فضلك املأ الحقول","error");return;}
  const key=rawInput.toLowerCase();
  const isSpecialAttempt=!!OWNER_USERNAME_MAP[key];
  if(isSpecialAttempt&&serial!==SERIAL_MAP[key]){showMsg(msg,"رقم التسلسل غير صحيح","error");return;}
  const email=OWNER_USERNAME_MAP[key]||rawInput;
  showMsg(msg,"جاري تسجيل الدخول...","ok");
  const {error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error){showMsg(msg,friendlyError(error),"error");return;}
  showToast("✅ تم الدخول","ok",1500);
  window.location.reload();
}
function openAuthModal(){document.getElementById("auth-overlay").classList.add("open");}
function closeAuthModal(){document.getElementById("auth-overlay").classList.remove("open");}
function watchOwnerField(){
  const input=document.getElementById("li-username");
  const serialField=document.getElementById("serial-field");
  input?.addEventListener("input",()=>{serialField.hidden=!OWNER_USERNAME_MAP[input.value.trim().toLowerCase()];});
}
async function logout(e){
  if(e?.preventDefault)e.preventDefault();
  if(e?.stopPropagation)e.stopPropagation();
  try{await supabaseClient.auth.signOut({scope:"global"});}catch(err){console.error(err);}
  try{Object.keys(localStorage).forEach(k=>{if(k.startsWith("sb-")||k.includes("supabase")||k.startsWith("temp-create-")||k==="basetna_view_mode")localStorage.removeItem(k);});sessionStorage.clear();}catch(_){}
  showToast("✅ خروج","ok",1200);
  setTimeout(()=>window.location.replace(window.location.pathname+"?logout="+Date.now()),250);
}
window.logout=logout;

/* ============================================================
   WhatsApp
   ============================================================ */
async function getWhatsAppNumber(){
  const {data,error}=await supabaseClient.from("settings").select("whatsapp_number").eq("id",1).maybeSingle();
  if(error)return null;
  return data?.whatsapp_number||null;
}
async function wireWhatsAppButton(){
  const btn=document.getElementById("wa-float");if(!btn)return;
  const number=await getWhatsAppNumber();
  if(number){btn.href=`https://wa.me/${number}`;}
  else{btn.onclick=e=>{e.preventDefault();showToast("⚠️ رقم واتساب لم يُضف","error");};}
}
async function subscribeViaWhatsApp(packageName){
  const number=await getWhatsAppNumber();
  if(!number){showToast("⚠️ رقم واتساب لم يُضف","error");return;}
  const text=`أهلاً، أنا عايز/ة أشترك في باقة "${packageName}"`;
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`,"_blank");
}
/* ============================================================
   Home
   ============================================================ */
async function loadHome(){
  const lang=localStorage.getItem("basetna_lang")||"ar";
  const levelsRes=await supabaseClient.from("grade_levels").select("*").order("sort_order");
  const levels=levelsRes.data||[];
  const pkgsRes=await supabaseClient.from("packages").select("*").eq("is_active",true);
  const packages=pkgsRes.data||[];
  const rpcRes=await supabaseClient.rpc("get_course_count");
  const courseCount=rpcRes.data??0;
  document.getElementById("stat-levels").textContent=levels.length;
  document.getElementById("stat-packages").textContent=packages.length;
  document.getElementById("stat-courses").textContent=courseCount;
  document.getElementById("levels-grid").innerHTML=levels.length
    ?levels.map((lv,i)=>`<div class="card level-card"><div class="lv-num">${i+1}</div><h3>${lang==="ar"?lv.name_ar:lv.name_en}</h3></div>`).join("")
    :`<div class="empty-state">لسه مفيش مراحل</div>`;
  const filterLevel = document.getElementById("filter-level");
  if(filterLevel){
    filterLevel.innerHTML = `<option value="">كل المراحل</option>` +
      levels.map(lv => `<option value="${lv.id}">${lv.name_ar}</option>`).join("");
  }
  document.getElementById("packages-grid").innerHTML=packages.length
    ?packages.map(p=>`<div class="card pkg-card"><h3>${lang==="ar"?p.name_ar:p.name_en}</h3><div class="price">${p.price} <small>${lang==="ar"?"ج.م / "+p.duration_days+" يوم":"EGP / "+p.duration_days+" days"}</small></div><p class="desc">${(lang==="ar"?p.description_ar:p.description_en)||""}</p><button class="btn btn-teal btn-block" onclick='subscribeViaWhatsApp(${JSON.stringify(lang==="ar"?p.name_ar:p.name_en)})'>اشترك</button></div>`).join("")
    :`<div class="empty-state">لسه مفيش باقات</div>`;
}

/* ============================================================
   Notifications
   ============================================================ */
async function loadNotifications(){
  if(!CURRENT_PROFILE) return [];
  const notifications = [];
  if(CURRENT_PROFILE.role === "student"){
    const { data: subs } = await supabaseClient.from("subscriptions")
      .select("*, packages(name_ar)").eq("student_id", CURRENT_PROFILE.id)
      .eq("status", "active").order("end_date").limit(1);
    if(subs?.[0]){
      const days = Math.ceil((new Date(subs[0].end_date) - new Date()) / (1000*60*60*24));
      if(days <= 7 && days >= 0){
        notifications.push({
          icon: "⏰",
          text: `اشتراكك في "${subs[0].packages?.name_ar || 'الباقة'}" ينتهي بعد ${days} يوم`,
          urgent: days <= 3
        });
      }
    }
  }
  const { data: msgs } = await supabaseClient.from("messages")
    .select("*").eq("recipient_role", CURRENT_PROFILE.role === "student" ? "student" : CURRENT_PROFILE.role)
    .eq("is_read", false).limit(10);
  if(msgs?.length){
    notifications.push({icon: "💬", text: `عندك ${msgs.length} رسالة جديدة`, urgent: true});
  }
  return notifications;
}
async function openNotifications(){
  const overlay = document.getElementById("notif-overlay");
  const list = document.getElementById("notifications-list");
  if(!overlay || !list) return;
  list.innerHTML = `<div class="empty-state">جاري التحميل...</div>`;
  overlay.classList.add("open");
  const notifs = await loadNotifications();
  if(!notifs.length){
    list.innerHTML = `<div class="empty-state">مفيش إشعارات جديدة 🎉</div>`;
  } else {
    list.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.urgent ? 'urgent' : ''}">
        <span class="notif-icon">${n.icon}</span>
        <span class="notif-text">${escapeHtml(n.text)}</span>
      </div>`).join("");
  }
}
function closeNotifications(){document.getElementById("notif-overlay").classList.remove("open");}
window.openNotifications = openNotifications;
window.closeNotifications = closeNotifications;

/* ============================================================
   AI Assistant
   ============================================================ */
const FAQ_ANSWERS = [
  {q:["اشتراك","باقة","سعر","فلوس","دفع"], a:"الاشتراكات بتتفعّل عن طريق التواصل مع المس شيرهان على الواتساب. اضغط على الزرار الأخضر تحت 👇"},
  {q:["كورس","كورسات","محتوى","فيديو","فيديوهات"], a:"الكورسات مرتبة حسب مرحلتك الدراسية. لما تسجل دخول وتكون مشترك، هتلاقي كورساتك ظاهرة في صفحتك."},
  {q:["تسجيل","دخول","حساب","باسورد"], a:"لتسجيل الدخول: اضغط 'تسجيل الدخول' في الأعلى، واكتب الإيميل وكلمة المرور اللي المس شيرهان عملتهملك."},
  {q:["ميس","شيرهان","تواصل","واتساب"], a:"للتواصل مع مس. شيرهان: اضغط على الزرار الأخضر العائم في أسفل الصفحة 💚"},
  {q:["شهادة","شهادات"], a:"بعد إكمال الكورس (80%)، تقدر تحمّل شهادة إتمام من صفحة 'شهاداتي' 📜"},
  {q:["نقاط","شارات"], a:"بتكسب نقاط لما تكمّل فيديوهات، وبتاخد شارات (متفوق، نشيط...) لما توصل لأهداف معينة 🏆"},
];
function openAIAssistant(){
  const overlay = document.getElementById("ai-overlay");
  if(!overlay) return;
  overlay.classList.add("open");
  const chat = document.getElementById("ai-chat");
  if(chat && !chat.dataset.initialized){
    chat.innerHTML = `<div class="ai-msg ai-bot">👋 أهلاً! أنا المساعد الذكي. اسألني عن الاشتراكات، الكورسات، الميس شيرهان، أو أي حاجة تانية 💛</div>`;
    chat.dataset.initialized = "1";
  }
}
function closeAIAssistant(){document.getElementById("ai-overlay").classList.remove("open");}
function sendAIMessage(){
  const input = document.getElementById("ai-input");
  const chat = document.getElementById("ai-chat");
  const text = input.value.trim();
  if(!text) return;
  chat.innerHTML += `<div class="ai-msg ai-user">${escapeHtml(text)}</div>`;
  input.value = "";
  chat.scrollTop = chat.scrollHeight;
  const lower = text.toLowerCase();
  const found = FAQ_ANSWERS.find(faq => faq.q.some(kw => lower.includes(kw)));
  const reply = found ? found.a : "معلش، مش فاهم سؤالك بالظبط. ممكن تسأل عن: الاشتراكات، الكورسات، تسجيل الدخول، أو التواصل مع الميس.";
  setTimeout(() => {
    chat.innerHTML += `<div class="ai-msg ai-bot">${reply}</div>`;
    chat.scrollTop = chat.scrollHeight;
  }, 400);
}
window.openAIAssistant = openAIAssistant;
window.closeAIAssistant = closeAIAssistant;
window.sendAIMessage = sendAIMessage;

/* ============================================================
   Support / Chat
   ============================================================ */
async function openSupportPanel(recipientRole="support"){
  if(!CURRENT_PROFILE){showToast("⚠️ سجّل دخول الأول","error");return;}
  const overlay=document.getElementById("support-overlay");
  overlay.classList.add("open");
  overlay.dataset.recipient=recipientRole;
  delete overlay.dataset.privateWith;
  const title=document.getElementById("support-title");
  const sub=document.getElementById("support-subtitle");
  const membersBox=document.getElementById("support-members");
  const banner=document.getElementById("private-banner");
  if(banner)banner.hidden=true;
  if(recipientRole==="support"){title.textContent="🛠️ الدعم الفني";sub.textContent="الدعم الفني للمنصة";}
  else if(recipientRole==="owner"){title.textContent="👩‍🏫 مس. شيرهان علي";sub.textContent="تواصلي مع الميس";}
  else{title.textContent="💬 الغرفة العامة";sub.textContent="كل الطلاب والميس والدعم";}
  if(membersBox){if(recipientRole==="general"){membersBox.hidden=false;await renderGroupMembers();}else{membersBox.hidden=true;}}
  loadMessages(recipientRole);
}
function closeSupportPanel(){document.getElementById("support-overlay").classList.remove("open");}

async function loadMessages(recipientRole){
  const list=document.getElementById("support-messages");
  list.innerHTML=`<div class="empty-state">جاري التحميل...</div>`;
  let query=supabaseClient.from("messages").select("*").order("created_at",{ascending:true}).limit(500);
  const isAdmin=ADMIN_ROLES.includes(CURRENT_PROFILE.role);
  if(recipientRole==="general"){query=query.eq("recipient_role","general");}
  else if(recipientRole==="private"){query=query.eq("recipient_role","private");}
  else if(isAdmin){query=query.eq("recipient_role",recipientRole);}
  else{query=query.or(`sender_id.eq.${CURRENT_PROFILE.id},recipient_role.eq.${recipientRole}`);}
  const {data,error}=await query;
  if(error){logError("تحميل الرسائل",error);return;}
  if(!data||!data.length){list.innerHTML=`<div class="empty-state">لسه مفيش رسائل 👋</div>`;return;}
  renderMessages(data);
  scrollMessagesToBottom();
}
function renderMessages(messages){
  const list=document.getElementById("support-messages");
  list.innerHTML=messages.map(m=>{
    const isMine=m.sender_id===CURRENT_PROFILE.id;
    const isAdminMsg=ADMIN_ROLES.includes(m.sender_role);
    const time=new Date(m.created_at).toLocaleString("ar-EG",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit"});
    const avatarEmoji=m.sender_role==="superadmin"?"👑":m.sender_role==="owner"?"👩‍🏫":m.sender_role==="support"?"🛠️":"🎓";
    const roleName=m.sender_role==="superadmin"?"👑 المدير":m.sender_role==="owner"?"الميس":m.sender_role==="support"?"دعم فني":"طالب";
    return `<div class="msg ${isMine?"mine":""} ${isAdminMsg?"admin-msg":""}">${!isMine?`<div class="msg-avatar">${avatarEmoji}</div>`:""}<div class="msg-bubble">${!isMine?`<div class="msg-name">${escapeHtml(m.sender_name)} <span class="role-tag">${roleName}</span></div>`:""}<div class="msg-text">${escapeHtml(m.content)}</div><div class="msg-time">${time}</div></div></div>`;
  }).join("");
}
function scrollMessagesToBottom(){const list=document.getElementById("support-messages");if(list)list.scrollTop=list.scrollHeight;}

async function renderGroupMembers(){
  const container=document.getElementById("support-members");
  if(!container)return;
  container.innerHTML=`<div class="empty-state" style="padding:10px;">جاري التحميل...</div>`;
  const {data,error}=await supabaseClient.from("profiles").select("id, full_name, role").neq("id",CURRENT_PROFILE.id).order("role");
  if(error){logError("تحميل الأعضاء",error);return;}
  const avatar=(r)=>r==="superadmin"?"👑":r==="owner"?"👩‍🏫":r==="support"?"🛠️":"🎓";
  container.innerHTML=`<div class="group-members-title">👥 الأعضاء</div>`+
    (data||[]).map(u=>`<span class="group-member-chip" onclick="startPrivateChat('${u.id}','${escapeHtml(u.full_name).replace(/'/g,"&#39;")}')"><span class="chip-avatar">${avatar(u.role)}</span>${escapeHtml(u.full_name)}</span>`).join("");
}

async function startPrivateChat(userId,userName){
  const overlay=document.getElementById("support-overlay");
  overlay.classList.add("open");
  overlay.dataset.recipient="private";
  overlay.dataset.privateWith=userId;
  document.getElementById("support-title").textContent="💬 محادثة خاصة مع "+userName;
  document.getElementById("support-subtitle").textContent="الرسائل دي بينكم بس 🔒";
  const membersBox=document.getElementById("support-members");
  if(membersBox)membersBox.hidden=true;
  const banner=document.getElementById("private-banner");
  if(banner){banner.hidden=false;banner.querySelector(".private-name").textContent=userName;}
  await loadPrivateMessages(userId);
}
window.startPrivateChat=startPrivateChat;

async function loadPrivateMessages(otherUserId){
  const list=document.getElementById("support-messages");
  list.innerHTML=`<div class="empty-state">جاري التحميل...</div>`;
  const {data,error}=await supabaseClient.from("messages").select("*").eq("recipient_role","private").or(`and(sender_id.eq.${CURRENT_PROFILE.id},private_with.eq.${otherUserId}),and(sender_id.eq.${otherUserId},private_with.eq.${CURRENT_PROFILE.id})`).order("created_at",{ascending:true}).limit(200);
  if(error){logError("تحميل الرسائل الخاصة",error);return;}
  if(!data||!data.length){list.innerHTML=`<div class="empty-state">لسه مفيش رسائل 👋</div>`;return;}
  renderMessages(data);
  scrollMessagesToBottom();
}

async function backToGeneralChat(){
  const overlay=document.getElementById("support-overlay");
  overlay.dataset.recipient="general";
  delete overlay.dataset.privateWith;
  document.getElementById("support-title").textContent="💬 الغرفة العامة";
  document.getElementById("support-subtitle").textContent="كل الطلاب والميس والدعم";
  const banner=document.getElementById("private-banner");
  if(banner)banner.hidden=true;
  const membersBox=document.getElementById("support-members");
  if(membersBox){membersBox.hidden=false;await renderGroupMembers();}
  await loadMessages("general");
}
window.backToGeneralChat=backToGeneralChat;

async function sendSupportMessage(){
  if(!CURRENT_PROFILE){showToast("⚠️ سجّل دخول","error");return;}
  const input=document.getElementById("support-input");
  const content=input.value.trim();
  if(!content)return;
  const overlay=document.getElementById("support-overlay");
  const recipientRole=overlay.dataset.recipient||"support";
  const privateWith=overlay.dataset.privateWith||null;
  const payload={sender_id:CURRENT_PROFILE.id,sender_name:CURRENT_PROFILE.full_name,sender_role:CURRENT_PROFILE.role,recipient_role:recipientRole==="private"?"private":recipientRole,content};
  if(recipientRole==="private"&&privateWith)payload.private_with=privateWith;
  input.value="";input.disabled=true;
  const {error}=await supabaseClient.from("messages").insert(payload);
  input.disabled=false;input.focus();
  if(error){logError("إرسال الرسالة",error);return;}
  if(recipientRole==="private"&&privateWith)await loadPrivateMessages(privateWith);
  else await loadMessages(recipientRole);
}

async function loadChatsPanel(){
  const list=document.getElementById("chats-list");
  if(!list)return;
  list.innerHTML=`<div class="empty-state">جاري التحميل...</div>`;
  const {data,error}=await supabaseClient.from("profiles").select("id, full_name, role, phone, grade_levels(name_ar)").neq("id",CURRENT_PROFILE.id).order("role");
  if(error){logError("تحميل جهات الاتصال",error);return;}
  ALL_CONTACTS=data||[];
  if(!ALL_CONTACTS.length){list.innerHTML=`<div class="empty-state">لسه مفيش مستخدمين</div>`;return;}
  const avatar=(r)=>r==="superadmin"?"👑":r==="owner"?"👩‍🏫":r==="support"?"🛠️":"🎓";
  const roleLabel=(r)=>r==="superadmin"?"👑 المدير":r==="owner"?"الميس":r==="support"?"دعم فني":"طالب";
  const roleColor=(r)=>r==="superadmin"?"#B8860B":r==="owner"?"var(--gold)":r==="support"?"var(--purple)":"var(--teal)";
  const groups={superadmin:[],owner:[],support:[],student:[]};
  ALL_CONTACTS.forEach(c=>{if(groups[c.role])groups[c.role].push(c);});
  const renderCard=(c)=>`<div class="chat-contact" onclick='startPrivateChat("${c.id}","${escapeHtml(c.full_name).replace(/'/g,"&#39;")}")'><div class="chat-contact-avatar" style="background:${roleColor(c.role)}">${avatar(c.role)}</div><div class="chat-contact-info"><div class="chat-contact-name">${escapeHtml(c.full_name)}</div><div class="chat-contact-meta"><span class="role-tag" style="background:${roleColor(c.role)}">${roleLabel(c.role)}</span>${c.grade_levels?.name_ar?`<span class="chat-grade">${escapeHtml(c.grade_levels.name_ar)}</span>`:""}</div></div><div class="chat-contact-action">💬</div></div>`;
  let html="";
  if(groups.superadmin.length)html+=`<div class="chat-section-title">👑 المدير</div>`+groups.superadmin.map(renderCard).join("");
  if(groups.owner.length)html+=`<div class="chat-section-title">👩‍🏫 الميس</div>`+groups.owner.map(renderCard).join("");
  if(groups.support.length)html+=`<div class="chat-section-title">🛠️ الدعم الفني</div>`+groups.support.map(renderCard).join("");
  if(groups.student.length)html+=`<div class="chat-section-title">🎓 الطلاب</div>`+groups.student.map(renderCard).join("");
  list.innerHTML=html;
}

/* ============================================================
   Owner Tabs
   ============================================================ */
function wireOwnerTabs(){
  document.querySelectorAll(".nav-link[data-tab]").forEach(link=>{
    link.addEventListener("click",(e)=>{
      e.preventDefault();
      document.querySelectorAll(".nav-link[data-tab]").forEach(l=>l.classList.remove("active"));
      link.classList.add("active");
      document.querySelectorAll("#view-owner .tab-panel").forEach(p=>p.hidden=true);
      const target=document.getElementById("panel-"+link.dataset.tab);
      if(target)target.hidden=false;
      const tab = link.dataset.tab;
      if(tab==="inbox")loadAdminInbox();
      if(tab==="chats")loadChatsPanel();
      if(tab==="levels")loadLevels();
      if(tab==="courses")loadCourses();
      if(tab==="packages")loadPackages();
      if(tab==="students")loadStudents();
      if(tab==="stats")loadStats();
      if(tab==="analytics")loadAnalytics();
      if(tab==="manage-tasks")loadAdminTasks();
      if(tab==="manage-schedule")loadAdminSchedule();
      if(tab==="manage-library")loadAdminLibrary();
      if(tab==="manage-discounts")loadAdminDiscounts();
    });
  });
}

/* ============================================================
   Admin Inbox
   ============================================================ */
async function loadAdminInbox(){
  const list=document.getElementById("inbox-list");
  if(!list)return;
  list.innerHTML=`<div class="empty-state">جاري التحميل...</div>`;
  const {data,error}=await supabaseClient.from("messages").select("*").order("created_at",{ascending:false}).limit(200);
  if(error){logError("تحميل صندوق الرسائل",error);return;}
  if(!data||!data.length){list.innerHTML=`<div class="empty-state">لسه مفيش رسائل</div>`;return;}
  list.innerHTML=data.map(m=>{
    const isFromMe=m.sender_id===CURRENT_PROFILE.id;
    const time=new Date(m.created_at).toLocaleString("ar-EG",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit"});
    const roleLabel=m.recipient_role==="support"?"🛠️ دعم":m.recipient_role==="owner"?"👩‍🏫 الميس":m.recipient_role==="private"?"🔒 خاص":"💬 عام";
    return `<div class="inbox-item ${m.is_read?"read":"unread"}"><div class="inbox-head"><b>${escapeHtml(m.sender_name)}</b><span class="role-tag">${m.sender_role}</span><span class="inbox-target">→ ${roleLabel}</span><span class="inbox-time">${time}</span></div><div class="inbox-body">${escapeHtml(m.content)}</div>${!isFromMe?`<div class="inbox-actions"><button class="btn btn-teal btn-sm" onclick='startPrivateChat("${m.sender_id}","${escapeHtml(m.sender_name).replace(/'/g,"&#39;")}")'>رد</button></div>`:""}</div>`;
  }).join("");
}

async function refreshOwnerData(){
  try{
    await loadLevels();
    await loadCourses();
    await loadPackages();
    await loadStudents();
    await loadOwnerSettings();
    await loadKpis();
    await loadAdminInbox();
    await loadChatsPanel();
    await loadAdminTasks();
    await loadAdminSchedule();
    await loadAdminLibrary();
    await loadAdminDiscounts();
  }catch(err){logError("تحديث بيانات",err);}
}

async function loadKpis(){
  const [sRes,aRes,cRes]=await Promise.all([
    supabaseClient.from("profiles").select("*",{count:"exact",head:true}).eq("role","student"),
    supabaseClient.from("subscriptions").select("*",{count:"exact",head:true}).eq("status","active"),
    supabaseClient.from("courses").select("*",{count:"exact",head:true})
  ]);
  document.getElementById("kpi-students").textContent=sRes.count??0;
  document.getElementById("kpi-active").textContent=aRes.count??0;
  document.getElementById("kpi-courses").textContent=cRes.count??0;
  document.getElementById("kpi-levels").textContent=CURRENT_LEVELS.length;
}

/* ============================================================
   Stats
   ============================================================ */
async function loadStats(){
  const el = document.getElementById("stats-content");
  if(!el) return;
  el.innerHTML = `<div class="empty-state">جاري التحميل...</div>`;
  const [levelsStats, lessonsStats, ratingsRes] = await Promise.all([
    supabaseClient.rpc("stats_students_per_level"),
    supabaseClient.rpc("stats_lessons_per_course"),
    supabaseClient.from("course_ratings").select("rating")
  ]);
  const levels = levelsStats.data || [];
  const coursesStats = lessonsStats.data || [];
  const ratings = ratingsRes.data || [];
  const totalStudents = levels.reduce((a, l) => a + Number(l.students_count || 0), 0);
  const totalActive = levels.reduce((a, l) => a + Number(l.active_subs || 0), 0);
  const avgAll = ratings.length ? (ratings.reduce((a,r) => a + r.rating, 0) / ratings.length).toFixed(1) : "—";

  el.innerHTML = `
    <div class="kpi-row" style="margin-bottom:24px;">
      <div class="kpi"><div class="num">${totalStudents}</div><div class="label">👥 إجمالي الطلاب</div></div>
      <div class="kpi"><div class="num">${totalActive}</div><div class="label">✅ اشتراكات فعّالة</div></div>
      <div class="kpi"><div class="num">${coursesStats.length}</div><div class="label">📚 الكورسات</div></div>
      <div class="kpi"><div class="num">${avgAll}</div><div class="label">⭐ متوسط التقييم</div></div>
    </div>
    <div class="card" style="margin-bottom:20px;">
      <h3>📊 الطلاب لكل مرحلة</h3>
      ${levels.length ? `<table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:var(--paper-2);"><th style="padding:10px;text-align:start;">المرحلة</th><th style="padding:10px;text-align:start;">الطلاب</th><th style="padding:10px;text-align:start;">اشتراكات</th></tr></thead>
        <tbody>${levels.map(l => `<tr><td style="padding:10px;border-bottom:1px solid var(--line);">${escapeHtml(l.level_name)}</td><td style="padding:10px;border-bottom:1px solid var(--line);"><b>${l.students_count}</b></td><td style="padding:10px;border-bottom:1px solid var(--line);">${l.active_subs}</td></tr>`).join("")}</tbody>
      </table>` : `<div class="empty-state">مفيش بيانات</div>`}
    </div>
    <div class="card">
      <h3>🎬 الكورسات والفيديوهات</h3>
      ${coursesStats.length ? `<table style="width:100%;border-collapse:collapse;">
        <thead><tr style="background:var(--paper-2);"><th style="padding:10px;text-align:start;">الكورس</th><th style="padding:10px;text-align:start;">الفيديوهات</th><th style="padding:10px;text-align:start;">⭐</th></tr></thead>
        <tbody>${coursesStats.map(c => `<tr><td style="padding:10px;border-bottom:1px solid var(--line);">${escapeHtml(c.course_title)}</td><td style="padding:10px;border-bottom:1px solid var(--line);"><b>${c.lessons_count}</b></td><td style="padding:10px;border-bottom:1px solid var(--line);">${c.avg_rating}</td></tr>`).join("")}</tbody>
      </table>` : `<div class="empty-state">مفيش كورسات</div>`}
    </div>`;
}
window.loadStats = loadStats;

/* ============================================================
   Analytics
   ============================================================ */
async function loadAnalytics(){
  const el = document.getElementById("analytics-content");
  if(!el) return;
  el.innerHTML = `<div class="empty-state">جاري التحميل...</div>`;

  const { data: profiles } = await supabaseClient.from("profiles").select("created_at, role").eq("role","student");
  const monthlyGrowth = {};
  (profiles||[]).forEach(p => {
    const month = new Date(p.created_at).toLocaleString("ar-EG",{month:"long",year:"numeric"});
    monthlyGrowth[month] = (monthlyGrowth[month]||0) + 1;
  });

  const { data: courses } = await supabaseClient.from("courses").select("id, title_ar");
  const { data: lessons } = await supabaseClient.from("lessons").select("course_id");
  const { data: progress } = await supabaseClient.from("lesson_progress").select("lesson_id").eq("watched", true);

  const coursePopularity = {};
  (lessons||[]).forEach(l => { coursePopularity[l.course_id] = (coursePopularity[l.course_id]||0) + 1; });
  const topCourses = (courses||[]).map(c => ({...c, lessons: coursePopularity[c.id]||0}))
    .sort((a,b) => b.lessons - a.lessons).slice(0, 5);

  const totalLessons = (lessons||[]).length;
  const totalWatched = (progress||[]).length;
  const completionRate = totalLessons ? Math.round((totalWatched / totalLessons) * 100) : 0;
  const maxGrowth = Math.max(...Object.values(monthlyGrowth), 1);

  el.innerHTML = `
    <div class="kpi-row" style="margin-bottom:24px;">
      <div class="kpi"><div class="num">${(profiles||[]).length}</div><div class="label">👥 إجمالي الطلاب</div></div>
      <div class="kpi"><div class="num">${totalLessons}</div><div class="label">🎬 إجمالي الفيديوهات</div></div>
      <div class="kpi"><div class="num">${totalWatched}</div><div class="label">✅ مشاهدات</div></div>
      <div class="kpi"><div class="num">${completionRate}%</div><div class="label">📊 معدل الإتمام</div></div>
    </div>
    <div class="card" style="margin-bottom:20px;">
      <h3>📈 نمو الطلاب شهريًا</h3>
      <div style="display:flex;gap:8px;align-items:flex-end;height:200px;padding:20px;background:var(--paper);border-radius:12px;">
        ${Object.entries(monthlyGrowth).map(([month, count]) => `
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
            <div style="width:100%;background:linear-gradient(180deg,var(--gold),var(--teal));border-radius:6px 6px 0 0;height:${(count/maxGrowth)*150}px;min-height:10px;position:relative;">
              <span style="position:absolute;top:-20px;inset-inline-start:50%;transform:translateX(-50%);font-size:12px;font-weight:800;color:var(--navy-deep);">${count}</span>
            </div>
            <div style="font-size:10.5px;color:var(--ink-soft);text-align:center;line-height:1.2;">${month}</div>
          </div>`).join("") || `<div class="empty-state">مفيش بيانات</div>`}
      </div>
    </div>
    <div class="card">
      <h3>🏆 أكثر الكورسات شعبية</h3>
      ${topCourses.length ? topCourses.map((c, i) => `
        <div style="display:flex;gap:12px;align-items:center;padding:10px;background:var(--paper);border-radius:8px;margin-bottom:8px;">
          <div style="font-size:24px;">${["🥇","🥈","🥉","4️⃣","5️⃣"][i]}</div>
          <div style="flex:1;"><b style="color:var(--navy-deep);">${escapeHtml(c.title_ar)}</b>
          <div style="font-size:12px;color:var(--ink-soft);">${c.lessons} فيديو</div></div>
        </div>`).join("") : `<div class="empty-state">مفيش بيانات</div>`}
    </div>`;
}
window.loadAnalytics = loadAnalytics;
/* ============================================================
   Levels
   ============================================================ */
async function loadLevels(){
  const {data,error}=await supabaseClient.from("grade_levels").select("*").order("sort_order");
  if(error){logError("تحميل المراحل",error);return;}
  CURRENT_LEVELS=data||[];
  document.getElementById("levels-table").innerHTML=CURRENT_LEVELS.length
    ?CURRENT_LEVELS.map(lv=>`<tr><td>${lv.name_ar}</td><td>${lv.name_en}</td><td>${lv.sort_order}</td><td><button class="icon-btn" onclick='openLevelForm(${JSON.stringify(lv)})'>✏️</button><button class="icon-btn danger" onclick="deleteRow('grade_levels','${lv.id}', loadLevels)">🗑️</button></td></tr>`).join("")
    :`<tr><td colspan="4"><div class="empty-state">لسه مفيش مراحل</div></td></tr>`;
}

function openLevelForm(level){
  const isEdit=!!level;
  document.getElementById("form-modal-content").innerHTML=`<button class="close" onclick="closeFormModal()">✕</button><h3>${isEdit?"تعديل":"إضافة"} مرحلة</h3><form id="level-form"><div class="field"><label>الاسم بالعربي</label><input type="text" id="lv-name-ar" value="${level?.name_ar||""}" required></div><div class="field"><label>Name in English</label><input type="text" id="lv-name-en" value="${level?.name_en||""}" required></div><div class="field"><label>الترتيب</label><input type="number" id="lv-order" value="${level?.sort_order??0}"></div><button class="btn btn-gold btn-block" type="submit">حفظ</button><div class="form-msg" id="level-msg"></div></form>`;
  document.getElementById("form-overlay").classList.add("open");
  document.getElementById("level-form").addEventListener("submit",async(e)=>{
    e.preventDefault();
    const msg=document.getElementById("level-msg");
    const payload={name_ar:document.getElementById("lv-name-ar").value.trim(),name_en:document.getElementById("lv-name-en").value.trim(),sort_order:Number(document.getElementById("lv-order").value)||0};
    const q=isEdit?supabaseClient.from("grade_levels").update(payload).eq("id",level.id):supabaseClient.from("grade_levels").insert(payload);
    const {error}=await q;
    if(error){showMsg(msg,friendlyError(error),"error");return;}
    closeFormModal();await loadLevels();await loadKpis();
  });
}

/* ============================================================
   Courses
   ============================================================ */
async function loadCourses(){
  const {data,error}=await supabaseClient.from("courses").select("*, grade_levels(name_ar)").order("sort_order");
  if(error){logError("تحميل الكورسات",error);return;}
  ALL_COURSES_CACHE = data || [];
  const courseIds = (data || []).map(c => c.id);
  let lessonsCount = {}, ratingsAvg = {};
  if(courseIds.length){
    const { data: lessonsData } = await supabaseClient.from("lessons").select("course_id").in("course_id", courseIds);
    (lessonsData||[]).forEach(l => { lessonsCount[l.course_id] = (lessonsCount[l.course_id]||0)+1; });
    const { data: ratingsData } = await supabaseClient.from("course_ratings").select("course_id, rating").in("course_id", courseIds);
    const totals = {};
    (ratingsData||[]).forEach(r => {
      if(!totals[r.course_id]) totals[r.course_id] = {sum:0, count:0};
      totals[r.course_id].sum += r.rating;
      totals[r.course_id].count += 1;
    });
    Object.keys(totals).forEach(k => { ratingsAvg[k] = (totals[k].sum / totals[k].count).toFixed(1); });
  }
  document.getElementById("courses-table").innerHTML=(data&&data.length)
    ?data.map(c=>`<tr>
        <td><b>${escapeHtml(c.title_ar)}</b></td>
        <td>${c.grade_levels?.name_ar||"—"}</td>
        <td><b>${lessonsCount[c.id]||0}</b> فيديو</td>
        <td>${ratingsAvg[c.id]||"—"} ⭐</td>
        <td>
          <button class="icon-btn" onclick='openLessonsManager("${c.id}","${escapeHtml(c.title_ar).replace(/'/g,"&#39;")}")'>🎬 الفيديوهات</button>
          <button class="icon-btn" onclick='openCourseForm(${JSON.stringify(c).replace(/'/g,"&#39;")})'>✏️</button>
          <button class="icon-btn" onclick='openCommentsModal("${c.id}","${escapeHtml(c.title_ar).replace(/'/g,"&#39;")}")'>💬</button>
          <button class="icon-btn danger" onclick="deleteRow('courses','${c.id}', loadCourses)">🗑️</button>
        </td>
      </tr>`).join("")
    :`<tr><td colspan="5"><div class="empty-state">لسه مفيش كورسات</div></td></tr>`;
}

function levelOptions(selectedId){
  return CURRENT_LEVELS.map(lv=>`<option value="${lv.id}" ${lv.id===selectedId?"selected":""}>${lv.name_ar}</option>`).join("");
}

function openCourseForm(course){
  if(!CURRENT_LEVELS.length){showToast("⚠️ أضف مرحلة أول","error");return;}
  const isEdit=!!course;
  document.getElementById("form-modal-content").innerHTML=`
    <button class="close" onclick="closeFormModal()">✕</button>
    <h3>${isEdit?"تعديل":"إضافة"} كورس</h3>
    <form id="course-form">
      <div class="field"><label>عنوان (عربي)</label><input type="text" id="cr-title-ar" value="${course?.title_ar||""}" required></div>
      <div class="field"><label>Course title (English)</label><input type="text" id="cr-title-en" value="${course?.title_en||""}" required></div>
      <div class="field"><label>المرحلة</label><select id="cr-level" required>${levelOptions(course?.grade_level_id)}</select></div>
      <div class="field"><label>وصف</label><textarea id="cr-desc-ar" rows="2">${course?.description_ar||""}</textarea></div>
      <div class="field"><label>نوع المحتوى</label>
        <select id="cr-type">
          <option value="link" ${course?.content_type==="link"?"selected":""}>🎬 كورس فيديوهات</option>
          <option value="file" ${course?.content_type==="file"?"selected":""}>📄 ملف</option>
        </select></div>
      <div class="field" id="cr-link-field"><label>رابط تقديمي (اختياري)</label><input type="url" id="cr-link" value="${course?.content_type==="link"?course.content_url:""}"></div>
      <button class="btn btn-gold btn-block" type="submit">حفظ</button>
      <div class="form-msg" id="course-msg"></div>
    </form>`;
  document.getElementById("form-overlay").classList.add("open");
  document.getElementById("course-form").addEventListener("submit",async(e)=>{
    e.preventDefault();
    const msg=document.getElementById("course-msg");
    let contentUrl=document.getElementById("cr-link").value.trim();
    if(!contentUrl){ contentUrl = "https://placeholder.com"; }
    const payload={title_ar:document.getElementById("cr-title-ar").value.trim(),title_en:document.getElementById("cr-title-en").value.trim(),grade_level_id:document.getElementById("cr-level").value,description_ar:document.getElementById("cr-desc-ar").value.trim(),content_type:document.getElementById("cr-type").value,content_url:contentUrl};
    const q=course?supabaseClient.from("courses").update(payload).eq("id",course.id):supabaseClient.from("courses").insert(payload);
    const {error}=await q;
    if(error){showMsg(msg,friendlyError(error),"error");return;}
    closeFormModal();await loadCourses();await loadKpis();
  });
}

/* ============================================================
   Lessons Manager
   ============================================================ */
async function openLessonsManager(courseId, courseTitle){
  const { data: lessons } = await supabaseClient.from("lessons").select("*").eq("course_id", courseId).order("sort_order");
  const list = lessons || [];
  document.getElementById("form-modal-content").innerHTML = `
    <button class="close" onclick="closeFormModal()">✕</button>
    <h3>🎬 فيديوهات: ${escapeHtml(courseTitle)}</h3>
    <button class="btn btn-gold btn-block" style="margin-bottom:16px; padding:14px; font-size:15px;" onclick='openLessonForm("${courseId}")'>
      ➕ إضافة فيديو جديد
    </button>
    <div style="max-height:60vh;overflow-y:auto;">
      ${list.length ? list.map(l => `
        <div style="background:var(--paper-2);padding:12px;border-radius:8px;margin-bottom:8px;display:flex;gap:10px;align-items:center;">
          ${getVideoThumbnail(l.video_type, l.video_url) ? `<img src="${getVideoThumbnail(l.video_type, l.video_url)}" style="width:70px;height:44px;object-fit:cover;border-radius:6px;">` : `<div style="width:70px;height:44px;background:var(--line);border-radius:6px;display:flex;align-items:center;justify-content:center;">🎬</div>`}
          <div style="flex:1;min-width:0;">
            <b style="color:var(--navy-deep);font-size:14px;">${escapeHtml(l.title_ar)}</b>
          </div>
          <button class="icon-btn danger" onclick='deleteLesson("${l.id}","${courseId}","${escapeHtml(courseTitle).replace(/'/g,"&#39;")}")'>🗑️</button>
        </div>
      `).join("") : `<div class="empty-state">لسه مفيش فيديوهات</div>`}
    </div>`;
  document.getElementById("form-overlay").classList.add("open");
}
window.openLessonsManager = openLessonsManager;

function openLessonForm(courseId){
  document.getElementById("form-modal-content").innerHTML = `
    <button class="close" onclick="closeFormModal()">✕</button>
    <h3>🎬 إضافة فيديو</h3>
    <form id="lesson-form">
      <div class="field"><label>العنوان</label><input type="text" id="ls-title" required></div>
      <div class="field"><label>الوصف</label><textarea id="ls-desc" rows="2"></textarea></div>
      <div class="field"><label>النوع</label>
        <select id="ls-type">
          <option value="youtube">▶️ يوتيوب</option>
          <option value="vimeo">🎥 فيميو</option>
          <option value="drive">📁 جوجل درايف</option>
          <option value="file">📱 رفع ملف</option>
        </select></div>
      <div class="field" id="ls-url-field"><label>الرابط</label><input type="url" id="ls-url"></div>
      <div class="field" id="ls-file-field" hidden><label>اختر ملف</label><input type="file" id="ls-file" accept="video/*"></div>
      <button class="btn btn-gold btn-block" type="submit">حفظ</button>
      <div class="form-msg" id="ls-msg"></div>
    </form>`;
  const typeSel = document.getElementById("ls-type");
  const toggle = () => {
    document.getElementById("ls-file-field").hidden = typeSel.value !== "file";
    document.getElementById("ls-url-field").hidden = typeSel.value === "file";
  };
  typeSel.addEventListener("change", toggle); toggle();
  document.getElementById("lesson-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("ls-msg");
    let videoUrl = document.getElementById("ls-url").value.trim();
    if(typeSel.value === "file"){
      const file = document.getElementById("ls-file").files[0];
      if(!file){ showMsg(msg, "اختار ملف", "error"); return; }
      const path = `lessons/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(path, file);
      if(upErr){ showMsg(msg, friendlyError(upErr), "error"); return; }
      videoUrl = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabaseClient.from("lessons").insert({
      course_id: courseId,
      title_ar: document.getElementById("ls-title").value.trim(),
      description_ar: document.getElementById("ls-desc").value.trim(),
      video_type: typeSel.value,
      video_url: videoUrl
    });
    if(error){ showMsg(msg, friendlyError(error), "error"); return; }
    logOk("الفيديو", "تمت الإضافة");
    closeFormModal();
    await loadCourses();
  });
}
window.openLessonForm = openLessonForm;

async function deleteLesson(id, courseId, courseTitle){
  if(!confirm("متأكدة؟")) return;
  await supabaseClient.from("lessons").delete().eq("id", id);
  openLessonsManager(courseId, courseTitle);
}
window.deleteLesson = deleteLesson;

/* ============================================================
   Course Player
   ============================================================ */
async function openCoursePlayer(courseId, courseTitle){
  const [courseRes, lessonsRes, ratingRes, progressRes, myRatingRes] = await Promise.all([
    supabaseClient.from("courses").select("*").eq("id", courseId).single(),
    supabaseClient.from("lessons").select("*").eq("course_id", courseId).order("sort_order"),
    supabaseClient.rpc("course_rating_stats", { course_uuid: courseId }),
    supabaseClient.from("lesson_progress").select("lesson_id").eq("student_id", CURRENT_PROFILE.id).eq("watched", true),
    supabaseClient.from("course_ratings").select("*").eq("course_id", courseId).eq("student_id", CURRENT_PROFILE.id).maybeSingle()
  ]);
  const lessons = lessonsRes.data || [];
  const rating = ratingRes.data?.[0] || { avg_rating: 0, total_ratings: 0 };
  const myRating = myRatingRes.data;
  LESSONS_PROGRESS = {};
  (progressRes.data||[]).forEach(p => { LESSONS_PROGRESS[p.lesson_id] = true; });
  const watchedCount = lessons.filter(l => LESSONS_PROGRESS[l.id]).length;
  const progressPct = lessons.length ? Math.round((watchedCount / lessons.length) * 100) : 0;

  document.getElementById("course-player-body").innerHTML = `
    <div class="course-player-head">
      <h2>${escapeHtml(courseTitle)}</h2>
      <div class="player-meta">
        <span>⭐ ${rating.avg_rating} (${rating.total_ratings})</span>
        <span>📹 ${lessons.length} فيديو</span>
      </div>
      <div class="progress-bar" style="margin-top:12px;"><div class="progress-fill" style="width:${progressPct}%;"></div></div>
      <div style="font-size:12px;color:var(--ink-soft);margin-top:6px;">📊 ${progressPct}% (${watchedCount}/${lessons.length})</div>
    </div>
    <div class="lessons-list">
      ${lessons.length ? lessons.map((l, i) => `
        <div class="lesson-item ${LESSONS_PROGRESS[l.id] ? 'watched' : ''}" onclick='playLesson(${JSON.stringify(l).replace(/'/g,"&#39;")})'>
          <div class="lesson-thumb">
            ${getVideoThumbnail(l.video_type, l.video_url) ? `<img src="${getVideoThumbnail(l.video_type, l.video_url)}">` : `<div class="lesson-placeholder">🎬</div>`}
            <div class="lesson-play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
            <span class="lesson-num">${LESSONS_PROGRESS[l.id] ? "✓" : i+1}</span>
          </div>
          <div class="lesson-info">
            <h4>${escapeHtml(l.title_ar)}</h4>
            ${l.description_ar ? `<p>${escapeHtml(l.description_ar)}</p>` : ""}
          </div>
        </div>`).join("") : `<div class="empty-state">لسه مفيش فيديوهات</div>`}
    </div>
    <div class="course-rating-section">
      <h3>⭐ قيّم الكورس</h3>
      <div class="rating-stars" id="rating-stars">
        ${[1,2,3,4,5].map(n => `<span class="star ${myRating && myRating.rating >= n ? "active" : ""}" onclick="submitRating('${courseId}', ${n})">★</span>`).join("")}
      </div>
      ${myRating ? `<p class="rating-thanks">شكراً لتقييمك 💛</p>` : ""}
    </div>`;
  document.getElementById("course-player-overlay").classList.add("open");
}
window.openCoursePlayer = openCoursePlayer;

function playLesson(lesson){
  const player = document.getElementById("video-player");
  const placeholder = document.getElementById("video-placeholder");
  document.getElementById("video-title").textContent = lesson.title_ar || "";
  document.getElementById("video-desc").textContent = lesson.description_ar || "";
  let html = "";
  if(lesson.video_type === "youtube"){
    const ytId = extractYouTubeId(lesson.video_url);
    if(ytId) html = `<iframe width="100%" height="100%" src="https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  } else if(lesson.video_type === "vimeo"){
    const m = lesson.video_url.match(/vimeo\.com\/(\d+)/);
    if(m) html = `<iframe src="https://player.vimeo.com/video/${m[1]}?autoplay=1" width="100%" height="100%" frameborder="0"></iframe>`;
  } else if(lesson.video_type === "drive"){
    const m = lesson.video_url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([A-Za-z0-9_-]+)/);
    if(m) html = `<iframe src="https://drive.google.com/file/d/${m[1]}/preview" width="100%" height="100%" frameborder="0"></iframe>`;
  } else {
    html = `<video src="${lesson.video_url}" controls autoplay style="width:100%;height:100%;"></video>`;
  }
  player.innerHTML = html || `<div style="color:#fff;padding:20px;text-align:center;">⚠️ الرابط غلط</div>`;
  placeholder.style.display = "none";
  player.style.display = "block";
  if(CURRENT_PROFILE){
    supabaseClient.from("lesson_progress").upsert({lesson_id: lesson.id, student_id: CURRENT_PROFILE.id, watched: true},{onConflict:"lesson_id,student_id"}).then(() => {
      supabaseClient.rpc("add_points", {student_uuid: CURRENT_PROFILE.id, points: 10}).then(()=>{});
    });
  }
}
window.playLesson = playLesson;

async function submitRating(courseId, rating){
  if(!CURRENT_PROFILE) return;
  await supabaseClient.from("course_ratings").upsert({course_id: courseId, student_id: CURRENT_PROFILE.id, rating}, { onConflict: "course_id,student_id" });
  showToast("✅ شكراً لتقييمك", "ok", 2000);
  document.querySelectorAll("#rating-stars .star").forEach((s, i) => s.classList.toggle("active", i < rating));
}
window.submitRating = submitRating;

function closeCoursePlayer(){
  document.getElementById("course-player-overlay").classList.remove("open");
  const player = document.getElementById("video-player");
  if(player) player.innerHTML = "";
}
window.closeCoursePlayer = closeCoursePlayer;

/* ============================================================
   Comments
   ============================================================ */
async function openCommentsModal(courseId, courseTitle){
  document.getElementById("comments-title").textContent = "💬 " + courseTitle;
  document.getElementById("comments-overlay").dataset.courseId = courseId;
  document.getElementById("comments-overlay").classList.add("open");
  await loadComments(courseId);
}
async function loadComments(courseId){
  const list = document.getElementById("comments-list");
  list.innerHTML = `<div class="empty-state">جاري التحميل...</div>`;
  const { data, error } = await supabaseClient.from("comments")
    .select("*, profiles(full_name, role)").eq("course_id", courseId)
    .order("created_at", {ascending: false});
  if(error || !data?.length){
    list.innerHTML = `<div class="empty-state">لسه مفيش تعليقات</div>`;
    return;
  }
  list.innerHTML = data.map(c => `
    <div style="background:var(--paper);padding:12px;border-radius:10px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <b style="color:var(--navy-deep);">${escapeHtml(c.profiles?.full_name || "طالب")}</b>
        <span class="role-tag">${c.profiles?.role || "student"}</span>
      </div>
      <p style="margin:0;font-size:14px;">${escapeHtml(c.content)}</p>
    </div>`).join("");
}
async function submitComment(){
  const overlay = document.getElementById("comments-overlay");
  const courseId = overlay.dataset.courseId;
  const content = document.getElementById("comment-input").value.trim();
  if(!content) return;
  await supabaseClient.from("comments").insert({course_id: courseId, student_id: CURRENT_PROFILE.id, content});
  document.getElementById("comment-input").value = "";
  await loadComments(courseId);
}
function closeComments(){document.getElementById("comments-overlay").classList.remove("open");}
window.openCommentsModal = openCommentsModal;
window.closeComments = closeComments;
window.submitComment = submitComment;

/* ============================================================
   Certificate
   ============================================================ */
async function openCertificate(courseId){
  document.getElementById("cert-overlay").classList.add("open");
  const body = document.getElementById("cert-body");
  const { data: course } = await supabaseClient.from("courses").select("*").eq("id", courseId).single();
  const { data: lessons } = await supabaseClient.from("lessons").select("id").eq("course_id", courseId);
  const { data: progress } = await supabaseClient.from("lesson_progress")
    .select("lesson_id").eq("student_id", CURRENT_PROFILE.id).eq("watched", true);
  const total = lessons?.length || 0;
  const watched = progress?.filter(p => lessons?.some(l => l.id === p.lesson_id)).length || 0;
  const pct = total ? Math.round((watched/total)*100) : 0;

  if(pct < 80){
    body.innerHTML = `<h3>📜 شهادة الإتمام</h3><div class="empty-state" style="padding:40px 20px;"><div style="font-size:48px;margin-bottom:12px;">⚠️</div><p>لازم تكمّل 80% (${watched}/${total})</p><button class="btn btn-teal" onclick="closeCertificate()">موافق</button></div>`;
    return;
  }
  body.innerHTML = `
    <div style="background:linear-gradient(135deg,#FAF6EE,#F1EADC);padding:40px;border:6px double var(--gold);border-radius:16px;text-align:center;">
      <div style="font-size:60px;">🏆</div>
      <h2 style="color:var(--navy-deep);margin:12px 0 6px;">شهادة إتمام</h2>
      <p style="color:var(--ink-soft);font-size:14px;">تشهد المنصة بأن</p>
      <h3 style="color:var(--navy-deep);font-size:24px;margin:14px 0;">${escapeHtml(CURRENT_PROFILE.full_name)}</h3>
      <p style="color:var(--ink-soft);font-size:14px;">قد أكمل بنجاح كورس</p>
      <h3 style="color:var(--teal);font-size:20px;margin:10px 0;">${escapeHtml(course?.title_ar || "")}</h3>
      <p style="color:var(--ink-soft);font-size:13px;margin-top:20px;">بإشراف: مس. شيرهان علي</p>
      <p style="color:var(--ink-soft);font-size:12px;">${new Date().toLocaleDateString("ar-EG")}</p>
      <button class="btn btn-gold" style="margin-top:20px;" onclick="window.print()">🖨️ اطبع</button>
    </div>`;
}
function closeCertificate(){document.getElementById("cert-overlay").classList.remove("open");}
window.openCertificate = openCertificate;
window.closeCertificate = closeCertificate;

/* ============================================================
   Student: Tasks
   ============================================================ */
async function loadMyTasks(){
  const list = document.getElementById("tasks-list");
  if(!list) return;
  list.innerHTML = `<div class="empty-state">جاري التحميل...</div>`;
  const { data, error } = await supabaseClient.from("tasks")
    .select("*").eq("student_id", CURRENT_PROFILE.id).order("created_at", {ascending: false});
  if(error || !data?.length){
    list.innerHTML = `<div class="empty-state">لسه مفيش مهام — اضغط "+ إضافة مهمة"</div>`;
    return;
  }
  list.innerHTML = data.map(t => `
    <div class="task-item ${t.is_done ? 'done' : ''}">
      <label class="task-check">
        <input type="checkbox" ${t.is_done ? 'checked' : ''} onchange="toggleTask('${t.id}', this.checked)">
        <span class="checkmark"></span>
      </label>
      <div class="task-body">
        <div class="task-title">${escapeHtml(t.title)}</div>
        ${t.due_date ? `<div class="task-due">📅 ${t.due_date}</div>` : ""}
      </div>
      <button class="icon-btn danger" onclick="deleteTask('${t.id}')">🗑️</button>
    </div>`).join("");
}

function openAddTaskForm(){
  document.getElementById("form-modal-content").innerHTML = `
    <button class="close" onclick="closeFormModal()">✕</button>
    <h3>➕ إضافة مهمة</h3>
    <form id="task-form">
      <div class="field"><label>عنوان المهمة</label><input type="text" id="task-title" required></div>
      <div class="field"><label>تاريخ التسليم</label><input type="date" id="task-due"></div>
      <button class="btn btn-gold btn-block" type="submit">حفظ</button>
      <div class="form-msg" id="task-msg"></div>
    </form>`;
  document.getElementById("form-overlay").classList.add("open");
  document.getElementById("task-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("task-msg");
    const { error } = await supabaseClient.from("tasks").insert({
      student_id: CURRENT_PROFILE.id,
      title: document.getElementById("task-title").value.trim(),
      due_date: document.getElementById("task-due").value || null
    });
    if(error){ showMsg(msg, friendlyError(error), "error"); return; }
    closeFormModal();
    await loadMyTasks();
  });
}
async function toggleTask(id, isDone){
  await supabaseClient.from("tasks").update({is_done: isDone}).eq("id", id);
  await loadMyTasks();
}
async function deleteTask(id){
  if(!confirm("متأكدة؟")) return;
  await supabaseClient.from("tasks").delete().eq("id", id);
  await loadMyTasks();
}
window.openAddTaskForm = openAddTaskForm;
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;

/* ============================================================
   Admin: Tasks
   ============================================================ */
async function loadAdminTasks(){
  const tbody = document.getElementById("admin-tasks-table");
  if(!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">جاري التحميل...</div></td></tr>`;
  const { data } = await supabaseClient.from("tasks")
    .select("*").order("created_at", {ascending: false});
  if(!data?.length){
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">لسه مفيش مهام</div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(t => `
    <tr>
      <td>${escapeHtml(t.title)}</td>
      <td>${t.due_date || "—"}</td>
      <td><span class="badge ${t.is_done ? 'active' : 'expired'}">${t.is_done ? "تم" : "قيد التنفيذ"}</span></td>
      <td><button class="icon-btn danger" onclick="deleteAdminTask('${t.id}')">🗑️</button></td>
    </tr>`).join("");
}
function openAdminTaskForm(){
  document.getElementById("form-modal-content").innerHTML = `
    <button class="close" onclick="closeFormModal()">✕</button>
    <h3>➕ إضافة مهمة لطالب</h3>
    <form id="admin-task-form">
      <div class="field"><label>عنوان المهمة</label><input type="text" id="at-title" required></div>
      <div class="field"><label>تاريخ التسليم</label><input type="date" id="at-due"></div>
      <button class="btn btn-gold btn-block" type="submit">حفظ</button>
      <div class="form-msg" id="at-msg"></div>
    </form>`;
  document.getElementById("form-overlay").classList.add("open");
  document.getElementById("admin-task-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    // ملاحظة: الأونر يضيف لطالب بدون تحديد — يحب نخلي الحقل طالب؟ (نخليه عام)
    closeFormModal();
    showToast("⚠️ اختار الطالب من قائمة الطلاب", "info");
  });
}
async function deleteAdminTask(id){
  if(!confirm("متأكدة؟")) return;
  await supabaseClient.from("tasks").delete().eq("id", id);
  await loadAdminTasks();
}
window.loadAdminTasks = loadAdminTasks;
window.openAdminTaskForm = openAdminTaskForm;
window.deleteAdminTask = deleteAdminTask;

/* ============================================================
   Schedule
   ============================================================ */
async function loadMySchedule(){
  const list = document.getElementById("student-schedule-list");
  if(!list) return;
  list.innerHTML = `<div class="empty-state">جاري التحميل...</div>`;
  const { data, error } = await supabaseClient.from("schedule").select("*").order("start_time");
  if(error || !data?.length){
    list.innerHTML = `<div class="empty-state">لسه مفيش حصص مجدولة</div>`;
    return;
  }
  list.innerHTML = data.map(s => {
    const d = new Date(s.start_time);
    return `
      <div class="schedule-card ${s.is_live ? 'live' : ''}">
        <div class="schedule-time">
          <div class="schedule-day">${d.toLocaleDateString("ar-EG",{weekday:"long"})}</div>
          <div class="schedule-date">${d.toLocaleDateString("ar-EG",{day:"numeric",month:"short"})}</div>
          <div class="schedule-hour">${d.toLocaleTimeString("ar-EG",{hour:"2-digit",minute:"2-digit"})}</div>
        </div>
        <div class="schedule-body">
          <h4>${escapeHtml(s.title_ar)}</h4>
          ${s.description ? `<p>${escapeHtml(s.description)}</p>` : ""}
          ${s.is_live ? `<span class="live-badge">🔴 مباشر</span>` : ""}
        </div>
        ${s.meet_link ? `<a href="${s.meet_link}" target="_blank" class="btn btn-teal btn-sm">ادخل</a>` : ""}
      </div>`;
  }).join("");
}
async function loadAdminSchedule(){
  const list = document.getElementById("admin-schedule-list");
  if(!list) return;
  list.innerHTML = `<div class="empty-state">جاري التحميل...</div>`;
  const { data, error } = await supabaseClient.from("schedule").select("*").order("start_time", {ascending: false});
  if(error || !data?.length){
    list.innerHTML = `<div class="empty-state">لسه مفيش حصص</div>`;
    return;
  }
  list.innerHTML = data.map(s => `
    <div class="inbox-item">
      <div class="inbox-head">
        <b>${escapeHtml(s.title_ar)}</b>
        <span class="inbox-time">${new Date(s.start_time).toLocaleString("ar-EG")}</span>
      </div>
      ${s.description ? `<div class="inbox-body">${escapeHtml(s.description)}</div>` : ""}
      <div class="inbox-actions">
        ${s.meet_link ? `<a href="${s.meet_link}" target="_blank" class="btn btn-teal btn-sm">فتح</a>` : ""}
        <button class="icon-btn danger" onclick="deleteSchedule('${s.id}')">🗑️</button>
      </div>
    </div>`).join("");
}

function openAdminScheduleForm(){
  document.getElementById("form-modal-content").innerHTML = `
    <button class="close" onclick="closeFormModal()">✕</button>
    <h3>➕ إضافة حصة</h3>
    <form id="schedule-form">
      <div class="field"><label>عنوان الحصة</label><input type="text" id="sch-title" required></div>
      <div class="field"><label>الوصف</label><textarea id="sch-desc" rows="2"></textarea></div>
      <div class="field"><label>المرحلة</label>
        <select id="sch-level"><option value="">الكل</option>${levelOptions()}</select></div>
      <div class="field"><label>وقت البداية</label><input type="datetime-local" id="sch-start" required></div>
      <div class="field"><label>رابط الحصة</label><input type="url" id="sch-link" placeholder="https://meet.google.com/..."></div>
      <div class="field"><label>مباشر الآن؟</label>
        <select id="sch-live">
          <option value="false">لا</option>
          <option value="true">نعم — مباشر 🔴</option>
        </select></div>
      <button class="btn btn-gold btn-block" type="submit">حفظ</button>
      <div class="form-msg" id="sch-msg"></div>
    </form>`;
  document.getElementById("form-overlay").classList.add("open");
  document.getElementById("schedule-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("sch-msg");
    const payload = {
      title_ar: document.getElementById("sch-title").value.trim(),
      description: document.getElementById("sch-desc").value.trim(),
      grade_level_id: document.getElementById("sch-level").value || null,
      start_time: new Date(document.getElementById("sch-start").value).toISOString(),
      meet_link: document.getElementById("sch-link").value.trim() || null,
      is_live: document.getElementById("sch-live").value === "true"
    };
    const { error } = await supabaseClient.from("schedule").insert(payload);
    if(error){ showMsg(msg, friendlyError(error), "error"); return; }
    logOk("الحصة", "تمت الإضافة");
    closeFormModal();
    await loadAdminSchedule();
  });
}

async function deleteSchedule(id){
  if(!confirm("متأكدة؟")) return;
  await supabaseClient.from("schedule").delete().eq("id", id);
  await loadAdminSchedule();
}
window.loadMySchedule = loadMySchedule;
window.loadAdminSchedule = loadAdminSchedule;
window.openAdminScheduleForm = openAdminScheduleForm;
window.deleteSchedule = deleteSchedule;

/* ============================================================
   Library
   ============================================================ */
async function loadMyLibrary(){
  const list = document.getElementById("library-list");
  if(!list) return;
  list.innerHTML = `<div class="empty-state">جاري التحميل...</div>`;
  const { data, error } = await supabaseClient.from("library_files")
    .select("*").order("created_at", {ascending: false});
  if(error || !data?.length){
    list.innerHTML = `<div class="empty-state">لسه مفيش ملفات</div>`;
    return;
  }
  list.innerHTML = `<div class="grid grid-3">` + data.map(f => `
    <div class="card library-card">
      <div class="library-icon">📄</div>
      <h4>${escapeHtml(f.title_ar)}</h4>
      ${f.description ? `<p>${escapeHtml(f.description)}</p>` : ""}
      ${f.file_size_kb ? `<span class="library-size">${(f.file_size_kb/1024).toFixed(1)} MB</span>` : ""}
      <a href="${f.file_url}" target="_blank" download class="btn btn-teal btn-block btn-sm">⬇️ تحميل</a>
    </div>`).join("") + `</div>`;
}

async function loadAdminLibrary(){
  const tbody = document.getElementById("admin-library-table");
  if(!tbody) return;
  tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state">جاري التحميل...</div></td></tr>`;
  const { data, error } = await supabaseClient.from("library_files")
    .select("*, grade_levels(name_ar)").order("created_at", {ascending: false});
  if(error || !data?.length){
    tbody.innerHTML = `<tr><td colspan="4"><div class="empty-state">لسه مفيش ملفات</div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(f => `
    <tr>
      <td>${escapeHtml(f.title_ar)}</td>
      <td>${f.grade_levels?.name_ar || "الكل"}</td>
      <td>${f.file_size_kb ? (f.file_size_kb/1024).toFixed(1)+" MB" : "—"}</td>
      <td>
        <a href="${f.file_url}" target="_blank" class="icon-btn">👁️</a>
        <button class="icon-btn danger" onclick="deleteLibraryFile('${f.id}')">🗑️</button>
      </td>
    </tr>`).join("");
}

function openAdminLibraryForm(){
  document.getElementById("form-modal-content").innerHTML = `
    <button class="close" onclick="closeFormModal()">✕</button>
    <h3>➕ إضافة ملف للمكتبة</h3>
    <form id="library-form">
      <div class="field"><label>اسم الملف</label><input type="text" id="lib-title" required></div>
      <div class="field"><label>وصف مختصر</label><textarea id="lib-desc" rows="2"></textarea></div>
      <div class="field"><label>المرحلة</label>
        <select id="lib-level"><option value="">الكل</option>${levelOptions()}</select></div>
      <div class="field" id="lib-file-field"><label>اختر الملف</label><input type="file" id="lib-file" required></div>
      <button class="btn btn-gold btn-block" type="submit">حفظ</button>
      <div class="form-msg" id="lib-msg"></div>
    </form>`;
  document.getElementById("form-overlay").classList.add("open");
  document.getElementById("library-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("lib-msg");
    const file = document.getElementById("lib-file").files[0];
    if(!file){ showMsg(msg, "اختار ملف", "error"); return; }
    showMsg(msg, "جاري الرفع...", "ok");
    const path = `library/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabaseClient.storage.from(STORAGE_BUCKET).upload(path, file);
    if(upErr){ showMsg(msg, friendlyError(upErr), "error"); return; }
    const file_url = supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
    const { error } = await supabaseClient.from("library_files").insert({
      title_ar: document.getElementById("lib-title").value.trim(),
      description: document.getElementById("lib-desc").value.trim(),
      grade_level_id: document.getElementById("lib-level").value || null,
      file_url,
      file_size_kb: Math.round(file.size / 1024)
    });
    if(error){ showMsg(msg, friendlyError(error), "error"); return; }
    logOk("الملف", "تمت الإضافة");
    closeFormModal();
    await loadAdminLibrary();
  });
}

async function deleteLibraryFile(id){
  if(!confirm("متأكدة؟")) return;
  await supabaseClient.from("library_files").delete().eq("id", id);
  await loadAdminLibrary();
}
window.loadMyLibrary = loadMyLibrary;
window.loadAdminLibrary = loadAdminLibrary;
window.openAdminLibraryForm = openAdminLibraryForm;
window.deleteLibraryFile = deleteLibraryFile;

/* ============================================================
   Certificates
   ============================================================ */
async function loadMyCertificates(){
  const list = document.getElementById("certificates-list");
  if(!list) return;
  list.innerHTML = `<div class="empty-state">جاري التحميل...</div>`;
  const { data: courses } = await supabaseClient.from("courses")
    .select("*").eq("grade_level_id", CURRENT_PROFILE.grade_level_id);
  if(!courses?.length){
    list.innerHTML = `<div class="empty-state">لسه مفيش كورسات</div>`;
    return;
  }
  const certs = [];
  for(const course of courses){
    const { data: lessons } = await supabaseClient.from("lessons").select("id").eq("course_id", course.id);
    const { data: progress } = await supabaseClient.from("lesson_progress")
      .select("lesson_id").eq("student_id", CURRENT_PROFILE.id).eq("watched", true);
    const lessonIds = (lessons||[]).map(l => l.id);
    const watched = (progress||[]).filter(p => lessonIds.includes(p.lesson_id)).length;
    const total = lessonIds.length;
    const pct = total ? Math.round((watched/total)*100) : 0;
    if(pct >= 80) certs.push({ course, pct });
  }
  if(!certs.length){
    list.innerHTML = `<div class="empty-state">لازم تكمّل 80% من كورس عشان تحصل على شهادة 🎓</div>`;
    return;
  }
  list.innerHTML = `<div class="grid grid-3">` + certs.map(c => `
    <div class="card cert-card">
      <div class="cert-icon">🏆</div>
      <h4>${escapeHtml(c.course.title_ar)}</h4>
      <p>${c.pct}% مكتمل</p>
      <button class="btn btn-gold btn-block btn-sm" onclick='openCertificate("${c.course.id}")'>📜 عرض الشهادة</button>
    </div>`).join("") + `</div>`;
}
window.loadMyCertificates = loadMyCertificates;

/* ============================================================
   Points
   ============================================================ */
async function loadMyPoints(){
  const content = document.getElementById("student-points-content");
  if(!content) return;
  content.innerHTML = `<div class="empty-state">جاري التحميل...</div>`;
  const { data } = await supabaseClient.from("student_points")
    .select("*").eq("student_id", CURRENT_PROFILE.id).maybeSingle();
  const points = data?.points || 0;
  const badges = data?.badges || [];
  const level = points >= 1000 ? "🏆 أسطورة" :
                points >= 500 ? "👑 ذهبي" :
                points >= 200 ? "🌟 فضي" :
                points >= 50 ? "⭐ برونزي" :
                "🎯 مبتدئ";
  content.innerHTML = `
    <div class="card" style="text-align:center;padding:40px;">
      <div style="font-size:80px;margin-bottom:16px;">${level.split(" ")[0]}</div>
      <h2 style="color:var(--navy-deep);font-size:44px;margin:0;">${points}</h2>
      <p style="color:var(--ink-soft);">نقطة</p>
      <div style="margin-top:20px;padding:14px;background:var(--paper-2);border-radius:12px;display:inline-block;">
        <b>المستوى:</b> ${level}
      </div>
    </div>
    ${badges.length ? `
      <div class="card" style="margin-top:20px;">
        <h3>🏅 الشارات</h3>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          ${badges.map(b => `<span class="badge-chip">${escapeHtml(b)}</span>`).join("")}
        </div>
      </div>` : ""}`;
}
window.loadMyPoints = loadMyPoints;

/* ============================================================
   Discounts
   ============================================================ */
async function loadAdminDiscounts(){
  const tbody = document.getElementById("admin-discounts-table");
  if(!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">جاري التحميل...</div></td></tr>`;
  const { data, error } = await supabaseClient.from("discount_codes")
    .select("*").order("created_at", {ascending: false});
  if(error || !data?.length){
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state">لسه مفيش أكواد</div></td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(d => `
    <tr>
      <td><b>${escapeHtml(d.code)}</b></td>
      <td>${d.discount_percent}%</td>
      <td>${d.used_count}/${d.max_uses}</td>
      <td>${d.expires_at ? new Date(d.expires_at).toLocaleDateString("ar-EG") : "—"}</td>
      <td><button class="icon-btn danger" onclick="deleteDiscount('${d.id}')">🗑️</button></td>
    </tr>`).join("");
}
function openAdminDiscountForm(){
  document.getElementById("form-modal-content").innerHTML = `
    <button class="close" onclick="closeFormModal()">✕</button>
    <h3>➕ إضافة كود خصم</h3>
    <form id="discount-form">
      <div class="field"><label>الكود</label><input type="text" id="dc-code" required placeholder="مثال: SAVE20"></div>
      <div class="field"><label>نسبة الخصم %</label><input type="number" id="dc-percent" min="1" max="100" value="10" required></div>
      <div class="field"><label>الحد الأقصى للاستخدام</label><input type="number" id="dc-max" value="100"></div>
      <div class="field"><label>ينتهي في (اختياري)</label><input type="date" id="dc-expires"></div>
      <button class="btn btn-gold btn-block" type="submit">حفظ</button>
      <div class="form-msg" id="dc-msg"></div>
    </form>`;
  document.getElementById("form-overlay").classList.add("open");
  document.getElementById("discount-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = document.getElementById("dc-msg");
    const { error } = await supabaseClient.from("discount_codes").insert({
      code: document.getElementById("dc-code").value.trim().toUpperCase(),
      discount_percent: Number(document.getElementById("dc-percent").value),
      max_uses: Number(document.getElementById("dc-max").value) || 100,
      expires_at: document.getElementById("dc-expires").value || null
    });
    if(error){ showMsg(msg, friendlyError(error), "error"); return; }
    closeFormModal();
    await loadAdminDiscounts();
  });
}
async function deleteDiscount(id){
  if(!confirm("متأكدة؟")) return;
  await supabaseClient.from("discount_codes").delete().eq("id", id);
  await loadAdminDiscounts();
}
window.loadAdminDiscounts = loadAdminDiscounts;
window.openAdminDiscountForm = openAdminDiscountForm;
window.deleteDiscount = deleteDiscount;

/* ============================================================
   Packages
   ============================================================ */
async function loadPackages(){
  const {data,error}=await supabaseClient.from("packages").select("*, grade_levels(name_ar)");
  if(error){logError("تحميل الباقات",error);return;}
  document.getElementById("packages-table").innerHTML=(data&&data.length)
    ?data.map(p=>`<tr><td>${p.name_ar}</td><td>${p.grade_levels?.name_ar||"—"}</td><td>${p.price} ج.م</td><td>${p.duration_days} يوم</td><td><button class="icon-btn" onclick='openPackageForm(${JSON.stringify(p)})'>✏️</button><button class="icon-btn danger" onclick="deleteRow('packages','${p.id}', loadPackages)">🗑️</button></td></tr>`).join("")
    :`<tr><td colspan="5"><div class="empty-state">لسه مفيش باقات</div></td></tr>`;
}

function openPackageForm(pkg){
  if(!CURRENT_LEVELS.length){showToast("⚠️ أضف مرحلة أول","error");return;}
  document.getElementById("form-modal-content").innerHTML=`<button class="close" onclick="closeFormModal()">✕</button><h3>${pkg?"تعديل":"إضافة"} باقة</h3><form id="package-form"><div class="field"><label>الاسم (عربي)</label><input type="text" id="pk-name-ar" value="${pkg?.name_ar||""}" required></div><div class="field"><label>Package name</label><input type="text" id="pk-name-en" value="${pkg?.name_en||""}" required></div><div class="field"><label>المرحلة</label><select id="pk-level" required>${levelOptions(pkg?.grade_level_id)}</select></div><div class="field"><label>السعر</label><input type="number" id="pk-price" value="${pkg?.price??0}" required></div><div class="field"><label>المدة (يوم)</label><input type="number" id="pk-duration" value="${pkg?.duration_days??30}" required></div><div class="field"><label>وصف</label><textarea id="pk-desc" rows="2">${pkg?.description_ar||""}</textarea></div><button class="btn btn-gold btn-block" type="submit">حفظ</button><div class="form-msg" id="package-msg"></div></form>`;
  document.getElementById("form-overlay").classList.add("open");
  document.getElementById("package-form").addEventListener("submit",async(e)=>{
    e.preventDefault();
    const msg=document.getElementById("package-msg");
    const payload={name_ar:document.getElementById("pk-name-ar").value.trim(),name_en:document.getElementById("pk-name-en").value.trim(),grade_level_id:document.getElementById("pk-level").value,price:Number(document.getElementById("pk-price").value),duration_days:Number(document.getElementById("pk-duration").value),description_ar:document.getElementById("pk-desc").value.trim(),is_active:true};
    const q=pkg?supabaseClient.from("packages").update(payload).eq("id",pkg.id):supabaseClient.from("packages").insert(payload);
    const {error}=await q;
    if(error){showMsg(msg,friendlyError(error),"error");return;}
    closeFormModal();await loadPackages();await loadKpis();
  });
}

/* ============================================================
   Students
   ============================================================ */
function openAddStudentForm(){
  if(!CURRENT_LEVELS.length){showToast("⚠️ أضف مرحلة أول","error");return;}
  document.getElementById("form-modal-content").innerHTML=`<button class="close" onclick="closeFormModal()">✕</button><h3>إضافة طالب</h3><form id="add-student-form"><div class="field"><label>الاسم</label><input type="text" id="as-name" required></div><div class="field"><label>الإيميل</label><input type="email" id="as-email" required></div><div class="field"><label>الهاتف</label><input type="tel" id="as-phone"></div><div class="field"><label>كلمة مرور</label><input type="text" id="as-password" required minlength="6"></div><div class="field"><label>المرحلة</label><select id="as-level">${levelOptions()}</select></div><button class="btn btn-gold btn-block" type="submit">إنشاء</button><div class="form-msg" id="add-student-msg"></div></form>`;
  document.getElementById("form-overlay").classList.add("open");
  document.getElementById("add-student-form").addEventListener("submit",async(e)=>{
    e.preventDefault();
    const msg=document.getElementById("add-student-msg");
    const full_name=document.getElementById("as-name").value.trim();
    const email=document.getElementById("as-email").value.trim();
    const phone=document.getElementById("as-phone").value.trim();
    const password=document.getElementById("as-password").value;
    const grade_level_id=document.getElementById("as-level").value;
    showMsg(msg,"جاري الإنشاء...","ok");
    const tempClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false,storageKey:"temp-"+Date.now()}});
    const {data,error}=await tempClient.auth.signUp({email,password});
    if(error){showMsg(msg,friendlyError(error),"error");return;}
    const uid=data.user?.id;
    if(!uid){showMsg(msg,"محتاج تأكيد إيميل","error");return;}
    const {error:pe}=await supabaseClient.from("profiles").insert({id:uid,full_name,phone:phone||null,role:"student",grade_level_id});
    if(pe){showMsg(msg,friendlyError(pe),"error");return;}
    closeFormModal();await loadStudents();await loadKpis();
  });
}

async function loadStudents(){
  const {data,error}=await supabaseClient.from("profiles").select("*, grade_levels(name_ar), subscriptions(status,end_date,created_at)").eq("role","student").order("created_at",{ascending:false});
  if(error){logError("تحميل الطلاب",error);return;}
  document.getElementById("students-table").innerHTML=(data&&data.length)
    ?data.map(s=>{
      const latestSub=(s.subscriptions||[]).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
      const isActive=!!(latestSub&&latestSub.status==="active"&&new Date(latestSub.end_date+"T23:59:59")>=new Date());
      return `<tr><td>${s.full_name}</td><td>${s.phone||"—"}</td><td>${s.grade_levels?.name_ar||"—"}</td><td><span class="badge ${isActive?"active":"expired"}">${isActive?"فعّال":"غير فعّال"}</span></td><td>${latestSub?.end_date||"—"}</td><td><button class="icon-btn" onclick='openSubscriptionForm("${s.id}","${s.full_name}")'>الاشتراك</button><button class="icon-btn" onclick='startPrivateChat("${s.id}","${escapeHtml(s.full_name).replace(/'/g,"&#39;")}")'>💬</button><button class="icon-btn danger" onclick='deleteStudent("${s.id}","${s.full_name}")'>🗑️</button></td></tr>`;
    }).join("")
    :`<tr><td colspan="6"><div class="empty-state">لسه مفيش طلاب</div></td></tr>`;
}

async function deleteStudent(studentId,studentName){
  if(!confirm(`متأكدة إنك عايزة تحذفي "${studentName}"؟`))return;
  await supabaseClient.from("subscriptions").delete().eq("student_id",studentId);
  const {error}=await supabaseClient.from("profiles").delete().eq("id",studentId);
  if(error){logError("حذف الطالب",error);return;}
  await loadStudents();await loadKpis();
}
window.deleteStudent=deleteStudent;

function openSubscriptionForm(studentId,studentName){
  document.getElementById("form-modal-content").innerHTML=`<button class="close" onclick="closeFormModal()">✕</button><h3>اشتراك: ${studentName}</h3><form id="sub-form"><div class="field"><label>المرحلة</label><select id="sub-level" required>${levelOptions()}</select></div><div class="field"><label>الباقة</label><select id="sub-package"></select></div><button class="btn btn-gold btn-block" type="submit">تفعيل</button><div class="form-msg" id="sub-msg"></div></form>`;
  document.getElementById("form-overlay").classList.add("open");
  const levelSelect=document.getElementById("sub-level");
  const packageSelect=document.getElementById("sub-package");
  const loadPkgOptions=async()=>{
    const {data,error}=await supabaseClient.from("packages").select("*").eq("grade_level_id",levelSelect.value);
    if(error){logError("تحميل باقات",error);return;}
    packageSelect.innerHTML=(data||[]).map(p=>`<option value="${p.id}" data-days="${p.duration_days}">${p.name_ar} — ${p.price} ج.م</option>`).join("");
  };
  levelSelect.addEventListener("change",loadPkgOptions);
  loadPkgOptions();
  document.getElementById("sub-form").addEventListener("submit",async(e)=>{
    e.preventDefault();
    const msg=document.getElementById("sub-msg");
    const packageId=packageSelect.value;
    if(!packageId){showMsg(msg,"مفيش باقة","error");return;}
    const days=Number(packageSelect.selectedOptions[0].dataset.days||30);
    const endDate=new Date();endDate.setDate(endDate.getDate()+days);
    await supabaseClient.from("profiles").update({grade_level_id:levelSelect.value}).eq("id",studentId);
    const {error}=await supabaseClient.from("subscriptions").insert({student_id:studentId,package_id:packageId,end_date:endDate.toISOString().slice(0,10),status:"active"});
    if(error){showMsg(msg,friendlyError(error),"error");return;}
    closeFormModal();await loadStudents();await loadKpis();
  });
}

/* ============================================================
   Settings
   ============================================================ */
async function loadOwnerSettings(){
  fillCountrySelect("20");
  const {data,error}=await supabaseClient.from("settings").select("*").eq("id",1).maybeSingle();
  if(error){logError("تحميل الإعدادات",error);return;}
  if(!data){await supabaseClient.from("settings").insert({id:1,owner_name:"ms. sherehan ali",whatsapp_number:null});return;}
  document.getElementById("set-owner-name").value=data.owner_name||"ms. sherehan ali";
  const {dial,local}=splitFullPhone(data.whatsapp_number||"");
  fillCountrySelect(dial);
  document.getElementById("set-whatsapp").value=local||"";
}
async function saveSettings(e){
  e.preventDefault();
  const dial=document.getElementById("set-country").value;
  const local=document.getElementById("set-whatsapp").value.trim();
  const full=composeFullPhone(dial,local);
  if(!full){showToast("⚠️ رقم غلط","error");return;}
  const {error}=await supabaseClient.from("settings").update({owner_name:document.getElementById("set-owner-name").value.trim()||"ms. sherehan ali",whatsapp_number:full}).eq("id",1);
  if(error){logError("حفظ الإعدادات",error);return;}
  logOk("الإعدادات","تم الحفظ");
  await wireWhatsAppButton();
}
function closeFormModal(){document.getElementById("form-overlay").classList.remove("open");}
async function deleteRow(table,id,refreshFn){
  if(!confirm("متأكدة؟"))return;
  const {error}=await supabaseClient.from(table).delete().eq("id",id);
  if(error){logError("حذف",error);return;}
  await refreshFn();await loadKpis();
}

/* ============================================================
   Search + Filters
   ============================================================ */
function filterCourses(){
  const q = (document.getElementById("search-input")?.value || "").toLowerCase();
  const cards = document.querySelectorAll("#packages-grid .course-card, #levels-grid .course-card");
  cards.forEach(card => {
    const t = (card.querySelector("h3")?.textContent || "").toLowerCase();
    card.style.display = t.includes(q) ? "" : "none";
  });
}
window.filterCourses = filterCourses;

function filterStudentCourses(){
  const q = (document.getElementById("student-search-input")?.value || "").toLowerCase();
  const cards = document.querySelectorAll("#courses-grid .course-card");
  cards.forEach(card => {
    const t = (card.querySelector("h3")?.textContent || "").toLowerCase();
    card.style.display = t.includes(q) ? "" : "none";
  });
}
window.filterStudentCourses = filterStudentCourses;

/* ============================================================
   Course Card (Student)
   ============================================================ */
function buildCourseCard(course, lang){
  const title = lang === "ar" ? course.title_ar : (course.title_en || course.title_ar);
  const desc  = lang === "ar" ? (course.description_ar || "") : (course.description_en || "");
  const video = getVideoInfo(course);
  let thumbHTML = "";
  if (video?.kind === "youtube"){ thumbHTML = `<img src="${video.thumbnail}" alt="${title}" loading="lazy">`; }
  else if (video?.kind === "drive"){ thumbHTML = `<img src="${video.thumbnail}" alt="${title}" loading="lazy">`; }
  else if (video?.kind === "video-file"){ thumbHTML = `<video src="${video.watchUrl}#t=0.5" preload="metadata" muted playsinline></video>`; }
  else { thumbHTML = `<div class="file-thumb"><div class="file-icon">🎬</div></div>`; }

  return `
    <div class="card course-card">
      <div class="course-thumb">
        ${thumbHTML}
        <div class="play-overlay"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div>
        <span class="video-badge">🎬 كورس</span>
      </div>
      <div class="course-body">
        <h3>${title}</h3>
        <p>${desc}</p>
        <button class="btn btn-teal btn-block" onclick='openCoursePlayer("${course.id}", ${JSON.stringify(title)})'>🎬 مشاهدة</button>
      </div>
    </div>`;
}

/* ============================================================
   Student Dashboard
   ============================================================ */
async function loadStudentDashboard(profile){
  const lang=localStorage.getItem("basetna_lang")||"ar";
  const isFemale = USER_GENDER === "female";
  const greetWord = isFemale ? "عزيزة" : "عزيز";
  const greetEmoji = isFemale ? "👸" : "🤵";
  document.getElementById("welcome-msg").textContent = `${greetEmoji} أهلاً بيك${isFemale ? "ِ" : ""} يا ${greetWord} ${profile.full_name}`;

  const { data: pts } = await supabaseClient.from("student_points").select("*").eq("student_id", profile.id).maybeSingle();
  const pointsEl = document.getElementById("student-points");
  if(pointsEl) pointsEl.textContent = pts?.points || 0;

  const subsRes=await supabaseClient.from("subscriptions").select("*").eq("student_id",profile.id).order("created_at",{ascending:false}).limit(1);
  const latestSub=subsRes.data?.[0];
  const endOfDay=latestSub?new Date(latestSub.end_date+"T23:59:59"):null;
  const isActive=!!(latestSub&&latestSub.status==="active"&&endOfDay>=new Date());
  const badge=document.getElementById("sub-badge");
  badge.className="badge "+(isActive?"active":"expired");
  badge.textContent=isActive?("فعّال حتى "+latestSub.end_date):"لا يوجد اشتراك";
  const notice=document.getElementById("no-sub-notice");
  const grid=document.getElementById("courses-grid");
  if(!isActive){
    notice.style.display="block";grid.innerHTML="";
    const number=await getWhatsAppNumber();
    if(number)document.getElementById("no-sub-wa-btn").href=`https://wa.me/${number}`;
    return;
  }
  notice.style.display="none";
  if(!profile.grade_level_id){grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1;">محتاجة تحددي المرحلة</div>`;return;}
  const {data:courses,error}=await supabaseClient.from("courses").select("*").eq("grade_level_id",profile.grade_level_id).order("sort_order");
  if(error){logError("تحميل كورسات الطالب",error);grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1;">⚠️ ${friendlyError(error)}</div>`;return;}
  if(!courses||!courses.length){grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1;">لسه مفيش كورسات</div>`;return;}
  grid.innerHTML=courses.map(c=>buildCourseCard(c,lang)).join("");
}

/* ============================================================
   Student Tabs
   ============================================================ */
function wireStudentTabs(){
  document.querySelectorAll("#view-student .nav-link[data-tab]").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      document.querySelectorAll("#view-student .nav-link[data-tab]").forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      document.querySelectorAll("#view-student .tab-panel").forEach(p => p.hidden = true);
      const target = document.getElementById("panel-" + link.dataset.tab);
      if(target) target.hidden = false;
      const tab = link.dataset.tab;
      if(tab === "my-tasks") loadMyTasks();
      if(tab === "my-schedule") loadMySchedule();
      if(tab === "my-library") loadMyLibrary();
            if(tab === "my-certificates") loadMyCertificates();
      if(tab === "my-points") loadMyPoints();
    });
  });
}

/* ============================================================
   Init
   ============================================================ */
async function initApp(){
  showWelcomeModalIfNeeded();

  const savedDark = localStorage.getItem("basetna_dark") === "1";
  applyDarkMode(savedDark);
  const savedTheme = localStorage.getItem("basetna_theme") || "default";
  applyStudentTheme(savedTheme);

  const {data:{session},error:sessErr}=await supabaseClient.auth.getSession();
  if(sessErr){logError("فحص الجلسة",sessErr);showView("public");await loadHome();await wireWhatsAppButton();updateWelcomeText();return;}
  if(!session){showView("public");await loadHome();await wireWhatsAppButton();updateWelcomeText();return;}

  const profRes=await supabaseClient.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
  if(profRes.error){logError("تحميل البروفايل",profRes.error);showView("public");await loadHome();await wireWhatsAppButton();return;}
  if(!profRes.data){showToast("⚠️ مفيش بروفايل","error",8000);showView("public");await loadHome();await wireWhatsAppButton();return;}
  CURRENT_PROFILE=profRes.data;

  if(CURRENT_PROFILE.gender && !USER_GENDER){
    USER_GENDER = CURRENT_PROFILE.gender;
    try { localStorage.setItem("basetna_gender", USER_GENDER); } catch(e){}
  }

  const isYassen = CURRENT_PROFILE.full_name && (CURRENT_PROFILE.full_name.includes("Yassen") || CURRENT_PROFILE.full_name.includes("ياسين"));

  if(isYassen && !VIEW_MODE){
    showView("owner");
    applyRoleMode();
    setTimeout(() => showRolePicker(), 500);
    return;
  }

  applyRoleMode();
  const effectiveRole = CURRENT_PROFILE.effectiveRole || CURRENT_PROFILE.role;

  if(ADMIN_ROLES.includes(effectiveRole)){
    showView("owner");
    wireOwnerTabs();
    hideSupportFabsForRole(effectiveRole);
    if(effectiveRole === "superadmin"){document.body.classList.add("is-superadmin");}
    else {document.body.classList.remove("is-superadmin");}
    await refreshOwnerData();
  } else {
    showView("student");
    wireStudentTabs();
    hideSupportFabsForRole("student");
    await loadStudentDashboard(CURRENT_PROFILE);
  }
  await wireWhatsAppButton();
  updateRoleUI();
  updateWelcomeText();
}

/* ============================================================
   DOMContentLoaded
   ============================================================ */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 DOMContentLoaded");

  // Init dark + theme + lang
  const savedDark = localStorage.getItem("basetna_dark") === "1";
  applyDarkMode(savedDark);
  const savedTheme = localStorage.getItem("basetna_theme") || "default";
  applyStudentTheme(savedTheme);
  applyLanguage(localStorage.getItem("basetna_lang") || "ar");

  // Lang switch buttons
  document.querySelectorAll(".lang-switch").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      toggleLanguage();
    });
  });

  // Theme buttons
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      toggleDarkMode();
    });
  });

  // Theme picker
  const themePicker = document.getElementById("student-theme-picker");
  if(themePicker){
    themePicker.value = localStorage.getItem("basetna_theme") || "default";
    themePicker.addEventListener("change", (e) => {
      applyStudentTheme(e.target.value);
      showToast("🎨 تم تغيير الثيم", "ok", 1500);
    });
  }

  // Login form
  document.getElementById("login-form")?.addEventListener("submit", handleLogin);
  // Settings form
  document.getElementById("settings-form")?.addEventListener("submit", saveSettings);

  // Logout
  document.querySelectorAll(".logout").forEach(el => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      logout(e);
    });
  });

  // Support
  document.getElementById("support-send")?.addEventListener("click", sendSupportMessage);
  document.getElementById("support-input")?.addEventListener("keydown", e => {
    if(e.key === "Enter" && !e.shiftKey){
      e.preventDefault();
      sendSupportMessage();
    }
  });
  document.getElementById("support-close")?.addEventListener("click", closeSupportPanel);

  // Search inputs
  document.getElementById("search-input")?.addEventListener("input", filterCourses);
  document.getElementById("student-search-input")?.addEventListener("input", filterStudentCourses);

  // Filters
  document.getElementById("filter-level")?.addEventListener("change", filterCourses);
  document.getElementById("filter-sort")?.addEventListener("change", filterCourses);

  watchOwnerField();
  await initApp();
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("❌ Unhandled:", e.reason);
});

/* Expose for debugging */
window.supabaseClient = supabaseClient;
window.CURRENT_PROFILE = () => CURRENT_PROFILE;