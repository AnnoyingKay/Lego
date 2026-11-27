const star=(x,y,c,s=6)=>`<path d="M${x} ${y-s} L${x+s/3} ${y-s/3} L${x+s} ${y} L${x+s/3} ${y+s/3} L${x} ${y+s} L${x-s/3} ${y+s/3} L${x-s} ${y} L${x-s/3} ${y-s/3} Z" fill="${c}"/>`;
const G=(id,a,b,v)=>`<defs><linearGradient id="${id}" x1="0" y1="0" x2="${v?0:1}" y2="${v?1:0}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;
const sky=(id,a,b)=>G(id,a,b,1)+`<rect width="340" height="80" fill="url(#${id})"/>`;
const brk=(x,y,w,h,c,d)=>{let s=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${c}"/><rect x="${x}" y="${y+h-4}" width="${w}" height="4" rx="2" fill="${d}" opacity=".55"/><rect x="${x+2}" y="${y+2}" width="${w-4}" height="3" rx="1.5" fill="#fff" opacity=".35"/>`;for(let i=0;i<Math.floor(w/13);i++)s+=`<rect x="${x+4+i*13}" y="${y-4}" width="9" height="5" rx="2" fill="${c}"/><rect x="${x+4+i*13}" y="${y-4}" width="9" height="2" rx="1" fill="#fff" opacity=".4"/>`;return s};
const win=(x,y,w,h,c='#FFE9A0')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1" fill="${c}"/>`;
const ARTS={
lego:()=>{let s=sky('gl','#FFE766','#FFD500');
 s+='<circle cx="300" cy="18" r="22" fill="#fff" opacity=".35"/><circle cx="300" cy="18" r="13" fill="#fff" opacity=".45"/>';
 s+='<rect y="66" width="340" height="14" fill="#2E9E4F"/><rect y="66" width="340" height="3" fill="#47B866"/>';for(let i=0;i<24;i++)s+=`<rect x="${4+i*14}" y="62" width="9" height="5" rx="2" fill="#2E9E4F"/>`;
 s+=brk(16,50,56,16,'#D01012','#7A0A0B')+brk(22,34,44,16,'#1F6FD1','#0E3F82')+brk(28,18,30,16,'#fff','#bbb');
 s+=brk(96,52,42,14,'#1F6FD1','#0E3F82')+brk(96,38,28,14,'#2E9E4F','#17652F');
 s+=brk(160,48,70,18,'#D01012','#7A0A0B')+brk(168,32,28,16,'#F5A300','#9A6500')+brk(200,32,28,16,'#fff','#bbb');
 s+='<rect x="262" y="50" width="26" height="16" rx="2" fill="#1D1D1B"/><rect x="266" y="36" width="18" height="16" rx="3" fill="#D01012"/><rect x="264" y="38" width="4" height="12" rx="2" fill="#F5C26B"/><rect x="282" y="38" width="4" height="12" rx="2" fill="#F5C26B"/><rect x="271" y="22" width="8" height="5" rx="2" fill="#F5C26B"/><circle cx="275" cy="22" r="8" fill="#F5C26B"/><path d="M267 18 Q275 8 283 18 Z" fill="#1D1D1B"/><circle cx="272" cy="22" r="1.2" fill="#1D1D1B"/><circle cx="278" cy="22" r="1.2" fill="#1D1D1B"/>';
 return s},
tren:()=>{let s=sky('gt','#BFD9E6','#F1F6F8');
 s+='<path d="M0 56 Q50 34 100 50 T200 46 T340 52 V80 H0Z" fill="#A9C3B2"/><path d="M0 62 Q70 46 140 60 T340 58 V80 H0Z" fill="#8FAE9B"/>';
 for(const x of[44,150,256])s+=`<rect x="${x}" y="30" width="2" height="38" fill="#5A4636"/><rect x="${x-8}" y="34" width="18" height="2" fill="#5A4636"/>`;
 s+='<path d="M45 34 Q98 44 151 34 M151 34 Q204 44 257 34" stroke="#5A4636" stroke-width=".8" fill="none"/>';
 s+='<rect y="68" width="340" height="12" fill="#B9A98C"/><rect y="70" width="340" height="2.5" fill="#6E7F88"/><rect y="76" width="340" height="2.5" fill="#6E7F88"/>';for(let i=0;i<30;i++)s+=`<rect x="${i*12}" y="68" width="5" height="12" fill="#7A6A52"/>`;
 s+='<rect x="190" y="38" width="62" height="28" rx="4" fill="#B5502C"/><rect x="190" y="38" width="62" height="5" rx="2" fill="#D07A55"/><rect x="236" y="22" width="22" height="44" rx="3" fill="#8E3B1F"/><rect x="238" y="26" width="18" height="12" fill="#CFE3EC"/><rect x="198" y="26" width="12" height="14" rx="2" fill="#2B2B2B"/><rect x="196" y="22" width="16" height="4" rx="1" fill="#2B2B2B"/><rect x="214" y="44" width="16" height="10" fill="#CFE3EC"/><circle cx="204" cy="68" r="8" fill="#3A3A3A"/><circle cx="224" cy="68" r="8" fill="#3A3A3A"/><circle cx="246" cy="68" r="6" fill="#3A3A3A"/><circle cx="204" cy="68" r="3" fill="#B9A98C"/><circle cx="224" cy="68" r="3" fill="#B9A98C"/>';
 s+='<circle cx="198" cy="14" r="7" fill="#fff" opacity=".9"/><circle cx="184" cy="8" r="9" fill="#fff" opacity=".7"/><circle cx="166" cy="5" r="8" fill="#fff" opacity=".5"/>';
 s+='<rect x="262" y="44" width="52" height="22" rx="3" fill="#2F6B8A"/><rect x="268" y="49" width="10" height="8" fill="#CFE3EC"/><rect x="284" y="49" width="10" height="8" fill="#CFE3EC"/><rect x="300" y="49" width="10" height="8" fill="#CFE3EC"/><circle cx="276" cy="68" r="5" fill="#3A3A3A"/><circle cx="300" cy="68" r="5" fill="#3A3A3A"/>';
 return s},
esp:()=>{let s=G('ge','#171A5C','#4B4FD6',1)+'<rect width="340" height="80" fill="url(#ge)"/>';
 for(let i=0;i<46;i++){const x=(i*73)%340,y=(i*37)%76,r=i%7===0?1.8:i%3===0?1.2:.8;s+=`<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${.5+(i%4)*.12}"/>`}
 s+=star(60,16,'#FFE9A0',5)+star(310,60,'#FFE9A0',4)+star(180,10,'#fff',4);
 s+='<circle cx="258" cy="40" r="22" fill="#F2A65A"/><path d="M240 34 Q258 28 276 36 M238 46 Q258 52 278 44" stroke="#E08A3C" stroke-width="3" fill="none"/><circle cx="250" cy="32" r="5" fill="#fff" opacity=".18"/><ellipse cx="258" cy="40" rx="38" ry="9" transform="rotate(-18 258 40)" fill="none" stroke="#D9DDFB" stroke-width="2.5" opacity=".9"/>';
 s+='<circle cx="30" cy="62" r="14" fill="#C9CCF3"/><circle cx="25" cy="58" r="3" fill="#A5A9E6"/><circle cx="35" cy="67" r="4" fill="#A5A9E6"/><circle cx="32" cy="55" r="2" fill="#A5A9E6"/>';
 s+='<g transform="rotate(35 120 40)"><path d="M110 56 L110 26 Q120 6 130 26 L130 56 Z" fill="#F4F4FF"/><path d="M110 40 L98 58 L110 54 Z M130 40 L142 58 L130 54 Z" fill="#E5484D"/><circle cx="120" cy="32" r="5" fill="#6FA8F0" stroke="#4B4FD6" stroke-width="1.5"/><path d="M114 56 L120 74 L126 56 Z" fill="#FFB347"/><path d="M117 56 L120 66 L123 56 Z" fill="#FFE9A0"/></g>';
 return s},
mod:()=>{let s=sky('gm','#F7C98F','#FBEAD2');
 const f=[['#C9694A','#7A4B35',44,58],['#E0B352','#8A6A1F',40,50],['#6D9AAE','#3D6577',46,62],['#9AAE7A','#5B6E3E',42,52],['#B07A9A','#6E4560',44,60]];
 let x=6;f.forEach((b,i)=>{const[w,h]=[b[2],b[3]];const y=78-h;s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${b[0]}"/><path d="M${x-2} ${y} L${x+w/2} ${y-10} L${x+w+2} ${y} Z" fill="${b[1]}"/><rect x="${x}" y="${y}" width="${w}" height="3" fill="#fff" opacity=".25"/>`;
  for(let r=0;r<2;r++)for(let c=0;c<2;c++)s+=win(x+7+c*(w/2-2),y+10+r*16,9,11,i%2?'#FFE9A0':'#FBF4EA')+`<rect x="${x+7+c*(w/2-2)}" y="${y+10+r*16}" width="9" height="1.5" fill="${b[1]}"/>`;
  s+=`<rect x="${x+w/2-5}" y="${72-6}" width="10" height="12" rx="5" fill="${b[1]}"/><rect x="${x+w/2-9}" y="${60}" width="18" height="4" fill="${i%2?'#D62828':'#fff'}" opacity=".9"/>`;x+=w+7.5});
 s+='<rect x="0" y="72" width="340" height="8" fill="#8B7A66"/><rect y="72" width="340" height="2" fill="#B8A88F"/><rect x="326" y="40" width="2.5" height="34" fill="#3B3B3B"/><circle cx="327" cy="38" r="4" fill="#FFE9A0"/>';
 return s},
hp:()=>{let s=G('gh','#12163A','#5B3A63',1)+'<rect width="340" height="80" fill="url(#gh)"/>';
 for(let i=0;i<30;i++)s+=`<circle cx="${(i*59)%340}" cy="${(i*23)%46}" r="${i%5?.8:1.4}" fill="#fff" opacity=".8"/>`;
 s+='<circle cx="288" cy="22" r="12" fill="#F5E9B8"/><circle cx="283" cy="19" r="2.5" fill="#E3D398"/>';
 s+='<path d="M0 80 L0 54 Q60 44 110 56 L340 50 V80Z" fill="#1E1630"/>';
 s+='<path d="M96 80 V46 h10 v-14 l6 -12 l6 12 v14 h12 v-22 l7 -16 l7 16 v22 h10 v-10 h8 v10 h12 v-26 l7 -14 l7 14 v26 h10 V80 Z" fill="#2B1F45"/><path d="M96 80 V46 h10 v-14 l6 -12 l6 12 v14 h12 v-22 l7 -16 l7 16 v22 h10 v-10 h8 v10 h12 v-26 l7 -14 l7 14 v26 h10 V80 Z" fill="none" stroke="#C9A24B" stroke-width=".8" opacity=".6"/>';
 [[110,40],[146,42],[130,64],[170,44],[190,56],[158,58],[208,50],[214,66]].forEach(p=>s+=win(p[0],p[1],4,7,'#FFD36B'));
 s+='<path d="M40 30 q6 -8 14 -2 q4 -6 8 2 q-6 -2 -10 2 q-6 -4 -12 -2z" fill="#0B0D24"/>';
 s+=star(70,14,'#C9A24B',5)+star(240,12,'#C9A24B',4)+star(24,52,'#C9A24B',4);
 s+='<path d="M0 80 V70 Q40 62 90 70 T180 72 T340 68 V80Z" fill="#7A2E3A"/>';
 return s},
lotr:()=>{let s=sky('gr','#CFE6EE','#F4F0D2');
 s+='<circle cx="278" cy="18" r="10" fill="#FFF3B8"/>';
 s+='<path d="M0 50 L30 22 L52 40 L84 12 L120 46 L150 30 L190 50 V60 H0Z" fill="#9FB3B8"/><path d="M84 12 L96 26 L88 24 L84 30 L78 24 L72 26Z M30 22 L38 31 L30 30 L26 34 L22 30Z" fill="#fff"/>';
 s+='<path d="M0 80 L0 56 Q40 40 90 54 Q140 66 190 50 Q250 36 340 54 V80Z" fill="#8FAE62"/>';
 s+='<path d="M180 80 Q190 66 230 62 Q290 58 340 64 V80Z" fill="#6E8F44"/>';
 s+='<circle cx="62" cy="60" r="24" fill="#7DA04F"/><circle cx="62" cy="63" r="8.5" fill="#4F7A2A" stroke="#B8923A" stroke-width="0"/><circle cx="62" cy="63" r="7" fill="#2F9E6F"/><circle cx="62" cy="63" r="6" fill="none" stroke="#7A5A2E" stroke-width="1"/><circle cx="64" cy="63" r="1" fill="#E5C25A"/>';
 s+='<path d="M54 80 Q70 70 86 66 Q120 60 150 62 Q180 64 200 72 L206 80 Z" fill="#D8C28F"/>';
 s+='<rect x="268" y="30" width="5" height="26" fill="#6B4A2B"/><circle cx="270" cy="26" r="15" fill="#4F6B2F"/><circle cx="260" cy="32" r="9" fill="#5F7F3B"/><circle cx="282" cy="32" r="9" fill="#5F7F3B"/>';
 s+='<circle cx="318" cy="16" r="8" fill="none" stroke="#B8923A" stroke-width="3"/>';
 return s},
dis:()=>{let s=sky('gd','#9CB9F2','#F9D3E6');
 for(let i=0;i<10;i++)s+=star((i*37+14)%330+5,(i*19)%30+8,i%2?'#fff':'#F2B84B',i%3?4:6);
 s+='<path d="M0 80 L0 68 Q80 56 170 66 Q260 56 340 68 V80Z" fill="#7EAE74"/>';
 s+='<g transform="translate(0 14)"><rect x="130" y="40" width="80" height="34" fill="#F7C6DA"/><rect x="104" y="28" width="22" height="46" fill="#F2A6C8"/><rect x="214" y="28" width="22" height="46" fill="#F2A6C8"/><rect x="154" y="18" width="32" height="56" fill="#F2A6C8"/>';
 s+='<path d="M101 28 L115 2 L129 28Z M211 28 L225 2 L239 28Z M151 18 L170 -12 L189 18Z" fill="#3C6DDB"/><path d="M115 2 V-4 M225 2 V-4 M170 -12 V-18" stroke="#9A6A2F" stroke-width="1.2"/>';
 s+='<path d="M170 -18 l12 3 l-12 3z" fill="#E5484D" transform="translate(0 5)"/>';
 s+='<path d="M160 74 V58 Q170 46 180 58 V74Z" fill="#3C6DDB"/><circle cx="170" cy="40" r="4" fill="#FFE9A0"/><rect x="112" y="44" width="6" height="9" rx="3" fill="#FFE9A0"/><rect x="222" y="44" width="6" height="9" rx="3" fill="#FFE9A0"/>';
 s+='</g><path d="M60 70 Q90 52 128 66 M212 66 Q250 52 280 70" stroke="#fff" stroke-width="3" fill="none" opacity=".6"/>';
 return s},
sh:()=>{let s=G('gs','#FFD9C2','#FFF0C9',1)+'<rect width="340" height="80" fill="url(#gs)"/>';
 for(let y=0;y<6;y++)for(let x=0;x<23;x++)s+=`<circle cx="${6+x*15+(y%2)*7.5}" cy="${6+y*14}" r="2.6" fill="#F2B6A4" opacity=".7"/>`;
 s+='<path d="M170 40 L0 20 M170 40 L0 44 M170 40 L0 64 M170 40 L340 14 M170 40 L340 42 M170 40 L340 68" stroke="#fff" stroke-width="2" opacity=".6"/>';
 s+='<path d="M0 80 L0 52 L16 52 L16 38 L34 38 L34 56 L58 56 L58 44 L80 44 L80 60 L104 60 L104 48 L124 48 L124 80Z M236 80 L236 52 L256 52 L256 36 L278 36 L278 58 L300 58 L300 46 L320 46 L320 80Z" fill="#1D4E9E"/>';
 s+='<path d="M0 80 L0 66 L22 66 L22 60 L40 60 L40 70 L70 70 L70 62 L96 62 L96 80Z M262 80 L262 64 L290 64 L290 58 L316 58 L316 72 L340 72 L340 80Z" fill="#163A78"/>';
 [[20,43],[40,60],[64,49],[88,65],[243,57],[264,42],[286,63],[304,51]].forEach(p=>s+=win(p[0],p[1],4,5,'#FFE066'));
 s+='<g transform="translate(170 40) scale(.78) translate(-170 -40)"><path d="M170 4 L182 22 L206 14 L198 36 L222 48 L196 54 L200 76 L178 64 L160 80 L156 58 L130 56 L148 40 L130 22 L158 26 Z" fill="#D62828" stroke="#7A1212" stroke-width="2.5" stroke-linejoin="round"/>';
 s+='<text x="176" y="49" text-anchor="middle" font-family="Impact,Arial Black,sans-serif" font-size="19" font-weight="900" fill="#FFE066" stroke="#7A1212" stroke-width="1.2" transform="rotate(-6 176 44)">¡POW!</text></g>';
 return s}};
