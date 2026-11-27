import {firebaseConfig} from './firebase-config.js';
import {THEMES,ORDER,FABS,SHELF,artSvg,patternUri} from './themes.js';
import {themeIcon} from './themeicons.js';
import {parseAny,compare,mergeRows} from './moc.js';
import {BL2LD,LDN} from './colors.js';

const VERSION='1.18.1', VERSION_DATE='2026-11-27';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v}catch{return d}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
const nf=new Intl.NumberFormat('es-ES');
const eur=new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'});
const money=n=>n==null||isNaN(n)?'—':eur.format(n);
const num=n=>n==null||isNaN(n)?'—':nf.format(n);
function parseNum(v){v=String(v??'').trim();if(!v)return null;if(v.includes(','))v=v.replace(/\./g,'').replace(',','.');const n=Number(v.replace(/[^0-9.\-]/g,''));return isNaN(n)?null:n}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const STATUS={wishlist:'Deseado',owned:'Poseído',sold:'Vendido'};

let toastT;function toast(m){const t=$('toast');t.textContent=m;t.classList.remove('hidden');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.add('hidden'),3200)}
function showOnly(id){if(id!=='app')$('fab').classList.add('hidden');['boot','nocfg','login','denied','app'].forEach(x=>$(x).classList.toggle('hidden',x!==id))}
document.addEventListener('error',e=>{const t=e.target;if(t&&t.tagName==='IMG'&&t.dataset.hide)t.remove()},true);

/* ---------- aspecto ---------- */
let aspecto=LS.get('bricks-aspecto','lego');if(!THEMES[aspecto])aspecto='lego';
function applyAspecto(k){
  if(!THEMES[k])k='lego';aspecto=k;const t=THEMES[k],r=document.documentElement.style;
  r.setProperty('--bg',t.bg);r.setProperty('--hd',t.hd);r.setProperty('--ac',t.ac);r.setProperty('--ink',t.ink);
  t.tile.forEach((c,i)=>r.setProperty('--t'+(i+1),c));r.setProperty('--rad',t.rad);r.setProperty('--bw',t.bw);
  document.body.style.backgroundImage=patternUri(k);
  $('themecolor').setAttribute('content',t.hd);
  $('hero-art').innerHTML=artSvg(k,'Cabecera '+t.label);$('hero-title').textContent=t.title;$('hero-tag').textContent=t.tag;
  const sh=SHELF[k];r.setProperty('--wall',sh.wall);r.setProperty('--plank-a',sh.a);r.setProperty('--plank-b',sh.b);r.setProperty('--plank-img',sh.img);
  $('fab').innerHTML=FABS[k];$('login-title').textContent=t.title;document.title=t.title;
  document.querySelectorAll('.asp').forEach(b=>b.classList.toggle('on',b.dataset.k===k));
  LS.set('bricks-aspecto',k);
}
function buildAspectos(){
  $('aspectos').innerHTML=ORDER.map(k=>`<button class="asp" data-k="${k}">${artSvg(k,'')}<span>${esc(THEMES[k].label)}</span></button>`).join('');
}
applyAspecto(aspecto);buildAspectos();applyAspecto(aspecto);

/* ---------- firebase ---------- */
let app,auth,db,fb={};
let user=null,sets=[],profile={},cfg={},unsubs=[],denied=false;
const prefs=JSON.parse(LS.get('bricks-prefs','null')||'null')||{view:'listimg',sort:'name',dir:1,f:{}};
const savePrefs=()=>LS.set('bricks-prefs',JSON.stringify(prefs));

async function boot(){
  if(/COPIAR/.test(JSON.stringify(firebaseConfig))){showOnly('nocfg');return}
  try{
    const V='https://www.gstatic.com/firebasejs/10.12.2/';
    const [a,au,fs]=await Promise.all([import(V+'firebase-app.js'),import(V+'firebase-auth.js'),import(V+'firebase-firestore.js')]);
    fb={...au,...fs};
    app=a.initializeApp(firebaseConfig);auth=au.getAuth(app);
    try{db=fs.initializeFirestore(app,{localCache:fs.persistentLocalCache({tabManager:fs.persistentMultipleTabManager()})})}catch(e){db=fs.getFirestore(app)}
  }catch(e){$('boot').innerHTML='<p>No se pudo cargar. Comprueba la conexión e inténtalo de nuevo.</p>';return}
  fb.onAuthStateChanged(auth,u=>{
    if(!u){stopData();user=null;showOnly('login');return}
    user=u;denied=false;$('s-mail').textContent=u.email||'';$('denied-mail').textContent=u.email||'';
    showOnly('app');startData();go(curTab);
  });
}
function stopData(){unsubs.forEach(f=>{try{f()}catch{}});unsubs=[];sets=[];profile={};cfg={};}
function startData(){
  stopData();
  const q=fb.query(fb.collection(db,'bricks'),fb.where('addedBy','==',user.uid));
  unsubs.push(fb.onSnapshot(q,{includeMetadataChanges:true},snap=>{
    const list=[];snap.forEach(d=>list.push({...d.data(),id:d.id}));
    sets=list;
    if(!snap.metadata.fromCache)setLast();
    renderAll();
  },err=>{if(err&&err.code==='permission-denied'){denied=true;showOnly('denied')}else toast('Error de sincronización')}));
  unsubs.push(fb.onSnapshot(fb.doc(db,'bricksMeta',user.uid),s=>{
    profile=s.exists()?s.data():{};
    if(profile.aspecto&&profile.aspecto!==aspecto)applyAspecto(profile.aspecto);
    if(curTab==='profile')syncProfile();
  },()=>{}));
  unsubs.push(fb.onSnapshot(fb.doc(db,'bricksMeta','config'),s=>{cfg=s.exists()?s.data():{};keysState()},()=>{}));
}
const setLast=()=>{LS.set('bricks-lastsync',String(Date.now()));lastTxt()};
function lastTxt(){const t=Number(LS.get('bricks-lastsync','0'));$('s-last').textContent='Última sincronización: '+(t?new Date(t).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'}):'nunca')}

/* ---------- navegación ---------- */
let curTab='home';
function go(t){
  if(t==='add'){openSheet(null);return}
  curTab=t;['home','lib','wish','parts','moc','profile','settings'].forEach(x=>$('v-'+x).classList.toggle('hidden',x!==t));
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));
  $('fab').classList.toggle('hidden',!(t==='home'||t==='lib'||t==='wish'));
  if(t==='parts')renderParts();if(t==='moc')renderMoc();if(t==='profile')syncProfile();if(t==='settings')settingsInit();
  window.scrollTo(0,0);renderAll();
}
$('nav').addEventListener('click',e=>{const b=e.target.closest('button');if(b)go(b.dataset.tab)});

/* ---------- datos derivados ---------- */
const coll=s=>s.status==='owned'&&!s.gift&&!s.resale;
function renderAll(){
  $('offline').classList.toggle('hidden',navigator.onLine!==false);
  if(curTab==='home')renderHome();
  if(curTab==='lib')renderLib();
  if(curTab==='parts')renderParts();
  if(curTab==='moc')renderMoc();
  if(curTab==='wish')renderWish();
  filterOptions();choiceList();
}
window.addEventListener('online',renderAll);window.addEventListener('offline',renderAll);

