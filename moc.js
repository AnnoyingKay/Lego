/* Creación: lectores de archivos (.io de Studio, CSV de Rebrickable, XML de BrickLink) y comparación con el cajón */

/* ---------- ZIP mínimo con contraseña clásica (ZipCrypto), como usa Studio ---------- */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc1=(c,b)=>(CRC[(c^b)&255]^(c>>>8))>>>0;
function zkUpd(k,b){k[0]=crc1(k[0],b);k[1]=(Math.imul((k[1]+(k[0]&255))|0,134775813)+1)>>>0;k[2]=crc1(k[2],k[1]>>>24)}
function zkInit(pw){const k=[305419896,591751049,878082192];for(let i=0;i<pw.length;i++)zkUpd(k,pw.charCodeAt(i));return k}
function zkDec(k,b){const t=(k[2]|2)&0xffff,c=b^(((t*(t^1))>>>8)&255);zkUpd(k,c);return c}
async function inflate(u8){
  const s=new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(s).arrayBuffer())}

/* Devuelve {nombre: () => Promise<Uint8Array>} */
export function readZip(buf,password='soho0909'){
  const u=buf instanceof Uint8Array?buf:new Uint8Array(buf),dv=new DataView(u.buffer,u.byteOffset,u.byteLength);
  let e=-1;for(let i=u.length-22;i>=Math.max(0,u.length-70000);i--)if(dv.getUint32(i,true)===0x06054b50){e=i;break}
  if(e<0)throw new Error('zip');
  const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const out={};
  for(let i=0;i<n;i++){
    if(dv.getUint32(p,true)!==0x02014b50)throw new Error('zip');
    const flags=dv.getUint16(p+8,true),method=dv.getUint16(p+10,true),time=dv.getUint16(p+12,true),crc=dv.getUint32(p+16,true),cs=dv.getUint32(p+20,true),
      nl=dv.getUint16(p+28,true),el=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),off=dv.getUint32(p+42,true),
      name=new TextDecoder().decode(u.subarray(p+46,p+46+nl));
    p+=46+nl+el+cl;
    out[name]=async()=>{
      const ln=dv.getUint16(off+26,true),le=dv.getUint16(off+28,true);let d=u.subarray(off+30+ln+le,off+30+ln+le+cs);
      if(method===99)throw new Error('aes');
      if(flags&1){
        const k=zkInit(password),h=new Uint8Array(12);
        for(let j=0;j<12;j++)h[j]=zkDec(k,d[j]);
        if(h[11]!==((flags&8)?(time>>>8):(crc>>>24))&&h[11]!==(crc>>>24))throw new Error('clave');
        const r=new Uint8Array(d.length-12);for(let j=12;j<d.length;j++)r[j-12]=zkDec(k,d[j]);d=r}
      return method===0?d:method===8?await inflate(d):(()=>{throw new Error('zip')})()}}
  return out}

/* ---------- LDraw (model.ldr, con submodelos MPD) ---------- */
export function parseLdr(text){
  const files=new Map(),flex=new Map();let cur=null,first=null;
  for(const raw of text.replace(/^﻿/,'').split(/\r?\n/)){
    const l=raw.trim();if(!l)continue;
    const m=/^0\s+FILE\s+(.+)$/i.exec(l);
    if(m){cur=m[1].trim().toLowerCase();if(!files.has(cur))files.set(cur,[]);first=first||cur;continue}
    if(!cur){cur='main';files.set(cur,[]);first=cur}
    const fb=/^0\s+FlexibleBrick:\s*(\S+)/i.exec(l);if(fb)flex.set(cur,fb[1].replace(/\.dat$/i,'').toLowerCase())
    if(l[0]==='1'&&/^1\s/.test(l)){const t=l.split(/\s+/);if(t.length>=15)files.get(cur).push([t[1],t.slice(14).join(' ')])}}
  const counts=new Map(),unknown=new Set();
  const walk=(name,pc,mult,depth)=>{
    if(depth>12)return;
    for(const [c,ref] of files.get(name)||[]){
      const col=c==='16'?pc:c,key=ref.toLowerCase();
      const sub=files.has(key)?key:files.has(key.replace(/\.(ldr|mpd|dat)$/,''))?key.replace(/\.(ldr|mpd|dat)$/,''):files.has(key+'.ldr')?key+'.ldr':'';
      if(sub&&sub!==name&&!flex.has(sub)){walk(sub,col,mult,depth+1);continue}
      /* una pieza flexible (manguera, cable) se guarda como submodelo, pero cuenta como una sola pieza */
      const part=sub&&flex.has(sub)?flex.get(sub):ref.replace(/\.dat$/i,'').toLowerCase();
      if(/^0x/i.test(col)||+col>=0x2000000)unknown.add(col);
      const k=part+'|'+col;counts.set(k,(counts.get(k)||0)+mult)}};
  if(first)walk(first,'0',1,0);
  return{rows:[...counts].map(([k,q])=>{const [part,col]=k.split('|');return{part,col,qty:q}}),kind:'ldraw',unknown:[...unknown]}}