export const THEMES={
lego:{label:'Lego',title:'Bricks',tag:'Tu colección, ladrillo a ladrillo',bg:'#FFF9E3',hd:'#FFD500',ac:'#D01012',ink:'#7A0A0B',tile:['#FFE9A8','#FFD0CF','#CFE6FF','#D8F0D2'],rad:'10px',bw:'1px',pat:['dots','#E8C900'],
art:ARTS.lego},
tren:{label:'Trenes',title:'Vías',tag:'Todos a bordo',bg:'#F1F6F8',hd:'#CFE3EC',ac:'#B5502C',ink:'#6B2D14',tile:['#DCEAF0','#F4DACB','#E6E2D3','#D5E6D8'],rad:'4px',bw:'1px',pat:['lines','#B9CBD3'],
art:ARTS.tren},
esp:{label:'Espacio',title:'Órbita',tag:'Despegue en 3, 2, 1',bg:'#F1F1FF',hd:'#D9DDFB',ac:'#4B4FD6',ink:'#2A2C85',tile:['#E0E3FF','#F3DDF5','#DDF1F5','#FFE9CF'],rad:'99px',bw:'1px',pat:['stars','#9CA0EE'],
art:ARTS.esp},
mod:{label:'Modulares',title:'Calle Mayor',tag:'Calle por calle',bg:'#FBF4EA',hd:'#EBD9C4',ac:'#A8472A',ink:'#5E2312',tile:['#F1DFC8','#E3E9D6','#D9E4EC','#F2D9D3'],rad:'6px',bw:'1px',pat:['none','#fff'],
art:ARTS.mod},
hp:{label:'Harry Potter',title:'Hechizo',tag:'Magia en cada caja',bg:'#F7EFDD',hd:'#E9DDBF',ac:'#7A2E3A',ink:'#4A1A22',tile:['#EFE2C2','#EBD0D4','#DCE3D3','#E8DCEF'],rad:'4px',bw:'2px',pat:['stars','#C9A24B'],
art:ARTS.hp},
lotr:{label:'El Señor de los Anillos',title:'Sendero',tag:'Un camino largo y verde',bg:'#F1F5E6',hd:'#DDE8C4',ac:'#4F6B2F',ink:'#2B3D16',tile:['#E1EBC9','#F1E6C2','#DCE6E0','#EFE0D2'],rad:'12px',bw:'1px',pat:['none','#fff'],
art:ARTS.lotr},
dis:{label:'Disney',title:'Cuento',tag:'Érase una vez una colección',bg:'#F2F7FF',hd:'#DCEBFF',ac:'#3C6DDB',ink:'#1E3E86',tile:['#DCEBFF','#FBDDEA','#FFF0C9','#E3F3E0'],rad:'99px',bw:'1px',pat:['stars','#F2B84B'],
art:ARTS.dis},
sh:{label:'Superhéroes',title:'Viñeta',tag:'Todo gran héroe empieza en una caja',bg:'#FFF6EA',hd:'#FFE0D2',ac:'#D62828',ink:'#7A1212',tile:['#FFD9D2','#D6E3F7','#FFF0B8','#DDEFD6'],rad:'2px',bw:'2px',pat:['dots','#F2B6A4'],
art:ARTS.sh}
};
export const ORDER=['lego','tren','esp','mod','hp','lotr','dis','sh'];
export const artSvg=(k,label='')=>`<svg viewBox="0 0 340 80" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}" style="background:${THEMES[k].hd}">${THEMES[k].art()}</svg>`;
export function patternUri(k){const [kind,c]=THEMES[k].pat;let s='';
if(kind==='dots')s=`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><circle cx="14" cy="14" r="2" fill="${c}" opacity=".35"/></svg>`;
else if(kind==='stars')s=`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><path d="M20 12l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="${c}" opacity=".35"/><circle cx="48" cy="44" r="1.5" fill="${c}" opacity=".3"/></svg>`;
else if(kind==='lines')s=`<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect y="19" width="40" height="2" fill="${c}" opacity=".3"/></svg>`;
else return '';
return `url("data:image/svg+xml,${encodeURIComponent(s)}")`}

