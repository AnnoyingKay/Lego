/* Iconos propios (dibujados para esta app) para las cabeceras de tema. No son logotipos de LEGO ni de terceros. */
const P={
rocket:'<path d="M12 3c3 2 5 6 4 11l-4 3-4-3c-1-5 1-9 4-11z"/><circle cx="12" cy="10" r="1.5"/><path d="M8 14l-3 3 3 1M16 14l3 3-3 1M12 17v4"/>',
gear:'<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
city:'<path d="M4 21V9h6v12M10 21V4h6v17M16 21v-8h4v8M3 21h18"/><path d="M12 8h2M12 12h2M6 13h2"/>',
train:'<rect x="6" y="3" width="12" height="13" rx="3"/><path d="M6 11h12M8 16l-1 4M16 16l1 4"/><circle cx="9" cy="13.5" r=".8"/><circle cx="15" cy="13.5" r=".8"/>',
castle:'<path d="M4 21V8h3v3h2V8h2v3h2V8h2v3h2V8h3v13zM10 21v-4a2 2 0 0 1 4 0v4"/>',
flower:'<circle cx="12" cy="9" r="2"/><circle cx="12" cy="4.5" r="1.8"/><circle cx="16.5" cy="9" r="1.8"/><circle cx="7.5" cy="9" r="1.8"/><circle cx="12" cy="13.5" r="1.8"/><path d="M12 15v6M12 19c-2 0-3-1-3-2M12 18c2 0 3-1 3-2"/>',
leaf:'<path d="M5 19c0-9 5-14 14-14 0 9-5 14-14 14zM5 19l8-8"/>',
brick:'<rect x="3" y="9" width="18" height="10" rx="1.5"/><circle cx="8" cy="6.5" r="1.8"/><circle cx="16" cy="6.5" r="1.8"/>',
duplo:'<rect x="4" y="10" width="16" height="9" rx="1.5"/><circle cx="8.5" cy="7" r="2.2"/><circle cx="15.5" cy="7" r="2.2"/>',
car:'<path d="M3 15l2-6h14l2 6v3H3zM3 15h18"/><circle cx="7.5" cy="18" r="1.8"/><circle cx="16.5" cy="18" r="1.8"/>',
palette:'<path d="M12 3a9 9 0 1 0 0 18c2 0 2-2 1-3s0-3 2-3h3a3 3 0 0 0 3-3c0-5-4-9-9-9z"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="16" cy="9" r="1"/>',
bulb:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3 11c1 1 1 2 1 4h4c0-2 0-3 1-4a6 6 0 0 0-3-11z"/>',
star:'<path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1L3.2 9.4l6.1-.8z"/>',
shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
hat:'<path d="M3 17h18M6 17c0-6 3-11 6-13 3 2 6 7 6 13M8 13h8"/>',
ring:'<circle cx="12" cy="14" r="6"/><path d="M9 6h6l-3-3z"/>',
paw:'<circle cx="7" cy="10" r="1.8"/><circle cx="11" cy="6.5" r="1.8"/><circle cx="16" cy="7" r="1.8"/><circle cx="19" cy="11.5" r="1.8"/><path d="M8 18c0-4 3-6 5-6s5 2 5 6c0 2-2 2-5 2s-5 0-5-2z"/>',
shuriken:'<path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"/><circle cx="12" cy="12" r="1.5"/>',
heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
cube:'<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9"/>',
sparkle:'<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z"/>',
person:'<circle cx="12" cy="8" r="4"/><path d="M5 21c0-5 3-8 7-8s7 3 7 8z"/>',
pad:'<rect x="3" y="8" width="18" height="10" rx="5"/><path d="M8 11v4M6 13h4M16 12h.01M18 14h.01"/>',
ship:'<path d="M3 15h18l-3 5H6zM12 3v12M12 5c3 1 5 4 5 8h-5M12 7c-3 1-4 4-4 7h4"/>',
book:'<path d="M4 5h7a1 1 0 0 1 1 1v14a1 1 0 0 0-1-1H4zM20 5h-7a1 1 0 0 0-1 1v14a1 1 0 0 1 1-1h7z"/>'
};
const MAP=[
[/space|espacio|nasa/i,'rocket'],[/star wars/i,'star'],[/technic|mindstorms|powered up|boost/i,'gear'],
[/modular|city|town|architecture|ciudad/i,'city'],[/train|tren/i,'train'],[/castle|kingdom|disney|princess|medieval/i,'castle'],
[/botanic/i,'flower'],[/animal crossing/i,'leaf'],[/duplo/i,'duplo'],[/speed|racer|formula|nascar|cars|mclaren|ferrari/i,'car'],
[/^art$|lego art/i,'palette'],[/ideas/i,'bulb'],[/marvel|^dc|batman|avengers|spider|super hero/i,'shield'],
[/harry potter|wizard|wicked|fantastic beasts|dreamzzz/i,'hat'],[/lord of|hobbit/i,'ring'],[/jurassic|dino/i,'paw'],
[/ninjago|monkie|kung|bionicle|hero factory/i,'shuriken'],[/friends|bluey|gabby|peppa|dots|heart/i,'heart'],
[/minecraft|minifig|brickheadz/i,null],[/mario|sonic|zelda|fortnite|overwatch|rivals|game|vidiyo/i,'pad'],
[/pokemon|pokémon|one piece|kpop|looney|shrek|avatar|stranger|wednesday|bluey/i,'sparkle'],
[/pirate/i,'ship'],[/education|braille|serious|class/i,'book'],[/icons|creator|classic|editions|brick/i,'brick']
];
const BG=['#fde2b8','#d8ecff','#e1f3d6','#ffd9dc','#e9ddff','#fff1b3','#d3f1ee','#ffe0cc'];
const hash=s=>[...s].reduce((n,c)=>(n*31+c.charCodeAt(0))>>>0,7);
export function themeIcon(name){
  const n=(name||'').trim(),bg=BG[hash(n||'x')%BG.length];
  let k=null;
  if(/minecraft/i.test(n))k='cube';else if(/minifig/i.test(n))k='person';else if(/brickheadz/i.test(n))k='brick';
  else for(const [re,i] of MAP){if(i&&re.test(n)){k=i;break}}
  const inner=k?`<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#2b2b2b" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${P[k]}</svg>`:`<span class="tl1">${(n[0]||'?').toUpperCase()}</span>`;
  return `<span class="tha" style="background:${bg}">${inner}</span>`;
}
