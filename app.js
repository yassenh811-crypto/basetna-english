/* ============================================================
   بسّطنا الإنجليزي — app.js v17 (مع Debug Logs)
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

console.log("🚀 app.js بدأ التحميل");

const SUPABASE_URL = "https://wgostqkywpybmzgbyzeo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zx0zeWR2bpbmyO90oN-4ow_FxZCSPl8";
const OWNER_USERNAME_MAP = {"yassen":"yassenq14232@gmail.com","shere":"shere@basetna-english.com"};
const SERIAL_MAP = {"yassen":"serial-2.2.2-yassen","shere":"serial_1.1.1_shere"};
const STORAGE_BUCKET = "course-files";
const ADMIN_ROLES = ["superadmin","owner","support"];
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log("✅ Supabase client ready");

let CURRENT_LEVELS = [];
let CURRENT_PROFILE = null;
let ALL_CONTACTS = [];
let VIEW_MODE = localStorage.getItem("basetna_view_mode") || null;

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
  if(/stack depth limit exceeded/i.test(msg))return "مشكلة RLS";
  if(/row-level security|RLS|permission denied/i.test(msg))return "مش مسموح بالوصول";
  if(/relation .* does not exist/i.test(msg))return "الجدول مش موجود";
  if(/column .* does not exist/i.test(msg))return "عمود مفقود";
  if(/function .* does not exist/i.test(msg))return "الدالة مش موجودة";
  if(/Failed to fetch|NetworkError|Load failed/i.test(msg))return "مشكلة في الاتصال";
  if(/duplicate key/i.test(msg))return "البيان موجود بالفعل";
  if(/Bucket not found/i.test(msg))return "Bucket مش موجود";
  if(/exceeded.*size|too large/i.test(msg))return "الملف كبير جدًا";
  return msg;
}
function logError(ctx,err){console.error(`❌ [${ctx}]`,err);showToast(`⚠️ ${ctx}: ${friendlyError(err)}`,"error");}
function logOk(ctx,msg){console.log(`✅ [${ctx}]`,msg||"");if(msg)showToast(`✅ ${msg}`,"ok",3500);}

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

function showView(view){
  document.getElementById("view-public").hidden=view!=="public";
  document.getElementById("view-owner").hidden=view!=="owner";
  document.getElementById("view-student").hidden=view!=="student";
}
function hideSupportFabsForRole(){document.querySelectorAll(".support-fab").forEach(b=>{b.style.display="flex";});}
function showMsg(el,text,type){el.textContent=text;el.className="form-msg "+type;}

function showRolePicker(){if(!CURRENT_PROFILE)return;document.getElementById("role-picker-overlay").classList.add("open");}
window.showRolePicker = showRolePicker;
function pickRole(role){
  document.getElementById("role-picker-overlay").classList.remove("open");
  if(role === "logout"){localStorage.removeItem("basetna_view_mode");logout();return;}
  VIEW_MODE = role;
  localStorage.setItem("basetna_view_mode", role);
  showToast(role === "superadmin" ? "👑 تم التبديل لواجهة المدير" : "🛠️ تم التبديل لواجهة الدعم", "ok", 2000);
  setTimeout(() => window.location.reload(), 600);
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

async function handleLogin(e){
  e.preventDefault();
  const msg=document.getElementById("login-msg");
  const rawInput=document.getElementById("li-username").value.trim();
  const password=document.getElementById("li-password").value;
  const serial=document.getElementById("li-serial")?.value.trim();
  if(!rawInput||!password){showMsg(msg,"من فضلك اكتبي الإيميل وكلمة المرور","error");return;}
  const key=rawInput.toLowerCase();
  const isSpecialAttempt=!!OWNER_USERNAME_MAP[key];
  if(isSpecialAttempt&&serial!==SERIAL_MAP[key]){showMsg(msg,"رقم التسلسل غير صحيح","error");return;}
  const email=OWNER_USERNAME_MAP[key]||rawInput;
  showMsg(msg,"جاري تسجيل الدخول...","ok");
  const {error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error){showMsg(msg,friendlyError(error),"error");logError("تسجيل الدخول",error);return;}
  showToast("✅ تم تسجيل الدخول بنجاح","ok",2000);
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
  showToast("✅ تم تسجيل الخروج","ok",1200);
  setTimeout(()=>window.location.replace(window.location.pathname+"?logout="+Date.now()),250);
}
window.logout=logout;

async function getWhatsAppNumber(){
  const {data,error}=await supabaseClient.from("settings").select("whatsapp_number").eq("id",1).maybeSingle();
  if(error){console.error("WhatsApp settings error:",error);return null;}
  return data?.whatsapp_number||null;
}
async function wireWhatsAppButton(){
  const btn=document.getElementById("wa-float");if(!btn)return;
  const number=await getWhatsAppNumber();
  if(number){btn.href=`https://wa.me/${number}`;btn.onclick=null;}
  else{btn.onclick=e=>{e.preventDefault();showToast("⚠️ رقم واتساب الأونر لم يُضف بعد","error");};}
}
async function subscribeViaWhatsApp(packageName){
  const number=await getWhatsAppNumber();
  if(!number){showToast("⚠️ رقم واتساب الأونر لم يُضف بعد","error");return;}
  const text=`أهلاً، أنا عايز/ة أشترك في باقة "${packageName}" في منصة بسّطنا الإنجليزي`;
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`,"_blank");
}

async function loadHome(){
  console.log("🏠 loadHome START");
  const lang=localStorage.getItem("basetna_lang")||"ar";
  const levelsRes=await supabaseClient.from("grade_levels").select("*").order("sort_order");
  console.log("Levels response:",levelsRes);
  if(levelsRes.error)logError("تحميل المراحل",levelsRes.error);
  const levels=levelsRes.data||[];
  const pkgsRes=await supabaseClient.from("packages").select("*").eq("is_active",true);
  console.log("Packages response:",pkgsRes);
  if(pkgsRes.error)logError("تحميل الباقات",pkgsRes.error);
  const packages=pkgsRes.data||[];
  const rpcRes=await supabaseClient.rpc("get_course_count");
  console.log("RPC response:",rpcRes);
  if(rpcRes.error)logError("جلب عدد الكورسات",rpcRes.error);
  const courseCount=rpcRes.data??0;
  document.getElementById("stat-levels").textContent=levels.length;
  document.getElementById("stat-packages").textContent=packages.length;
  document.getElementById("stat-courses").textContent=courseCount;
  document.getElementById("levels-grid").innerHTML=levels.length
    ?levels.map((lv,i)=>`<div class="card level-card"><div class="lv-num">${i+1}</div><h3>${lang==="ar"?lv.name_ar:lv.name_en}</h3></div>`).join("")
    :`<div class="empty-state">لسه مفيش مراحل</div>`;
  document.getElementById("packages-grid").innerHTML=packages.length
    ?packages.map(p=>`<div class="card pkg-card"><h3>${lang==="ar"?p.name_ar:p.name_en}</h3><div class="price">${p.price} <small>${lang==="ar"?"ج.م / "+p.duration_days+" يوم":"EGP / "+p.duration_days+" days"}</small></div><p class="desc">${(lang==="ar"?p.description_ar:p.description_en)||""}</p><button class="btn btn-teal btn-block" onclick='subscribeViaWhatsApp(${JSON.stringify(lang==="ar"?p.name_ar:p.name_en)})'>اشترك</button></div>`).join("")
    :`<div class="empty-state">لسه مفيش باقات</div>`;
  console.log("🏠 loadHome DONE");
}

function escapeHtml(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

async function openSupportPanel(recipientRole="support"){
  if(!CURRENT_PROFILE){showToast("⚠️ لازم تسجّلي دخول الأول","error");return;}
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
  else if(recipientRole==="owner"){title.textContent="👩‍🏫 مس. شيرهان علي";sub.textContent="تواصلي مع الميس مباشرة";}
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
  const lang=localStorage.getItem("basetna_lang")||"ar";
  list.innerHTML=messages.map(m=>{
    const isMine=m.sender_id===CURRENT_PROFILE.id;
    const isAdminMsg=ADMIN_ROLES.includes(m.sender_role);
    const time=new Date(m.created_at).toLocaleString(lang==="ar"?"ar-EG":"en-US",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit"});
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
  const roleLabel=(r)=>r==="superadmin"?"👑":r==="owner"?"الميس":r==="support"?"دعم":"طالب";
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
  if(!CURRENT_PROFILE){showToast("⚠️ لازم تسجّلي دخول الأول","error");return;}
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
  if(groups.superadmin.length)html+=`<div class="chat-section-title">👑 المدير الأعلى</div>`+groups.superadmin.map(renderCard).join("");
  if(groups.owner.length)html+=`<div class="chat-section-title">👩‍🏫 الميس</div>`+groups.owner.map(renderCard).join("");
  if(groups.support.length)html+=`<div class="chat-section-title">🛠️ الدعم الفني</div>`+groups.support.map(renderCard).join("");
  if(groups.student.length)html+=`<div class="chat-section-title">🎓 الطلاب</div>`+groups.student.map(renderCard).join("");
  list.innerHTML=html;
}

function wireOwnerTabs(){
  document.querySelectorAll(".nav-link[data-tab]").forEach(link=>{
    link.addEventListener("click",(e)=>{
      e.preventDefault();
      document.querySelectorAll(".nav-link[data-tab]").forEach(l=>l.classList.remove("active"));
      link.classList.add("active");
      document.querySelectorAll("#view-owner .tab-panel").forEach(p=>p.hidden=true);
      const target=document.getElementById("panel-"+link.dataset.tab);
      if(target)target.hidden=false;
      if(link.dataset.tab==="inbox")loadAdminInbox();
      if(link.dataset.tab==="chats")loadChatsPanel();
    });
  });
}

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
  console.log("🔄 refreshOwnerData START");
  try{
    console.log("→ loadLevels...");
    await loadLevels();
    console.log("→ loadCourses...");
    await loadCourses();
    console.log("→ loadPackages...");
    await loadPackages();
    console.log("→ loadStudents...");
    await loadStudents();
    console.log("→ loadOwnerSettings...");
    await loadOwnerSettings();
    console.log("→ loadKpis...");
    await loadKpis();
    console.log("→ loadAdminInbox...");
    await loadAdminInbox();
    console.log("→ loadChatsPanel...");
    await loadChatsPanel();
    console.log("✅ refreshOwnerData DONE");
  }catch(err){
    console.error("❌ refreshOwnerData ERROR:", err);
  }
}

async function loadKpis(){
  console.log("📊 loadKpis START");
  const [sRes,aRes,cRes]=await Promise.all([
    supabaseClient.from("profiles").select("*",{count:"exact",head:true}).eq("role","student"),
    supabaseClient.from("subscriptions").select("*",{count:"exact",head:true}).eq("status","active"),
    supabaseClient.from("courses").select("*",{count:"exact",head:true})
  ]);
  console.log("KPI results:", {students: sRes, active: aRes, courses: cRes});
  if(sRes.error) logError("إحصائية الطلاب", sRes.error);
  if(aRes.error) logError("إحصائية الاشتراكات", aRes.error);
  if(cRes.error) logError("إحصائية الكورسات", cRes.error);
  document.getElementById("kpi-students").textContent=sRes.count??0;
  document.getElementById("kpi-active").textContent=aRes.count??0;
  document.getElementById("kpi-courses").textContent=cRes.count??0;
  document.getElementById("kpi-levels").textContent=CURRENT_LEVELS.length;
  console.log("📊 loadKpis DONE");
}

async function loadLevels(){
  console.log("📚 loadLevels START");
  const {data,error}=await supabaseClient.from("grade_levels").select("*").order("sort_order");
  console.log("Levels response:", {data, error});
  if(error){logError("تحميل المراحل",error);return;}
  CURRENT_LEVELS=data||[];
  document.getElementById("levels-table").innerHTML=CURRENT_LEVELS.length
    ?CURRENT_LEVELS.map(lv=>`<tr><td>${lv.name_ar}</td><td>${lv.name_en}</td><td>${lv.sort_order}</td><td><button class="icon-btn" onclick='openLevelForm(${JSON.stringify(lv)})'>✏️</button><button class="icon-btn danger" onclick="deleteRow('grade_levels','${lv.id}', loadLevels)">🗑️</button></td></tr>`).join("")
    :`<tr><td colspan="4"><div class="empty-state">لسه مفيش مراحل</div></td></tr>`;
  console.log("📚 loadLevels DONE");
}

function openLevelForm(level){
  const isEdit=!!level;
  document.getElementById("form-modal-content").innerHTML=`<button class="close" onclick="closeFormModal()">✕</button><h3>${isEdit?"تعديل مرحلة":"إضافة مرحلة"}</h3><form id="level-form"><div class="field"><label>الاسم بالعربي</label><input type="text" id="lv-name-ar" value="${level?.name_ar||""}" required></div><div class="field"><label>Name in English</label><input type="text" id="lv-name-en" value="${level?.name_en||""}" required></div><div class="field"><label>ترتيب الظهور</label><input type="number" id="lv-order" value="${level?.sort_order??0}"></div><button class="btn btn-gold btn-block" type="submit">حفظ</button><div class="form-msg" id="level-msg"></div></form>`;
  document.getElementById("form-overlay").classList.add("open");
  document.getElementById("level-form").addEventListener("submit",async(e)=>{
    e.preventDefault();
    const msg=document.getElementById("level-msg");
    const payload={name_ar:document.getElementById("lv-name-ar").value.trim(),name_en:document.getElementById("lv-name-en").value.trim(),sort_order:Number(document.getElementById("lv-order").value)||0};
    const q=isEdit?supabaseClient.from("grade_levels").update(payload).eq("id",level.id):supabaseClient.from("grade_levels").insert(payload);
    const {error}=await q;
    if(error){showMsg(msg,friendlyError(error),"error");return;}
    logOk("المرحلة","تم الحفظ");
    closeFormModal();await loadLevels();await loadKpis();
  });
}

async function loadCourses(){
  console.log("📖 loadCourses START");
  const {data,error}=await supabaseClient.from("courses").select("*, grade_levels(name_ar)").order("sort_order");
  console.log("Courses response:", {data, error});
  if(error)logError("تحميل الكورسات",error);
  document.getElementById("courses-table").innerHTML=(data&&data.length)
    ?data.map(c=>`<tr><td><b>${escapeHtml(c.title_ar)}</b></td><td>${c.grade_levels?.name_ar||"—"}</td><td>${c.content_type==="link"?"🔗":"📄"}</td><td><button class="icon-btn" onclick='openCourseForm(${JSON.stringify(c).replace(/'/g,"&#39;")})'>✏️</button><button class="icon-btn danger" onclick="deleteRow('courses','${c.id}', loadCourses)">🗑️</button></td></tr>`).join("")
    :`<tr><td colspan="4"><div class="empty-state">لسه مفيش كورسات</div></td></tr>`;
  console.log("📖 loadCourses DONE");
}

function levelOptions(selectedId){
  return CURRENT_LEVELS.map(lv=>`<option value="${lv.id}" ${lv.id===selectedId?"selected":""}>${lv.name_ar}</option>`).join("");
}

function openCourseForm(course){
  if(!CURRENT_LEVELS.length){showToast("⚠️ لازم تضيفي مرحلة الأول","error");return;}
  const isEdit=!!course;
  document.getElementById("form-modal-content").innerHTML=`
    <button class="close" onclick="closeFormModal()">✕</button>
    <h3>${isEdit?"تعديل كورس":"إضافة كورس"}</h3>
    <form id="course-form">
      <div class="field"><label>عنوان الكورس (عربي)</label><input type="text" id="cr-title-ar" value="${course?.title_ar||""}" required></div>
      <div class="field"><label>Course title (English)</label><input type="text" id="cr-title-en" value="${course?.title_en||""}" required></div>
      <div class="field"><label>المرحلة الدراسية</label><select id="cr-level" required>${levelOptions(course?.grade_level_id)}</select></div>
      <div class="field"><label>وصف مختصر</label><textarea id="cr-desc-ar" rows="2">${course?.description_ar||""}</textarea></div>
      <div class="field"><label>نوع المحتوى</label>
        <select id="cr-type">
          <option value="file" ${course?.content_type==="file"?"selected":""}>📱 رفع من الموبايل</option>
          <option value="link" ${course?.content_type==="link"?"selected":""}>🔗 رابط خارجي</option>
        </select></div>
      <div class="field" id="cr-file-field">
        <label>اختار الملف</label>
        <input type="file" id="cr-file" accept="video/*,image/*,.pdf,.doc,.docx">
        <div id="file-preview" style="margin-top:10px;"></div>
      </div>
      <div class="field" id="cr-link-field" hidden>
        <label>الرابط</label>
        <input type="url" id="cr-link" value="${course?.content_type==="link"?course.content_url:""}">
      </div>
      <button class="btn btn-gold btn-block" type="submit">حفظ</button>
      <div class="form-msg" id="course-msg"></div>
    </form>`;
  document.getElementById("form-overlay").classList.add("open");
  const typeSelect=document.getElementById("cr-type");
  const toggleType=()=>{
    const isFile=typeSelect.value==="file";
    document.getElementById("cr-file-field").hidden=!isFile;
    document.getElementById("cr-link-field").hidden=isFile;
  };
  typeSelect.addEventListener("change",toggleType);toggleType();
  document.getElementById("cr-file").addEventListener("change",(e)=>{
    const file=e.target.files[0];
    const preview=document.getElementById("file-preview");
    if(!file){preview.innerHTML="";return;}
    const size=(file.size/1024/1024).toFixed(1);
    if(file.type.startsWith("video/")){preview.innerHTML=`<video src="${URL.createObjectURL(file)}" controls style="max-width:100%;border-radius:10px;"></video><div style="font-size:12px;margin-top:6px;">📹 ${file.name} (${size} MB)</div>`;}
    else if(file.type.startsWith("image/")){preview.innerHTML=`<img src="${URL.createObjectURL(file)}" style="max-width:100%;border-radius:10px;"><div style="font-size:12px;margin-top:6px;">🖼️ ${file.name} (${size} MB)</div>`;}
    else{preview.innerHTML=`<div style="padding:14px;background:var(--paper-2);border-radius:10px;">📄 ${file.name} (${size} MB)</div>`;}
  });
  document.getElementById("course-form").addEventListener("submit",async(e)=>{
    e.preventDefault();
    const msg=document.getElementById("course-msg");
    const type=typeSelect.value;
    let contentUrl=document.getElementById("cr-link").value.trim();
    if(type==="file"){
      const file=document.getElementById("cr-file").files[0];
      if(file){
        showMsg(msg,"جاري رفع الملف...","ok");
        const path=`courses/${Date.now()}_${file.name}`;
        const {error:upErr}=await supabaseClient.storage.from(STORAGE_BUCKET).upload(path,file,{contentType:file.type,upsert:false});
        if(upErr){showMsg(msg,"فشل الرفع: "+friendlyError(upErr),"error");return;}
        contentUrl=supabaseClient.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
      }else if(!course){showMsg(msg,"اختار ملف الأول","error");return;}
      else{contentUrl=course.content_url;}
    }
    const payload={title_ar:document.getElementById("cr-title-ar").value.trim(),title_en:document.getElementById("cr-title-en").value.trim(),grade_level_id:document.getElementById("cr-level").value,description_ar:document.getElementById("cr-desc-ar").value.trim(),content_type:type,content_url:contentUrl};
    const q=course?supabaseClient.from("courses").update(payload).eq("id",course.id):supabaseClient.from("courses").insert(payload);
    const {error}=await q;
    if(error){showMsg(msg,friendlyError(error),"error");return;}
    logOk("الكورس","تم الحفظ");
    closeFormModal();await loadCourses();await loadKpis();
  });
}

async function loadPackages(){
  console.log("📦 loadPackages START");
  const {data,error}=await supabaseClient.from("packages").select("*, grade_levels(name_ar)");
  console.log("Packages response:", {data, error});
  if(error)logError("تحميل الباقات",error);
  document.getElementById("packages-table").innerHTML=(data&&data.length)
    ?data.map(p=>`<tr><td>${p.name_ar}</td><td>${p.grade_levels?.name_ar||"—"}</td><td>${p.price} ج.م</td><td>${p.duration_days} يوم</td><td><button class="icon-btn" onclick='openPackageForm(${JSON.stringify(p)})'>✏️</button><button class="icon-btn danger" onclick="deleteRow('packages','${p.id}', loadPackages)">🗑️</button></td></tr>`).join("")
    :`<tr><td colspan="5"><div class="empty-state">لسه مفيش باقات</div></td></tr>`;
  console.log("📦 loadPackages DONE");
}

function openPackageForm(pkg){
  if(!CURRENT_LEVELS.length){showToast("⚠️ لازم تضيفي مرحلة الأول","error");return;}
  document.getElementById("form-modal-content").innerHTML=`<button class="close" onclick="closeFormModal()">✕</button><h3>${pkg?"تعديل باقة":"إضافة باقة"}</h3><form id="package-form"><div class="field"><label>اسم الباقة (عربي)</label><input type="text" id="pk-name-ar" value="${pkg?.name_ar||""}" required></div><div class="field"><label>Package name (English)</label><input type="text" id="pk-name-en" value="${pkg?.name_en||""}" required></div><div class="field"><label>المرحلة الدراسية</label><select id="pk-level" required>${levelOptions(pkg?.grade_level_id)}</select></div><div class="field"><label>السعر (ج.م)</label><input type="number" id="pk-price" value="${pkg?.price??0}" required></div><div class="field"><label>مدة الاشتراك (يوم)</label><input type="number" id="pk-duration" value="${pkg?.duration_days??30}" required></div><div class="field"><label>وصف</label><textarea id="pk-desc" rows="2">${pkg?.description_ar||""}</textarea></div><button class="btn btn-gold btn-block" type="submit">حفظ</button><div class="form-msg" id="package-msg"></div></form>`;
  document.getElementById("form-overlay").classList.add("open");
  document.getElementById("package-form").addEventListener("submit",async(e)=>{
    e.preventDefault();
    const msg=document.getElementById("package-msg");
    const payload={name_ar:document.getElementById("pk-name-ar").value.trim(),name_en:document.getElementById("pk-name-en").value.trim(),grade_level_id:document.getElementById("pk-level").value,price:Number(document.getElementById("pk-price").value),duration_days:Number(document.getElementById("pk-duration").value),description_ar:document.getElementById("pk-desc").value.trim(),is_active:true};
    const q=pkg?supabaseClient.from("packages").update(payload).eq("id",pkg.id):supabaseClient.from("packages").insert(payload);
    const {error}=await q;
    if(error){showMsg(msg,friendlyError(error),"error");return;}
    logOk("الباقة","تم الحفظ");
    closeFormModal();await loadPackages();await loadKpis();
  });
}

function openAddStudentForm(){
  if(!CURRENT_LEVELS.length){showToast("⚠️ لازم تضيفي مرحلة الأول","error");return;}
  document.getElementById("form-modal-content").innerHTML=`<button class="close" onclick="closeFormModal()">✕</button><h3>إضافة حساب طالب</h3><form id="add-student-form"><div class="field"><label>الاسم</label><input type="text" id="as-name" required></div><div class="field"><label>الإيميل</label><input type="email" id="as-email" required></div><div class="field"><label>الهاتف</label><input type="tel" id="as-phone"></div><div class="field"><label>كلمة مرور</label><input type="text" id="as-password" required minlength="6"></div><div class="field"><label>المرحلة</label><select id="as-level">${levelOptions()}</select></div><button class="btn btn-gold btn-block" type="submit">إنشاء</button><div class="form-msg" id="add-student-msg"></div></form>`;
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
    logOk("الطالب","تم الإنشاء");
    closeFormModal();await loadStudents();await loadKpis();
  });
}

async function loadStudents(){
  console.log("🎓 loadStudents START");
  const {data,error}=await supabaseClient.from("profiles").select("*, grade_levels(name_ar), subscriptions(status,end_date,created_at)").eq("role","student").order("created_at",{ascending:false});
  console.log("Students response:", {data, error});
  if(error)logError("تحميل الطلاب",error);
  document.getElementById("students-table").innerHTML=(data&&data.length)
    ?data.map(s=>{
      const latestSub=(s.subscriptions||[]).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at))[0];
      const isActive=!!(latestSub&&latestSub.status==="active"&&new Date(latestSub.end_date+"T23:59:59")>=new Date());
      return `<tr><td>${s.full_name}</td><td>${s.phone||"—"}</td><td>${s.grade_levels?.name_ar||"—"}</td><td><span class="badge ${isActive?"active":"expired"}">${isActive?"فعّال":"غير فعّال"}</span></td><td>${latestSub?.end_date||"—"}</td><td><button class="icon-btn" onclick='openSubscriptionForm("${s.id}","${s.full_name}")'>الاشتراك</button><button class="icon-btn" onclick='startPrivateChat("${s.id}","${escapeHtml(s.full_name).replace(/'/g,"&#39;")}")'>💬</button><button class="icon-btn danger" onclick='deleteStudent("${s.id}","${s.full_name}")'>🗑️</button></td></tr>`;
    }).join("")
    :`<tr><td colspan="6"><div class="empty-state">لسه مفيش طلاب</div></td></tr>`;
  console.log("🎓 loadStudents DONE");
}

async function deleteStudent(studentId,studentName){
  if(!confirm(`متأكدة إنك عايزة تحذفي "${studentName}"؟`))return;
  await supabaseClient.from("subscriptions").delete().eq("student_id",studentId);
  const {error}=await supabaseClient.from("profiles").delete().eq("id",studentId);
  if(error){logError("حذف الطالب",error);return;}
  logOk("الحذف","تم الحذف");
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
    if(error)logError("تحميل باقات",error);
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
    logOk("الاشتراك","تم التفعيل");
    closeFormModal();await loadStudents();await loadKpis();
  });
}

async function loadOwnerSettings(){
  console.log("⚙️ loadOwnerSettings START");
  fillCountrySelect("20");
  const {data,error}=await supabaseClient.from("settings").select("*").eq("id",1).maybeSingle();
  console.log("Settings response:", {data, error});
  if(error){logError("تحميل الإعدادات",error);return;}
  if(!data){await supabaseClient.from("settings").insert({id:1,owner_name:"ms. sherehan ali",whatsapp_number:null});return;}
  document.getElementById("set-owner-name").value=data.owner_name||"ms. sherehan ali";
  const {dial,local}=splitFullPhone(data.whatsapp_number||"");
  fillCountrySelect(dial);
  document.getElementById("set-whatsapp").value=local||"";
  console.log("⚙️ loadOwnerSettings DONE");
}
async function saveSettings(e){
  e.preventDefault();
  const dial=document.getElementById("set-country").value;
  const local=document.getElementById("set-whatsapp").value.trim();
  const full=composeFullPhone(dial,local);
  if(!full){showToast("⚠️ رقم غلط","error");return;}
  const {error}=await supabaseClient.from("settings").update({owner_name:document.getElementById("set-owner-name").value.trim()||"ms. sherehan ali",whatsapp_number:full}).eq("id",1);
  if(error){logError("حفظ الإعدادات",error);return;}
  logOk("الإعدادات","تم الحفظ: "+full);
  await wireWhatsAppButton();
}
function closeFormModal(){document.getElementById("form-overlay").classList.remove("open");}
async function deleteRow(table,id,refreshFn){
  if(!confirm("متأكدة؟"))return;
  const {error}=await supabaseClient.from(table).delete().eq("id",id);
  if(error){logError("حذف",error);return;}
  logOk("الحذف","تم");
  await refreshFn();await loadKpis();
}

function getYouTubeId(url){
  if(!url)return null;
  const p=[/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,/^([A-Za-z0-9_-]{11})$/];
  for(const x of p){const m=url.match(x);if(m)return m[1];}
  return null;
}
function getVideoInfo(course){
  const url=(course?.content_url||"").trim();
  if(!url)return null;
  const ytId=getYouTubeId(url);
  if(ytId)return{kind:"youtube",thumbnail:`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,watchUrl:`https://www.youtube.com/watch?v=${ytId}`};
  if(/\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(url))return{kind:"video-file",thumbnail:null,watchUrl:url};
  return null;
}
function buildCourseCard(course,lang){
  const title=lang==="ar"?course.title_ar:(course.title_en||course.title_ar);
  const desc=lang==="ar"?(course.description_ar||""):"";
  const isFile=course.content_type==="file";
  const video=getVideoInfo(course);
  let thumbHTML="",actionLabel="",targetUrl=course.content_url;
  if(video?.kind==="youtube"){
    targetUrl=video.watchUrl;
    thumbHTML=`<a class="course-thumb" href="${targetUrl}" target="_blank"><img src="${video.thumbnail}" loading="lazy"><div class="play-overlay"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div><span class="video-badge">▶ فيديو</span></a>`;
    actionLabel="▶️ مشاهدة";
  }else if(video?.kind==="video-file"){
    thumbHTML=`<a class="course-thumb" href="${targetUrl}" target="_blank"><video src="${targetUrl}#t=0.5" preload="metadata" muted playsinline></video><div class="play-overlay"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div><span class="video-badge">▶ فيديو</span></a>`;
    actionLabel="▶️ مشاهدة";
  }else if(isFile){
    thumbHTML=`<div class="course-thumb file-thumb"><div class="file-icon">📄</div></div>`;
    actionLabel="⬇️ تحميل";
  }else{
    thumbHTML=`<div class="course-thumb file-thumb"><div class="file-icon">🔗</div></div>`;
    actionLabel="🔗 فتح";
  }
  return `<div class="card course-card">${thumbHTML}<div class="course-body"><h3>${title}</h3><p>${desc}</p><a class="btn btn-teal btn-block" href="${targetUrl}" target="_blank" ${isFile&&!video?"download":""}>${actionLabel}</a></div></div>`;
}

async function loadStudentDashboard(profile){
  console.log("🎒 loadStudentDashboard START");
  const lang=localStorage.getItem("basetna_lang")||"ar";
  document.getElementById("welcome-msg").textContent=(lang==="en"?"Welcome, ":"أهلاً بيك يا ")+profile.full_name;
  const subsRes=await supabaseClient.from("subscriptions").select("*").eq("student_id",profile.id).order("created_at",{ascending:false}).limit(1);
  if(subsRes.error)logError("تحميل الاشتراك",subsRes.error);
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
  console.log("🎒 loadStudentDashboard DONE");
}

async function initApp(){
  console.log("🚀 initApp START");
  const {data:{session},error:sessErr}=await supabaseClient.auth.getSession();
  console.log("Session:", session, "Error:", sessErr);
  if(sessErr){logError("فحص الجلسة",sessErr);showView("public");await loadHome();await wireWhatsAppButton();return;}
  if(!session){console.log("🚪 No session → public");showView("public");await loadHome();await wireWhatsAppButton();return;}
  console.log("👤 User:", session.user.email);
  const profRes=await supabaseClient.from("profiles").select("*").eq("id",session.user.id).maybeSingle();
  console.log("Profile response:", profRes);
  if(profRes.error){logError("تحميل البروفايل",profRes.error);showView("public");await loadHome();await wireWhatsAppButton();return;}
  if(!profRes.data){showToast("⚠️ مفيش بروفايل","error",8000);showView("public");await loadHome();await wireWhatsAppButton();return;}
  CURRENT_PROFILE=profRes.data;
  console.log("✅ CURRENT_PROFILE:", CURRENT_PROFILE);

  const isYassen = CURRENT_PROFILE.full_name && (CURRENT_PROFILE.full_name.includes("Yassen") || CURRENT_PROFILE.full_name.includes("ياسين"));
  console.log("isYassen:", isYassen, "VIEW_MODE:", VIEW_MODE);

  if(isYassen && !VIEW_MODE){
    console.log("🎭 Showing Role Picker");
    showView("owner");
    setTimeout(() => showRolePicker(), 400);
    return;
  }
  applyRoleMode();
  const effectiveRole = CURRENT_PROFILE.effectiveRole || CURRENT_PROFILE.role;
  console.log("🎯 effectiveRole:", effectiveRole);

  if(ADMIN_ROLES.includes(effectiveRole)){
    console.log("👑 Admin mode");
    showView("owner");
    wireOwnerTabs();
    hideSupportFabsForRole(effectiveRole);
    if(effectiveRole === "superadmin"){document.body.classList.add("is-superadmin");}
    else {document.body.classList.remove("is-superadmin");}
    console.log("⏳ Calling refreshOwnerData...");
    await refreshOwnerData();
    console.log("✅ refreshOwnerData finished");
  } else {
    console.log("🎓 Student mode");
    showView("student");
    hideSupportFabsForRole("student");
    await loadStudentDashboard(CURRENT_PROFILE);
  }
  await wireWhatsAppButton();
  updateRoleUI();
  console.log("🚀 initApp DONE");
}

document.addEventListener("DOMContentLoaded",async()=>{
  console.log("🚀 DOMContentLoaded");
  applyLanguage(localStorage.getItem("basetna_lang")||"ar");
  document.querySelectorAll(".lang-switch").forEach(btn=>btn.addEventListener("click",toggleLanguage));
  document.getElementById("login-form")?.addEventListener("submit",handleLogin);
  document.getElementById("settings-form")?.addEventListener("submit",saveSettings);
  document.querySelectorAll(".logout").forEach(el=>el.addEventListener("click",logout));
  watchOwnerField();
  document.getElementById("support-send")?.addEventListener("click",sendSupportMessage);
  document.getElementById("support-input")?.addEventListener("keydown",e=>{
    if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendSupportMessage();}
  });
  document.getElementById("support-close")?.addEventListener("click",closeSupportPanel);
  await initApp();
  console.log("✅ Everything loaded");
});

window.addEventListener("unhandledrejection",(e)=>{
  console.error("❌ Unhandled promise:",e.reason);
  showToast("⚠️ خطأ غير متوقع: "+friendlyError(e.reason),"error");
});

// expose for debugging
window.supabaseClient = supabaseClient;
window.getProfile = () => CURRENT_PROFILE;
window.refreshOwnerData = refreshOwnerData;