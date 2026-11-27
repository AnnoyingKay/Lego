/* Trofeos de Bricks: se calculan siempre a partir de tus datos, no se guardan.
   ctx = { sets, parts (sets con piezas cargadas), moc (creaciones), rareMin (menor nº de sets de una pieza tuya, o null),
           hasCard (tarjeta publicada), hasFav (set favorito elegido) } */
const sum = (a, f) => a.reduce((n, s) => n + (f(s) || 0), 0);
const copies = sets => {
  const m = new Map();
  for (const s of sets) {
    if (s.status !== 'owned') continue;
    const n = (s.setNumber || '').trim().replace(/-1$/, '');
    if (n) m.set(n, (m.get(n) || 0) + 1);
  }
  return Math.max(0, ...m.values());
};
const D = ctx => {
  const S = ctx.sets, own = S.filter(s => s.status === 'owned'), sold = S.filter(s => s.status === 'sold'), wish = S.filter(s => s.status === 'wishlist');
  const mine = S.filter(s => s.status !== 'wishlist');
  const built = own.filter(s => s.built), boxed = own.filter(s => !s.built && !s.building);
  const both = mine.filter(s => s.rrp != null && s.paid != null);
  const rrp = sum(both, s => s.rrp), save = sum(both, s => s.rrp - s.paid);
  const soldB = sold.filter(s => s.salePrice != null && s.paid != null);
  return { S, own, sold, wish, built, boxed, both, rrp, save, soldB, mine };
};

