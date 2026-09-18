/* ============================================================
   بسّطنا الإنجليزي — app.js v11 (كامل نهائي)
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
const OWNER_USERNAME_MAP = {"yassen":"yassen@basetna-english.com","shere":"shere@basetna-english.com"};
const SERIAL_MAP = {"yassen":"serial-2.2.2-yassen","shere":"serial_1.1.1_shere"};
const STORAGE_BUCKET = "course-files";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let CURRENT_LEVELS = [];
let CURRENT_PROFILE = null;
let ALL_CONTACTS = [];

/* Toast */
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
function logError(ctx,err){console.error(`[${ctx}]`,err);showToast(`⚠️ ${ctx}: ${friendlyError(err)}`,"error");}
function logOk(ctx,msg){console.log(`[✓ ${ctx}]`,msg||"");if(msg)showToast(`✅ ${msg}`,"ok",3500);}

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

/* Language */
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
function hideSupportFabsForRole(){}
function showMsg(el,text,type){el.textContent=text;el.className="form-msg "+type;}

/* Auth */
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
  try{
    Object.keys(localStorage).forEach(k=>{if(k.startsWith("sb-")||k.includes("supabase")||k.startsWith("temp-create-"))localStorage.removeItem(k);});
    sessionStorage.clear();
  }catch(_){}
  showToast("✅ تم تسجيل الخروج","ok",1200);
  setTimeout(()=>window.location.replace(window.location.pathname+"?logout="+Date.now()),250);
}
window.logout=logout;