export async function parseIo(buf){
  const z=readZip(buf);
  const name=['model.ldr','modelv2.ldr','model2.ldr'].find(n=>z[n]);
  if(!name)throw new Error('sin-modelo');
  const r=parseLdr(new TextDecoder().decode(await z[name]()));
  let total=null;try{total=JSON.parse(new TextDecoder().decode(await z['.info']())).total_parts}catch{}
  return{...r,total}}

/* ---------- CSV / texto ---------- */
export function parseCsv(text){
  const lines=text.replace(/^﻿/,'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean);if(!lines.length)return{rows:[],kind:'rb'};
  const d=lines[0].includes('\t')?'\t':lines[0].includes(';')&&!lines[0].includes(',')?';':',';
  const cut=l=>l.split(d).map(x=>x.trim().replace(/^"|"$/g,''));
  const h=cut(lines[0]).map(x=>x.toLowerCase().replace(/[^a-z]/g,'')),hasH=h.some(x=>/^(part|quantity|qty|color|colour|ldrawid|blitemno|ldrawcolorid|blcolorid)$/.test(x));
  const ix=(...ns)=>h.findIndex(x=>ns.includes(x));
  let ip=0,ic=1,iq=2,is=-1,kind='rb';
  if(hasH){
    ip=ix('part','ldrawid','blitemno');ic=ix('color','colour','ldrawcolorid','blcolorid');iq=ix('quantity','qty');is=ix('isspare');
    if(ix('color','colour')<0){kind=ix('ldrawcolorid')>=0?'ldraw':'bl'}
    if(ip<0||ic<0||iq<0)throw new Error('columnas')}
  const rows=[];
  for(const l of hasH?lines.slice(1):lines){
    const t=cut(l);if(t.length<3)continue;
    if(is>=0&&/^true$/i.test(t[is]))continue;
    const q=parseInt(t[iq],10);if(!(q>0)||!t[ip])continue;
    rows.push({part:t[ip].toLowerCase(),col:String(parseInt(t[ic],10)||0),qty:q})}
  return{rows,kind}}

/* ---------- XML de lista de deseos de BrickLink ---------- */
export function parseBlXml(text){
  const rows=[];
  for(const m of text.matchAll(/<ITEM>([\s\S]*?)<\/ITEM>/gi)){
    const g=t=>{const x=new RegExp('<'+t+'>\\s*([^<]*?)\\s*</'+t+'>','i').exec(m[1]);return x?x[1]:''};
    if((g('ITEMTYPE')||'P').toUpperCase()!=='P')continue;
    const q=parseInt(g('MINQTY')||'1',10)||1,part=g('ITEMID');
    if(part)rows.push({part:part.toLowerCase(),col:String(parseInt(g('COLOR'),10)||0),qty:q})}
  return{rows,kind:'bl'}}

/* Detecta el tipo por nombre y contenido */
export async function parseAny(name,buf){
  if(/\.io$/i.test(name))return{...(await parseIo(buf)),src:'Studio (.io)'};
  const t=new TextDecoder().decode(buf);
  if(/^\s*(<\?xml|<INVENTORY)/i.test(t)||/<ITEM>/i.test(t))return{...parseBlXml(t),src:'BrickLink (XML)'};
  return{...parseCsv(t),src:/\.tsv$/i.test(name)?'TSV':'CSV'}}

/* ---------- comparación ---------- */
/* need: [{part,col,qty}] · pool: [{part,col,qty,set}] */
export function compare(need,pool,mode){
  const P=new Map(),B=new Map();
  for(const e of pool){const o={...e,left:e.qty},k=e.part+'|'+e.col;
    if(!P.has(k))P.set(k,[]);P.get(k).push(o);if(!B.has(e.part))B.set(e.part,[]);B.get(e.part).push(o)}
  const takes=[],left=need.map(x=>({...x,rem:x.qty}));
  const take=(list,r,exact)=>{
    for(const o of [...(list||[])].sort((a,b)=>b.left-a.left)){
      if(r.rem<=0)break;const t=Math.min(o.left,r.rem);if(t<=0)continue;
      o.left-=t;r.rem-=t;takes.push({set:o.set,part:r.part,col:o.col,want:r.col,qty:t,exact})}};
  for(const r of left)take(P.get(r.part+'|'+r.col),r,true);
  if(mode==='loose')for(const r of left)if(r.rem>0)take(B.get(r.part),r,false);
  const total=need.reduce((n,x)=>n+x.qty,0),miss=left.filter(r=>r.rem>0).map(r=>({part:r.part,col:r.col,qty:r.rem})),
    got=total-miss.reduce((n,x)=>n+x.qty,0);
  return{total,got,pct:total?got/total*100:0,missing:miss,takes,types:need.length,subs:takes.filter(t=>!t.exact).reduce((n,t)=>n+t.qty,0)}}

/* Agrupa líneas repetidas (misma pieza y color) */
export function mergeRows(rows){const m=new Map();for(const r of rows){const k=r.part+'|'+r.col;m.set(k,(m.get(k)||0)+r.qty)}return[...m].map(([k,q])=>{const [part,col]=k.split('|');return{part,col,qty:q}})}