function renderHome(){
  const own=sets.filter(s=>s.status==='owned'),c=own.filter(coll);
  const mont=c.filter(s=>s.built),por=c.filter(s=>!s.built&&!s.building),proc=c.filter(s=>s.building&&!s.built),reg=own.filter(s=>s.gift),sc=own.filter(s=>s.resale);
    const pz=a=>a.reduce((n,s)=>n+(s.pieces||0),0);
    const soldAll=sets.filter(s=>s.status==='sold'),wish=sets.filter(s=>s.status==='wishlist');
  const benS=soldAll.reduce((n,s)=>n+((s.salePrice!=null&&s.paid!=null)?s.salePrice-s.paid:0),0);
  const tile=(n,l,a,cls,go,extra)=>`<button type="button" class="tile" data-go="${go}" style="background:var(--${cls})"><b>${n}</b><span>${l}</span><small>${num(pz(a))} piezas${extra||''}</small></button>`;
  $('tiles').innerHTML=tile(mont.length,'Montados',mont,'t1','mont')+tile(por.length,'Por montar',por,'t2','por',proc.length?' · '+proc.length+' en proceso':'')+tile(reg.length,'Para regalar',reg,'t3','reg')+tile(sc.length,'Scalper',sc,'t4','sc')
    +tile(soldAll.length,'Vendidos',soldAll,'t2','sold',soldAll.length&&benS?' · '+(benS>=0?'+':'−')+money(Math.abs(benS)):'')+tile(wish.length,'Deseos',wish,'t1','wish',wish.some(s=>s.rrp)?' · PVP '+money(wish.reduce((n,s)=>n+(s.rrp||0),0)):'');
  const money_=sets.filter(s=>s.status!=='wishlist');
  const sum=(a,f)=>a.reduce((n,s)=>n+(f(s)||0),0);
  const both=money_.filter(s=>s.rrp!=null&&s.paid!=null);
  const ahorro=sum(both,s=>s.rrp-s.paid);
  const potS=sets.filter(s=>s.resale&&s.status!=='sold'&&s.potPrice!=null&&(s.paid!=null?s.paid:s.rrp)),potN=potS.length,potB=sum(potS,s=>s.potPrice-(s.paid!=null?s.paid:s.rrp));
  const ben=sum(sets.filter(s=>s.status==='sold'&&s.salePrice!=null&&s.paid!=null),s=>s.salePrice-s.paid);
  /* tarjetas de dinero: colección (sin scalper) separada de lo que se va a vender */
  const paidColl=sum(c,s=>s.paid),paidRes=sum(sc,s=>s.paid),paidOwn=sum(own,s=>s.paid);
  const bc=c.filter(s=>s.rrp!=null&&s.paid!=null),svC=sum(bc,s=>s.rrp-s.paid),rpC=sum(bc,s=>s.rrp),svP=rpC?svC/rpC*100:null;
  const ba=own.filter(s=>s.rrp!=null&&s.paid!=null),svA=sum(ba,s=>s.rrp-s.paid),rpA=sum(ba,s=>s.rrp),svAP=rpA?svA/rpA*100:null;
  const pct=n=>n==null?'—':n.toFixed(1).replace('.',',')+' %';
  const net=paidOwn-ben,netPot=net-potB;
  const IC=p=>`<svg class="mic" viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICS={paid:'<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.3"/>',
    save:'<path d="M5 12a7 6 0 0 1 12-3.5h2v3l-1.5 1V16h-3l-.5 1.5h-3L10 16H8l-1.5-1.5"/><path d="M5 11H3.5"/><path d="M12 5.5v-2"/><circle cx="15.5" cy="11" r=".6"/>',
    sold:'<circle cx="12" cy="12" r="8.5"/><path d="M12 16.5V8m-3.5 3.5L12 8l3.5 3.5"/>',
    pot:'<path d="M7 3h10M7 21h10"/><path d="M8 3c0 5 8 5 8 9s-8 4-8 9"/><path d="M16 3c0 5-8 5-8 9s8 4 8 9" opacity=".5"/>',
    price:'<path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-8.5 8.5z"/><circle cx="8" cy="8" r="1.4"/>',
    pots:'<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z"/>'};
  const mc=(l,v,sub,k,cls)=>`<div class="mnyc ${cls}"><span>${l}</span>${IC(ICS[k])}<b>${v}</b>${sub?`<small>${sub}</small>`:''}</div>`;
  $('home-money').innerHTML=`<h3>Cuentas</h3><div class="mny">`
   +mc('Pagado por tu colección',money(paidColl),sc.length?`Para vender: ${money(paidRes)} · todo: ${money(paidOwn)}`:'','paid','m1')
   +mc('Ahorro frente al PVP',money(svC),`${pct(svP)} del PVP${sc.length?` · con scalper: ${money(svA)} (${pct(svAP)})`:''}`,'save','m2')
   +mc('Beneficio de ventas',money(ben),`${soldAll.length} vendido${soldAll.length===1?'':'s'}`,'sold','m3')
   +mc('Beneficio previsto',money(potB),`${potN} set${potN===1?'':'s'} para vender`,'pot','m4')
   +mc('Precio de la colección',money(net),'Pagado − beneficio de ventas','price','m5')
   +mc('Precio potencial',money(netPot),'Pagado − beneficio de ventas − beneficio previsto','pots','m6')
   +`</div>
   <div class="kv"><span>Piezas en tu colección</span><b>${num(pz(c))}</b></div>
   <div class="kv"><span>Minifiguras en tu colección</span><b>${num(sum(c,s=>s.minifigs))}</b></div>
   <div class="kv"><span>Total PVP</span><b>${money(sum(money_,s=>s.rrp))}</b></div>
   <div class="kv"><span>Deseados</span><b>${sets.filter(s=>s.status==='wishlist').length}</b></div>`;
  const rec=sets.filter(s=>s.status!=='wishlist').sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).slice(0,8);
  $('home-recent').classList.toggle('hidden',!rec.length);
  renderRare();
  $('recent').innerHTML=rec.map(s=>`<button class="th it" style="padding:0;border:0;background:none;display:block" data-id="${s.id}">${phHTML(s)}</button>`).join('');
}
const copiesN=s=>{if(s.status!=='owned')return 0;const n=(s.setNumber||'').trim().replace(/-1$/,'');return n?sets.filter(x=>x.status==='owned'&&(x.setNumber||'').trim().replace(/-1$/,'')===n).length:0};
const GIFT='<svg viewBox="0 0 24 24" width="{S}" height="{S}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><rect x="3" y="9" width="18" height="4" rx="1"/><path d="M5 13v7h14v-7M12 9v11M12 9S9 8.500 8.500 6.500 10 4 12 9c2-5 3.500-4.500 3.500-2.500S12 9 12 9z"/></svg>';
const phHTML=(s,photoFirst,ov)=>{const src=photoFirst?(s.photo||s.imageUrl):(s.imageUrl||s.photo),own=!!src&&src===s.photo;
  return `<div class="ph sq">${src?`<img src="${esc(src)}" ${own?'class="cover" ':'loading="lazy" referrerpolicy="no-referrer" '}alt="" data-hide="1">`:''}<span class="ovs">${ov&&s.status==='wishlist'?'<span class="ov heart" role="img" aria-label="Deseado" title="Deseado"><svg viewBox="0 0 24 24" width="18" height="18" fill="#d11a2a" stroke="#d11a2a" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg></span>':''}${ov&&s.gift?`<span class="ov tl gift" role="img" aria-label="Para regalar" title="Para regalar">${GIFT.replace(/\{S\}/g,24)}</span>`:''}${ov&&s.status==='owned'&&!s.built?(s.building?'<span class="ov tr box prog" role="img" aria-label="En proceso" title="En proceso"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="11" width="18" height="9" rx="1.5"/><path d="M7 11V8m5 3V8m5 3V8"/><path d="M5 5h14" stroke-dasharray="2 3"/></svg></span>':'<span class="ov tr box" role="img" aria-label="Por montar" title="Por montar"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/></svg></span>'):''}</span>${ov&&ov!=='h'&&s.pieces?`<span class="ov bc">${num(s.pieces)} pzs${copiesN(s)>1?' · ×'+copiesN(s):''}</span>`:''}</div>`};
function renderShelf(a){
  const body=$('lib-body'),b=a.filter(s=>s.status==='owned'&&s.built);
  if(!b.length){body.innerHTML=`<div class="empty">${artSvg(aspecto,'')}<div>Aún no hay sets montados. Marca un set como Montado y aparecerá aquí.</div></div>`;return}
  const g=new Map();b.forEach(s=>{const k=s.location||'';if(!g.has(k))g.set(k,[]);g.get(k).push(s)});
  const keys=[...g.keys()].sort((x,y)=>!x?1:!y?-1:x.localeCompare(y,'es'));
  body.innerHTML=`<div class="note" style="padding:10px 14px 0">${b.length} montado${b.length===1?'':'s'} en la estantería</div>`+keys.map(k=>{
    const items=g.get(k);let rows='';
    for(let i=0;i<items.length;i+=3)rows+=`<div class="srow">${items.slice(i,i+3).map(s=>`<button class="si" data-id="${s.id}">${phHTML(s,true)}<b>${esc(s.name||s.setNumber)}${copiesN(s)>1?' <span class="cp">×'+copiesN(s)+'</span>':''}</b></button>`).join('')}</div><div class="plank"></div>`;
    return `<div class="shelfgrp"><h3><span>${esc(k||'Sin ubicación')}</span><span class="chip">${items.length}</span></h3>${rows}</div>`}).join('');
}

/* ---------- biblioteca ---------- */
function filtered(){
  const f=prefs.f,q=($('lib-q').value||'').trim().toLowerCase();
  let a=sets.filter(s=>{
    if(q&&!(`${s.name||''} ${s.setNumber||''}`.toLowerCase().includes(q)))return false;
    if(s.status==='wishlist')return false;
    if(f.coll&&!coll(s))return false;
    if(f.status&&s.status!==f.status)return false;
    if(f.theme&&s.theme!==f.theme)return false;
    if(f.year&&String(s.year)!==f.year)return false;
    if(f.store&&s.store!==f.store)return false;
    if(f.built==='1'&&!(s.status==='owned'&&s.built))return false;
    if(f.built==='0'&&!(s.status==='owned'&&!s.built&&!s.building))return false;
    if(f.built==='2'&&!(s.status==='owned'&&s.building&&!s.built))return false;
    if(f.gift&&!s.gift)return false;if(f.resale&&!s.resale)return false;if(f.used&&!s.used)return false;return true});
  const k=prefs.sort,d=prefs.dir;
  const val=s=>k==='name'?(s.name||''):k==='theme'?(s.theme||null):k==='num'?parseInt(s.setNumber,10):k==='year'?s.year:k==='pieces'?s.pieces:k==='state'?(s.status==='wishlist'?0:s.status==='sold'?4:s.built?3:s.building?2:1):s.paid;
  a.sort((x,y)=>{const A=val(x),B=val(y);const an=A==null||(typeof A==='number'&&isNaN(A)),bn=B==null||(typeof B==='number'&&isNaN(B));
    if(an&&bn)return k==='theme'?(x.name||'').localeCompare(y.name||'','es'):0;if(an)return 1;if(bn)return -1;const c=(typeof A==='string'?A.localeCompare(B,'es'):A-B);return (c||(k==='theme'?(x.name||'').localeCompare(y.name||'','es'):0))*d});
  return a;
}
const pcTxt=s=>{if(s.status==='wishlist'||!s.rrp||s.paid==null)return '';const d=(s.rrp-s.paid)/s.rrp*100;if(Math.abs(d)<0.5)return '';
  return d>0?`<span class="pc up">ahorro ${d.toFixed(0)} %</span>`:`<span class="pc down">sobre PVP ${Math.abs(d).toFixed(0)} %</span>`};
const profTxt=s=>{if(s.status!=='sold'||s.salePrice==null||s.paid==null)return '';const p=s.salePrice-s.paid;return `<span class="pc ${p>=0?'up':'down'}">${p>=0?'beneficio +':'pérdida '}${money(Math.abs(p))}</span>`};
const potTxt=s=>{if(!s.resale||s.status==='sold'||s.potPrice==null)return '';const base=s.paid!=null?s.paid:s.rrp;if(!base)return '';const b=s.potPrice-base;return `<span class="pc ${b>=0?'up':'down'}">previsto ${b>=0?'+':'−'}${money(Math.abs(b))} (${(Math.abs(b)/base*100).toFixed(0)} %)</span>`};
function badges(s){return (copiesN(s)>1?`<span class="badge">×${copiesN(s)} copias</span>`:'')+pcTxt(s)+profTxt(s)+potTxt(s)+(s.built&&s.status==='owned'?'<span class="badge ok">Montado</span>':'')+(s.status==='owned'&&!s.built&&!s.building?'<span class="badge un">Por montar</span>':'')+(s.building&&!s.built&&s.status==='owned'?'<span class="badge prog">En proceso</span>':'')+(s.gift?`<span class="badge">${GIFT.replace(/\{S\}/g,11)} Regalo</span>`:'')+(s.resale?'<span class="badge">Scalper</span>':'')+(s.used?'<span class="badge">Segunda mano</span>':'')}
function renderLib(){
  const c=sets.filter(coll);
  $('lib-tot').innerHTML=`<span class="chip">${c.length} sets</span><span class="chip">${num(c.reduce((n,s)=>n+(s.pieces||0),0))} piezas</span><span class="chip">${c.filter(s=>s.built).length} montado${c.filter(s=>s.built).length===1?'':'s'}</span><span class="chip">${c.filter(s=>!s.built&&!s.building).length} en caja</span>${c.some(s=>s.building&&!s.built)?`<span class="chip">${c.filter(s=>s.building&&!s.built).length} en proceso</span>`:''}`;
  {const n=Object.entries(prefs.f||{}).filter(([,v])=>v).length;if(n)$('lib-tot').insertAdjacentHTML('beforeend',`<button type="button" class="chip clr" id="lib-clr">Filtros activos (${n}) · quitar ✕</button>`)}
  document.querySelectorAll('#views button').forEach(b=>b.classList.toggle('on',b.dataset.v===prefs.view));$('view-note').textContent=VDESC[prefs.view]||'';
  $('lib-sort').value=prefs.sort;$('lib-dir').textContent=prefs.dir===1?'↑':'↓';
  const a=filtered(),v=prefs.view,body=$('lib-body');
  if(v==='shelf'){renderShelf(a);return}
  if(!a.length){
    body.innerHTML=`<div class="empty">${artSvg(aspecto,'')}<div>${sets.length?'Ningún set con estos filtros.':'Aún no hay sets. Añade el primero.'}</div></div>`;return}
  const items=l=>(v==='grid-s'||v==='grid-l')?
    `<div class="grid ${v==='grid-s'?'s':'l'}">${l.map(s=>`<button class="gi" data-id="${s.id}">${phHTML(s,false,true)}<b>${esc(s.name||s.setNumber)}</b><span>${esc(s.setNumber||'')}${v==='grid-l'?' · '+num(s.pieces)+' pzs':''}</span>${v==='grid-l'?badges(s):''}</button>`).join('')}</div>`:
    `<div class="list">${l.map(s=>`<button class="it ${v==='list'?'noimg':''}" data-id="${s.id}">${phHTML(s)}<div class="tx"><b>${esc(s.name||s.setNumber)}</b><span>${esc(s.setNumber||'')} · ${esc(s.theme||'—')} · ${s.year||'—'} · ${num(s.pieces)} pzs</span><span>${STATUS[s.status]||''} ${badges(s)}${s.paid!=null?' · '+money(s.paid):''}</span></div></button>`).join('')}</div>`;
  if(prefs.sort==='theme'){
    const g=new Map();a.forEach(s=>{const k=s.theme||'';if(!g.has(k))g.set(k,[]);g.get(k).push(s)});
    body.innerHTML=[...g].map(([k,l])=>{return `<div class="thh">${themeIcon(k)}<b>${esc(k||'Sin tema')}</b><span class="chip">${l.length} set${l.length===1?'':'s'} · ${num(l.reduce((n,s)=>n+(s.pieces||0),0))} pzs</span></div>`+items(l)}).join('');
  }else body.innerHTML=items(a);
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b&&(b.closest('#lib-body')||b.closest('#recent')||b.closest('#wish-body'))){const s=sets.find(x=>x.id===b.dataset.id);if(s)openSheet(s)}});
$('lib-q').addEventListener('input',renderLib);
$('lib-sort').addEventListener('change',e=>{prefs.sort=e.target.value;savePrefs();renderLib()});
$('lib-dir').addEventListener('click',()=>{prefs.dir*=-1;savePrefs();renderLib()});
$('views').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;prefs.view=b.dataset.v;savePrefs();renderLib()});

const ALL_THEMES=['Architecture','Art','Botanicals','BrickHeadz','City','Classic','Creator 3-in-1','DC','Disney','Dots','Duplo','Friends','Harry Potter','Icons','Ideas','Jurassic World','Lord of the Rings','Marvel','Minecraft','Minifigures','Monkie Kid','Ninjago','Speed Champions','Star Wars','Super Mario','Technic','Trains','Space','Modular Buildings','Sonic the Hedgehog','Avatar','Wicked','Formula 1','Animal Crossing','Pirates','Castle','Town','Racers','Bionicle','Hidden Side','Vidiyo','Overwatch','Stranger Things','Wednesday','The Legend of Zelda','Rivals','Gabby\'s Dollhouse','Education','Powered Up','Mindstorms','Batman','Bluey','Braille Bricks','DREAMZzz','Duplo Peppa Pig','Editions','Fortnite','KPop Demon Hunters','One Piece','Pokémon','Shrek','Looney Tunes','Nike x LEGO','Serious Play'];
let fKey='';
function filterOptions(){
  const u=a=>[...new Set(a.filter(x=>x!=null&&x!=='').map(String))];
  const th=u(sets.map(s=>s.theme)).sort((a,b)=>a.localeCompare(b,'es')),yr=u(sets.map(s=>s.year)).sort((a,b)=>b-a),st=u(sets.map(s=>s.store)).sort((a,b)=>a.localeCompare(b,'es'));
  const key=JSON.stringify([th,yr,st]);if(key===fKey)return;fKey=key;
  const opt=(a,sel)=>'<option value="">Todos</option>'+a.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  $('x-theme').innerHTML=opt(th);$('x-year').innerHTML=opt(yr);$('x-store').innerHTML=opt(st);fillFilters();
  $('dl-theme').innerHTML=[...new Set([...th,...ALL_THEMES])].sort((x,y)=>x.localeCompare(y,'es')).map(x=>`<option value="${esc(x)}">`).join('');
}
const CH={
  store:{sel:'f-store',oth:'f-store-other',defs:['LEGO Store','Amazon','El Corte Inglés','Carrefour','Juguettos','Smyths','Wallapop'],field:'store',lab:'Elige tienda',sk:null},
  where:{sel:'f-where',oth:'f-where-other',defs:['Salón','Dormitorio','Despacho','Trastero'],field:'location',lab:'Elige lugar',sk:null}
};
function choiceList(){
  for(const c of Object.values(CH)){
    const custom=[...new Set(sets.map(s=>s[c.field]).filter(x=>x&&!c.defs.includes(x)))].sort((a,b)=>a.localeCompare(b,'es'));
    const k=custom.join('|');if(k===c.sk)continue;c.sk=k;
    const sel=$(c.sel),cur=sel.value;
    sel.innerHTML=`<option value="">${c.lab}</option>`+[...c.defs,...custom].map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('')+'<option value="__other">Otros…</option>';
    sel.value=[...sel.options].some(o=>o.value===cur)?cur:'';
  }
}
const choiceVal=c=>$(c.sel).value==='__other'?$(c.oth).value.trim():$(c.sel).value;
function setChoice(c,v){
  const sel=$(c.sel);$(c.oth).value='';
  if(!v)sel.value='';else if([...sel.options].some(o=>o.value===v))sel.value=v;else{sel.value='__other';$(c.oth).value=v}
  $(c.oth).classList.toggle('hidden',sel.value!=='__other');
}
Object.values(CH).forEach(c=>$(c.sel).addEventListener('change',()=>{const o=$(c.sel).value==='__other';$(c.oth).classList.toggle('hidden',!o);if(o)$(c.oth).focus()}));
function fillFilters(){const f=prefs.f;$('x-status').value=f.status||'';$('x-theme').value=f.theme||'';$('x-year').value=f.year||'';$('x-store').value=f.store||'';$('x-built').value=f.built||'';$('x-gift').checked=!!f.gift;$('x-resale').checked=!!f.resale;$('x-used').checked=!!f.used}
$('btn-filters').addEventListener('click',()=>{fillFilters();$('filters').classList.remove('hidden')});
$('x-ok').addEventListener('click',()=>{prefs.f={status:$('x-status').value,theme:$('x-theme').value,year:$('x-year').value,store:$('x-store').value,built:$('x-built').value,gift:$('x-gift').checked,resale:$('x-resale').checked,used:$('x-used').checked};savePrefs();$('filters').classList.add('hidden');renderLib()});
$('x-clear').addEventListener('click',()=>{prefs.f={};savePrefs();fillFilters();$('filters').classList.add('hidden');renderLib()});

/* ---------- formulario de set (se construye una vez, nunca se rehace con la sincronización) ---------- */
let editing=null,pickResults=[];
const F=['q','num','year','name','theme','pieces','mini','rrp','paid','date','img','sale','sdate','notes','pot'];
function potUI(){const st=document.querySelector('#f-status button.on')?.dataset.s;$('f-potbox').classList.toggle('hidden',!($('f-resale').checked&&st!=='sold'))}
function setStatusUI(s){
  document.querySelectorAll('#f-status button').forEach(b=>b.classList.toggle('on',b.dataset.s===s));
  $('c-built').classList.toggle('hidden',s!=='owned');$('c-building').classList.toggle('hidden',s!=='owned');$('f-soldbox').classList.toggle('hidden',s!=='sold');potUI();calc();
}
const curStatus=()=>document.querySelector('#f-status button.on')?.dataset.s||'owned';
$('f-status').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setStatusUI(b.dataset.s)});
function calc(){
  const r=parseNum($('f-rrp').value),p=parseNum($('f-paid').value),s=parseNum($('f-sale').value);
  const sv=$('f-save'),pf=$('f-profit'),pt=$('f-potnote'),pot=parseNum($('f-pot').value),base=p!=null?p:r;
  if(pot!=null&&base){const b=pot-base,pc=(b/base*100).toFixed(1).replace('.',',');pt.textContent=`${b>=0?'Beneficio previsto: +':'Pérdida prevista: '}${money(Math.abs(b))} (${b>=0?'+':'−'}${pc.replace('-','')} %)${p==null?' · sobre el PVP':''}`;pt.classList.toggle('up',b>=0);pt.classList.toggle('down',b<0)}else{pt.textContent='';pt.classList.remove('up','down')}
  sv.textContent=r&&p!=null?(p<=r?`Ahorro: ${(((r-p)/r)*100).toFixed(1).replace('.',',')} % (${money(r-p)})`:`Sobre el PVP: +${(((p-r)/r)*100).toFixed(1).replace('.',',')} % (${money(p-r)})`):'';
  sv.classList.toggle('up',!!(r&&p!=null&&p<=r));sv.classList.toggle('down',!!(r&&p!=null&&p>r));
  pf.textContent=s!=null&&p!=null?(s-p>=0?`Beneficio: ${money(s-p)}`:`Pérdida: ${money(p-s)}`):'';
  pf.classList.toggle('up',s!=null&&p!=null&&s-p>=0);pf.classList.toggle('down',s!=null&&p!=null&&s-p<0);
}
['f-rrp','f-paid','f-sale','f-pot'].forEach(i=>$(i).addEventListener('input',calc));
function preview(){const u=$('f-img').value.trim();$('f-ph').innerHTML=/^https?:\/\//i.test(u)?`<img src="${esc(u)}" alt="" referrerpolicy="no-referrer" data-hide="1">`:''}
$('f-img').addEventListener('input',preview);
let pendingPhoto='';
function photoUI(){$('f-myph').innerHTML=pendingPhoto?`<img src="${pendingPhoto}" alt="" class="cover">`:'';$('ph-del').classList.toggle('hidden',!pendingPhoto)}
function shrink(file,max,q){return new Promise((res,rej)=>{const rd=new FileReader();rd.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/jpeg',q))};im.onerror=rej;im.src=rd.result};rd.onerror=rej;rd.readAsDataURL(file)})}
['ph-cam','ph-gal'].forEach(id=>$(id).addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{pendingPhoto=await shrink(f,640,.65);photoUI()}catch{$('f-err').textContent='No se pudo leer la foto.'}}));
$('ph-take').addEventListener('click',()=>$('ph-cam').click());$('ph-pick').addEventListener('click',()=>$('ph-gal').click());$('ph-del').addEventListener('click',()=>{pendingPhoto='';photoUI()});
function openSheet(s,st0){
  editing=s?s.id:null;pickResults=[];$('f-res').innerHTML='';$('f-msg').textContent='';$('f-err').textContent='';
  F.forEach(k=>$('f-'+k).value='');setChoice(CH.store,s?s.store:'');setChoice(CH.where,s?s.location:'');pendingPhoto=s?(s.photo||''):'';photoUI();
  $('sh-title').textContent=s?'Editar set':'Añadir set';$('f-del').classList.toggle('hidden',!s);$('f-del').textContent='Borrar';
  $('f-built').checked=false;$('f-building').checked=false;$('f-gift').checked=false;$('f-resale').checked=false;$('f-used').checked=false;
  if(s){
    const m={pot:s.potPrice,num:s.setNumber,year:s.year,name:s.name,theme:s.theme,pieces:s.pieces,mini:s.minifigs,rrp:s.rrp,paid:s.paid,date:s.purchaseDate,img:s.imageUrl,sale:s.salePrice,sdate:s.saleDate,notes:s.notes};
    Object.entries(m).forEach(([k,v])=>{$('f-'+k).value=v==null?'':(k==='rrp'||k==='paid'||k==='sale'||k==='pot')?String(v).replace('.',','):String(v)});
    $('f-built').checked=!!s.built;$('f-building').checked=!!s.building&&!s.built;$('f-gift').checked=!!s.gift;$('f-resale').checked=!!s.resale;$('f-used').checked=!!s.used;setStatusUI(s.status||'owned');
  }else setStatusUI(st0||'owned');
  instrLink();$('f-parts').classList.toggle('hidden',!s);$('f-dup').classList.toggle('hidden',!s);preview();calc();$('sheet').classList.remove('hidden');$('sheet').querySelector('.panel').scrollTop=0;
}
$('sheet').addEventListener('click',e=>{if(e.target===$('sheet'))closeSheet()});$('filters').addEventListener('click',e=>{if(e.target===$('filters'))$('filters').classList.add('hidden')});
function closeSheet(){stopScan();$('sheet').classList.add('hidden');editing=null}
$('f-cancel').addEventListener('click',closeSheet);$('sh-x').addEventListener('click',closeSheet);$('x-x').addEventListener('click',()=>$('filters').classList.add('hidden'));$('fab').addEventListener('click',()=>openSheet(null,curTab==='wish'?'wishlist':undefined));
$('f-ok').addEventListener('click',async()=>{
  const g=k=>$('f-'+k).value.trim(),n=k=>parseNum($('f-'+k).value);
  if(!g('name')&&!g('num')){$('f-err').textContent='Escribe el número o el nombre del set.';return}
  for(const k of ['year','pieces','mini','rrp','paid','sale','pot']){if(g(k)&&n(k)==null){$('f-err').textContent='Revisa los números.';return}}
  const st=curStatus();
  const data={addedBy:user.uid,setNumber:g('num'),name:g('name'),theme:g('theme'),year:n('year'),pieces:n('pieces'),minifigs:n('mini'),rrp:n('rrp'),paid:n('paid'),
    store:choiceVal(CH.store),purchaseDate:g('date'),location:choiceVal(CH.where),photo:pendingPhoto,notes:g('notes'),imageUrl:g('img'),status:st,built:st==='owned'&&$('f-built').checked,building:st==='owned'&&$('f-building').checked&&!$('f-built').checked,
    gift:$('f-gift').checked,resale:$('f-resale').checked,used:$('f-used').checked,salePrice:st==='sold'?n('sale'):null,potPrice:$('f-resale').checked&&st!=='sold'?n('pot'):null,saleDate:st==='sold'?g('sdate'):'',updatedAt:fb.serverTimestamp()};
  try{
    if(editing)await fb.setDoc(fb.doc(db,'bricks',editing),data,{merge:true});
    else{data.createdAt=fb.serverTimestamp();await fb.setDoc(fb.doc(fb.collection(db,'bricks')),data)}
    closeSheet();toast('Guardado');
  }catch(e){$('f-err').textContent='No se pudo guardar. Inténtalo de nuevo.'}
});
let delT;$('f-del').addEventListener('click',async()=>{
  if($('f-del').textContent==='Borrar'){$('f-del').textContent='¿Seguro? Borrar';clearTimeout(delT);delT=setTimeout(()=>$('f-del').textContent='Borrar',4000);return}
  try{await fb.deleteDoc(fb.doc(db,'bricks',editing));closeSheet();toast('Borrado')}catch{$('f-err').textContent='No se pudo borrar.'}
});

/* ---------- búsqueda de sets ---------- */
const keys=()=>({bs:cfg.bricksetKey||LS.get('bricks-k-bs',''),rb:cfg.rebrickableKey||LS.get('bricks-k-rb','')});
async function getJson(url,opts={}){const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);
  try{const r=await fetch(url,{...opts,signal:c.signal});if(!r.ok){const e=new Error('http');e.status=r.status;throw e}return await r.json()}finally{clearTimeout(t)}}
function bsNorm(s){return{setNumber:(s.numberVariant>1?`${s.number}-${s.numberVariant}`:String(s.number)),name:s.name,theme:s.theme||'',subtheme:s.subtheme||'',year:s.year??null,pieces:s.pieces??null,minifigs:s.minifigs??null,rrp:s.LEGOCom?.DE?.retailPrice??null,rrpAlt:{US:s.LEGOCom?.US?.retailPrice??null,UK:s.LEGOCom?.UK?.retailPrice??null,CA:s.LEGOCom?.CA?.retailPrice??null},imageUrl:s.image?.imageURL||s.image?.thumbnailURL||''}}
async function bsQuery(params,key){
  const j=await getJson(`https://brickset.com/api/v3.asmx/getSets?apiKey=${encodeURIComponent(key)}&userHash=&params=${encodeURIComponent(JSON.stringify(params))}`);
  if(j.status!=='success'){const e=new Error(j.message||'brickset');e.status=/key/i.test(j.message||'')?401:500;throw e}
  return (j.sets||[]).map(bsNorm);
}
let rbLast=0;
async function rbGet(path,key){const w=rbLast+1100-Date.now();if(w>0)await sleep(w);rbLast=Date.now();
  return getJson('https://rebrickable.com/api/v3'+path,{headers:{Authorization:'key '+key}})}
