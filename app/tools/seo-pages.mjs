// Statik il/yakıt sayfalarının içeriği. Saf fonksiyonlar: dosya okuma/yazma prerender.mjs'te.
// Arama motorları ve paylaşım önizlemeleri JavaScript çalıştırmadan fiyatı görsün diye
// her sayfa kendi başlığını, açıklamasını ve okunabilir bir fiyat özetini taşır.
// Uygulama açılınca bu özet Angular arayüzüyle yer değiştirir.

export const FUELS = [
  { key: 'benzin', label: 'Benzin', lower: 'benzin' },
  { key: 'motorin', label: 'Motorin', lower: 'motorin' },
  { key: 'lpg', label: 'LPG', lower: 'LPG' },
];

const money = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const dateTime = new Intl.DateTimeFormat('tr-TR', {
  timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
const dateOnly = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric' });

export const tl = v => money.format(v);
export const formatDateTime = iso => dateTime.format(new Date(iso));
export const formatDate = iso => dateOnly.format(new Date(iso));

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const TANK = 50;

/** Bir yakıt için Türkiye geneli sıralama: ortalama, sıra, en ucuz bölgeler. */
export function ranking(latest, fuel) {
  const all = Object.entries(latest.prices)
    .map(([slug, c]) => ({ slug, name: c.name, price: c[fuel] }))
    .filter(c => typeof c.price === 'number')
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name, 'tr'));
  const avg = all.length ? all.reduce((s, c) => s + c.price, 0) / all.length : null;
  return { all, avg };
}

/** Geçmişten tek yakıtın değişim anları, yeniden eskiye. */
export function fuelChanges(history, fuel, limit = 10) {
  const rows = [];
  for (const h of history ?? []) {
    const price = h[fuel];
    if (typeof price !== 'number') continue;
    const prev = rows.length ? rows[rows.length - 1].price : null;
    if (prev === price) continue;
    rows.push({ at: h.at, price, delta: prev == null ? null : price - prev });
  }
  return rows.reverse().slice(0, limit);
}

export function cityPage({ latest, history, slug, fuel, baseUrl }) {
  const city = latest.prices[slug];
  const f = FUELS.find(x => x.key === fuel);
  const price = city?.[fuel];
  if (!city || !f || typeof price !== 'number') return null;

  const { all, avg } = ranking(latest, fuel);
  const rank = all.filter(c => c.price < price).length + 1;
  const diff = avg == null ? 0 : price - avg;
  const others = FUELS.filter(x => x.key !== fuel && typeof city[x.key] === 'number');
  const path = `${slug}/${fuel}/`;
  const url = baseUrl + path;
  const changes = fuelChanges(history, fuel);
  // Bu yakıtın fiyatının kaydedildiği an; ilin changedAt'i başka bir yakıtın değişimi olabilir.
  const lastChange = changes[0]?.at ?? city.changedAt;

  const title = `${city.name} ${f.lower} fiyatı bugün: ${tl(price)} ₺ | Depo Dolu`;
  const description = `${city.name} ${f.lower} litre fiyatı ${tl(price)} ₺ (Petrol Ofisi il liste fiyatı, KDV dahil). ` +
    `Son değişiklik: ${formatDate(lastChange)}. ` +
    others.map(o => `${o.label} ${tl(city[o.key])} ₺`).join(', ') +
    `. Depo maliyeti, fiyat geçmişi ve zam bildirimi.`;

  const compare = Math.abs(diff) < 0.005 ? 'Türkiye ortalamasıyla aynı'
    : `Türkiye ortalamasından ${tl(Math.abs(diff))} ₺ ${diff < 0 ? 'ucuz' : 'pahalı'}`;
  const cheapest = all.slice(0, 5);

  const body = `
<article class="dd-static">
  <nav class="dd-static-nav"><a href="./">Depo Dolu</a> › <a href="fiyatlar/">Tüm iller</a> › ${escapeHtml(city.name)}</nav>
  <h1>${escapeHtml(city.name)} ${f.lower} fiyatı</h1>
  <p class="dd-static-price">${tl(price)} <small>₺/L</small></p>
  <p>Petrol Ofisi il liste fiyatı, KDV dahil. Son değişiklik: ${formatDateTime(lastChange)}.
  ${compare}${avg != null ? ` (ortalama ${tl(avg)} ₺)` : ''}; ${all.length} bölge içinde ${rank}. sırada.</p>
  <h2>${TANK} litrelik depo</h2>
  <p>${whole.format(price * TANK)} ₺</p>
  ${others.length ? `<h2>${escapeHtml(city.name)} diğer yakıtlar</h2>
  <ul>${others.map(o => `<li><a href="${slug}/${o.key}/">${o.label}: ${tl(city[o.key])} ₺</a></li>`).join('')}</ul>` : ''}
  ${changes.length ? `<h2>Son ${f.lower} fiyat değişiklikleri</h2>
  <table><thead><tr><th>Tarih</th><th>Fiyat</th><th>Değişim</th></tr></thead><tbody>${changes.map(c =>
    `<tr><td>${formatDateTime(c.at)}</td><td>${tl(c.price)} ₺</td><td>${c.delta == null ? 'ilk kayıt'
      : `${c.delta > 0 ? '+' : '−'}${tl(Math.abs(c.delta))} ₺`}</td></tr>`).join('')}</tbody></table>` : ''}
  <h2>En ucuz ${f.lower}</h2>
  <ol>${cheapest.map(c => `<li><a href="${c.slug}/${fuel}/">${escapeHtml(c.name)}: ${tl(c.price)} ₺</a></li>`).join('')}</ol>
  <p><a href="fiyatlar/">81 ilin benzin, motorin ve LPG fiyatları</a></p>
</article>`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Depo Dolu', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Tüm iller', item: baseUrl + 'fiyatlar/' },
      { '@type': 'ListItem', position: 3, name: `${city.name} ${f.lower}`, item: url },
    ],
  };

  // Görsel make_share_images.py ile üretilir; prerender dosya yoksa bu alanı düşürür.
  const image = { url: `${baseUrl}og/${slug}-${fuel}.png`, alt: `${city.name} ${f.lower} litre fiyatı: ${tl(price)} ₺` };

  return { path, url, title, description, body, jsonLd, image, lastmod: lastChange };
}

