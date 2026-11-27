/* Playtime! 4 minijuegos con ladrillos. Prueba: los récords se guardan solo en este dispositivo. */
const COL=['#D01012','#1F6FD1','#F5C400','#2E9E4F','#F27C1A','#8E44AD','#00A3A3'];
const $=id=>document.getElementById(id);
const BK='bricks-play-best';
const bestAll=()=>{try{return JSON.parse(localStorage.getItem(BK)||'{}')}catch{return{}}};
const setBest=(k,v)=>{const b=bestAll();if(v>(b[k]||0)){b[k]=v;try{localStorage.setItem(BK,JSON.stringify(b))}catch{}return true}return false};
const rr=(c,x,y,w,h,r)=>{c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()};
function cell(c,x,y,s,col,a=1){c.globalAlpha=a;c.fillStyle=col;rr(c,x+1,y+1,s-2,s-2,3);c.fill();
  c.fillStyle='rgba(255,255,255,.3)';c.fillRect(x+3,y+3,s-6,3);c.fillStyle='rgba(0,0,0,.2)';c.fillRect(x+3,y+s-5,s-6,3);
  c.beginPath();c.arc(x+s/2,y+s/2,s*.24,0,7);c.fillStyle='rgba(255,255,255,.28)';c.fill();c.strokeStyle='rgba(0,0,0,.2)';c.lineWidth=1;c.stroke();c.globalAlpha=1}
function brick(c,x,y,w,h,col){c.fillStyle=col;rr(c,x,y,w,h,3);c.fill();c.fillStyle='rgba(255,255,255,.3)';c.fillRect(x+2,y+2,w-4,3);c.fillStyle='rgba(0,0,0,.2)';c.fillRect(x+2,y+h-4,w-4,3);
  const n=Math.max(1,Math.round(w/h));const sw=w/n;for(let i=0;i<n;i++){c.beginPath();c.arc(x+sw*(i+.5),y+h/2,Math.min(sw,h)*.24,0,7);c.fillStyle='rgba(255,255,255,.28)';c.fill();c.strokeStyle='rgba(0,0,0,.2)';c.lineWidth=1;c.stroke()}}

/* lienzo con tamaño lógico fijo, escalado al espacio libre */
function mkCanvas(root,lw,lh,reserve=170){
  const cv=document.createElement('canvas');cv.className='plcv';root.appendChild(cv);
  const fit=()=>{const dpr=Math.min(2,window.devicePixelRatio||1),aw=Math.min(window.innerWidth-24,460),ah=Math.max(240,window.innerHeight-reserve),css=Math.min(aw/lw,ah/lh),k=css*dpr;
    cv.style.width=lw*css+'px';cv.style.height=lh*css+'px';cv.width=Math.round(lw*k);cv.height=Math.round(lh*k);cv.getContext('2d').setTransform(k,0,0,k,0,0)};
  fit();window.addEventListener('resize',fit);
  const pt=e=>{const r=cv.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*lw,y:(e.clientY-r.top)/r.height*lh}};
  return{cv,ctx:cv.getContext('2d'),pt,off:()=>window.removeEventListener('resize',fit)}}
function btns(root,list){const d=document.createElement('div');d.className='plbtns';d.innerHTML=list.map(b=>`<button type="button" data-a="${b[0]}" aria-label="${b[2]||b[1]}">${b[1]}</button>`).join('');root.appendChild(d);return d}
function endCard(root,html,again,label='Otra vez'){const d=document.createElement('div');d.className='plend';d.innerHTML=`<div>${html}<button type="button" class="plagain">${label}</button></div>`;root.appendChild(d);d.querySelector('.plagain').addEventListener('click',()=>{d.remove();again()})}
const rot=cells=>{const r=cells.map(([x,y])=>[-y,x]),mx=Math.min(...r.map(c=>c[0])),my=Math.min(...r.map(c=>c[1]));return r.map(([x,y])=>[x-mx,y-my])};
const dim=cells=>[Math.max(...cells.map(c=>c[0]))+1,Math.max(...cells.map(c=>c[1]))+1];