/* WhatsApp */
async function getWhatsAppNumber(){
  const {data,error}=await supabaseClient.from("settings").select("whatsapp_number").eq("id",1).maybeSingle();
  if(error){logError("جلب رقم الواتساب",error);return null;}
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

/* Home */
async function loadHome(){
  const lang=localStorage.getItem("basetna_lang")||"ar";
  const levelsRes=await supabaseClient.from("grade_levels").select("*").order("sort_order");
  if(levelsRes.error)logError("تحميل المراحل",levelsRes.error);
  const levels=levelsRes.data||[];
  const pkgsRes=await supabaseClient.from("packages").select("*").eq("is_active",true);
  if(pkgsRes.error)logError("تحميل الباقات",pkgsRes.error);
  const packages=pkgsRes.data||[];
  const rpcRes=await supabaseClient.rpc("get_course_count");
  if(rpcRes.error)logError("جلب عدد الكورسات",rpcRes.error);
  const courseCount=rpcRes.data??0;
  document.getElementById("stat-levels").textContent=levels.length;
  document.getElementById("stat-packages").textContent=packages.length;
  document.getElementById("stat-courses").textContent=courseCount;
  document.getElementById("levels-grid").innerHTML=levels.length
    ?levels.map((lv,i)=>`<div class="card level-card"><div class="lv-num">${i+1}</div><h3>${lang==="ar"?lv.name_ar:lv.name_en}</h3></div>`).join("")
    :`<div class="empty-state">${lang==="ar"?"لسه مفيش مراحل":"No stages yet"}</div>`;
  document.getElementById("packages-grid").innerHTML=packages.length
    ?packages.map(p=>`<div class="card pkg-card"><h3>${lang==="ar"?p.name_ar:p.name_en}</h3><div class="price">${p.price} <small>${lang==="ar"?"ج.م / "+p.duration_days+" يوم":"EGP / "+p.duration_days+" days"}</small></div><p class="desc">${(lang==="ar"?p.description_ar:p.description_en)||""}</p><button class="btn btn-teal btn-block" onclick='subscribeViaWhatsApp(${JSON.stringify(lang==="ar"?p.name_ar:p.name_en)})'>${lang==="ar"?"اشترك عبر واتساب":"Subscribe"}</button></div>`).join("")
    :`<div class="empty-state">${lang==="ar"?"لسه مفيش باقات":"No packages yet"}</div>`;
}

/* Support */
function escapeHtml(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

async function openSupportPanel(recipientRole="support"){
  if(!CURRENT_PROFILE){showToast("⚠️ لازم تسجّلي دخول الأول","error");return;}
  const overlay=document.getElementById("support-overlay");
  overlay.classList.add("open");
  overlay.dataset.recipient=recipientRole;
  delete overlay.dataset.privateWith;
  const title=document.getElementById("support-title");
  const sub=document.getElementById("support-subtitle");
  const lang=localStorage.getItem("basetna_lang")||"ar";
  const membersBox=document.getElementById("support-members");
  const banner=document.getElementById("private-banner");
  if(banner)banner.hidden=true;
  if(recipientRole==="support"){title.textContent="🛠️ الدعم الفني";sub.textContent=lang==="ar"?"الدعم الفني للمنصة":"Platform support";}
  else if(recipientRole==="owner"){title.textContent="👩‍🏫 مس. شيرهان علي";sub.textContent=lang==="ar"?"تواصلي مع الميس مباشرة":"Chat with ms. sherehan";}
  else{title.textContent="💬 الغرفة العامة";sub.textContent=lang==="ar"?"كل الطلاب والميس والدعم":"Everyone can see";}
  if(membersBox){
    if(recipientRole==="general"){membersBox.hidden=false;await renderGroupMembers();}
    else{membersBox.hidden=true;}
  }
  loadMessages(recipientRole);
}
function closeSupportPanel(){document.getElementById("support-overlay").classList.remove("open");}

async function loadMessages(recipientRole){
  const list=document.getElementById("support-messages");
  const lang=localStorage.getItem("basetna_lang")||"ar";
  list.innerHTML=`<div class="empty-state">${lang==="en"?"Loading...":"جاري التحميل..."}</div>`;
  let query=supabaseClient.from("messages").select("*").order("created_at",{ascending:true}).limit(200);
  if(recipientRole==="general"){query=query.eq("recipient_role","general");}
  else{query=query.or(`and(sender_id.eq.${CURRENT_PROFILE.id},recipient_role.eq.${recipientRole}),and(recipient_role.eq.${recipientRole},sender_role.eq.${recipientRole})`);}
  const {data,error}=await query;
  if(error){logError("تحميل الرسائل",error);return;}
  if(!data||!data.length){list.innerHTML=`<div class="empty-state">${lang==="en"?"No messages yet 👋":"لسه مفيش رسائل 👋"}</div>`;return;}
  renderMessages(data,recipientRole);
  scrollMessagesToBottom();
}

function renderMessages(messages){
  const list=document.getElementById("support-messages");
  const lang=localStorage.getItem("basetna_lang")||"ar";
  list.innerHTML=messages.map(m=>{
    const isMine=m.sender_id===CURRENT_PROFILE.id;
    const isAdminMsg=m.sender_role==="owner"||m.sender_role==="support";
    const time=new Date(m.created_at).toLocaleString(lang==="ar"?"ar-EG":"en-US",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit"});
    const avatarEmoji=m.sender_role==="owner"?"👩‍🏫":m.sender_role==="support"?"🛠️":"🎓";
    const roleName=m.sender_role==="owner"?(lang==="ar"?"الميس":"Teacher"):m.sender_role==="support"?(lang==="ar"?"دعم فني":"Support"):(lang==="ar"?"طالب":"Student");
    return `<div class="msg ${isMine?"mine":""} ${isAdminMsg?"admin-msg":""}">${!isMine?`<div class="msg-avatar">${avatarEmoji}</div>`:""}<div class="msg-bubble">${!isMine?`<div class="msg-name">${escapeHtml(m.sender_name)} <span class="role-tag">${roleName}</span></div>`:""}<div class="msg-text">${escapeHtml(m.content)}</div><div class="msg-time">${time}</div></div></div>`;
  }).join("");
}
function scrollMessagesToBottom(){const list=document.getElementById("support-messages");if(list)list.scrollTop=list.scrollHeight;}

async function renderGroupMembers(){
  const container=document.getElementById("support-members");
  if(!container)return;
  container.innerHTML=`<div class="empty-state" style="padding:10px;font-size:12.5px;">جاري تحميل الأعضاء...</div>`;
  const {data,error}=await supabaseClient.from("profiles").select("id, full_name, role").neq("id",CURRENT_PROFILE.id).order("role",{ascending:true});
  if(error){logError("تحميل الأعضاء",error);container.innerHTML="";return;}
  const roleLabel=(r)=>r==="owner"?"الميس":r==="support"?"دعم فني":"طالب";
  const roleClass=(r)=>r==="owner"?"owner":r==="support"?"support":"";
  const avatar=(r)=>r==="owner"?"👩‍🏫":r==="support"?"🛠️":"🎓";
  let chipsHtml="";
  if(data&&data.length){
    chipsHtml=data.map(u=>`<span class="group-member-chip ${roleClass(u.role)}" onclick="startPrivateChat('${u.id}','${escapeHtml(u.full_name).replace(/'/g,"&#39;")}','${u.role}')"><span class="chip-avatar">${avatar(u.role)}</span>${escapeHtml(u.full_name)}<span class="role-tag" style="margin-inline-start:4px;">${roleLabel(u.role)}</span></span>`).join("");
  }else{chipsHtml=`<div style="font-size:12.5px;color:var(--ink-soft);padding:6px;">مفيش أعضاء تانيين لسه</div>`;}
  container.innerHTML=`<div class="group-members-title">👥 الأعضاء</div>${chipsHtml}`;
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
  const {data,error}=await supabaseClient.from("profiles").select("id, full_name, role, phone, grade_levels(name_ar)").neq("id",CURRENT_PROFILE.id).order("role",{ascending:true}).order("full_name",{ascending:true});
  if(error){logError("تحميل جهات الاتصال",error);return;}
  ALL_CONTACTS=data||[];
  if(!ALL_CONTACTS.length){list.innerHTML=`<div class="empty-state">لسه مفيش مستخدمين</div>`;return;}
  const avatar=(r)=>r==="owner"?"👩‍🏫":r==="support"?"🛠️":"🎓";
  const roleLabel=(r)=>r==="owner"?"الميس":r==="support"?"دعم فني":"طالب";
  const roleColor=(r)=>r==="owner"?"var(--gold)":r==="support"?"var(--purple)":"var(--teal)";
  const owners=ALL_CONTACTS.filter(c=>c.role==="owner");
  const supports=ALL_CONTACTS.filter(c=>c.role==="support");
  const students=ALL_CONTACTS.filter(c=>c.role==="student");
  const renderCard=(c)=>`<div class="chat-contact" onclick='startPrivateChat("${c.id}","${escapeHtml(c.full_name).replace(/'/g,"&#39;")}")'><div class="chat-contact-avatar" style="background:${roleColor(c.role)}">${avatar(c.role)}</div><div class="chat-contact-info"><div class="chat-contact-name">${escapeHtml(c.full_name)}</div><div class="chat-contact-meta"><span class="role-tag" style="background:${roleColor(c.role)}">${roleLabel(c.role)}</span>${c.grade_levels?.name_ar?`<span class="chat-grade">${escapeHtml(c.grade_levels.name_ar)}</span>`:""}${c.phone?`<span class="chat-phone">📱 ${escapeHtml(c.phone)}</span>`:""}</div></div><div class="chat-contact-action">💬</div></div>`;
  let html="";
  if(students.length)html+=`<div class="chat-section-title">🎓 الطلاب <span class="chat-count">${students.length}</span></div>`+students.map(renderCard).join("");
  if(supports.length)html+=`<div class="chat-section-title">🛠️ الدعم الفني <span class="chat-count">${supports.length}</span></div>`+supports.map(renderCard).join("");
  if(owners.length)html+=`<div class="chat-section-title">👩‍🏫 الميس <span class="chat-count">${owners.length}</span></div>`+owners.map(renderCard).join("");
  list.innerHTML=html;
}

/* Owner Dashboard */
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
    const roleLabel=m.recipient_role==="support"?"🛠️ دعم فني":m.recipient_role==="owner"?"👩‍🏫 الميس":m.recipient_role==="private"?"🔒 خاص":"💬 عام";
    return `<div class="inbox-item ${m.is_read?"read":"unread"}"><div class="inbox-head"><b>${escapeHtml(m.sender_name)}</b><span class="role-tag">${m.sender_role}</span><span class="inbox-target">→ ${roleLabel}</span><span class="inbox-time">${time}</span></div><div class="inbox-body">${escapeHtml(m.content)}</div>${!isFromMe?`<div class="inbox-actions"><button class="btn btn-teal btn-sm" onclick='startPrivateChat("${m.sender_id}","${escapeHtml(m.sender_name).replace(/'/g,"&#39;")}")'>رد</button>${!m.is_read?`<button class="btn btn-ghost btn-sm" onclick='markMessageRead("${m.id}")'>تمييز كمقروء</button>`:""}</div>`:""}</div>`;
  }).join("");
}
async function markMessageRead(id){
  const {error}=await supabaseClient.from("messages").update({is_read:true}).eq("id",id);
  if(error){logError("تحديث الرسالة",error);return;}
  loadAdminInbox();
}

