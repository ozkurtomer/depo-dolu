import { send, onState, isExtension, requestNotifications } from './platform.js';
import { money, ago, fuelLabel } from './data.js';

const $ = id => document.getElementById(id);
let state;
let busy = false;
function message(text, error = false) { $('dev-message').textContent = text; $('dev-message').classList.toggle('error', error); }
function render(next) {
  state = next;
  const demo = state.settings.mode === 'demo';
  $('environment').textContent = isExtension ? 'Yüklü Chrome eklentisi · gerçek storage / alarms / notifications API’leri' : 'Tasarım önizlemesi · Chrome API’leri taklit edilir, işletim sistemi bildirimi gösterilmez';
  $('mode-detail').textContent = `${demo ? 'Deneme modu açık' : 'Canlı kaynak açık'}${state.current.city ? ` · ${state.current.city.name} / ${fuelLabel(state.settings.fuel)}` : ' · Pencereden bir il seç'}${state.demo.offline && demo ? ' · Bağlantı hatası benzetiliyor' : ''}`;
  $('demo-mode').disabled = busy || demo;
  $('live-mode').disabled = busy || !demo || !isExtension;
  for (const id of ['increase', 'decrease']) $(id).disabled = busy || !demo || state.current.price == null;
  for (const id of ['offline', 'reset-demo']) $(id).disabled = busy || !demo;
  $('offline').textContent = state.demo.offline ? 'Bağlantıyı geri getir' : 'Bağlantı hatasını benzet';
  $('enable-notify').textContent = state.settings.notify ? 'Bildirimleri kapat' : 'Bildirimleri aç';
  $('enable-notify').disabled = busy || !state.settings.city;
  $('test-notification').disabled = busy || !state.settings.notify;
  $('delivery-count').textContent = `${state.deliveries.length} kayıt`;
  $('delivery-empty').hidden = state.deliveries.length > 0;
  $('deliveries').replaceChildren(...[...state.deliveries].reverse().map(item => {
    const row = document.createElement('li');
    const title = document.createElement('strong');
    title.textContent = `${item.mode === 'demo' ? '🧪 Deneme · ' : ''}${item.name} ${fuelLabel(item.fuel)} · ${money(item.old)} → ${money(item.new)} ₺`;
    const time = document.createElement('span'); time.textContent = `${ago(item.deliveredAt)} · ${isExtension ? 'Chrome API teslimi' : 'Önizlemede taklit edilen teslim'}`;
    row.append(title, time); return row;
  }));
}
async function run(type, payload, text) {
  if (busy) return;
  busy = true;
  if (state) render(state);
  try {
    const next = await send(type, payload);
    if (type === 'mode' && payload.value === 'demo' && !next.settings.city) await send('select', { city: 'bursa' });
    render(await send('get'));
    message(text);
  } catch (error) { message(error.message, true); }
  finally { busy = false; if (state) render(state); }
}
$('demo-mode').addEventListener('click', () => { void run('mode', { value: 'demo' }, 'Deneme modu açıldı. Sağdaki pencereden yakıt seç veya bir fiyat değişikliği oluştur.'); });
$('live-mode').addEventListener('click', () => { void run('mode', { value: 'live' }, 'Canlı kaynağa dönüldü. Deneme verisi canlı fiyatlarla karıştırılmaz.'); });
$('increase').addEventListener('click', () => { void run('demo-change', { delta: 1.3 }, 'Örnek zam uygulandı. Bildirimler açıksa Chrome’a bir deneme uyarısı iletildi.'); });
$('decrease').addEventListener('click', () => { void run('demo-change', { delta: -0.5 }, 'Örnek indirim uygulandı. Bildirimler açıksa Chrome’a bir deneme uyarısı iletildi.'); });
$('offline').addEventListener('click', () => { void run('demo-offline', { value: !state.demo.offline }, state.demo.offline ? 'Bağlantı geri getirildi.' : 'Bağlantı hatası benzetiliyor. Pencerede son kaydedilen veri ve uyarı görünür.'); });
$('reset-demo').addEventListener('click', () => { void run('demo-reset', {}, 'Yalnızca örnek fiyatlar ve deneme geçmişi başlangıca döndü.'); });
$('enable-notify').addEventListener('click', async () => {
  if (busy) return;
  const on = !state.settings.notify;
  try {
    if (on && !(await requestNotifications())) { message('Bildirim izni verilmedi.', true); return; }
    await run('notify', { value: on }, on ? 'Bildirimler açıldı ve başlangıç fiyatı kaydedildi. Şimdi zam / indirim düğmesini dene.' : 'Bildirimler kapatıldı; arka plan alarmı kaldırıldı.');
  } catch (error) { message(error.message, true); }
});
$('test-notification').addEventListener('click', () => { void run('test-notification', {}, isExtension ? 'Test bildirimi Chrome’a iletildi. Görünmesi sistem bildirim ayarlarına bağlı.' : 'Önizleme bildirimi taklit edildi; işletim sistemi bildirimi gösterilmez.'); });
onState(render);
window.addEventListener('depodolu-preview-notification', event => { message(`Önizleme bildirimi: ${event.detail.title}`); });
try { render(await send('init')); message(state.settings.city ? 'Hazır. Örnek bir zam veya indirim oluşturabilirsin.' : 'Hazır. Sağdaki pencereden bir il seçerek başlayabilirsin.'); }
catch (error) { message(error.message, true); }