/* ============ 1. Brick Drop ============ */
const SH=[[[0,0],[1,0],[2,0],[3,0]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[0,1],[1,1],[2,1]],[[2,0],[0,1],[1,1],[2,1]],[[1,0],[0,1],[1,1],[2,1]],[[1,0],[2,0],[0,1],[1,1]],[[0,0],[1,0],[1,1],[2,1]],[[0,0],[1,0]],[[0,0],[1,0],[2,0]]];
const SHW=[2,2,2,2,2,2,2,1,1];
function gDrop(root,top){
  const W=10,H=16,S=26,LW=W*S,LH=H*S,C=mkCanvas(root,LW,LH,250),{ctx}=C;
  const info=document.createElement('div');info.className='plinfo';info.innerHTML='<span id="d-sc">0</span> puntos · nivel <span id="d-lv">1</span> · filas <span id="d-ln">0</span> · siguiente <canvas id="d-nx" width="60" height="30"></canvas>';root.insertBefore(info,C.cv);
  const nx=info.querySelector('#d-nx').getContext('2d');
  let grid,cur,next,score,lines,level,acc,over,raf,last,fx=[],paused=false;
  const pick=()=>{let t=Math.random()*SHW.reduce((a,b)=>a+b,0),i=0;for(;i<SHW.length;i++){t-=SHW[i];if(t<0)break}i=Math.min(i,SH.length-1);return{c:SH[i].map(a=>a.slice()),col:COL[i%COL.length]}};
  const hit=(c,x,y)=>c.some(([cx,cy])=>{const gx=x+cx,gy=y+cy;return gx<0||gx>=W||gy>=H||(gy>=0&&grid[gy][gx])});
  const spawn=()=>{cur=next||pick();next=pick();const [w]=dim(cur.c);cur.x=Math.floor((W-w)/2);cur.y=-1;if(hit(cur.c,cur.x,0)){finish();return}
    nx.clearRect(0,0,60,30);const [nw,nh]=dim(next.c),s=Math.min(14,28/nh,56/nw);next.c.forEach(([x,y])=>cell(nx,2+x*s,1+y*s,s,next.col))};
  const lock=()=>{cur.c.forEach(([cx,cy])=>{const gy=cur.y+cy;if(gy>=0)grid[gy][cur.x+cx]=cur.col});
    const full=[];grid.forEach((r,i)=>{if(r.every(Boolean))full.push(i)});
    if(full.length){fx.push({rows:full,t:0,cols:full.map(i=>grid[i].slice())});grid=grid.filter((_,i)=>!full.includes(i));while(grid.length<H)grid.unshift(Array(W).fill(0));
      lines+=full.length;score+=[0,100,300,500,800][Math.min(4,full.length)]*level;level=Math.floor(lines/8)+1;upd()}
    spawn()};
  const upd=()=>{info.querySelector('#d-sc').textContent=score;info.querySelector('#d-lv').textContent=level;info.querySelector('#d-ln').textContent=lines};
  const mv=d=>{if(over||paused)return;if(!hit(cur.c,cur.x+d,cur.y))cur.x+=d};
  const rt=()=>{if(over||paused)return;const r=rot(cur.c);for(const k of[0,-1,1,-2,2])if(!hit(r,cur.x+k,cur.y)){cur.c=r;cur.x+=k;return}};
  const down=()=>{if(over||paused)return false;if(!hit(cur.c,cur.x,cur.y+1)){cur.y++;return true}lock();return false};
  const hard=()=>{if(over||paused)return;let n=0;while(!hit(cur.c,cur.x,cur.y+1)){cur.y++;n++}score+=n*2;upd();lock()};
  function finish(){over=true;cancelAnimationFrame(raf);const nb=setBest('drop',score);endCard(root,`<h3>Fin de la partida</h3><p><b>${score}</b> puntos · ${lines} filas${nb?'<br>¡Nuevo récord!':''}</p>`,start)}
  function draw(){ctx.fillStyle='#1f2430';ctx.fillRect(0,0,LW,LH);ctx.fillStyle='rgba(255,255,255,.06)';for(let x=0;x<W;x++)for(let y=0;y<H;y++)ctx.fillRect(x*S+S/2-1,y*S+S/2-1,2,2);
    grid.forEach((r,y)=>r.forEach((c,x)=>{if(c)cell(ctx,x*S,y*S,S,c)}));
    if(!over){let gy=cur.y;while(!hit(cur.c,cur.x,gy+1))gy++;cur.c.forEach(([cx,cy])=>cell(ctx,(cur.x+cx)*S,(gy+cy)*S,S,cur.col,.22));cur.c.forEach(([cx,cy])=>{if(cur.y+cy>=0)cell(ctx,(cur.x+cx)*S,(cur.y+cy)*S,S,cur.col)})}
    fx.forEach(f=>{ctx.fillStyle=`rgba(255,255,255,${Math.max(0,.8-f.t/260)})`;f.rows.forEach(r=>ctx.fillRect(0,r*S,LW,S))})}
  function loop(t){if(over)return;const dt=Math.min(60,t-(last||t));last=t;if(!paused){acc+=dt;const iv=Math.max(110,700-(level-1)*65);while(acc>=iv){acc-=iv;down()}}fx.forEach(f=>f.t+=dt);fx=fx.filter(f=>f.t<260);draw();raf=requestAnimationFrame(loop)}
  function start(){grid=Array.from({length:H},()=>Array(W).fill(0));score=0;lines=0;level=1;acc=0;over=false;last=0;fx=[];next=null;upd();spawn();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}
  const act={l:()=>mv(-1),r:()=>mv(1),t:rt,d:()=>{if(down())score++;upd()},h:hard};
  const b=btns(root,[['l','◀','Izquierda'],['t','⟳','Girar'],['r','▶','Derecha'],['d','▼','Bajar'],['h','⤓','Soltar']]);
  b.addEventListener('click',e=>{const a=e.target.closest('button');if(a)act[a.dataset.a]()});
  let sx,sy,st,acx=0,moved=false,downs=0;
  C.cv.addEventListener('pointerdown',e=>{const p=C.pt(e);sx=p.x;sy=p.y;st=performance.now();acx=0;moved=false;downs=0;C.cv.setPointerCapture(e.pointerId)});
  C.cv.addEventListener('pointermove',e=>{if(sx==null)return;const p=C.pt(e);const dx=p.x-sx;while(dx-acx>=S){mv(1);acx+=S;moved=true}while(acx-dx>=S){mv(-1);acx-=S;moved=true}
    const dy=p.y-sy;while(dy-downs*S>=S){act.d();downs++;moved=true}});
  C.cv.addEventListener('pointerup',e=>{if(sx==null)return;const p=C.pt(e),dy=p.y-sy,dt=performance.now()-st;if(!moved&&Math.abs(p.x-sx)<8&&Math.abs(dy)<8)rt();else if(dy>S*3&&dt<260)hard();sx=null});
  const key=e=>{const m={ArrowLeft:'l',ArrowRight:'r',ArrowUp:'t',ArrowDown:'d',' ':'h'}[e.key];if(m){e.preventDefault();act[m]()}};document.addEventListener('keydown',key);
  start();
  return{destroy(){over=true;cancelAnimationFrame(raf);document.removeEventListener('keydown',key);C.off()},pause(p){paused=p}}}

