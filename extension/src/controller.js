import { POLL_MINUTES, FUELS, TANKS, validLatest, validHistory, validPrice, stateFrom, snapshot,
  topicFor, notificationChange, notificationMessage, demoHistory } from './data.js';

/** Chrome'dan bağımsız iş akışı; tüm yazmalar tek sırada ve kalıcı depoda. */
export function createController(io) {
  let queue = Promise.resolve();
  const now = () => io.now?.() ?? Date.now();
  const iso = () => new Date(now()).toISOString();
  const save = async state => { await io.write(state); try { await io.badge?.(snapshot(state)); } catch { /* Rozet hatası veriyi geri almaz. */ } };
  const hasPermission = async () => Boolean(await io.hasNotifications());

  async function alarm(state) {
    await io.alarm(state.settings.notify);
  }

  async function ensureDemo(state) {
    if (state.demo.latest) return;
    const latest = structuredClone(await io.loadDemo());
    if (!validLatest(latest)) throw new Error('Örnek veri okunamadı.');
    latest.updatedAt = iso();
    state.demo.latest = latest;
  }

  async function refresh(state, force = false) {
    const mode = state.settings.mode;
    const cache = state.cache[mode];
    if (!force && cache.latest && cache.checkedAt && !cache.error && now() - Date.parse(cache.checkedAt) < POLL_MINUTES * 60000)
      return;

    let latest;
    try {
      if (mode === 'demo') {
        await ensureDemo(state);
        if (state.demo.offline) throw new Error('Deneme bağlantı hatası');
        latest = structuredClone(state.demo.latest);
      } else latest = await io.fetchLatest();
      if (!validLatest(latest)) throw new Error('Geçersiz kaynak verisi');
    } catch {
      cache.error = cache.latest ? 'Bağlantı kurulamadı. Son kaydedilen fiyatları görüyorsun.' : 'Fiyatlar alınamadı. Bağlantını kontrol edip tekrar dene.';
      await save(state);
      return;
    }

    cache.latest = latest;
    cache.checkedAt = iso();
    cache.error = null;
    await save(state); // Ağ sonucu, bildirim sağlayıcısından bağımsız korunur.

    if (state.settings.notify && !(await hasPermission())) {
      state.settings.notify = false;
      state.baseline = null;
      state.notificationError = 'Bildirim izni kapatılmış. Yeniden açmak için Ayarlar bölümünü kullan.';
      await alarm(state);
      await save(state);
      return;
    }

    const change = notificationChange(state, latest);
    if (change) {
      try {
        const id = `dd:${topicFor(state.settings)}:${change.at}:${change.new}`;
        await io.notify(id, notificationMessage(change));
        state.deliveries = [...state.deliveries, { ...change, deliveredAt: iso() }].slice(-10);
        state.notificationError = null;
      } catch {
        // Temel fiyat ilerletilmez: sonraki başarılı kontrolde tekrar denenir.
        state.notificationError = 'Bildirim gönderilemedi. Sonraki kontrolde tekrar denenecek.';
        await save(state);
        return;
      }
    }
    const price = latest.prices[state.settings.city]?.[state.settings.fuel];
    state.baseline = state.settings.notify && validPrice(price)
      ? { topic: topicFor(state.settings), price, mode } : null;
    await save(state);
  }

  async function history(state, force = false) {
    const slug = state.settings.city;
    const cache = state.cache[state.settings.mode];
    if (!slug || !Object.hasOwn(cache.latest?.prices ?? {}, slug)) return;
    const prior = cache.histories[slug];
    if (!force && prior && now() - Date.parse(prior.checkedAt) < POLL_MINUTES * 60000) return;
    try {
      let entries;
      if (state.settings.mode === 'demo') {
        if (state.demo.offline) throw new Error('Deneme bağlantı hatası');
        state.demo.histories[slug] ??= demoHistory(cache.latest.prices[slug], now());
        entries = state.demo.histories[slug];
      } else entries = await io.fetchHistory(slug);
      if (!validHistory(entries)) throw new Error('Geçersiz geçmiş');
      cache.histories[slug] = { entries, checkedAt: iso(), error: null };
    } catch {
      cache.histories[slug] = { entries: validHistory(prior?.entries) ? prior.entries : [],
        checkedAt: prior?.checkedAt ?? null, error: 'Fiyat geçmişi alınamadı. Daha sonra tekrar dene.' };
    }
    await save(state);
  }

  async function execute(type, payload = {}) {
    const state = stateFrom(await io.read());
    switch (type) {
      case 'get': return snapshot(state);
      case 'init':
        if (state.settings.notify && !(await hasPermission())) state.settings.notify = false;
        await alarm(state);
        await save(state);
        return snapshot(state);
      case 'refresh': await refresh(state, payload.force === true); break;
      case 'history': await history(state, payload.force === true); break;
      case 'select': {
        const cache = state.cache[state.settings.mode];
        const city = payload.city ?? state.settings.city;
        const fuel = payload.fuel ?? state.settings.fuel;
        if (!Object.hasOwn(cache.latest?.prices ?? {}, city) || !FUELS.some(f => f.key === fuel)) throw new Error('Geçerli bir il ve yakıt seç.');
        if (city !== state.settings.city || fuel !== state.settings.fuel) state.baseline = null;
        state.settings.city = city;
        state.settings.fuel = fuel;
        await save(state);
        if (state.settings.notify) await refresh(state, true);
        break;
      }
      case 'liters':
        if (!TANKS.includes(payload.value)) throw new Error('Geçersiz depo litresi.');
        state.settings.liters = payload.value;
        await save(state);
        break;
      case 'badge': state.settings.badge = payload.value === true; await save(state); break;
      case 'notify':
        if (payload.value === true) {
          if (!state.settings.city) throw new Error('Önce bir il seç.');
          if (!(await hasPermission())) throw new Error('Bildirim izni verilmedi.');
        }
        state.settings.notify = payload.value === true;
        state.notificationError = null;
        state.baseline = null;
        await save(state);
        await alarm(state);
        if (state.settings.notify) await refresh(state, true);
        break;
      case 'mode':
        if (!['live', 'demo'].includes(payload.value)) throw new Error('Geçersiz veri modu.');
        if (state.settings.mode !== payload.value) state.baseline = null;
        state.settings.mode = payload.value;
        if (payload.value === 'demo') await ensureDemo(state);
        await save(state);
        await refresh(state, true);
        break;
      case 'demo-change': {
        if (state.settings.mode !== 'demo') throw new Error('Önce deneme modunu aç.');
        if (!state.settings.city) throw new Error('Önce bir il seç.');
        if (![1.3, -0.5].includes(payload.delta)) throw new Error('Geçersiz deneme değişikliği.');
        await ensureDemo(state);
        const slug = state.settings.city;
        const city = state.demo.latest.prices[slug];
        if (!validPrice(city[state.settings.fuel])) throw new Error('Bu yakıt için örnek fiyat yok.');
        const next = Math.round((city[state.settings.fuel] + payload.delta) * 100) / 100;
        if (!validPrice(next)) throw new Error('Fiyat bu aralıkta değiştirilemez.');
        state.demo.histories[slug] ??= demoHistory(city, now());
        city[state.settings.fuel] = next;
        city.changedAt = iso();
        state.demo.latest.updatedAt = iso();
        state.demo.histories[slug].push({ at: iso(), ...Object.fromEntries(FUELS.map(f => [f.key, city[f.key]])) });
        state.demo.histories[slug] = state.demo.histories[slug].slice(-400);
        state.demo.offline = false;
        await save(state);
        await refresh(state, true);
        await history(state, true);
        break;
      }
      case 'demo-offline':
        if (state.settings.mode !== 'demo') throw new Error('Bu işlem yalnızca deneme modunda kullanılabilir.');
        state.demo.offline = payload.value === true;
        await save(state);
        await refresh(state, true);
        break;
      case 'demo-reset':
        if (state.settings.mode !== 'demo') throw new Error('Bu işlem yalnızca deneme modunda kullanılabilir.');
        state.demo = { latest: null, offline: false, histories: {} };
        state.cache.demo = { latest: null, checkedAt: null, error: null, histories: {} };
        state.baseline = null;
        await ensureDemo(state);
        await save(state);
        await refresh(state, true);
        break;
      case 'test-notification':
        if (!(await hasPermission())) throw new Error('Önce bildirim izni ver.');
        await io.notify('dd:test', { title: '🧪 Depo Dolu · Deneme', message: 'Bu bir test bildirimi. Gerçek bir fiyat değişikliği değil.' });
        break;
      default: throw new Error('Bu işlem desteklenmiyor.');
    }
    return snapshot(state);
  }

  return { handle(type, payload) {
    const task = queue.then(() => execute(type, payload));
    queue = task.catch(() => {});
    return task;
  } };
}