const rbNorm=s=>({setNumber:String(s.set_num).replace(/-1$/,''),name:s.name,theme:'',themeId:s.theme_id,year:s.year??null,pieces:s.num_parts??null,minifigs:null,rrp:null,imageUrl:s.set_img_url||''});
async function rbTheme(id,key){
  const cache=JSON.parse(LS.get('bricks-rbthemes','{}'));let name='',cur=id;
  for(let i=0;i<4&&cur;i++){
    if(!cache[cur]){const t=await rbGet(`/lego/themes/${cur}/`,key);cache[cur]={n:t.name,p:t.parent_id}}
    name=cache[cur].n;cur=cache[cur].p;
  }
  LS.set('bricks-rbthemes',JSON.stringify(cache));return name;
}
async function enrich(r,key){
  if(!key)return r;
  try{
    if(!r.theme&&r.themeId)r.theme=await rbTheme(r.themeId,key);
    if(r.minifigs==null){const m=await rbGet(`/lego/sets/${r.setNumber.includes('-')?r.setNumber:r.setNumber+'-1'}/minifigs/?page_size=100`,key);r.minifigs=(m.results||[]).reduce((n,x)=>n+(x.quantity||1),0)}
  }catch{}
  return r;
}
const errMsg=e=>e.status===401?'La clave no es válida. Revísala en Ajustes, Avanzado.':e.status===429?'Demasiadas peticiones. Espera unos segundos.':'No se pudo consultar. Rellena el set a mano o inténtalo de nuevo.';
async function runLookup(q){
  const k=keys();if(!k.bs&&!k.rb)return{results:[],err:{status:0,nokey:true}};
  const ean=/^\d{12,13}$/.test(q),numq=!ean&&/^\d{3,7}(-\d+)?$/.test(q);
  const sn=numq?(q.includes('-')?q:q+'-1'):null;let results=[],err=null;
  if(k.bs){try{results=await bsQuery(ean?{query:q}:numq?{setNumber:sn}:{query:q,pageSize:10},k.bs)}catch(e){err=e}}
  if(!results.length&&k.rb&&!ean){try{
    if(numq){results=[rbNorm(await rbGet(`/lego/sets/${sn}/`,k.rb))]}
    else{const j=await rbGet(`/lego/sets/?search=${encodeURIComponent(q)}&page_size=10`,k.rb);results=(j.results||[]).map(rbNorm)}
    err=null}catch(e){if(e.status!==404)err=e}}
  if(!numq&&!ean)results=results.filter(x=>!(x.pieces===0||/^gear$/i.test(x.theme||'')||/video ?games?/i.test(x.subtheme||'')));
  return{results,err};
}
function fillFrom(r){
  const put=(k,v)=>{if(v!=null&&v!=='')$('f-'+k).value=k==='rrp'?String(v).replace('.',','):String(v)};
  if(r.imageUrl&&location.protocol==='https:')r.imageUrl=r.imageUrl.replace(/^http:\/\//i,'https://');
  put('num',r.setNumber);put('name',r.name);put('theme',r.theme);put('year',r.year);put('pieces',r.pieces);put('mini',r.minifigs);put('rrp',r.rrp);put('img',r.imageUrl);
  preview();calc();
}
async function pick(r){
  $('f-res').innerHTML='';$('f-msg').textContent='Rellenando…';
  r=await enrich({...r},keys().rb);fillFrom(r);const alt=r.rrpAlt?[['US','$'],['UK','£'],['CA','CA$']].filter(([c])=>r.rrpAlt[c]!=null).map(([c,m])=>`${m}${String(r.rrpAlt[c]).replace('.',',')}`):[];
  $('f-msg').textContent=r.rrp==null?(alt.length?`Datos rellenados. Brickset no tiene PVP en euros para este set (solo ${alt.join(' · ')}): escribe el de LEGO España a mano.`:'Datos rellenados. Este set no tiene PVP en la fuente: escríbelo a mano.'):'Datos rellenados. El PVP es el de Alemania (euros); compruébalo con el de LEGO España.';
}
async function search(){
  const q=$('f-q').value.trim();if(!q){$('f-msg').textContent='Escribe un número, un nombre o escanea el código.';return}
  $('f-res').innerHTML='';$('f-msg').textContent='Buscando…';$('f-search').disabled=true;
  try{
    const {results,err}=await runLookup(q);
    if(err&&err.nokey){$('f-msg').textContent='Aún no hay clave. Añádela en Ajustes, Avanzado, o rellena el set a mano.';return}
    if(!results.length){$('f-msg').textContent=err?errMsg(err):(/^\d{12,13}$/.test(q)?'No encontré ese código. Escribe el número del set (está en la caja).':'No encontré nada. Rellena el set a mano.');return}
    if(results.length===1&&/^\d/.test(q)){await pick(results[0]);return}
    pickResults=results;$('f-msg').textContent='Elige un resultado.';
    $('f-res').innerHTML=results.map((r,i)=>`<button class="it" data-i="${i}"><div class="ph sq">${r.imageUrl?`<img src="${esc(r.imageUrl)}" alt="" referrerpolicy="no-referrer" data-hide="1">`:''}</div><div class="tx"><b>${esc(r.name)}</b><span>${esc(r.setNumber)} · ${r.year||'—'} · ${num(r.pieces)} pzs</span></div></button>`).join('');
  }finally{$('f-search').disabled=false}
}
$('f-search').addEventListener('click',search);
$('f-q').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();search()}});
$('f-res').addEventListener('click',e=>{const b=e.target.closest('[data-i]');if(b)pick(pickResults[+b.dataset.i])});