/* ============ 3. Encaja la silueta ============ */
const PZ=[[[0,0],[1,0]],[[0,0],[1,0],[2,0]],[[0,0],[1,0],[0,1]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[1,1],[2,1]],[[1,0],[0,1],[1,1],[2,1]],[[1,0],[2,0],[0,1],[1,1]]];
function gFit(root){
  const N=6,S=48,LW=N*S,LH=N*S,C=mkCanvas(root,LW,LH,360),{ctx}=C;
  const info=document.createElement('div');info.className='plinfo';root.insertBefore(info,C.cv);
  const tray=document.createElement('div');tray.className='pltray';root.appendChild(tray);
  const bt=btns(root,[['rot','⟳ Girar','Girar pieza'],['new','↺ Nuevo','Otro puzle'],['clr','Vaciar']]);
  let level=1,sil,pieces,sel,occ,hov=null,done;
  const key=(x,y)=>x+','+y;
  function gen(n){
    for(let tries=0;tries<50;tries++){
      const used=new Set(),ps=[];
      for(let i=0;i<n;i++){let ok=false;
        for(let a=0;a<300&&!ok;a++){let c=PZ[Math.floor(Math.random()*PZ.length)].map(q=>q.slice());for(let r=Math.floor(Math.random()*4);r>0;r--)c=rot(c);
          const [w,h]=dim(c),ox=Math.floor(Math.random()*(N-w+1)),oy=Math.floor(Math.random()*(N-h+1)),cs=c.map(([x,y])=>[x+ox,y+oy]);
          if(cs.some(([x,y])=>used.has(key(x,y))))continue;
          if(used.size&&!cs.some(([x,y])=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>used.has(key(x+dx,y+dy)))))continue;
          cs.forEach(([x,y])=>used.add(key(x,y)));ps.push({c,sol:cs});ok=true}
        if(!ok)break}
      if(ps.length===n)return{used,ps}}
    return null}
  function newPuzzle(){done=false;const g=gen(Math.min(8,3+level))||gen(3);sil=g.used;
    pieces=g.ps.map((q,i)=>({c:q.c.map(a=>a.slice()),sol:q.sol,col:COL[i%COL.length],pos:null,rt:Math.floor(Math.random()*4)}));
    pieces.forEach(p=>{for(let r=0;r<p.rt;r++)p.c=rot(p.c)});sel=0;occ={};drawTray();draw();upd()}
  const upd=()=>{info.innerHTML=`Puzle <b>${level}</b> · piezas colocadas <b>${pieces.filter(p=>p.pos).length}</b> de ${pieces.length}`};
  function drawTray(){tray.innerHTML='';pieces.forEach((p,i)=>{const b=document.createElement('button');b.type='button';b.className='pit'+(i===sel?' on':'')+(p.pos?' used':'');b.dataset.i=i;
    const [w,h]=dim(p.c),s=Math.min(18,44/h,70/w),cv=document.createElement('canvas');cv.width=Math.ceil(w*s)+4;cv.height=Math.ceil(h*s)+4;const c=cv.getContext('2d');p.c.forEach(([x,y])=>cell(c,2+x*s,2+y*s,s,p.col));b.appendChild(cv);tray.appendChild(b)})}
  const anchor=(p,gx,gy)=>{const [w,h]=dim(p.c),ax=Math.floor(w/2),ay=Math.floor(h/2);return p.c.map(([x,y])=>[gx-ax+x,gy-ay+y])};
  const valid=cs=>cs.every(([x,y])=>sil.has(key(x,y))&&!occ[key(x,y)]);
  function draw(){ctx.fillStyle='#e9e6dc';ctx.fillRect(0,0,LW,LH);
    for(let y=0;y<N;y++)for(let x=0;x<N;x++){const k=key(x,y);if(sil.has(k)){ctx.fillStyle='#b9b4a4';rr(ctx,x*S+2,y*S+2,S-4,S-4,5);ctx.fill();ctx.fillStyle='#a8a393';ctx.beginPath();ctx.arc(x*S+S/2,y*S+S/2,S*.14,0,7);ctx.fill()}}
    pieces.forEach(p=>{if(p.pos)p.pos.forEach(([x,y])=>cell(ctx,x*S,y*S,S,p.col))});
    const p=pieces[sel];if(p&&!p.pos&&hov){const cs=anchor(p,hov.x,hov.y),ok=valid(cs);cs.forEach(([x,y])=>{if(x>=0&&y>=0&&x<N&&y<N)cell(ctx,x*S,y*S,S,ok?p.col:'#777',.45)})}}
  C.cv.addEventListener('pointermove',e=>{const q=C.pt(e);hov={x:Math.floor(q.x/S),y:Math.floor(q.y/S)};draw()});
  C.cv.addEventListener('pointerleave',()=>{hov=null;draw()});
  C.cv.addEventListener('pointerdown',e=>{if(done)return;const q=C.pt(e),gx=Math.floor(q.x/S),gy=Math.floor(q.y/S);hov={x:gx,y:gy};
    const k=key(gx,gy);
    if(occ[k]!==undefined){const i=occ[k],p=pieces[i];p.pos.forEach(([x,y])=>delete occ[key(x,y)]);p.pos=null;sel=i;drawTray();draw();upd();return}
    const p=pieces[sel];if(!p||p.pos)return;const cs=anchor(p,gx,gy);
    if(!valid(cs)){C.cv.classList.add('shake');setTimeout(()=>C.cv.classList.remove('shake'),250);return}
    p.pos=cs;cs.forEach(([x,y])=>occ[key(x,y)]=sel);const nxt=pieces.findIndex(q=>!q.pos);sel=nxt<0?sel:nxt;drawTray();draw();upd();
    if(pieces.every(q=>q.pos)){done=true;const nb=setBest('fit',level);endCard(root,`<h3>¡Montado!</h3><p>Puzle ${level} resuelto${nb?'<br>¡Nuevo récord!':''}</p>`,()=>{level++;newPuzzle()},'Siguiente puzle')}});
  tray.addEventListener('click',e=>{const b=e.target.closest('.pit');if(!b||done)return;const i=Number(b.dataset.i),p=pieces[i];if(p.pos)return;if(sel===i){p.c=rot(p.c)}sel=i;drawTray();draw()});
  bt.addEventListener('click',e=>{const a=e.target.closest('button');if(!a||done&&a.dataset.a!=='new')return;
    if(a.dataset.a==='rot'){const p=pieces[sel];if(p&&!p.pos){p.c=rot(p.c);drawTray();draw()}}
    if(a.dataset.a==='new'){done=false;root.querySelectorAll('.plend').forEach(d=>d.remove());newPuzzle()}
    if(a.dataset.a==='clr'){pieces.forEach(p=>p.pos=null);occ={};sel=0;drawTray();draw();upd()}});
  /* solo para pruebas automáticas: window.__qa activa un asistente que dice cómo resolver el puzle */
  if(window.__qa)window.__qa.fit=()=>pieces.map((p,i)=>{const norm=cs=>{const mx=Math.min(...cs.map(c=>c[0])),my=Math.min(...cs.map(c=>c[1]));return cs.map(([x,y])=>x-mx+','+(y-my)).sort().join('|')},t=norm(p.sol);let c=p.c,r=0;while(norm(c)!==t&&r<4){c=rot(c);r++}
    const [w,h]=dim(c),mx=Math.min(...p.sol.map(q=>q[0])),my=Math.min(...p.sol.map(q=>q[1]));return{i,r,cell:[mx+Math.floor(w/2),my+Math.floor(h/2)],placed:!!p.pos,sel:i===sel}});
  newPuzzle();
  return{destroy(){C.off()},pause(){}}}