/* th: umbrales de cada nivel (bronce, plata, oro, platino, diamante). inv: gana el valor más bajo. */
export const TROPHIES = [
  { id: 'own', g: 'Colección', name: 'Coleccionista', desc: 'Sets en tu colección', ic: 'box', th: [1, 10, 25, 50, 100], val: c => D(c).own.length },
  { id: 'built', g: 'Colección', name: 'Constructor', desc: 'Sets montados', ic: 'hammer', th: [1, 5, 15, 30, 60], val: c => D(c).built.length },
  { id: 'boxed', g: 'Colección', name: 'Pila de cajas', desc: 'Sets por montar, todavía en su caja', ic: 'box', th: [3, 10, 20, 40], val: c => D(c).boxed.length },
  { id: 'clean', g: 'Colección', name: 'Cero pendientes', desc: 'Tener al menos 5 sets y todos montados', ic: 'check', th: [1], val: c => { const d = D(c); return d.own.length >= 5 && d.boxed.length === 0 ? 1 : 0; } },
  { id: 'pieces', g: 'Colección', name: 'Mar de piezas', desc: 'Piezas en tus sets', ic: 'brick', th: [1000, 5000, 10000, 25000, 50000], val: c => sum(D(c).own, s => s.pieces) },
  { id: 'minifigs', g: 'Colección', name: 'Ejército de minifiguras', desc: 'Minifiguras en tus sets', ic: 'person', th: [10, 50, 100, 250], val: c => sum(D(c).own, s => s.minifigs) },
  { id: 'themes', g: 'Colección', name: 'Todoterreno', desc: 'Temas distintos', ic: 'star', th: [3, 5, 10, 15], val: c => new Set(D(c).mine.map(s => (s.theme || '').trim()).filter(Boolean)).size },
  { id: 'years', g: 'Colección', name: 'Viajero en el tiempo', desc: 'Años de lanzamiento distintos', ic: 'clock', th: [5, 10, 20, 30], val: c => new Set(D(c).mine.map(s => s.year).filter(Boolean)).size },
  { id: 'giant', g: 'Colección', name: 'Gran obra', desc: 'Piezas del set más grande que has montado', ic: 'tower', th: [1000, 3000, 5000, 9000], val: c => Math.max(0, ...D(c).built.map(s => s.pieces || 0)) },
  { id: 'copies', g: 'Colección', name: 'Dos iguales', desc: 'Copias del mismo set', ic: 'copy', th: [2, 3, 4], val: c => copies(c.sets) },
  { id: 'photos', g: 'Colección', name: 'Fotógrafo', desc: 'Sets con foto propia', ic: 'camera', th: [1, 5, 15, 40], val: c => D(c).mine.filter(s => s.photo).length },
  { id: 'gifts', g: 'Colección', name: 'Generoso', desc: 'Sets para regalar', ic: 'gift', th: [1, 3, 6], val: c => D(c).own.filter(s => s.gift).length },
  { id: 'wish', g: 'Colección', name: 'Soñador', desc: 'Sets en tu lista de deseos', ic: 'heart', th: [5, 15, 30], val: c => D(c).wish.length },

  { id: 'paid', g: 'Dinero', name: 'Gran inversor', desc: 'Euros pagados en sets', ic: 'coin', th: [500, 1000, 2500, 5000, 10000], val: c => Math.round(sum(D(c).mine, s => s.paid)) },
  { id: 'save', g: 'Dinero', name: 'Cazaofertas', desc: 'Euros ahorrados frente al PVP', ic: 'tag', th: [100, 500, 1000, 2500], val: c => Math.round(D(c).save) },
  { id: 'savepct', g: 'Dinero', name: 'Regateador', desc: '% medio de ahorro frente al PVP (con al menos 5 sets con PVP y precio)', ic: 'percent', th: [10, 20, 30, 40], val: c => { const d = D(c); return d.both.length >= 5 && d.rrp ? Math.round(d.save / d.rrp * 100) : 0; } },
  { id: 'dear', g: 'Dinero', name: 'Capricho caro', desc: 'Euros pagados por un solo set', ic: 'coin', th: [100, 250, 500, 1000], val: c => Math.round(Math.max(0, ...D(c).mine.map(s => s.paid || 0))) },

  { id: 'sold', g: 'Ventas', name: 'Vendedor', desc: 'Sets vendidos', ic: 'sell', th: [1, 5, 10, 25], val: c => D(c).sold.length },
  { id: 'soldmoney', g: 'Ventas', name: 'Caja registradora', desc: 'Euros ingresados por ventas', ic: 'coin', th: [100, 500, 1000, 2500, 5000], val: c => Math.round(sum(D(c).sold, s => s.salePrice)) },
  { id: 'profit', g: 'Ventas', name: 'Buen negocio', desc: 'Euros de beneficio en ventas', ic: 'up', th: [1, 100, 500, 1000], val: c => Math.round(sum(D(c).soldB, s => s.salePrice - s.paid)) },
  { id: 'bestsale', g: 'Ventas', name: 'Pelotazo', desc: 'Beneficio de tu mejor venta', ic: 'up', th: [25, 100, 250], val: c => Math.round(Math.max(0, ...D(c).soldB.map(s => s.salePrice - s.paid))) },
  { id: 'resale', g: 'Ventas', name: 'Revendedor', desc: 'Sets guardados para vender', ic: 'sell', th: [1, 5, 10], val: c => D(c).own.filter(s => s.resale).length },

  { id: 'drawer', g: 'Piezas y creación', name: 'Cajón lleno', desc: 'Sets con las piezas cargadas en Cajón', ic: 'drawer', th: [1, 5, 15, 30], val: c => c.parts || 0 },
  { id: 'moc', g: 'Piezas y creación', name: 'Inventor', desc: 'Creaciones importadas', ic: 'cube', th: [1, 3, 10], val: c => c.moc || 0 },
  { id: 'rare', g: 'Piezas y creación', name: 'Cazador de rarezas', desc: 'Tu pieza más rara aparece en tan pocos sets', ic: 'gem', th: [10, 5, 2, 1], inv: true, val: c => c.rareMin == null ? null : c.rareMin },

  { id: 'card', g: 'Perfil', name: 'Con carné', desc: 'Publicar tu tarjeta de coleccionista', ic: 'person', th: [1], val: c => c.hasCard ? 1 : 0 },
  { id: 'fav', g: 'Perfil', name: 'Favorito del alma', desc: 'Elegir tu set favorito', ic: 'heart', th: [1], val: c => c.hasFav ? 1 : 0 },
];

export function evalTrophies(ctx) {
  return TROPHIES.map(t => {
    const value = t.val(ctx), n = t.th.length;
    let level = 0;
    if (value != null) level = t.inv ? t.th.filter(x => value <= x).length : t.th.filter(x => value >= x).length;
    const next = level < n ? t.th[level] : null, prev = level ? t.th[level - 1] : (t.inv ? null : 0);
    let pct = 100;
    if (next != null) {
      if (value == null) pct = 0;
      else if (t.inv) pct = Math.max(0, Math.min(99, Math.round(next / Math.max(1, value) * 100)));
      else pct = Math.max(0, Math.min(99, Math.round((value - prev) / (next - prev) * 100)));
    }
    return { ...t, value, level, max: n, next, pct, done: level === n };
  });
}