/* ---------- escáner ---------- */
let stream=null,scanTimer=null;
function stopScan(){clearInterval(scanTimer);scanTimer=null;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}$('scanbox').classList.add('hidden')}
$('scan-close').addEventListener('click',stopScan);
$('f-scan').addEventListener('click',async()=>{
  if(!('BarcodeDetector' in window)||!navigator.mediaDevices?.getUserMedia){$('f-msg').textContent='Este navegador no lee códigos. Escribe los números que hay bajo el código de barras.';return}
  try{
    const det=new BarcodeDetector({formats:['ean_13','upc_a','ean_8']});
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    const v=$('scan-video');v.srcObject=stream;await v.play();$('scanbox').classList.remove('hidden');
    scanTimer=setInterval(async()=>{try{const c=await det.detect(v);if(c.length){const code=c[0].rawValue;stopScan();$('f-q').value=code;search()}}catch{}},350);
  }catch{stopScan();$('f-msg').textContent='No pude abrir la cámara. Escribe el número a mano.'}
});

/* ---------- perfil ---------- */
function syncProfile(){
  const a=document.activeElement;
  if(a!==$('p-name'))$('p-name').value=profile.name??(user?.displayName||'');
  if(a!==$('p-num'))$('p-num').value=profile.insidersNumber||'';
  $('p-delphoto').classList.toggle('hidden',!profile.cardImage);
}
let pT;async function saveProfile(patch){
  try{await fb.setDoc(fb.doc(db,'bricksMeta',user.uid),{...patch,updatedAt:fb.serverTimestamp()},{merge:true})}catch{toast('No se pudo guardar el perfil')}
}
['p-name','p-num'].forEach(id=>$(id).addEventListener('input',()=>{clearTimeout(pT);pT=setTimeout(()=>saveProfile({name:$('p-name').value.trim(),insidersNumber:$('p-num').value.trim()}),600)}));
$('aspectos').addEventListener('click',e=>{const b=e.target.closest('.asp');if(!b)return;applyAspecto(b.dataset.k);saveProfile({aspecto:b.dataset.k})});
$('p-photo').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{saveProfile({cardImage:await shrink(f,900,.72)});toast('Foto guardada')}catch{toast('No se pudo leer la foto')}});
$('p-delphoto').addEventListener('click',()=>saveProfile({cardImage:''}));
/* ---------- tarjeta digital con código de barras (Code 128, generado aquí) ---------- */
const C128=['11011001100','11001101100','11001100110','10010011000','10010001100','10001001100','10011001000','10011000100','10001100100','11001001000','11001000100','11000100100','10110011100','10011011100','10011001110','10111001100','10011101100','10011100110','11001110010','11001011100','11001001110','11011100100','11001110100','11101101110','11101001100','11100101100','11100100110','11101100100','11100110100','11100110010','11011011000','11011000110','11000110110','10100011000','10001011000','10001000110','10110001000','10001101000','10001100010','11010001000','11000101000','11000100010','10110111000','10110001110','10001101110','10111011000','10111000110','10001110110','11101110110','11010001110','11000101110','11011101000','11011100010','11011101110','11101011000','11101000110','11100010110','11101101000','11101100010','11100011010','11101111010','11001000010','11110001010','10100110000','10100001100','10010110000','10010000110','10000101100','10000100110','10110010000','10110000100','10011010000','10011000010','10000110100','10000110010','11000010010','11001010000','11110111010','11000010100','10001111010','10100111100','10010111100','10010011110','10111100100','10011110100','10011110010','11110100100','11110010100','11110010010','11011011110','11011110110','11110110110','10101111000','10100011110','10001011110','10111101000','10111100010','11110101000','11110100010','10111011110','10111101110','11101011110','11110101110','11010000100','11010010000','11010011100','1100011101011'];
function code128(str){
  const v=[];const dig=/^\d+$/.test(str);
  if(dig&&str.length>=2){let i=0;if(str.length%2){v.push(104,str.charCodeAt(0)-32,99);i=1}else v.push(105);
    for(;i<str.length;i+=2)v.push(parseInt(str.substr(i,2),10))}
  else{v.push(104);for(const ch of str)v.push(Math.max(0,Math.min(94,ch.charCodeAt(0)-32)))}
  let sum=v[0];for(let i=1;i<v.length;i++)sum+=v[i]*i;v.push(sum%103,106);
  return v.map(x=>C128[x]).join('');
}
function barcodeSvg(str){
  const m=code128(str),q=10;let x=q,r='';
  for(let i=0;i<m.length;){if(m[i]==='1'){let j=i;while(m[j]==='1')j++;r+=`<rect x="${x+i}" y="0" width="${j-i}" height="60"/>`;i=j}else i++}
  return `<svg viewBox="0 0 ${m.length+q*2} 60" preserveAspectRatio="none" role="img" aria-label="Código de barras ${esc(str)}" fill="#000">${r}</svg>`;
}
function cardHTML(){
  const n=($('p-num').value||'').replace(/\s+/g,''),email=user?.email||'',name=($('p-name').value||'').trim();
  const diam='<svg class="lc-art" viewBox="0 0 300 90" aria-hidden="true" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="6"><path d="M60 90 150 0l90 90M20 90 150-40l130 130"/></svg>';
  return `<div class="lcard"><div class="lc-top"><b>Bricks</b><span>Tarjeta de socio</span></div>${name?`<div class="lc-l">Nombre</div><div class="lc-v">${esc(name)}</div>`:''}<div class="lc-l">Email</div><div class="lc-v">${esc(email)}</div>
    ${n?`<div class="bcbox">${barcodeSvg(n)}<div class="bcnum">${esc(n)}</div></div>`:'<div class="bcbox"><div class="bcnum" style="letter-spacing:0;font-size:14px">Añade tu número de socio en el perfil</div></div>'}${diam}</div>`;
}
$('p-showcard').addEventListener('click',()=>{
  $('cf-card').innerHTML=cardHTML();
  const im=$('cf-img');im.classList.toggle('hidden',!profile.cardImage);if(profile.cardImage)im.src=profile.cardImage;$('cardfull').classList.remove('hidden');
});
$('cf-close').addEventListener('click',()=>$('cardfull').classList.add('hidden'));