/* ============ 4. Torre ============ */
function gTower(root){
  const LW=300,LH=440,BH=22,C=mkCanvas(root,LW,LH,190),{ctx}=C;
  const info=document.createElement('div');info.className='plinfo';info.innerHTML='Pisos <b id="t-sc">0</b> <span id="t-msg"></span>';root.insertBefore(info,C.cv);
  let st,raf,last,over,paused=false;
  function start(){st={blocks:[{x:90,w:120,col:COL[0]}],cur:{x:0,w:120,dir:1,col:COL[1]},debris:[],cam:0,score:0};over=false;last=0;info.querySelector('#t-sc').textContent=0;info.querySelector('#t-msg').textContent='';cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}
  function drop(){if(over||paused)return;const t=st.blocks[st.blocks.length-1],c=st.cur,l=Math.max(t.x,c.x),r=Math.min(t.x+t.w,c.x+c.w),ov=r-l;
    if(ov<=0){st.debris.push({x:c.x,y:(st.blocks.length)*BH,w:c.w,vy:0,col:c.col});over=true;st.cur=null;setTimeout(finish,500);return}
    const perfect=Math.abs(c.x-t.x)<5;let nb;
    if(perfect){nb={x:t.x,w:Math.min(120,t.w+(st.perfect>=2?6:0)),col:c.col};st.perfect=(st.perfect||0)+1;info.querySelector('#t-msg').textContent=st.perfect>1?`¡Perfecto ×${st.perfect}!`:'¡Perfecto!'}
    else{nb={x:l,w:ov,col:c.col};st.perfect=0;info.querySelector('#t-msg').textContent='';
      const cx=c.x<t.x?c.x:r,cw=c.w-ov;st.debris.push({x:cx,y:st.blocks.length*BH,w:cw,vy:0,col:c.col})}
    st.blocks.push(nb);st.score++;info.querySelector('#t-sc').textContent=st.score;
    st.cur={x:st.score%2?0:LW-nb.w,w:nb.w,dir:st.score%2?1:-1,col:COL[(st.score+1)%COL.length]}}
  function finish(){cancelAnimationFrame(raf);const nb=setBest('tower',st.score);endCard(root,`<h3>¡Se cayó!</h3><p>Torre de <b>${st.score}</b> pisos${nb?'<br>¡Nuevo récord!':''}</p>`,start)}
  function loop(t){const dt=Math.min(50,t-(last||t))/1000;last=t;if(!paused){
    if(!over&&st.cur){const sp=130+Math.min(st.score,40)*7;st.cur.x+=st.cur.dir*sp*dt;if(st.cur.x<0){st.cur.x=0;st.cur.dir=1}if(st.cur.x+st.cur.w>LW){st.cur.x=LW-st.cur.w;st.cur.dir=-1}}
    st.debris.forEach(d=>{d.vy+=900*dt;d.y-=0;d.fall=(d.fall||0)+d.vy*dt});
    const target=Math.max(0,(st.blocks.length-9)*BH);st.cam+=(target-st.cam)*Math.min(1,dt*5)}
    ctx.fillStyle='#BFE3F2';ctx.fillRect(0,0,LW,LH);const g=ctx.createLinearGradient(0,0,0,LH);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,255,255,.7)');ctx.fillStyle=g;ctx.fillRect(0,0,LW,LH);
    const Y=i=>LH-(i+1)*BH-30+st.cam;
    ctx.fillStyle='#2E9E4F';ctx.fillRect(0,LH-30+st.cam,LW,200);
    st.blocks.forEach((b,i)=>{const y=Y(i);if(y>-BH&&y<LH)brick(ctx,b.x,y,b.w,BH,b.col)});
    if(st.cur){const y=Y(st.blocks.length);brick(ctx,st.cur.x,y,st.cur.w,BH,st.cur.col)}
    st.debris.forEach(d=>{const y=LH-(d.y/BH+1)*BH-30+st.cam+d.fall;if(y<LH+60)brick(ctx,d.x,y,d.w,BH,d.col)});
    raf=requestAnimationFrame(loop)}
  C.cv.addEventListener('pointerdown',e=>{e.preventDefault();drop()});
  const b=btns(root,[['d','⤓ Soltar ladrillo','Soltar ladrillo']]);b.addEventListener('click',drop);
  const key=e=>{if(e.key===' '||e.key==='ArrowDown'){e.preventDefault();drop()}};document.addEventListener('keydown',key);
  start();
  return{destroy(){over=true;cancelAnimationFrame(raf);document.removeEventListener('keydown',key);C.off()},pause(p){paused=p}}}