export function homeBody(latest) {
  const avgs = FUELS.map(f => ({ ...f, avg: ranking(latest, f.key).avg })).filter(f => f.avg != null);
  const featured = ['istanbul-avrupa', 'istanbul-anadolu', 'ankara', 'izmir', 'bursa', 'antalya', 'adana', 'konya']
    .filter(s => latest.prices[s]);
  return `
<article class="dd-static">
  <h1>Türkiye akaryakıt fiyatları</h1>
  <p>81 ilde benzin, motorin ve LPG litre fiyatları. Petrol Ofisi il liste fiyatı, KDV dahil.
  Son veri güncellemesi: ${formatDateTime(latest.updatedAt)}.</p>
  <ul>${avgs.map(f => `<li>${f.label} Türkiye ortalaması: ${tl(f.avg)} ₺</li>`).join('')}</ul>
  <h2>Büyük şehirler</h2>
  <ul>${featured.map(s => `<li>${escapeHtml(latest.prices[s].name)}: ${FUELS.map(f =>
    `<a href="${s}/${f.key}/">${f.label} ${tl(latest.prices[s][f.key])} ₺</a>`).join(' · ')}</li>`).join('')}</ul>
  <p><a href="fiyatlar/">81 ilin tüm fiyatları</a></p>
</article>`;
}