/* ---------- ajustes ---------- */
function settingsInit(){
  const d=new Date(VERSION_DATE+'T12:00:00');$('s-version').textContent=`${VERSION} · ${d.toLocaleDateString('es-ES')}`;lastTxt();keysState();
}
function keysState(){const k=keys();$('k-state').textContent=`Brickset: ${k.bs?'guardada':'sin clave'} · Rebrickable: ${k.rb?'guardada':'sin clave'}`}
$('btn-keys').addEventListener('click',async()=>{
  const bs=$('k-bs').value.trim(),rb=$('k-rb').value.trim();if(!bs&&!rb){toast('Pega una clave primero');return}
  const patch={updatedAt:fb.serverTimestamp()};if(bs){patch.bricksetKey=bs;LS.set('bricks-k-bs',bs)}if(rb){patch.rebrickableKey=rb;LS.set('bricks-k-rb',rb)}
  try{await fb.setDoc(fb.doc(db,'bricksMeta','config'),patch,{merge:true});toast('Claves guardadas')}catch{toast('Guardadas solo en este móvil. La clave compartida solo se cambia desde la cuenta principal.')}
  $('k-bs').value='';$('k-rb').value='';keysState();
});
$('btn-sync').addEventListener('click',async()=>{
  $('btn-sync').disabled=true;
  try{await fb.waitForPendingWrites(db);await fb.getDocsFromServer(fb.query(fb.collection(db,'bricks'),fb.where('addedBy','==',user.uid)));setLast();toast('Sincronizado')}
  catch{toast('Sin conexión. Se sincronizará al volver.')}finally{$('btn-sync').disabled=false}
});
$('btn-export').addEventListener('click',()=>{
  const out={app:'Bricks',version:VERSION,exportedAt:new Date().toISOString(),profile,sets:sets.map(({id,...s})=>({id,...s,createdAt:undefined,updatedAt:undefined}))};
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(out,null,1)],{type:'application/json'}));
  a.download=`bricks-copia-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
});
const out=()=>fb.signOut(auth);
$('btn-out').addEventListener('click',out);$('btn-denied-out').addEventListener('click',out);
$('btn-login').addEventListener('click',async()=>{
  $('login-err').textContent='';const p=new fb.GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});
  try{await fb.signInWithPopup(auth,p)}catch(e){$('login-err').textContent=e.code==='auth/popup-blocked'?'El navegador bloqueó la ventana. Permítela e inténtalo otra vez.':'No se pudo entrar. Inténtalo de nuevo.'}
});

if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
boot();

/* ---------- enlace a las instrucciones ---------- */
const instrCache=new Map();let instrTok=0;
function instrLink(){const l=$('f-instr');if(!l)return;const n=($('f-num').value||'').trim().replace(/-\d+$/,'').replace(/\D/g,''),tok=++instrTok;
  if(!n){l.classList.add('hidden');l.removeAttribute('href');return}
  const setDirect=u=>{if(tok!==instrTok)return;if(u){l.href=u;l.textContent='Descargar manual (PDF)'}else{l.href='https://www.lego.com/service/buildinginstructions/'+n;l.textContent='Ver manual de instrucciones (LEGO)'}l.classList.remove('hidden')};
  setDirect(instrCache.get(n)||null);
  if(instrCache.has(n))return;const k=keys().bs;if(!k)return;
  clearTimeout(instrLink.t);instrLink.t=setTimeout(async()=>{
    try{const j=await getJson(`https://brickset.com/api/v3.asmx/getInstructions2?apiKey=${encodeURIComponent(k)}&setNumber=${encodeURIComponent(n+'-1')}`);
      const list=(j.instructions||[]).map(x=>x.URL||x.url).filter(u=>typeof u==='string'&&/^https:\/\//i.test(u)),u=list.find(x=>/\.pdf(\?|$)/i.test(x))||list[0]||'';
      instrCache.set(n,u);setDirect(u)}catch{}},400)}
$('f-num').addEventListener('input',instrLink);

$('f-built').addEventListener('change',()=>{if($('f-built').checked)$('f-building').checked=false});
$('f-building').addEventListener('change',()=>{if($('f-building').checked)$('f-built').checked=false});

/* ---------- inventario de piezas (Rebrickable, guardado en este dispositivo) ---------- */
const PT={scope:'owned',theme:'',set:'',sort:'qty',q:'',ref:'',view:'list',open:new Set(),lim:150,busy:false,stop:false,cache:null};
const snKey=s=>{const n=(s.setNumber||'').trim();return n?(n.includes('-')?n:n+'-1'):''};
const idb=()=>new Promise((res,rej)=>{try{const q=indexedDB.open('bricks-parts',1);q.onupgradeneeded=()=>q.result.createObjectStore('p');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)}catch(e){rej(e)}});
async function ptLoad(){if(PT.cache)return PT.cache;PT.cache=new Map();
  try{const d=await idb();await new Promise(res=>{const st=d.transaction('p').objectStore('p'),q=st.openCursor();q.onsuccess=()=>{const c=q.result;if(c){PT.cache.set(c.key,c.value);c.continue()}else res()};q.onerror=()=>res()})}catch{}
  return PT.cache}
async function ptSave(k,v){PT.cache.set(k,v);try{const d=await idb();d.transaction('p','readwrite').objectStore('p').put(v,k)}catch{}}
function ptSets(){const sc=PT.scope;return sets.filter(s=>snKey(s)&&(sc==='all'||(sc==='owned'&&s.status==='owned')||(sc==='built'&&s.status==='owned'&&s.built)||(sc==='unbuilt'&&s.status==='owned'&&!s.built&&!s.building)||(sc==='building'&&s.status==='owned'&&s.building&&!s.built)||(sc==='wish'&&s.status==='wishlist'))&&(!PT.theme||s.theme===PT.theme)&&(!PT.set||s.id===PT.set))}
async function ptFetch(sn,key){
  let path=`/lego/sets/${sn}/parts/?page_size=1000&inc_color_details=1`,out=[];
  for(let n=0;path&&n<10;n++){let j;
    try{j=await rbGet(path,key)}catch(e){if(e.status===429){await sleep(6000);j=await rbGet(path,key)}else throw e}
    for(const x of j.results||[]){if(x.is_spare)continue;out.push([x.part?.part_num||'',x.part?.name||'',x.color?.id??0,x.color?.name||'',x.color?.rgb||'',x.quantity||0,x.part?.part_img_url||''])}
    path=j.next?String(j.next).replace(/^https:\/\/rebrickable\.com\/api\/v3/,''):''}
  return out}
function ptSelects(){
  const th=[...new Set(sets.map(s=>s.theme).filter(Boolean))].sort((x,y)=>x.localeCompare(y,'es'));
  const so=[...sets].filter(s=>snKey(s)).sort((x,y)=>(x.name||'').localeCompare(y.name||'','es'));
  const k=JSON.stringify([th,so.map(s=>s.id)]);
  if(ptSelects.k!==k){ptSelects.k=k;
    $('pt-theme').innerHTML='<option value="">Todas las colecciones</option>'+th.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
    $('pt-set').innerHTML='<option value="">Todos los sets</option>'+so.map(s=>`<option value="${esc(s.id)}">${esc(s.setNumber)} ${esc(s.name||'')}</option>`).join('')}
  $('pt-scope').value=PT.scope;$('pt-theme').value=PT.theme;$('pt-set').value=PT.set;$('pt-sort').value=PT.sort}
const ptRow=o=>`<div class="prow"><span class="pimg">${o.img?`<img src="${esc(o.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-hide="1">`:''}</span><div class="pt"><b>${esc(o.ref)}</b> ${esc(o.name)}<div class="pcol"><i class="sw" style="background:${/^[0-9a-f]{6}$/i.test(o.rgb)?'#'+o.rgb:'#ddd'}"></i>${esc(o.col)}</div></div><b class="pq">×${num(o.q)}</b></div>`;
const ptTile=o=>`<div class="ptile" title="${esc(o.ref+' '+o.name+' · '+o.col)}"><span class="pimg">${o.img?`<img src="${esc(o.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-hide="1">`:''}</span><b>×${num(o.q)}</b><small>${esc(o.ref)}</small><i class="sw" style="background:${/^[0-9a-f]{6}$/i.test(o.rgb)?'#'+o.rgb:'#ddd'}"></i></div>`;
function ptSort(rows){return rows.sort((x,y)=>PT.sort==='ref'?x.ref.localeCompare(y.ref,'es',{numeric:true}):PT.sort==='col'?(x.col.localeCompare(y.col,'es')||y.q-x.q):y.q-x.q)}
const ptObj=p=>({ref:p[0],name:p[1],cid:p[2],col:p[3],rgb:p[4],q:p[5],img:p[6]});
async function renderParts(){
  await ptLoad();ptSelects();
  const ss=ptSets(),have=ss.filter(s=>PT.cache.has(snKey(s))),miss=ss.length-have.length,q=PT.q.trim().toLowerCase();
  document.querySelectorAll('#pt-views button').forEach(b=>b.classList.toggle('on',b.dataset.pv===PT.view));
  const match=p=>!q||`${p[0]} ${p[1]} ${p[3]}`.toLowerCase().includes(q);
  // buscador por referencia
  const ref=PT.ref.trim().toLowerCase();
  if(!ref)$('pt-ref-out').innerHTML='';
  else{const hits=[];let name='',tot=0;const byCol=new Map();
    for(const s of have){const rows=PT.cache.get(snKey(s)).p.filter(p=>String(p[0]).toLowerCase()===ref);if(rows.length){rows.forEach(p=>{name=name||p[1];tot+=p[5];byCol.set(p[3],(byCol.get(p[3])||0)+p[5])});hits.push([s,rows])}}
    $('pt-ref-out').innerHTML=!hits.length?`<div class="refcard">No tienes la referencia <b>${esc(PT.ref.trim())}</b> en los sets cargados.${miss?` Hay ${miss} sin cargar.`:''}</div>`:
      `<div class="refcard"><b>${esc(PT.ref.trim())}</b> · ${esc(name)}<div class="refbig">${num(tot)} pieza${tot===1?'':'s'} en ${hits.length} set${hits.length===1?'':'s'}</div><div class="pcol">${[...byCol].sort((x,y)=>y[1]-x[1]).map(([c,n])=>esc(c)+' ×'+num(n)).join(' · ')}</div><ul>${hits.map(([s,rows])=>`<li><button type="button" class="lnk" data-pset="${esc(s.id)}">${esc(s.name||s.setNumber)}</button> (${esc(s.setNumber||'')}) · ${rows.map(p=>esc(p[3])+' ×'+num(p[5])).join(', ')}</li>`).join('')}</ul>${miss?`<div class="note">Hay ${miss} set${miss===1?'':'s'} sin cargar.</div>`:''}</div>`}
  // contenido
  let tot=0,types=0,html='';
  if(!ss.length)html='<div class="empty">No hay sets con este filtro.</div>';
  else if(PT.view==='sets'){
    const sorted=[...ss].sort((x,y)=>(x.name||'').localeCompare(y.name||'','es'));
    for(const s of sorted){const k=snKey(s),d=PT.cache.get(k);
      if(!d){html+=`<div class="pset off"><div class="psh"><span class="pimg">${s.imageUrl||s.photo?`<img src="${esc(s.photo||s.imageUrl)}" alt="" referrerpolicy="no-referrer" data-hide="1">`:''}</span><div class="pt"><b>${esc(s.name||k)}</b><div class="pcol">${esc(s.setNumber||'')} · sin cargar</div></div></div></div>`;continue}
      const rows=d.p.filter(match);if(q&&!rows.length)continue;
      const qty=rows.reduce((n,p)=>n+p[5],0);tot+=qty;types+=rows.length;const open=PT.open.has(s.id);
      html+=`<div class="pset"><button type="button" class="psh" data-pset="${esc(s.id)}" aria-expanded="${open}"><span class="pimg">${s.imageUrl||s.photo?`<img src="${esc(s.photo||s.imageUrl)}" alt="" referrerpolicy="no-referrer" data-hide="1">`:''}</span><div class="pt"><b>${esc(s.name||k)}</b><div class="pcol">${esc(s.setNumber||'')} · ${rows.length} tipos · ${num(qty)} piezas${d.na?' · sin datos en Rebrickable':''}</div></div><span class="chev">${open?'▾':'▸'}</span></button>${open?`<div class="pbody">${rows.length?ptSort(rows.map(ptObj)).slice(0,400).map(ptRow).join(''):'<div class="empty">Sin piezas para mostrar.</div>'}</div>`:''}</div>`}
    if(!html)html='<div class="empty">Sin resultados.</div>';
  }else{
    const agg=new Map();
    for(const s of have)for(const p of PT.cache.get(snKey(s)).p){if(!match(p))continue;const k=p[0]+'|'+p[2],o=agg.get(k)||{ref:p[0],name:p[1],cid:p[2],col:p[3],rgb:p[4],img:p[6],q:0};o.q+=p[5];agg.set(k,o)}
    const rows=ptSort([...agg.values()]);tot=rows.reduce((n,o)=>n+o.q,0);types=rows.length;const vis=rows.slice(0,PT.lim);
    html=!rows.length?`<div class="empty">${miss?'Pulsa «Cargar piezas» para traer el inventario de estos sets.':'Sin resultados.'}</div>`:
      (PT.view==='grid'?`<div class="pgrid">${vis.map(ptTile).join('')}</div>`:vis.map(ptRow).join(''))+(rows.length>vis.length?`<button class="btn sec small" id="pt-more" style="margin:10px auto;display:block">Mostrar más (${rows.length-vis.length})</button>`:'');
  }
  $('pt-stat').innerHTML=`<span class="chip">${ss.length} set${ss.length===1?'':'s'}</span><span class="chip">${have.length} con piezas</span>${miss?`<span class="chip warn">${miss} sin cargar</span>`:''}<span class="chip">${num(types)} tipos</span><span class="chip">${num(tot)} piezas</span>`;
  $('pt-load').textContent=PT.busy?'Parar':miss?`Cargar piezas (${miss})`:'Actualizar piezas';
  $('pt-list').className=PT.view==='grid'?'plist g':'plist';$('pt-list').innerHTML=html;
}
async function ptRun(){
  if(PT.busy){PT.stop=true;return}
  const rb=keys().rb;if(!rb){$('pt-msg').textContent='Falta la clave de Rebrickable (Ajustes, Avanzado).';return}
  await ptLoad();const todo=ptSets().filter(s=>!PT.cache.has(snKey(s)));
  const again=!todo.length?ptSets():todo,seen=new Set();let n=0,fail=0;PT.busy=true;PT.stop=false;$('pt-msg').textContent='';
  for(const s of again){const k=snKey(s);if(seen.has(k))continue;seen.add(k);if(PT.stop)break;n++;
    $('pt-msg').textContent=`Cargando ${n} de ${new Set(again.map(snKey)).size}: ${s.name||k}`;renderParts();
    try{await ptSave(k,{t:Date.now(),p:await ptFetch(k,rb)})}
    catch(e){if(e.status===404)await ptSave(k,{t:Date.now(),p:[],na:1});else if(e.status===401){$('pt-msg').textContent='La clave de Rebrickable no es válida.';PT.busy=false;renderParts();return}else fail++}}
  PT.busy=false;$('pt-msg').textContent=(PT.stop?'Parado. ':'Listo. ')+(fail?`${fail} set${fail===1?'':'s'} no se pudieron cargar; inténtalo de nuevo.`:'');renderParts();
}
$('pt-scope').addEventListener('change',e=>{PT.scope=e.target.value;PT.lim=150;renderParts()});
$('pt-theme').addEventListener('change',e=>{PT.theme=e.target.value;PT.lim=150;renderParts()});
$('pt-set').addEventListener('change',e=>{PT.set=e.target.value;PT.lim=150;renderParts()});
$('pt-sort').addEventListener('change',e=>{PT.sort=e.target.value;renderParts()});
$('pt-q').addEventListener('input',e=>{PT.q=e.target.value;PT.lim=150;renderParts()});
$('pt-load').addEventListener('click',ptRun);
$('pt-list').addEventListener('click',e=>{if(e.target.id==='pt-more'){PT.lim+=150;renderParts();return}
  const b=e.target.closest('[data-pset]');if(b){const id=b.dataset.pset;PT.open.has(id)?PT.open.delete(id):PT.open.add(id);renderParts()}});