/* ============ 5. Clasificador de colores ============ */
function gSort(root){
  const LW=300,LH=440,LN=4,LWD=LW/LN,BY=372,C=mkCanvas(root,LW,LH,190),{ctx}=C;
  const info=document.createElement('div');info.className='plinfo';info.innerHTML='Aciertos <b id="s-sc">0</b> · vidas <span id="s-lv">♥♥♥</span>';root.insertBefore(info,C.cv);
  let bricks,score,lives,lastSp,raf,last,over,paused=false,lanes,flash;
  const low=()=>bricks.reduce((m,b)=>!m||b.y>m.y?b:m,null);
  function start(){lanes=COL.slice(0,LN).sort(()=>Math.random()-.5);bricks=[];score=0;lives=3;lastSp=0;over=false;last=0;flash=[];info.querySelector('#s-sc').textContent=0;info.querySelector('#s-lv').textContent='♥♥♥';cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}
  function spawn(t){const lane=Math.floor(Math.random()*LN);bricks.push({lane,x:lane*LWD+LWD/2,y:-30,col:COL[Math.floor(Math.random()*LN)]});lastSp=t}
  const setLane=l=>{if(over||paused)return;const b=low();if(b)b.lane=Math.max(0,Math.min(LN-1,l))};
  function land(b){const ok=lanes[b.lane]===b.col;flash.push({lane:b.lane,t:0,ok});if(ok){score++;info.querySelector('#s-sc').textContent=score}else{lives--;info.querySelector('#s-lv').textContent='♥'.repeat(Math.max(0,lives))+'♡'.repeat(3-Math.max(0,lives));if(lives<=0){over=true;setTimeout(()=>{cancelAnimationFrame(raf);const nb=setBest('sort',score);endCard(root,`<h3>Fin del juego</h3><p><b>${score}</b> aciertos${nb?'<br>¡Nuevo récord!':''}</p>`,start)},350)}}}
  function loop(t){const dt=Math.min(50,t-(last||t))/1000;last=t;
    if(!paused&&!over){const sp=85+Math.min(score,40)*5;
      if(!bricks.length||(score>=8&&bricks.length<3&&t-lastSp>1700))spawn(t);
      bricks.forEach(b=>{b.x+=(b.lane*LWD+LWD/2-b.x)*Math.min(1,dt*16);b.y+=sp*dt});
      for(const b of bricks.filter(b=>b.y>=BY-24)){land(b);bricks.splice(bricks.indexOf(b),1)}}
    flash.forEach(f=>f.t+=dt*1000);flash=flash.filter(f=>f.t<300);
    ctx.fillStyle='#F4EFE0';ctx.fillRect(0,0,LW,LH);
    for(let i=0;i<LN;i++){ctx.fillStyle=i%2?'rgba(0,0,0,.035)':'rgba(0,0,0,.07)';ctx.fillRect(i*LWD,0,LWD,BY)}
    lanes.forEach((c,i)=>{ctx.fillStyle=c;rr(ctx,i*LWD+4,BY,LWD-8,LH-BY-6,8);ctx.fill();ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(i*LWD+10,BY+6,LWD-20,6);ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(i*LWD+10,BY+LH-BY-20,LWD-20,4)});
    flash.forEach(f=>{ctx.fillStyle=f.ok?`rgba(255,255,255,${.7-f.t/430})`:`rgba(0,0,0,${.55-f.t/560})`;ctx.fillRect(f.lane*LWD,0,LWD,LH)});
    bricks.forEach(b=>brick(ctx,b.x-26,b.y,52,24,b.col));
    raf=requestAnimationFrame(loop)}
  C.cv.addEventListener('pointerdown',e=>{e.preventDefault();setLane(Math.floor(C.pt(e).x/LWD))});
  const b=btns(root,[['0','1'],['1','2'],['2','3'],['3','4']].map(a=>[a[0],`Carril ${a[1]}`,`Carril ${a[1]}`]));b.addEventListener('click',e=>{const a=e.target.closest('button');if(a)setLane(Number(a.dataset.a))});
  const key=e=>{const b=low();if(!b)return;if(e.key==='ArrowLeft'){e.preventDefault();setLane(b.lane-1)}if(e.key==='ArrowRight'){e.preventDefault();setLane(b.lane+1)}if(/^[1-4]$/.test(e.key))setLane(Number(e.key)-1)};document.addEventListener('keydown',key);
  start();
  return{destroy(){over=true;cancelAnimationFrame(raf);document.removeEventListener('keydown',key);C.off()},pause(p){paused=p}}}