const plus=(x=32,y=32,s=11)=>`<path d="M${x} ${y-s}v${2*s}M${x-s} ${y}h${2*s}" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none"/>`;
const burst=(n,ro,ri,cx=32,cy=32)=>{const p=[];for(let i=0;i<n*2;i++){const r=i%2?ri:ro,a=Math.PI*i/n-Math.PI/2;p.push((cx+r*Math.cos(a)).toFixed(1)+','+(cy+r*Math.sin(a)).toFixed(1))}return p.join(' ')};
const fs=b=>`<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">${b}</svg>`;
export const FABS={
lego:fs('<rect x="6" y="22" width="52" height="34" rx="6" fill="#D01012"/><circle cx="20" cy="17" r="8" fill="#E5393A"/><circle cx="44" cy="17" r="8" fill="#E5393A"/>'+plus(32,40)),
tren:fs('<rect x="38" y="4" width="12" height="12" fill="#8E3B1F"/><rect x="6" y="14" width="52" height="34" rx="6" fill="#B5502C"/><circle cx="19" cy="53" r="7" fill="#6B2D14"/><circle cx="45" cy="53" r="7" fill="#6B2D14"/>'+plus(32,31)),
esp:fs('<circle cx="32" cy="32" r="26" fill="#4B4FD6"/><ellipse cx="32" cy="32" rx="31" ry="9" transform="rotate(-22 32 32)" fill="none" stroke="#D9DDFB" stroke-width="3"/>'+plus()),
mod:fs('<path d="M4 30 L32 4 L60 30 V58 H4 Z" fill="#A8472A"/><rect x="44" y="8" width="8" height="14" fill="#5E2312"/>'+plus(32,40)),
hp:fs(`<polygon points="${burst(8,31,19)}" fill="#7A2E3A" stroke="#C9A24B" stroke-width="3" stroke-linejoin="round"/>`+plus()),
lotr:fs('<circle cx="32" cy="32" r="24" fill="#4F6B2F" stroke="#B8923A" stroke-width="7"/>'+plus(32,32,10)),
dis:fs('<path d="M32 1 C34 20 44 30 63 32 C44 34 34 44 32 63 C30 44 20 34 1 32 C20 30 30 20 32 1Z" fill="#3C6DDB"/><circle cx="52" cy="12" r="4" fill="#F2A6C8"/><circle cx="12" cy="52" r="3" fill="#F2A6C8"/>'+plus(32,32,9)),
sh:fs(`<polygon points="${burst(11,31,21)}" fill="#D62828" stroke="#1D4E9E" stroke-width="3" stroke-linejoin="round"/>`+plus())
};

export const SHELF={
lego:{wall:'#FFF3C4',a:'#D9A25F',b:'#A8742F',img:'none'},
tren:{wall:'#E8F0F4',a:'#8A9AA3',b:'#5F6E77',img:'repeating-linear-gradient(90deg,transparent 0 12px,rgba(60,40,20,.35) 12px 16px)'},
esp:{wall:'#E6E8FF',a:'#7B7FEA',b:'#4B4FD6',img:'none'},
mod:{wall:'#F4E6D3',a:'#C98B6B',b:'#9A5A3C',img:'repeating-linear-gradient(90deg,transparent 0 18px,rgba(0,0,0,.18) 18px 20px)'},
hp:{wall:'#EADFC4',a:'#8C5A3A',b:'#5A3522',img:'none'},
lotr:{wall:'#E3EDCF',a:'#8FAE62',b:'#5D7A38',img:'none'},
dis:{wall:'#E4EEFF',a:'#F2A6C8',b:'#D9779F',img:'none'},
sh:{wall:'#FFE9DC',a:'#4F7FC8',b:'#1D4E9E',img:'none'}
};
