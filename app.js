import {firebaseConfig} from './firebase-config.js';
import {THEMES,ORDER,FABS,SHELF,artSvg,patternUri} from './themes.js';

const VERSION='1.12.0', VERSION_DATE='2026-11-25';
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
  curTab=t;['home','lib','wish','parts','profile','settings'].forEach(x=>$('v-'+x).classList.toggle('hidden',x!==t));
  document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));
  $('fab').classList.toggle('hidden',!(t==='home'||t==='lib'||t==='wish'));
  if(t==='parts')renderParts();if(t==='profile')syncProfile();if(t==='settings')settingsInit();
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
  $('home-money').innerHTML=`<h3>Cuentas</h3>
   <div class="kv"><span>Piezas en tu colección</span><b>${num(pz(c))}</b></div>
   <div class="kv"><span>Minifiguras en tu colección</span><b>${num(sum(c,s=>s.minifigs))}</b></div>
   <div class="kv"><span>Total pagado</span><b>${money(sum(money_,s=>s.paid))}</b></div>
   <div class="kv"><span>Total PVP</span><b>${money(sum(money_,s=>s.rrp))}</b></div>
   <div class="kv"><span>Ahorrado frente al PVP</span><b>${money(ahorro)}</b></div>
   <div class="kv"><span>Beneficio de ventas</span><b>${money(ben)}</b></div>${potN?`<div class="kv"><span>Beneficio previsto (scalper)</span><b>${money(potB)}</b></div>`:''}
   <div class="kv"><span>Deseados</span><b>${sets.filter(s=>s.status==='wishlist').length}</b></div>`;
  const rec=sets.filter(s=>s.status!=='wishlist').sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).slice(0,8);
  $('home-recent').classList.toggle('hidden',!rec.length);
  $('recent').innerHTML=rec.map(s=>`<button class="th it" style="padding:0;border:0;background:none;display:block" data-id="${s.id}">${phHTML(s)}</button>`).join('');
}
const copiesN=s=>{if(s.status!=='owned')return 0;const n=(s.setNumber||'').trim().replace(/-1$/,'');return n?sets.filter(x=>x.status==='owned'&&(x.setNumber||'').trim().replace(/-1$/,'')===n).length:0};
const GIFT='<svg viewBox="0 0 24 24" width="{S}" height="{S}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><rect x="3" y="9" width="18" height="4" rx="1"/><path d="M5 13v7h14v-7M12 9v11M12 9S9 8.500 8.500 6.500 10 4 12 9c2-5 3.500-4.500 3.500-2.500S12 9 12 9z"/></svg>';
const phHTML=(s,photoFirst,ov)=>{const src=photoFirst?(s.photo||s.imageUrl):(s.imageUrl||s.photo),own=!!src&&src===s.photo;
  return `<div class="ph sq">${src?`<img src="${esc(src)}" ${own?'class="cover" ':'loading="lazy" referrerpolicy="no-referrer" '}alt="" data-hide="1">`:''}${ov&&s.status==='owned'&&!s.built?(s.building?'<span class="ov tr box prog" role="img" aria-label="En proceso" title="En proceso"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><rect x="3" y="11" width="18" height="9" rx="1.5"/><path d="M7 11V8m5 3V8m5 3V8"/><path d="M5 5h14" stroke-dasharray="2 3"/></svg></span>':'<span class="ov tr box" role="img" aria-label="Por montar" title="Por montar"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/></svg></span>'):''}${ov&&s.gift?`<span class="ov tl gift" role="img" aria-label="Para regalar" title="Para regalar">${GIFT.replace(/\{S\}/g,24)}</span>`:''}${ov&&s.pieces?`<span class="ov bc">${num(s.pieces)} pzs${copiesN(s)>1?' · ×'+copiesN(s):''}</span>`:''}</div>`};
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
    body.innerHTML=[...g].map(([k,l])=>{const im=l.map(s=>s.photo||s.imageUrl).find(Boolean);
      return `<div class="thh"><span class="tha">${im?`<img src="${esc(im)}" alt="" referrerpolicy="no-referrer" data-hide="1">`:''}</span><b>${esc(k||'Sin tema')}</b><span class="chip">${l.length} set${l.length===1?'':'s'} · ${num(l.reduce((n,s)=>n+(s.pieces||0),0))} pzs</span></div>`+items(l)}).join('');
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
function bsNorm(s){return{setNumber:(s.numberVariant>1?`${s.number}-${s.numberVariant}`:String(s.number)),name:s.name,theme:s.theme||'',subtheme:s.subtheme||'',year:s.year??null,pieces:s.pieces??null,minifigs:s.minifigs??null,rrp:s.LEGOCom?.DE?.retailPrice??null,imageUrl:s.image?.imageURL||s.image?.thumbnailURL||''}}
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
  r=await enrich({...r},keys().rb);fillFrom(r);$('f-msg').textContent=r.rrp==null?'Datos rellenados. Este set no tiene PVP en la fuente: escríbelo a mano.':'Datos rellenados. Revísalos antes de guardar.';
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
const PT={scope:'owned',theme:'',set:'',sort:'qty',q:'',lim:150,busy:false,stop:false,cache:null};
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
async function renderParts(){
  await ptLoad();ptSelects();
  const ss=ptSets(),have=ss.filter(s=>PT.cache.has(snKey(s))),miss=ss.length-have.length;
  const agg=new Map();
  for(const s of have){for(const p of PT.cache.get(snKey(s)).p){const k=p[0]+'|'+p[2],o=agg.get(k)||{ref:p[0],name:p[1],cid:p[2],col:p[3],rgb:p[4],img:p[6],q:0};o.q+=p[5];agg.set(k,o)}}
  let rows=[...agg.values()];const q=PT.q.trim().toLowerCase();
  if(q)rows=rows.filter(o=>`${o.ref} ${o.name} ${o.col}`.toLowerCase().includes(q));
  rows.sort((x,y)=>PT.sort==='ref'?x.ref.localeCompare(y.ref,'es',{numeric:true}):PT.sort==='col'?(x.col.localeCompare(y.col,'es')||y.q-x.q):y.q-x.q);
  const tot=rows.reduce((n,o)=>n+o.q,0);
  $('pt-stat').innerHTML=`<span class="chip">${ss.length} set${ss.length===1?'':'s'}</span><span class="chip">${have.length} con piezas</span>${miss?`<span class="chip warn">${miss} sin cargar</span>`:''}<span class="chip">${num(rows.length)} tipos</span><span class="chip">${num(tot)} piezas</span>`;
  $('pt-load').textContent=PT.busy?'Parar':miss?`Cargar piezas (${miss})`:'Actualizar piezas';
  const vis=rows.slice(0,PT.lim);
  $('pt-list').innerHTML=!ss.length?'<div class="empty">No hay sets con este filtro.</div>':!rows.length?`<div class="empty">${miss?'Pulsa «Cargar piezas» para traer el inventario de estos sets.':'Sin resultados.'}</div>`:
    vis.map(o=>`<div class="prow"><span class="pimg">${o.img?`<img src="${esc(o.img)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-hide="1">`:''}</span><div class="pt"><b>${esc(o.ref)}</b> ${esc(o.name)}<div class="pcol"><i class="sw" style="background:${/^[0-9a-f]{6}$/i.test(o.rgb)?'#'+o.rgb:'#ddd'}"></i>${esc(o.col)}</div></div><b class="pq">×${num(o.q)}</b></div>`).join('')+(rows.length>vis.length?`<button class="btn sec small" id="pt-more" style="margin:10px auto;display:block">Mostrar más (${rows.length-vis.length})</button>`:'');
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
$('pt-list').addEventListener('click',e=>{if(e.target.id==='pt-more'){PT.lim+=150;renderParts()}});
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
    `<div class="list">${a.map(s=>`<div class="wrow"><button class="it" data-id="${s.id}">${phHTML(s)}<div class="tx"><b>${esc(s.name||s.setNumber)}</b><span>${esc(s.setNumber||'')} · ${esc(s.theme||'—')} · ${s.year||'—'} · ${num(s.pieces)} pzs</span><span>PVP ${money(s.rrp)} ${s.gift?'<span class="badge">Regalo</span>':''}${s.resale?'<span class="badge">Scalper</span>':''}${potTxt(s)}</span></div></button><button class="btn sec small" data-own="${s.id}">Ya lo tengo</button></div>`).join('')}</div>`;
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