/* ============ menú ============ */
const GAMES=[
 {id:'drop',n:'Brick Drop',d:'Cae un ladrillo tras otro. Completa filas.',f:gDrop,u:'puntos',how:'<p>Caen ladrillos. Colócalos para completar filas enteras: cada fila completa desaparece y suma puntos.</p><ul><li><b>Mover:</b> arrastra el dedo a los lados</li><li><b>Girar:</b> toca el tablero</li><li><b>Bajar:</b> arrastra hacia abajo</li><li><b>Soltar de golpe:</b> desliza rápido hacia abajo</li></ul><p>También tienes botones debajo. Pierdes si los ladrillos llegan arriba. Cada 8 filas sube el nivel y cae más rápido.</p>'},
 {id:'fit',n:'Encaja la silueta',d:'Rellena la forma con todas las piezas.',f:gFit,u:'puzles',how:'<p>La silueta gris se rellena con todas las piezas de abajo, sin huecos ni solapes. Siempre hay solución.</p><ul><li><b>Elegir pieza:</b> tócala en la bandeja</li><li><b>Girar:</b> botón Girar, o toca otra vez la pieza elegida</li><li><b>Colocar:</b> toca el tablero; la pieza se centra donde toques</li><li><b>Quitar:</b> toca una pieza ya colocada</li></ul><p>Cada puzle que resuelves añade una pieza más.</p>'},
 {id:'tower',n:'Torre',d:'Suelta cada ladrillo justo encima del anterior.',f:gTower,u:'pisos',how:'<p>Un ladrillo va de lado a lado. Tócalo para soltarlo justo encima del anterior.</p><ul><li>Lo que sobresale se corta y cae, así que el siguiente es más estrecho</li><li>Si lo dejas casi perfecto no se corta nada, y con varios perfectos seguidos la torre recupera anchura</li><li>Si fallas del todo, se acaba</li></ul><p>Cuantos más pisos, más rápido se mueve. Toca la pantalla o el botón.</p>'},
 {id:'sort',n:'Clasificador',d:'Lleva cada ladrillo a la caja de su color.',f:gSort,u:'aciertos',how:'<p>Cae un ladrillo de color. Llévalo a la caja de su mismo color antes de que llegue abajo.</p><ul><li><b>Cambiar de carril:</b> toca el carril al que lo quieres mandar (o usa los botones)</li><li>Acierto: sumas un punto</li><li>Fallo: pierdes una vida; tienes 3</li></ul><p>Las cajas cambian de sitio en cada partida. Con el tiempo cae más rápido y caen varios a la vez.</p>'}];
