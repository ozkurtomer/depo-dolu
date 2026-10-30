import { send, onState, isExtension, requestNotifications, openPage } from './platform.js';
import { FUELS, TANKS, money, whole, fuelLabel, comparison, series, fold, ago, selectionUrl } from './data.js';

const $ = id => document.getElementById(id);
const create = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text != null) node.textContent = text; return node; };
let state;
let view = 'prices';
let picking = false;
let busy = false;
let toastTimer;
const popular = ['istanbul-avrupa', 'istanbul-anadolu', 'ankara', 'izmir', 'bursa', 'antalya'];

function toast(text) {
  $('toast').textContent = text;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
}

async function act(type, payload) {
  if (busy) return;
  busy = true;
  $('refresh').classList.add('loading');
  $('refresh').disabled = true;
  try {
    state = await send(type, payload);
    render();
    return state;
  } catch (error) {
    toast(error.message);
  } finally {
    busy = false;
    $('refresh').classList.remove('loading');
    $('refresh').disabled = false;
  }
}

function showView(next) {
  view = next;
  picking = false;
  $('main').scrollTop = 0;
  render();
  if (next === 'history') void act('history');
}

function renderCities() {
  const prices = state.current.latest?.prices ?? {};
  const query = fold($('city-search').value.trim());
  const cities = Object.entries(prices).map(([slug, city]) => ({ slug, name: city.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  $('city-count').textContent = cities.length ? `${cities.length} bölge` : '';
  $('picker-empty').hidden = cities.length > 0;
  $('city-search').disabled = cities.length === 0;
  $('cities').hidden = cities.length === 0;
  $('popular-cities').hidden = Boolean(query) || cities.length === 0;
  $('popular-cities').replaceChildren(...popular.filter(slug => Object.hasOwn(prices, slug)).map(slug => {
    const button = create('button', null, prices[slug].name);
    button.type = 'button'; button.dataset.city = slug; return button;
  }));
  const filtered = cities.filter(city => fold(city.name).includes(query));
  $('cities').replaceChildren(...filtered.map(city => {
    const button = create('button', city.slug === state.settings.city ? 'selected' : '', city.name);
    button.type = 'button'; button.dataset.city = city.slug;
    if (city.slug === state.settings.city) button.append(create('span', null, '✓'));
    return button;
  }));
  if (cities.length && !filtered.length) $('cities').append(create('p', 'no-results', 'Bu adla bir il bulamadık. Yazımı kontrol et.'));
}

function chart(points) {
  const container = $('chart');
  container.replaceChildren();
  if (points.length < 2) {
    container.append(create('p', 'chart-empty', 'Henüz yeterli fiyat değişikliği yok. İlk zam ya da indirimden sonra grafik burada oluşacak.'));
    return;
  }
  const values = points.map(p => p.price);
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const first = Date.parse(points[0].at), end = Math.max(Date.now(), Date.parse(points.at(-1).at), first + 1);
  const x = at => 6 + (Date.parse(at) - first) / (end - first) * 274;
  const y = value => 14 + (1 - (value - min) / range) * 90;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 330 120'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `${money(min)} ile ${money(max)} lira arasında değişen fiyat geçmişi`);
  function shape(tag, attributes) {
    const node = document.createElementNS(ns, tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    svg.append(node); return node;
  }
  for (const value of [min, max]) {
    shape('line', { x1: 6, x2: 280, y1: y(value), y2: y(value), stroke: '#dce6e1', 'stroke-dasharray': '3 4' });
    shape('text', { x: 288, y: y(value) + 4, fill: '#627378', stroke: 'none', 'font-size': 11 }).textContent = money(value);
  }
  let path = `M6 ${y(points[0].price)}`;
  for (const point of points.slice(1)) path += ` H${x(point.at)} V${y(point.price)}`;
  path += ' H280';
  shape('path', { d: `${path} V112 H6 Z`, fill: '#0e3b4a', opacity: '.06', stroke: 'none' });
  shape('path', { d: path, stroke: '#0e3b4a', 'stroke-width': 2.5, fill: 'none' });
  shape('circle', { cx: 280, cy: y(points.at(-1).price), r: 4, fill: '#f2b705', stroke: '#0e3b4a' });
  const labels = create('div', 'chart-labels');
  labels.append(create('span', null, new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' }).format(new Date(first))), create('span', null, 'Bugün'));
  container.append(svg, labels);
}

function renderHistory() {
  const { city, history } = state.current;
  $('history-subtitle').textContent = `${city?.name ?? ''} · ${fuelLabel(state.settings.fuel)}`;
  const points = series(history, state.settings.fuel);
  chart(points);
  $('history-count').textContent = `${points.length} kayıt`;
  const historyError = state.current.histories[state.settings.city]?.error;
  $('history-error').hidden = !historyError;
  $('history-error').textContent = historyError ?? '';
  $('history-list').replaceChildren(...points.slice(-8).reverse().map(point => {
    const index = points.indexOf(point);
    const delta = index > 0 ? point.price - points[index - 1].price : 0;
    const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : '';
    const row = create('li');
    const icon = create('span', `move-icon ${direction}`, delta > 0 ? '↗' : delta < 0 ? '↘' : '·');
    icon.setAttribute('aria-hidden', 'true');
    const info = create('div', 'history-info');
    info.append(create('strong', null, delta > 0 ? 'Fiyat artışı' : delta < 0 ? 'Fiyat indirimi' : 'İlk kayıt'),
      create('small', null, new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(point.at))));
    const price = create('div', 'history-price');
    price.append(create('span', null, `${money(point.price)} ₺`), create('small', direction, delta ? `${delta > 0 ? '+' : '−'}${money(Math.abs(delta))} ₺` : 'Başlangıç'));
    row.append(icon, info, price); return row;
  }));
}

function render() {
  if (!state) return;
  const { settings, current } = state;
  const showPicker = picking || !current.city;
  $('main').setAttribute('aria-busy', 'false');
  $('mode-banner').hidden = settings.mode !== 'demo';
  $('preview-banner').hidden = isExtension;
  $('network-message').hidden = !current.error;
  $('network-message').textContent = current.error ?? '';
  $('picker').hidden = !showPicker;
  $('picker-back').hidden = !current.city;
  $('bottom-nav').hidden = showPicker;
  for (const name of ['prices', 'history', 'settings']) $(`${name}-view`).hidden = showPicker || view !== name;
  for (const button of $('bottom-nav').querySelectorAll('button')) {
    if (button.dataset.view === view) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  }
  if (showPicker) { renderCities(); return; }

  $('city-name').textContent = current.city.name;
  $('check-status').textContent = current.error ? 'Önbellek' : `${ago(current.checkedAt)} kontrol`;
  $('check-status').classList.toggle('offline', Boolean(current.error));
  $('fuel-tabs').replaceChildren(...FUELS.map(fuel => {
    const button = create('button', null, fuel.label);
    button.type = 'button'; button.dataset.fuel = fuel.key;
    button.setAttribute('aria-pressed', String(fuel.key === settings.fuel)); return button;
  }));
  $('price-label').textContent = `${fuelLabel(settings.fuel)} litre fiyatı`;
  const digits = current.price == null ? ['—', ''] : money(current.price).split(',');
  $('price-whole').textContent = digits[0];
  $('price-fraction').textContent = digits[1] ? `,${digits[1]}` : '';
  $('price-line').setAttribute('aria-label', current.price == null ? 'Fiyat bilgisi yok' : `${money(current.price)} lira, litre fiyatı`);
  $('source-date').textContent = `Fiyat kaydı: ${ago(current.latest.updatedAt).toLocaleLowerCase('tr-TR')}`;
  const compare = comparison(current.latest, settings.city, settings.fuel);
  $('comparison').hidden = !compare;
  if (compare) {
    const difference = compare.difference;
    $('compare-text').textContent = Math.abs(difference) < 0.005 ? 'Türkiye ortalamasıyla aynı' : `Ortalamadan ${money(Math.abs(difference))} ₺ ${difference > 0 ? 'pahalı' : 'ucuz'}`;
    $('compare-text').parentElement.classList.toggle('expensive', difference > 0.005);
    $('cheapest-name').textContent = compare.cheapest.name;
    $('cheapest-price').textContent = `${money(compare.cheapest.price)} ₺`;
    $('region-count').textContent = `${compare.count} bölge`;
    $('average-price').textContent = `${money(compare.average)} ₺`;
  }
  $('tank-options').replaceChildren(...TANKS.map(liters => {
    const button = create('button', null, `${liters} L`); button.type = 'button'; button.dataset.liters = liters;
    button.setAttribute('aria-pressed', String(liters === settings.liters)); return button;
  }));
  $('tank-total').textContent = current.price == null ? '—' : whole(current.price * settings.liters);
  $('tank-detail').textContent = `${settings.liters} litre · KDV dahil`;
  $('copy-price').disabled = current.price == null;
  $('quick-notify-title').textContent = settings.notify ? 'Bildirimler açık' : 'Fiyat değişince haber al';
  $('quick-notify-detail').textContent = settings.notify ? `${current.city.name} · ${fuelLabel(settings.fuel)}` : 'Zamı da indirimi de takip et';
  $('notify-toggle').setAttribute('aria-checked', String(settings.notify));
  $('badge-toggle').setAttribute('aria-checked', String(settings.badge));
  $('notify-detail').textContent = settings.notify ? `${current.city.name} ${fuelLabel(settings.fuel)} izleniyor. İlk kontrol başlangıç fiyatını kaydeder; geçmiş değişiklikler için bildirim gönderilmez.` : 'İzin yalnızca bu anahtarı açtığında istenir. Chrome kapalıyken bildirim gelmez.';
  $('notify-error').hidden = !state.notificationError;
  $('notify-error').textContent = state.notificationError ?? '';
  $('test-notify').hidden = !settings.notify;
  if (view === 'history') renderHistory();
}

async function pickCity(city) {
  const result = await act('select', { city });
  if (!result) return;
  picking = false; view = 'prices'; $('city-search').value = ''; $('main').scrollTop = 0; render();
}

for (const id of ['cities', 'popular-cities']) $(id).addEventListener('click', event => {
  const button = event.target.closest('button[data-city]'); if (button) void pickCity(button.dataset.city);
});
$('city-search').addEventListener('input', renderCities);
$('choose-city').addEventListener('click', () => { picking = true; render(); $('main').scrollTop = 0; $('city-search').focus(); });
$('picker-back').addEventListener('click', () => { picking = false; render(); });
$('fuel-tabs').addEventListener('click', event => { const fuel = event.target.closest('button')?.dataset.fuel; if (fuel) void act('select', { fuel }); });
$('tank-options').addEventListener('click', event => { const liters = event.target.closest('button')?.dataset.liters; if (liters) void act('liters', { value: Number(liters) }); });
$('bottom-nav').addEventListener('click', event => { const next = event.target.closest('button')?.dataset.view; if (next) showView(next); });
$('quick-notify').addEventListener('click', () => showView('settings'));
$('refresh').addEventListener('click', async () => { await act('refresh', { force: true }); if (view === 'history') await act('history', { force: true }); });
$('picker-demo').addEventListener('click', () => { void act('mode', { value: 'demo' }); });
$('badge-toggle').addEventListener('click', () => { void act('badge', { value: !state.settings.badge }); });
$('notify-toggle').addEventListener('click', async () => {
  if (busy) return;
  const on = !state.settings.notify;
  try {
    if (on && !(await requestNotifications())) { toast('Bildirim izni verilmedi. Fiyatları takip etmeye devam edebilirsin.'); return; }
    await act('notify', { value: on });
  } catch { toast('Bildirim izni alınamadı. Chrome eklenti ayarlarını kontrol et.'); }
});
$('test-notify').addEventListener('click', async () => { if (await act('test-notification')) toast(isExtension ? 'Test Chrome’a iletildi. Görünmesi sistem bildirim ayarlarına bağlıdır.' : 'Önizleme testi tamamlandı; işletim sistemi bildirimi gösterilmez.'); });
$('open-devtools').addEventListener('click', () => { openPage('devtools.html'); });
$('copy-price').addEventListener('click', async () => {
  try {
    const { settings, current } = state;
    const text = settings.mode === 'demo' ? '🧪 Depo Dolu örnek verisi; canlı fiyat değildir.' : `${current.city.name} ${fuelLabel(settings.fuel)}: ${money(current.price)} ₺/L. Kaynak: Petrol Ofisi il listesi.`;
    await navigator.clipboard.writeText(`${text}\n${selectionUrl(settings.city, settings.fuel)}`);
    toast('Fiyat ve bağlantı kopyalandı.');
  } catch { toast('Kopyalanamadı. Eklentiyi tekrar açıp dene.'); }
});

onState(next => { state = next; render(); });
try {
  state = await send('init'); render();
  await act('refresh');
} catch (error) {
  $('main').setAttribute('aria-busy', 'false');
  $('network-message').hidden = false; $('network-message').textContent = error.message;
  $('picker').hidden = false; $('picker-empty').hidden = false;
}