$('pt-ref').addEventListener('input',e=>{PT.ref=e.target.value;renderParts()});
$('pt-ref-out').addEventListener('click',e=>{const b=e.target.closest('[data-pset]');if(!b)return;PT.view='sets';PT.open.add(b.dataset.pset);PT.q=PT.ref;$('pt-q').value=PT.ref;renderParts().then(()=>document.querySelector(`#pt-list [data-pset="${CSS.escape(b.dataset.pset)}"]`)?.scrollIntoView({block:'center'}))});
$('pt-views').addEventListener('click',e=>{const b=e.target.closest('[data-pv]');if(!b)return;PT.view=b.dataset.pv;renderParts()});
$('f-parts').addEventListener('click',()=>{const id=editing;closeSheet();PT.set=id;PT.scope='all';PT.theme='';PT.q='';go('parts')});

$('f-resale').addEventListener('change',()=>{potUI();calc()});

/* ---------- lista de deseos ---------- */
const WS={q:'',sort:'name'};
function renderWish(){
  const all=sets.filter(s=>s.status==='wishlist'),q=WS.q.trim().toLowerCase();
  let a=all.filter(s=>!q||`${s.name||''} ${s.setNumber||''} ${s.theme||''}`.toLowerCase().includes(q));
  const k=WS.sort,val=s=>k==='theme'?(s.theme||null):k==='year'?s.year:k==='pieces'?s.pieces:k==='rrp'?s.rrp:k==='new'?-(s.createdAt?.seconds||0):(s.name||'');
  a.sort((x,y)=>{const A=val(x),B=val(y);if(A==null&&B==null)return 0;if(A==null)return 1;if(B==null)return -1;return typeof A==='string'?A.localeCompare(B,'es'):A-B});
  const sum=f=>all.reduce((n,s)=>n+(f(s)||0),0);
  $('wish-tot').innerHTML=`<span class="chip">${all.length} deseado${all.length===1?'':'s'}</span><span class="chip">${num(sum(s=>s.pieces))} piezas</span><span class="chip">PVP total ${money(sum(s=>s.rrp))}</span>`;
  $('wish-body').innerHTML=!a.length?`<div class="empty">${artSvg(aspecto,'')}<div>${all.length?'Ningún deseo con esta búsqueda.':'Tu lista de deseos está vacía. Pulsa + para añadir un set que quieras.'}</div></div>`:
    `<div class="list">${a.map(s=>`<div class="wrow"><button class="it" data-id="${s.id}">${phHTML(s,false,'h')}<div class="tx"><b>${esc(s.name||s.setNumber)}</b><span>${esc(s.setNumber||'')} · ${esc(s.theme||'—')} · ${s.year||'—'} · ${num(s.pieces)} pzs</span><span>PVP ${money(s.rrp)} ${s.gift?'<span class="badge">Regalo</span>':''}${s.resale?'<span class="badge">Scalper</span>':''}${potTxt(s)}</span></div></button><button class="btn sec small" data-own="${s.id}">Ya lo tengo</button></div>`).join('')}</div>`;
}
$('wish-q').addEventListener('input',e=>{WS.q=e.target.value;renderWish()});
$('wish-sort').addEventListener('change',e=>{WS.sort=e.target.value;renderWish()});
$('wish-body').addEventListener('click',async e=>{const b=e.target.closest('[data-own]');if(!b)return;
  try{await fb.setDoc(fb.doc(db,'bricks',b.dataset.own),{status:'owned',updatedAt:fb.serverTimestamp()},{merge:true});toast('Pasado a tu colección')}catch{toast('No se pudo guardar')}});

/* ---------- tarjetas de portada: abren la vista filtrada ---------- */
function goFilter(f){prefs.f=f;prefs.view=prefs.view==='shelf'?'listimg':prefs.view;$('lib-q').value='';savePrefs();go('lib')}
$('tiles').addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(!b)return;const g=b.dataset.go;
  if(g==='wish')return go('wish');
  goFilter(g==='mont'?{coll:true,built:'1'}:g==='por'?{coll:true,built:'0'}:g==='reg'?{status:'owned',gift:true}:g==='sc'?{status:'owned',resale:true}:{status:'sold'})});
document.addEventListener('click',e=>{if(e.target.closest('#lib-clr')){prefs.f={};savePrefs();fillFilters();renderLib()}});
const VDESC={list:'Lista: sin fotos, con todos los datos.',listimg:'Lista con foto: foto pequeña y todos los datos.',
 'grid-s':'Mosaico: fotos pequeñas con nombre, número y piezas. Poca información.','grid-l':'Cuadrícula: fotos grandes con piezas, estado y precios.',shelf:'Estantería: solo sets montados, por lugar. Vista limpia.'};

/* ---------- duplicar un set ---------- */
$('f-dup').addEventListener('click',()=>{const s=sets.find(x=>x.id===editing);if(!s)return;
  closeSheet();openSheet(null,'owned');
  const m={num:s.setNumber,year:s.year,name:s.name,theme:s.theme,pieces:s.pieces,mini:s.minifigs,rrp:s.rrp,paid:s.paid,date:s.purchaseDate,img:s.imageUrl};
  Object.entries(m).forEach(([k,v])=>{$('f-'+k).value=v==null?'':(k==='rrp'||k==='paid')?String(v).replace('.',','):String(v)});
  setChoice(CH.store,s.store);setChoice(CH.where,s.location);instrLink();preview();calc();
  $('sh-title').textContent='Copia de '+(s.name||s.setNumber||'set');toast('Copia creada: ajusta lo que cambie y guarda');});

/* ---------- diseño: móvil, tablet u ordenador ---------- */
function applyLayout(){const p=localStorage.getItem('bricks-layout')||'auto',w=innerWidth;
  document.documentElement.dataset.layout=p!=='auto'?p:(w<700?'phone':w<1100?'tablet':'desktop')}
applyLayout();addEventListener('resize',applyLayout);
$('s-layout').value=localStorage.getItem('bricks-layout')||'auto';
$('s-layout').addEventListener('change',e=>{try{localStorage.setItem('bricks-layout',e.target.value)}catch{}applyLayout()});

/* ---------- Creación: ¿puedo montar esto con mis piezas? (guardado en este dispositivo) ---------- */
const MC={open:null,mode:'strict',busy:false,tr:null};
const mcList=()=>{try{const v=JSON.parse(LS.get('bricks-moc','[]'));return Array.isArray(v)?v:[]}catch{return[]}};
const mcSave=l=>LS.set('bricks-moc',JSON.stringify(l));
const mcEx=()=>{try{return JSON.parse(LS.get('bricks-moc-sets','{}'))||{}}catch{return{}}};
/* por defecto no se usan: montados, en proceso, regalos y los de reventa; se puede cambiar set a set */
/* selección rápida: nunca entran regalos ni reventa; Deseos no cuenta porque no es de tu colección */
const MC_PRE={all:s=>!(s.gift||s.resale),dis:s=>!(s.built||s.building||s.gift||s.resale),built:s=>!!s.built&&!(s.gift||s.resale)};
const mcPre=k=>{const o={};for(const s of sets)if(s.status==='owned')o[s.id]=MC_PRE[k](s);LS.set('bricks-moc-sets',JSON.stringify(o))};
const mcPreOn=()=>{const own=sets.filter(s=>s.status==='owned');if(!own.length)return '';return Object.keys(MC_PRE).find(k=>own.every(s=>mcUse(s)===MC_PRE[k](s)))||''};
const mcUse=s=>{const o=mcEx();return s.id in o?o[s.id]:!(s.built||s.building||s.gift||s.resale)};
const mcColors=()=>{try{return JSON.parse(LS.get('bricks-colors','null'))}catch{return null}};
async function mcFetchColors(){
  const k=keys().rb;if(!k)return null;
  const cm={ld:{},bl:{},nm:{}};let path='/lego/colors/?page_size=1000';
  for(let n=0;path&&n<5;n++){const j=await rbGet(path,k);
    for(const c of j.results||[]){cm.nm[c.id]=[c.name,c.rgb||''];
      for(const x of c.external_ids?.LDraw?.ext_ids||[])cm.ld[x]=c.id;
      for(const x of c.external_ids?.BrickLink?.ext_ids||[])cm.bl[x]=c.id}
    path=j.next?String(j.next).replace(/^https:\/\/rebrickable\.com\/api\/v3/,''):''}
  LS.set('bricks-colors',JSON.stringify(cm));return cm}
/* números de elemento de LEGO -> [pieza, color] (se guarda lo ya traducido; clave de Rebrickable solo para esto) */
const mcEls=()=>{try{return JSON.parse(LS.get('bricks-elements','{}'))||{}}catch{return{}}};
async function mcTranslate(cid){
  const k=keys().rb,c=mcList().find(x=>x.id===cid);if(!k||!c||MC.tr)return;
  const em=mcEls(),todo=[...new Set(c.rows.map(x=>x.part))].filter(id=>!em[id]);if(!todo.length)return;
  MC.tr={n:0,t:todo.length};let fail=0;renderMoc();
  for(const id of todo){
    try{const j=await rbGet('/lego/elements/'+id+'/',k);const e=mcEls();e[id]=[String(j.part.part_num).toLowerCase(),String(j.color.id)];LS.set('bricks-elements',JSON.stringify(e))}
    catch(err){if(err&&err.status===404){const e=mcEls();e[id]=['?','0'];LS.set('bricks-elements',JSON.stringify(e))}else{fail++;if(fail>=3)break}}
    MC.tr.n++;if(MC.tr.n%5===0)renderMoc()}
  MC.tr=null;renderMoc();toast(fail?'Traducción detenida: puedes reintentar':'Elementos traducidos')}
function mcResolve(c,cm,known){
  const kind=c.kind||'rb';let note=false,adj=0,unr=0;const em=kind==='el'?mcEls():null;
  const rows=c.rows.map(x=>{let col=x.col,part=x.part;
    if(kind==='el'){const e=em[part];if(e&&e[0]!=='?')return{part:e[0],col:e[1],qty:x.qty};unr+=x.qty;return{part:'e:'+part,col:'0',qty:x.qty}}
    /* BrickLink y Rebrickable numeran distinto algunas piezas (3070 / 3070b): si no está tal cual, prueba con sufijo */
    if(kind==='bl'&&known&&!known.has(part)){const s=['b','a','c','d'].map(z=>part+z).find(z=>known.has(z));if(s){part=s;adj++}}
    if(kind==='ldraw'){if(cm&&cm.ld[col]!=null)col=String(cm.ld[col])}
    else if(kind==='bl'){if(cm&&cm.bl[col]!=null)col=String(cm.bl[col]);else if(BL2LD[col]!=null)col=String(BL2LD[col]);else note=true}
    return{part,col,qty:x.qty}});
  return{rows:mergeRows(rows),note,adj,bl:kind==='bl',unr,el:kind==='el'}}