const ICO={drop:'<svg viewBox="0 0 40 40"><rect x="6" y="26" width="28" height="8" rx="2" fill="#D01012"/><rect x="6" y="16" width="14" height="8" rx="2" fill="#1F6FD1"/><rect x="14" y="6" width="14" height="8" rx="2" fill="#F5C400"/></svg>',
 fit:'<svg viewBox="0 0 40 40"><path d="M6 6h18v10H16v8H6z" fill="#2E9E4F"/><path d="M24 6h10v18H24z" fill="#F27C1A"/><path d="M6 24h10v10H6zM16 24h18v10H16z" fill="#8E44AD" opacity=".5"/></svg>',
 tower:'<svg viewBox="0 0 40 40"><rect x="12" y="28" width="16" height="7" rx="2" fill="#D01012"/><rect x="10" y="20" width="16" height="7" rx="2" fill="#1F6FD1"/><rect x="14" y="12" width="14" height="7" rx="2" fill="#F5C400"/><rect x="4" y="4" width="10" height="6" rx="2" fill="#2E9E4F"/></svg>',
 sort:'<svg viewBox="0 0 40 40"><rect x="4" y="26" width="9" height="10" rx="2" fill="#D01012"/><rect x="15" y="26" width="9" height="10" rx="2" fill="#1F6FD1"/><rect x="26" y="26" width="9" height="10" rx="2" fill="#F5C400"/><rect x="14" y="6" width="12" height="8" rx="2" fill="#1F6FD1"/><path d="M20 16v7m-3-3l3 3 3-3" stroke="#555" stroke-width="2" fill="none"/></svg>'};
