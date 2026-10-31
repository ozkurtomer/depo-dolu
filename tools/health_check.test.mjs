import assert from 'node:assert/strict';
import test from 'node:test';
import { assess, report } from './health_check.mjs';

const now = new Date('2026-11-01T12:00:00Z');
const run = (minutesAgo, conclusion, status = 'completed') => ({
  status, conclusion, updated_at: new Date(now - minutesAgo * 60_000).toISOString(), html_url: `https://x/${minutesAgo}`,
});
const fresh = new Date(now - 2 * 86400_000).toISOString();

test('düzenli çalışan toplayıcı sağlıklı', () => {
  const r = assess({ runs: [run(5, 'success'), run(20, 'success')], latestUpdatedAt: fresh, now });
  assert.deepEqual(r, { healthy: true, problems: [] });
});

test('tek tük başarısızlık alarm değil, üst üste üç başarısızlık alarm', () => {
  assert.equal(assess({ runs: [run(5, 'failure'), run(20, 'success')], latestUpdatedAt: fresh, now }).healthy, true);
  const r = assess({ runs: [run(5, 'failure'), run(20, 'failure'), run(35, 'failure'), run(50, 'success')], latestUpdatedAt: fresh, now });
  assert.equal(r.healthy, false);
  assert.match(r.problems[0], /Son 3 çalıştırma başarısız/);
});

test('uzun sessizlik ve hiç başarı olmaması yakalanır', () => {
  assert.match(assess({ runs: [run(300, 'success')], latestUpdatedAt: fresh, now }).problems[0], /5 saattir/);
  assert.match(assess({ runs: [run(5, 'failure')], latestUpdatedAt: fresh, now }).problems[0], /hiçbiri başarılı değil/);
  // Süren çalıştırma sayılmaz.
  assert.equal(assess({ runs: [run(1, null, 'in_progress'), run(10, 'success')], latestUpdatedAt: fresh, now }).healthy, true);
});

test('haftalarca değişmeyen fiyat kaynak sorununa işaret eder', () => {
  const old = new Date(now - 9 * 86400_000).toISOString();
  const r = assess({ runs: [run(5, 'success')], latestUpdatedAt: old, now });
  assert.match(r.problems[0], /9 gündür fiyat değişmedi/);
});

test('rapor metni sorunları ve iş akışı bağlantısını taşır', () => {
  const r = report(['A sorunu'], 'o/r');
  assert.match(r.body, /- A sorunu/);
  assert.match(r.telegram, /github\.com\/o\/r\/actions\/workflows\/collect\.yml/);
});
