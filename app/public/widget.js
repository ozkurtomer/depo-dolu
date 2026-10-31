/*!
 * Depo Dolu fiyat kutusu — https://github.com/ozkurtomer/depo-dolu
 * Kullanım:
 *   <div data-depodolu-il="bursa" data-depodolu-yakit="motorin"></div>
 *   <script src="https://ozkurtomer.github.io/depo-dolu/widget.js" async></script>
 * İsteğe bağlı: data-depodolu-tema="koyu", data-depodolu-genislik="320".
 * Her kutu bir iframe'dir: sayfanın stilini ve verisini etkilemez, çerez kullanmaz.
 */
(() => {
  const script = document.currentScript;
  const base = script && script.src ? new URL('.', script.src).href : 'https://ozkurtomer.github.io/depo-dolu/';

  function mount(node) {
    if (node.dataset.depodoluMounted) return;
    const city = node.dataset.depodoluIl;
    if (!city) return;
    const fuel = node.dataset.depodoluYakit;
    const url = new URL('embed.html', base);
    url.searchParams.set('il', city);
    if (fuel) url.searchParams.set('yakit', fuel);
    if (node.dataset.depodoluTema) url.searchParams.set('tema', node.dataset.depodoluTema);

    const frame = document.createElement('iframe');
    frame.src = url.href;
    frame.title = 'Akaryakıt fiyatı — Depo Dolu';
    frame.loading = 'lazy';
    frame.width = node.dataset.depodoluGenislik || '320';
    frame.height = fuel ? '150' : '130';
    frame.style.border = '0';
    frame.style.maxWidth = '100%';
    node.dataset.depodoluMounted = '1';
    node.replaceChildren(frame);
  }

  const run = () => document.querySelectorAll('[data-depodolu-il]').forEach(mount);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
  else run();
})();