/* miniatura pequeña (96 px) para la tarjeta; el .io lleva una imagen del modelo dentro */
async function mcThumb(bytes){
  try{const bm=await createImageBitmap(new Blob([bytes],{type:'image/png'})),k=96/Math.max(bm.width,bm.height),w=Math.max(1,Math.round(bm.width*Math.min(1,k))),h=Math.max(1,Math.round(bm.height*Math.min(1,k)));
    const cv=document.createElement('canvas');cv.width=w;cv.height=h;const cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,w,h);cx.drawImage(bm,0,0,w,h);
    const u=cv.toDataURL('image/jpeg',.72);return u.length<40000?u:''}catch{return''}}
const MC_ICON='<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>';
async function mcImport(name,buf){
  const p=await parseAny(name,buf);
  if(!p.rows.length)throw new Error('vacío');
  const l=mcList();
  l.unshift({id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),name:name.replace(/\.[a-z]+$/i,'').replace(/[_]+/g,' ').trim()||'Creación',src:p.src,kind:p.kind,rows:mergeRows(p.rows),total:p.total??null,thumb:p.thumb?await mcThumb(p.thumb):'',unknown:p.unknown?.length||0,date:new Date().toISOString()});
  mcSave(l);
  if(p.kind==='el'){mcTranslate(l[0].id)}
  else if(p.kind!=='rb'&&keys().rb&&!mcColors()){try{await mcFetchColors()}catch{}}
  return l[0]}
function mcPool(){
  const out=[],names=new Map(),cols=new Map(),miss=[],used=[];
  for(const s of sets){if(s.status!=='owned')continue;
    const d=PT.cache&&PT.cache.get(snKey(s));
    if(d)for(const p of d.p){if(!names.has(p[0]))names.set(p[0],p[1]);if(!cols.has(String(p[2])))cols.set(String(p[2]),[p[3],p[4]])}
    if(!mcUse(s))continue;
    if(!d){miss.push(s);continue}
    used.push(s);
    for(const p of d.p)out.push({part:String(p[0]).toLowerCase(),col:String(p[2]),qty:p[5],set:s.id})}
  return{pool:out,names,cols,miss,used}}
const mcSetName=id=>{const s=sets.find(x=>x.id===id);return s?(s.name||s.setNumber||id):'?'};
async function renderMoc(){
  await ptLoad();
  const P=mcPool(),cm=mcColors(),list=mcList(),owned=sets.filter(s=>s.status==='owned'),known=new Set([...P.names.keys()].map(k=>String(k).toLowerCase()));
  /* sets que usar */
  const nuse=owned.filter(mcUse).length;
  {const k=mcPreOn();document.querySelectorAll('#mc-pre button').forEach(b=>{b.classList.toggle('on',b.dataset.mcpre===k);b.setAttribute('aria-pressed',b.dataset.mcpre===k)})}
  $('mc-pool-n').textContent=`${nuse} de ${owned.length}`;
  $('mc-pool-list').innerHTML=owned.length?[...owned].sort((x,y)=>(x.name||'').localeCompare(y.name||'','es')).map(s=>{
    const d=PT.cache&&PT.cache.get(snKey(s));
    return `<label class="mcs"><input type="checkbox" data-mcset="${esc(s.id)}" ${mcUse(s)?'checked':''}><span><b>${esc(s.name||s.setNumber)}</b> <small>${esc(s.setNumber||'')}${s.built?' · montado':s.building?' · en proceso':s.gift?' · regalo':s.resale?' · reventa':''}${d?'':' · sin piezas cargadas'}</small></span></label>`}).join(''):'<div class="empty">Aún no tienes sets poseídos.</div>';
  $('mc-pool-note').innerHTML=P.miss.length?`<span class="chip warn">${P.miss.length} set${P.miss.length===1?'':'s'} marcado${P.miss.length===1?'':'s'} sin piezas cargadas: no cuentan. Cárgalos en Cajón.</span>`:'';
  if(!list.length){$('mc-saved').innerHTML='';$('mc-list').innerHTML='<div class="empty">Importa un archivo .io de Studio, un CSV de Rebrickable o Pick a Brick, o un XML de BrickLink para ver si puedes montarlo.</div>';return}
  const cinfo=c=>P.cols.get(c)||(cm&&cm.nm[c])||LDN[c],cname=c=>{const x=cinfo(c);return x?x[0]:'Color '+c},crgb=c=>{const x=cinfo(c);return x&&/^[0-9a-f]{6}$/i.test(x[1])?'#'+x[1]:'#ddd'};
  /* guardadas: se quedan siempre; se elige una para verla */
  $('mc-saved').innerHTML=list.map(c=>{const rs=mcResolve(c,cm,known).rows,s1=compare(rs,P.pool,'strict'),s2=compare(rs,P.pool,'loose');
    return `<button type="button" class="mcchip ${MC.open===c.id?'on':''}" data-mcopen="${esc(c.id)}" aria-pressed="${MC.open===c.id}" title="${esc(c.name)}"><span class="mci">${c.thumb?`<img src="${esc(c.thumb)}" alt="">`:MC_ICON}</span><b>${esc(c.name)}</b><small title="Mismo color"><i class="d1"></i>${s1.pct.toFixed(0)} %</small><small title="Cualquier color"><i class="d2"></i>${s2.pct.toFixed(0)} %</small></button>`}).join('');
  $('mc-list').innerHTML=!list.some(c=>c.id===MC.open)?'<div class="empty">Elige una creación guardada de arriba o importa otra.</div>':list.filter(c=>c.id===MC.open).map(c=>{
    const {rows,note,adj,bl,unr,el}=mcResolve(c,cm,known),st=compare(rows,P.pool,'strict'),lo=compare(rows,P.pool,'loose'),open=MC.open===c.id,cur=MC.mode==='loose'?lo:st;
    const bar=(l,x)=>`<div class="mcb"><span>${l}</span><div class="bar2"><i style="width:${x.pct.toFixed(1)}%"></i></div><b>${x.pct.toFixed(0)} %</b></div>`;
    let body='';
    if(open){
      const byset=new Map();for(const t of cur.takes){if(!byset.has(t.set))byset.set(t.set,[]);byset.get(t.set).push(t)}
      const miss=[...cur.missing].sort((x,y)=>y.qty-x.qty);
      body=`<div class="mcbody">
        <div class="views mcm"><button data-mcmode="strict" class="${MC.mode==='strict'?'on':''}">Mismo color</button><button data-mcmode="loose" class="${MC.mode==='loose'?'on':''}">Cualquier color</button></div>
        <div class="refcard" style="margin:6px 0"><div class="refbig">${num(cur.got)} de ${num(cur.total)} piezas · ${cur.pct.toFixed(1)} %</div>${MC.mode==='loose'&&cur.subs?`<div class="pcol">${num(cur.subs)} con otro color distinto al del modelo.</div>`:''}<div class="pcol">${miss.length?`Te faltan ${num(miss.reduce((n,x)=>n+x.qty,0))} piezas de ${miss.length} referencia${miss.length===1?'':'s'}.`:'Tienes todo lo necesario.'}</div>${note?'<div class="note">Algunos colores de este archivo no tienen equivalente conocido en Rebrickable y cuentan como no encontrados. Los porcentajes pueden salir más bajos de lo real.</div>':''}${el&&unr?`<div class="note">${MC.tr?`Traduciendo números de elemento de LEGO: ${MC.tr.n} de ${MC.tr.t}…`:keys().rb?`Este archivo usa números de elemento de LEGO y ${num(unr)} piezas aún no están traducidas a pieza y color, así que cuentan como no encontradas. <button class="btn sec small" data-mcel="${esc(c.id)}">Traducir ahora</button>`:'Este archivo usa números de elemento de LEGO (Pick a Brick). Para convertirlos a pieza y color hace falta la clave de Rebrickable (Ajustes, Avanzado); hasta entonces cuentan como no encontradas.'}</div>`:''}${bl?`<div class="note">Archivo de BrickLink: algunas piezas se numeran distinto en Rebrickable${adj?` (${adj} ajustadas automáticamente)`:''}. Las que no coinciden cuentan como no encontradas. El .io de Studio es más exacto.</div>`:''}${c.unknown?`<div class="note">${c.unknown} color(es) directos de Studio sin equivalente.</div>`:''}</div>
        ${miss.length?`<h4 class="mch">Por comprar <span><button class="btn sec small" data-mccopy="${esc(c.id)}">Copiar lista</button> <button class="btn sec small" data-mccsv="${esc(c.id)}">Descargar CSV</button></span></h4>${miss.slice(0,300).map(m=>`<div class="prow"><div class="pt"><b>${m.part.startsWith('e:')?'Elemento '+esc(m.part.slice(2)):esc(m.part)}</b> ${esc(P.names.get(m.part)||'')}${m.part.startsWith('e:')?'':`<div class="pcol"><i class="sw" style="background:${crgb(m.col)}"></i>${esc(cname(m.col))}</div>`}</div><b class="pq">×${num(m.qty)}</b></div>`).join('')}${miss.length>300?`<div class="note">Se muestran 300 de ${miss.length}.</div>`:''}`:''}
        <h4 class="mch">De dónde sacarlas</h4>
        ${byset.size?[...byset].sort((x,y)=>y[1].reduce((n,t)=>n+t.qty,0)-x[1].reduce((n,t)=>n+t.qty,0)).map(([id,ts])=>{const m=new Map();for(const t of ts){const k=t.part+'|'+t.col+'|'+t.want;m.set(k,(m.get(k)||0)+t.qty)}
          return `<details class="mcset"><summary><b>${esc(mcSetName(id))}</b> · ${num(ts.reduce((n,t)=>n+t.qty,0))} piezas</summary>${[...m].slice(0,200).map(([k,q])=>{const [pt,co,wa]=k.split('|');return `<div class="prow"><div class="pt"><b>${esc(pt)}</b> ${esc(P.names.get(pt)||'')}<div class="pcol"><i class="sw" style="background:${crgb(co)}"></i>${esc(cname(co))}${co!==wa?` <small>(el modelo pide ${esc(cname(wa))})</small>`:''}</div></div><b class="pq">×${num(q)}</b></div>`}).join('')}</details>`}).join(''):'<div class="empty">Ninguna pieza sale de tus sets con estos ajustes.</div>'}
        <div style="margin-top:12px"><button class="btn danger small" data-mcdel="${esc(c.id)}">Eliminar creación</button></div></div>`}
    return `<div class="mcard"><button type="button" class="mch0" data-mcopen="${esc(c.id)}" aria-expanded="${open}"><span class="mci">${c.thumb?`<img src="${esc(c.thumb)}" alt="">`:MC_ICON}</span><div class="pt"><b>${esc(c.name)}</b><div class="pcol">${num(rows.reduce((n,x)=>n+x.qty,0))} piezas · ${rows.length} tipos · ${esc(c.src)}</div>${bar('Mismo color',st)}${bar('Cualquier color',lo)}</div><span class="chev">${open?'▾':'▸'}</span></button>${body}</div>`}).join('')}
$('mc-file').addEventListener('change',async e=>{
  const fs=[...e.target.files];e.target.value='';let ok=0,last=null;
  for(const f of fs){try{last=await mcImport(f.name,new Uint8Array(await f.arrayBuffer()));ok++}
    catch(err){toast(err.message==='clave'?`${f.name}: no se pudo abrir (contraseña distinta)`:err.message==='aes'?`${f.name}: este .io usa un cifrado no admitido; expórtalo desde Studio como CSV`:`${f.name}: no se pudo leer`)}}
  if(ok){MC.open=last.id;toast(ok===1?'Creación añadida':ok+' creaciones añadidas');renderMoc()}});
/* Limpiar: vacía la vista para cargar otra; las creaciones guardadas no se tocan */
$('mc-clear').addEventListener('click',()=>{MC.open=null;$('mc-paste').classList.add('hidden');renderMoc();window.scrollTo(0,0);toast('Pantalla limpia. Las creaciones siguen guardadas')});
$('mc-paste-b').addEventListener('click',()=>$('mc-paste').classList.toggle('hidden'));
$('mc-add').addEventListener('click',async()=>{
  const t=$('mc-text').value.trim();if(!t)return;
  try{const c=await mcImport(($('mc-name').value.trim()||'Lista pegada')+'.txt',new TextEncoder().encode(t));$('mc-text').value='';$('mc-name').value='';$('mc-paste').classList.add('hidden');MC.open=c.id;toast('Creación añadida');renderMoc()}
  catch{toast('No se reconoció la lista. Usa Part,Color,Quantity')}});