let cur=null,introOpen=false;const SEENK='bricks-play-intro';
const seenAll=()=>{try{return JSON.parse(localStorage.getItem(SEENK)||'{}')}catch{return{}}};
let curId=null;
function intro(id){const g=GAMES.find(x=>x.id===id);if(!g||!cur)return;const d=document.createElement('div');d.className='plend plintro';d.innerHTML=`<div><h3>${g.n}</h3><div class="plhow">${g.how}</div><button type="button" class="plagain">¡A jugar!</button></div>`;$('pl-body').appendChild(d);introOpen=true;if(cur.pause)cur.pause(true);
  d.querySelector('.plagain').addEventListener('click',()=>{d.remove();introOpen=false;if(cur&&cur.pause)cur.pause(false);const s=seenAll();s[id]=1;try{localStorage.setItem(SEENK,JSON.stringify(s))}catch{}})}
function menu(){
  const body=$('pl-body');if(cur){cur.destroy();cur=null}introOpen=false;curId=null;$('pl-help').classList.add('hidden');
  $('pl-title').textContent='Playtime!';$('pl-back').dataset.m='close';
  const b=bestAll();
  body.innerHTML='<p class="plsub">Elige un juego. Los récords se guardan en este dispositivo.</p><div class="plmenu">'+GAMES.map(g=>`<button type="button" class="plcard" data-g="${g.id}">${ICO[g.id]}<b>${g.n}</b><span>${g.d}</span><em>Récord: ${b[g.id]||0} ${g.u}</em></button>`).join('')+'</div>'}
function open(id){const g=GAMES.find(x=>x.id===id);if(!g)return;const body=$('pl-body');body.innerHTML='';$('pl-title').textContent=g.n;$('pl-back').dataset.m='menu';cur=g.f(body);curId=id;$('pl-help').classList.remove('hidden');if(!seenAll()[id])intro(id)}
export function openPlay(){$('play').classList.remove('hidden');document.body.classList.add('noscroll');menu()}
export function closePlay(){if(cur){cur.destroy();cur=null}introOpen=false;$('play').classList.add('hidden');document.body.classList.remove('noscroll')}
export function initPlay(){
  $('pl-body').addEventListener('click',e=>{const c=e.target.closest('.plcard');if(c)open(c.dataset.g)});
  $('pl-help').addEventListener('click',()=>{if(curId&&!introOpen)intro(curId)});
  $('pl-back').addEventListener('click',()=>{if($('pl-back').dataset.m==='menu')menu();else closePlay()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('play').classList.contains('hidden')){if($('pl-back').dataset.m==='menu')menu();else closePlay()}});
  document.addEventListener('visibilitychange',()=>{if(cur&&cur.pause&&!introOpen)cur.pause(document.hidden)});
}