/** Tüm bölgelerin tablosu. Angular'sız, tek başına çalışan hafif bir sayfa. */
export function allPricesPage(latest, baseUrl) {
  const rows = Object.entries(latest.prices)
    .sort(([, a], [, b]) => a.name.localeCompare(b.name, 'tr'))
    .map(([slug, c]) => `<tr><th scope="row">${escapeHtml(c.name)}</th>${FUELS.map(f => typeof c[f.key] === 'number'
      ? `<td><a href="../${slug}/${f.key}/">${tl(c[f.key])}</a></td>` : '<td>–</td>').join('')}</tr>`)
    .join('\n');
  const title = 'Türkiye akaryakıt fiyatları: 81 il benzin, motorin, LPG | Depo Dolu';
  const description = `81 il ve 82 bölgede benzin, motorin ve LPG litre fiyatları tek tabloda. Son güncelleme: ${formatDate(latest.updatedAt)}.`;
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${baseUrl}fiyatlar/">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${baseUrl}fiyatlar/">
<meta property="og:image" content="${baseUrl}social-preview.png">
<meta property="og:locale" content="tr_TR">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0E3B4A">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<link rel="manifest" href="../manifest.webmanifest">
<style>
  :root { color-scheme: light; --ink: #182a2f; --soft: #627378; --brand: #0e3b4a; --line: #e2e8e6; --bg: #f2f5f4; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.45 system-ui, sans-serif; }
  main { max-width: 44rem; margin: 0 auto; padding: 1.25rem 1rem 3rem; }
  h1 { font-size: 1.5rem; margin: 0.5rem 0; }
  p { color: var(--soft); }
  a { color: var(--brand); }
  .app { display: inline-block; margin: 0.25rem 0 1rem; padding: 0.7rem 1.1rem; border-radius: 999px; background: var(--brand); color: #fff; text-decoration: none; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 1rem; overflow: hidden; }
  th, td { padding: 0.55rem 0.75rem; border-bottom: 1px solid var(--line); text-align: right; font-variant-numeric: tabular-nums; }
  th[scope="row"], thead th:first-child { text-align: left; font-weight: 600; }
  thead th { background: var(--brand); color: #fff; }
  td a { text-decoration: none; font-weight: 600; }
  @media (max-width: 420px) { th, td { padding: 0.5rem 0.4rem; font-size: 0.9375rem; } }
</style>
</head>
<body>
<main>
  <h1>Türkiye akaryakıt fiyatları</h1>
  <p>Litre fiyatı, KDV dahil, ₺. Kaynak: Petrol Ofisi il liste fiyatı; pompa fiyatları farklı olabilir.
  Son veri güncellemesi: ${formatDateTime(latest.updatedAt)}.</p>
  <a class="app" href="../">Depo Dolu uygulamasını aç</a>
  <table>
    <thead><tr><th>İl</th>${FUELS.map(f => `<th>${f.label}</th>`).join('')}</tr></thead>
    <tbody>
${rows}
    </tbody>
  </table>
  <p><a href="../harita/">Türkiye fiyat haritası</a></p>
  <p>Bu veriyi kendi projende kullanmak için: <a href="https://github.com/ozkurtomer/depo-dolu/blob/main/data/README.md">açık JSON API</a>.</p>
</main>
</body>
</html>
`;
}

const MAP_W = 1000;
const MAP_H = 440;
const MAP_COLORS = ['#1a7f64', '#6cae75', '#d9c24f', '#e8964f', '#c8553d'];
// İstanbul'un iki yakası haritada üst üste biner; biraz ayır.
const MAP_NUDGE = { 'istanbul-avrupa': [-7, -5], 'istanbul-anadolu': [7, 5] };

/** Enlem/boylamı harita koordinatına çevirir (39° enleme göre düzeltilmiş eşdikdörtgen izdüşüm). */
export function project([lat, lon]) {
  const cos = Math.cos(39 * Math.PI / 180);
  const k = MAP_W / ((44.9 - 25.6) * cos);
  return [(lon - 25.6) * cos * k, (42.25 - lat) * k + 10];
}

/** Fiyatları beş eşit sayılı sınıfa böler: en ucuz %20 ilk renk, en pahalı %20 son renk. */
export function priceClasses(prices) {
  const sorted = [...prices].sort((a, b) => a - b);
  const cuts = [1, 2, 3, 4].map(i => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * i / 5))]);
  return { cuts, classOf: p => cuts.filter(c => p >= c).length, min: sorted[0], max: sorted[sorted.length - 1] };
}

/** 81 ilin fiyatını renkli noktalarla gösteren tek başına sayfa. JavaScript'siz: yakıt seçimi CSS ile. */
export function mapPage(latest, baseUrl, coords) {
  const panels = FUELS.map(f => {
    const { all, avg } = ranking(latest, f.key);
    const placed = all.filter(c => coords[c.slug]);
    if (!placed.length) return '';
    const { cuts, classOf, min, max } = priceClasses(placed.map(c => c.price));
    const dots = placed.map(c => {
      const [x, y] = project(coords[c.slug]);
      const [dx, dy] = MAP_NUDGE[c.slug] ?? [0, 0];
      return `<a href="../${c.slug}/${f.key}/"><circle cx="${(x + dx).toFixed(1)}" cy="${(y + dy).toFixed(1)}" r="11" fill="${MAP_COLORS[classOf(c.price)]}"><title>${escapeHtml(c.name)}: ${tl(c.price)} ₺</title></circle></a>`;
    }).join('');
    // Sınıf sınırları: [en düşük, 4 kesim, en yüksek]. Aynı fiyat çok ilde varsa sınıf boş kalabilir.
    const bounds = [min, ...cuts, max];
    const legend = MAP_COLORS.map((color, i) => {
      const used = placed.some(c => classOf(c.price) === i);
      return used ? `<li><i style="background:${color}"></i>${tl(bounds[i])}${bounds[i + 1] > bounds[i] ? ` – ${tl(bounds[i + 1])}` : ''}</li>` : '';
    }).join('');
    const list = items => items.map(c => `<li><a href="../${c.slug}/${f.key}/">${escapeHtml(c.name)}</a> <b>${tl(c.price)} ₺</b></li>`).join('');
    return `<section class="panel p-${f.key}">
    <svg viewBox="0 0 ${MAP_W} ${MAP_H}" role="img" aria-label="Türkiye ${f.lower} fiyat haritası">${dots}</svg>
    <ul class="legend">${legend}</ul>
    <p>${f.label} Türkiye ortalaması <b>${tl(avg)} ₺</b>. En ucuz ve en pahalı il arasındaki fark ${tl(max - min)} ₺, 50 litrelik depoda ${whole.format((max - min) * TANK)} ₺.</p>
    <div class="cols"><div><h2>En ucuz ${f.lower}</h2><ol>${list(all.slice(0, 5))}</ol></div>
    <div><h2>En pahalı ${f.lower}</h2><ol>${list(all.slice(-5).reverse())}</ol></div></div>
  </section>`;
  }).join('\n');

  const title = 'Türkiye akaryakıt fiyat haritası: 81 il benzin, motorin, LPG | Depo Dolu';
  const description = `Hangi ilde yakıt ucuz, hangisinde pahalı? 81 ilin benzin, motorin ve LPG fiyatları renkli harita üzerinde. Son güncelleme: ${formatDate(latest.updatedAt)}.`;
  const sel = (fmt) => FUELS.map(f => fmt(f.key)).join(', ');
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${baseUrl}harita/">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${baseUrl}harita/">
<meta property="og:image" content="${baseUrl}social-preview.png">
<meta property="og:locale" content="tr_TR">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0E3B4A">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<link rel="manifest" href="../manifest.webmanifest">
<style>
  :root { color-scheme: light; --ink: #182a2f; --soft: #627378; --brand: #0e3b4a; --line: #e2e8e6; --bg: #f2f5f4; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.45 system-ui, sans-serif; }
  main { max-width: 56rem; margin: 0 auto; padding: 1.25rem 1rem 3rem; }
  h1 { font-size: 1.5rem; margin: 0.5rem 0; }
  h2 { font-size: 1.05rem; margin: 1rem 0 0.25rem; }
  p { color: var(--soft); }
  a { color: var(--brand); }
  .app { display: inline-block; margin: 0.25rem 0 1rem; padding: 0.7rem 1.1rem; border-radius: 999px; background: var(--brand); color: #fff; text-decoration: none; font-weight: 600; }
  input { position: absolute; opacity: 0; pointer-events: none; }
  .tabs { display: flex; gap: 0.5rem; margin: 0.5rem 0 0.75rem; }
  .tabs label { padding: 0.5rem 1rem; border-radius: 999px; background: #fff; border: 1px solid var(--line); cursor: pointer; font-weight: 600; }
  ${sel(k => `#f-${k}:checked ~ .tabs label[for="f-${k}"]`)} { background: var(--brand); color: #fff; border-color: var(--brand); }
  ${sel(k => `#f-${k}:focus-visible ~ .tabs label[for="f-${k}"]`)} { outline: 2px solid var(--brand); outline-offset: 2px; }
  .panel { display: none; }
  ${sel(k => `#f-${k}:checked ~ .p-${k}`)} { display: block; }
  svg { display: block; width: 100%; height: auto; background: #fff; border-radius: 1rem; }
  circle { stroke: #fff; stroke-width: 2; }
  a:hover circle, a:focus circle { stroke: var(--ink); stroke-width: 3; }
  .legend { display: flex; flex-wrap: wrap; gap: 0.25rem 1rem; padding: 0; margin: 0.75rem 0; list-style: none; font-size: 0.875rem; font-variant-numeric: tabular-nums; }
  .legend i { display: inline-block; width: 0.8rem; height: 0.8rem; border-radius: 50%; margin-right: 0.35rem; vertical-align: -0.05rem; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0 1.5rem; }
  ol { padding-left: 1.25rem; margin: 0.25rem 0; }
  li b { font-variant-numeric: tabular-nums; }
  @media (max-width: 520px) { .cols { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<main>
  <h1>Türkiye akaryakıt fiyat haritası</h1>
  <p>Yeşil ucuz, kırmızı pahalı. Bir ile dokununca o ilin sayfası açılır. Petrol Ofisi il liste fiyatı, KDV dahil.
  Son veri güncellemesi: ${formatDateTime(latest.updatedAt)}.</p>
  <a class="app" href="../">Depo Dolu uygulamasını aç</a>
  ${FUELS.map(f => `<input type="radio" name="fuel" id="f-${f.key}"${f.key === 'motorin' ? ' checked' : ''}>`).join('')}
  <div class="tabs">${FUELS.map(f => `<label for="f-${f.key}">${f.label}</label>`).join('')}</div>
  ${panels}
  <p><a href="../fiyatlar/">Tüm illerin fiyat tablosu</a></p>
</main>
</body>
</html>
`;
}

/** İsteğe bağlı, çerezsiz ziyaret sayacı (GoatCounter). Kod boşsa sayfa olduğu gibi kalır. */
export function withAnalytics(html, code) {
  if (!code) return html;
  if (!/^[a-z0-9-]{2,50}$/.test(code)) throw new Error(`Geçersiz GoatCounter kodu: ${code}`);
  if (html.includes('gc.zgo.at')) return html;
  const tag = `<script data-goatcounter="https://${code}.goatcounter.com/count" async src="https://gc.zgo.at/count.js"></script>`;
  return html.replace('</head>', `${tag}\n</head>`);
}

/** Derlenmiş index.html'in başlık, açıklama ve paylaşım etiketlerini sayfaya göre değiştirir. */
export function applyHead(html, { title, description, url, jsonLd, image }) {
  let out = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);
  const setMeta = (attr, key, value) => {
    const re = new RegExp(`<meta\\s[^>]*${attr}="${key}"[^>]*>`);
    const tag = `<meta ${attr}="${key}" content="${escapeHtml(value)}">`;
    out = re.test(out) ? out.replace(re, tag) : out.replace('</head>', `${tag}\n</head>`);
  };
  setMeta('name', 'description', description);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:url', url);
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  if (image) {
    setMeta('property', 'og:image', image.url);
    setMeta('property', 'og:image:width', '1200');
    setMeta('property', 'og:image:height', '630');
    setMeta('property', 'og:image:alt', image.alt);
    setMeta('name', 'twitter:image', image.url);
    setMeta('name', 'twitter:image:alt', image.alt);
  }
  out = out.replace(/<link\s[^>]*rel="canonical"[^>]*>/, `<link rel="canonical" href="${escapeHtml(url)}">`);
  if (jsonLd)
    out = out.replace('</head>', `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>\n</head>`);
  return out;
}

/** Angular açılana kadar görünen, arama motorlarının okuduğu içerik. */
export function applyBody(html, body) {
  return html.replace(/<app-root[^>]*>[\s\S]*?<\/app-root>/, m => m.replace(/>[\s\S]*<\/app-root>$/, `>${body}</app-root>`));
}

export function sitemap(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map(e => `  <url><loc>${escapeHtml(e.url)}</loc>${e.lastmod ? `<lastmod>${e.lastmod.slice(0, 10)}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
}