$('v-moc').addEventListener('click',async e=>{
  const o=e.target.closest('[data-mcopen]');if(o){MC.open=MC.open===o.dataset.mcopen?null:o.dataset.mcopen;renderMoc();return}
  const te=e.target.closest('[data-mcel]');if(te){mcTranslate(te.dataset.mcel);return}
  const m=e.target.closest('[data-mcmode]');if(m){MC.mode=m.dataset.mcmode;renderMoc();return}
  const d=e.target.closest('[data-mcdel]');if(d){if(confirm('¿Eliminar esta creación de este dispositivo?')){mcSave(mcList().filter(x=>x.id!==d.dataset.mcdel));MC.open=null;renderMoc()}return}
  const dl=e.target.closest('[data-mccsv]');if(dl){
    const cr=mcList().find(x=>x.id===dl.dataset.mccsv);if(!cr)return;
    const PP=mcPool(),st=compare(mcResolve(cr,mcColors(),new Set([...PP.names.keys()].map(k=>String(k).toLowerCase()))).rows,PP.pool,MC.mode),cm=mcColors();
    const ci=id=>PP.cols.get(id)||(cm&&cm.nm[id])||LDN[id],cn=id=>{const x=ci(id);return x?x[0]:''};
    csvDown(`piezas-que-necesito-${(cr.name||'creacion').replace(/[^\w-]+/g,'-').slice(0,40)}.csv`,['Pieza','Nombre','Color (id)','Color','Cantidad que falta'],
      [...st.missing].sort((x,y)=>y.qty-x.qty).map(x=>x.part.startsWith('e:')?['Elemento '+x.part.slice(2),'','','',x.qty]:[x.part,PP.names.get(x.part)||'',x.col,cn(x.col),x.qty]));return}
  const c=e.target.closest('[data-mccopy]');if(c){
    const cr=mcList().find(x=>x.id===c.dataset.mccopy);if(!cr)return;
    const PP=mcPool(),st=compare(mcResolve(cr,mcColors(),new Set([...PP.names.keys()].map(k=>String(k).toLowerCase()))).rows,PP.pool,MC.mode);
    const csv='Part,Color,Quantity\n'+st.missing.filter(x=>!x.part.startsWith('e:')).map(x=>`${x.part},${x.col},${x.qty}`).join('\n');
    try{await navigator.clipboard.writeText(csv);toast('Lista copiada (formato CSV de Rebrickable)')}catch{toast('No se pudo copiar')}}});
$('mc-pre').addEventListener('click',e=>{const b=e.target.closest('[data-mcpre]');if(!b)return;mcPre(b.dataset.mcpre);renderMoc()});
$('mc-pool-list').addEventListener('change',e=>{const i=e.target.closest('[data-mcset]');if(!i)return;const o=mcEx();o[i.dataset.mcset]=i.checked;LS.set('bricks-moc-sets',JSON.stringify(o));renderMoc()});

/* ---------- exportar a CSV (se abre en Excel) ---------- */
const csvC=v=>{v=v==null?'':String(v);return /[";\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
const csvN=n=>n==null?'':String(n).replace('.',',');
function csvDown(name,head,rows){
  const t='\ufeff'+[head,...rows].map(r=>r.map(csvC).join(';')).join('\r\n');
  const u=URL.createObjectURL(new Blob([t],{type:'text/csv;charset=utf-8'})),l=document.createElement('a');
  l.href=u;l.download=name;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast('Descargado '+name)}
const stTxt=s=>s.status==='wishlist'?'Deseado':s.status==='sold'?'Vendido':s.built?'Montado':s.building?'En proceso':'Por montar';
const dStr=new Date().toISOString().slice(0,10);
function expColl(){
  const l=sets.filter(s=>s.status==='owned').sort((x,y)=>(x.name||'').localeCompare(y.name||'','es'));
  if(!l.length){toast('No hay sets en tu colección');return}
  csvDown(`coleccion-${dStr}.csv`,['Número','Nombre','Tema','Año','Piezas','Minifiguras','PVP','Pagado','Ahorro','Fecha de compra','Tienda','Estado','Regalo','Scalper','Notas'],
    l.map(s=>[s.setNumber,s.name,s.theme,s.year,s.pieces,s.minifigs,csvN(s.rrp),csvN(s.paid),csvN(s.rrp!=null&&s.paid!=null?+(s.rrp-s.paid).toFixed(2):null),s.purchaseDate,s.store,stTxt(s),s.gift?'Sí':'',s.resale?'Sí':'',s.notes]))}
function expSales(){
  const l=sets.filter(s=>s.status==='sold'||(s.status==='owned'&&s.resale)).sort((x,y)=>(x.name||'').localeCompare(y.name||'','es'));
  if(!l.length){toast('No hay ventas ni sets para vender');return}
  csvDown(`ventas-${dStr}.csv`,['Número','Nombre','Estado','Pagado','Precio de venta','Precio previsto','Beneficio','Beneficio previsto','Fecha de venta'],
    l.map(s=>{const sold=s.status==='sold',b=sold&&s.salePrice!=null&&s.paid!=null?+(s.salePrice-s.paid).toFixed(2):null,base=s.paid!=null?s.paid:s.rrp,pb=!sold&&s.potPrice!=null&&base!=null?+(s.potPrice-base).toFixed(2):null;
      return [s.setNumber,s.name,sold?'Vendido':'Para vender',csvN(s.paid),csvN(sold?s.salePrice:null),csvN(sold?null:s.potPrice),csvN(b),csvN(pb),sold?s.saleDate:'']}))}
async function expParts(){
  const c=await ptLoad(),m=new Map();let n=0;
  for(const s of sets){if(s.status!=='owned')continue;const d=c.get(snKey(s));if(!d)continue;n++;
    for(const p of d.p){const k=p[0]+'|'+p[2];let o=m.get(k);if(!o){o={ref:p[0],name:p[1],cid:p[2],cn:p[3],q:0,free:0,sets:new Set()};m.set(k,o)}
      o.q+=p[5];if(!s.built&&!s.building)o.free+=p[5];o.sets.add(s.name||s.setNumber)}}
  if(!n){toast('Aún no hay piezas cargadas. Cárgalas en Cajón');return}
  const l=[...m.values()].sort((x,y)=>String(x.ref).localeCompare(String(y.ref),'es',{numeric:true})||String(x.cid).localeCompare(String(y.cid),'es',{numeric:true}));
  csvDown(`piezas-que-tengo-${dStr}.csv`,['Pieza','Nombre','Color (id)','Color','Cantidad total','En sets sin montar','Sets'],l.map(o=>[o.ref,o.name,o.cid,o.cn,o.q,o.free,[...o.sets].join(' | ')]))}
$('x-coll').addEventListener('click',expColl);$('x-sales').addEventListener('click',expSales);$('x-parts').addEventListener('click',expParts);
/* completar PVP vacíos con Brickset (precio de Alemania, en euros) */
$('x-rrp').addEventListener('click',async()=>{
  const k=keys().bs,out=$('x-rrp-msg');if(!k){out.textContent='Hace falta la clave de Brickset (Avanzado).';return}
  const todo=sets.filter(s=>s.rrp==null&&s.setNumber&&s.status!=='sold');
  if(!todo.length){out.textContent='Todos tus sets ya tienen PVP.';return}
  $('x-rrp').disabled=true;let ok=0,none=0,err=null;
  try{
    for(let i=0;i<todo.length;i+=20){const part=todo.slice(i,i+20),want=part.map(s=>/-\d+$/.test(s.setNumber)?s.setNumber:s.setNumber+'-1');
      out.textContent=`Consultando ${Math.min(i+20,todo.length)} de ${todo.length}…`;
      const res=await bsQuery({setNumber:want.join(',')},k),by=new Map(res.map(x=>[x.setNumber.replace(/-1$/,''),x]));
      for(const s of part){const x=by.get(s.setNumber.replace(/-1$/,''));
        if(x&&x.rrp!=null){try{await fb.setDoc(fb.doc(db,'bricks',s.id),{rrp:x.rrp,updatedAt:fb.serverTimestamp()},{merge:true});ok++}catch{err='guardar'}}else none++}}
  }catch(e){err=e.status===401?'La clave de Brickset no es válida.':'No se pudo consultar Brickset.'}
  $('x-rrp').disabled=false;
  out.textContent=(err&&err!=='guardar'?err+' ':'')+`PVP completado en ${ok} set${ok===1?'':'s'}${none?`; ${none} sin precio en euros en Brickset (escríbelo a mano)`:''}.`});

/* ---------- piezas destacadas: la más popular y la más rara de tu colección (nº de sets en Rebrickable) ---------- */
const RAR_K='bricks-rarity',RAR={p:null,run:false};
const rarGet=()=>{try{const j=JSON.parse(LS.get(RAR_K,'{}'))||{};return{n:j.n||{},d:j.d||{}}}catch{return{n:{},d:{}}}};
async function ownedAgg(){
  const c=await ptLoad(),m=new Map();
  for(const s of sets){if(s.status!=='owned')continue;const d=c.get(snKey(s));if(!d)continue;
    for(const p of d.p){const k=p[0]+'|'+p[2];let o=m.get(k);if(!o){o={k,part:String(p[0]),name:p[1],col:String(p[2]),cn:p[3],rgb:p[4],img:p[6]||'',q:0};m.set(k,o)}o.q+=p[5];if(!o.img&&p[6])o.img=p[6]}}
  return m}
async function rarCalc(){
  const k=keys().rb;if(!k||RAR.run)return;RAR.run=true;
  const m=await ownedAgg(),R=rarGet(),want=new Set([...m.values()].map(o=>o.part)),todo=[...want].filter(p=>!R.d[p]);
  RAR.p={n:0,t:todo.length};renderRare();let fail=0;
  for(const part of todo){
    try{const j=await rbGet(`/lego/parts/${encodeURIComponent(part)}/colors/?page_size=1000`,k);
      for(const x of j.results||[]){const key=part+'|'+x.color_id;if(m.has(key))R.n[key]=x.num_sets}
      R.d[part]=1}
    catch(e){if(e&&e.status===404)R.d[part]=1;else{fail++;if(fail>=3)break}}
    RAR.p.n++;if(RAR.p.n%10===0){LS.set(RAR_K,JSON.stringify(R));renderRare()}}
  LS.set(RAR_K,JSON.stringify(R));RAR.p=null;RAR.run=false;renderRare();if(fail)toast('Cálculo detenido: puedes reanudarlo')}
async function renderRare(){
  const box=$('home-rare');if(!box||curTab!=='home')return;
  const m=await ownedAgg();if(!m.size){box.classList.add('hidden');return}
  const R=rarGet(),all=[...m.values()],withN=all.filter(o=>R.n[o.k]!=null);
  const most=[...all].sort((x,y)=>y.q-x.q)[0];
  const card=(t,o,why)=>`<div class="rcard"><div class="rt">${t}</div><div class="rim">${o.img?`<img src="${esc(o.img.replace(/^http:\/\//i,'https://'))}" alt="" loading="lazy">`:''}</div><b>${esc(o.part)}</b><div class="rn">${esc(o.name||'')}</div><div class="pcol"><i class="sw" style="background:${/^[0-9a-f]{6}$/i.test(o.rgb||'')?'#'+o.rgb:'#ddd'}"></i>${esc(o.cn||'Color '+o.col)}</div><div class="rq">Tienes ${num(o.q)} unidad${o.q===1?'':'es'}</div><small>${why}</small></div>`;
  let body='';
  if(withN.length){
    const pop=[...withN].sort((x,y)=>R.n[y.k]-R.n[x.k]||y.q-x.q)[0],rare=[...withN].sort((x,y)=>R.n[x.k]-R.n[y.k]||y.q-x.q)[0];
    body=`<div class="rpair">${card('Más popular',pop,`Aparece en ${num(R.n[pop.k])} sets`)}${card('Más rara',rare,`Aparece en ${num(R.n[rare.k])} set${R.n[rare.k]===1?'':'s'}`)}</div>`;
    if(withN.length<all.length)body+=`<div class="note">Calculado con ${num(withN.length)} de ${num(all.length)} piezas (referencia y color).</div>`}
  const k=keys().rb;
  const act=RAR.p?`<div class="note">Calculando… ${RAR.p.n} de ${RAR.p.t} referencias. Tarda un poco: hay un límite de peticiones.</div>`
    :(!k?'<div class="note">Para ver la más popular y la más rara hace falta la clave de Rebrickable (Ajustes, Avanzado).</div>'
    :(withN.length<all.length?`<div class="row" style="margin-top:8px"><button class="btn sec small" data-rarcalc="1">${withN.length?'Seguir calculando':'Calcular popular y rara'}</button></div>`:''));
  box.classList.remove('hidden');
  box.innerHTML=`<h3>Piezas destacadas</h3>${body}<div class="kv"><span>La que más tienes</span><b>${esc(most.part)} · ${esc(most.cn||'')} · ×${num(most.q)}</b></div>${act}`}
$('home-rare').addEventListener('click',e=>{if(e.target.closest('[data-rarcalc]'))rarCalc()});