async function refreshOwnerData(){
  try{await loadLevels();await loadCourses();await loadPackages();await loadStudents();await loadOwnerSettings();await loadKpis();await loadAdminInbox();await loadChatsPanel();}
  catch(err){logError("تحديث بيانات الأونر",err);}
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

async function loadLevels(){
  const {data,error}=await supabaseClient.from("grade_levels").select("*").order("sort_order");
  if(error)logError("تحميل المراحل",error);
  CURRENT_LEVELS=data||[];
  document.getElementById("levels-table").innerHTML=CURRENT_LEVELS.length
    ?CURRENT_LEVELS.map(lv=>`<tr><td>${lv.name_ar}</td><td>${lv.name_en}</td><td>${lv.sort_order}</td><td><button class="icon-btn" onclick='openLevelForm(${JSON.stringify(lv)})'>✏️</button><button class="icon-btn danger" onclick="deleteRow('grade_levels','${lv.id}', loadLevels)">🗑️</button></td></tr>`).join("")
    :`<tr><td colspan="4"><div class="empty-state">لسه مفيش مراحل</div></td></tr>`;
}

function openLevelForm(level){
  const isEdit=!!level;
  document.getElementById("form-modal-content").innerHTML=`<button class="close" onclick="closeFormModal()">✕</button><h3>${isEdit?"✏️ تعديل مرحلة":"➕ إضافة مرحلة"}</h3><form id="level-form"><div class="field"><label>الاسم بالعربي</label><input type="text" id="lv-name-ar" value="${level?.name_ar||""}" required></div><div class="field"><label>Name in English</label><input type="text" id="lv-name-en" value="${level?.name_en||""}" required></div><div class="field"><label>ترتيب الظهور</label><input type="number" id="lv-order" value="${level?.sort_order??0}"></div><button class="btn btn-gold btn-block" type="submit">💾 حفظ</button><div class="form-msg" id="level-msg"></div></form>`;
  document.getElementById("form-overlay").classList.add("open");
  document.getElementById("level-form").addEventListener("submit",async(e)=>{
    e.preventDefault();
    const msg=document.getElementById("level-msg");
    const payload={name_ar:document.getElementById("lv-name-ar").value.trim(),name_en:document.getElementById("lv-name-en").value.trim(),sort_order:Number(document.getElementById("lv-order").value)||0};
    const q=isEdit?supabaseClient.from("grade_levels").update(payload).eq("id",level.id):supabaseClient.from("grade_levels").insert(payload);
    const {error}=await q;
    if(error){showMsg(msg,friendlyError(error),"error");return;}
    logOk("المرحلة",isEdit?"تم التعديل ✏️":"تمت الإضافة ➕");
    closeFormModal();await loadLevels();await loadKpis();
  });
}

async function loadCourses(){
  const {data,error}=await supabaseClient.from("courses").select("*, grade_levels(name_ar)").order("sort_order");
  if(error)logError("تحميل الكورسات",error);
  document.getElementById("courses-table").innerHTML=(data&&data.length)
    ?data.map(c=>{
      const info=getVideoInfo(c);
      const thumb=info?.thumbnail?`<img src="${info.thumbnail}" style="width:60px;height:36px;object-fit:cover;border-radius:6px;">`:`<div style="width:60px;height:36px;background:var(--paper-2);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:18px;">${c.content_type==="file"?"📄":"🔗"}</div>`;
      return `<tr><td style="display:flex;align-items:center;gap:10px;"><span>${thumb}</span><b>${escapeHtml(c.title_ar)}</b></td><td>${c.grade_levels?.name_ar||"—"}</td><td>${c.content_type==="link"?"🔗":"📄"}</td><td><button class="icon-btn" onclick='openCourseForm(${JSON.stringify(c).replace(/'/g,"&#39;")})'>✏️ تعديل</button><button class="icon-btn danger" onclick="deleteRow('courses','${c.id}', loadCourses)">🗑️ حذف</button></td></tr>`;
    }).join("")
    :`<tr><td colspan="4"><div class="empty-state">لسه مفيش كورسات</div></td></tr>`;
}

function levelOptions(selectedId){
  return CURRENT_LEVELS.map(lv=>`<option value="${lv.id}" ${lv.id===selectedId?"selected":""}>${lv.name_ar}</option>`).join("");
}

function openCourseForm(course){
  if(!CURRENT_LEVELS.length){showToast("⚠️ لازم تضيفي مرحلة الأول","error");return;}
}