import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dictionaryKeys, getLang, setLang, t } from '../src/app/i18n.ts';
import { ago, tl } from '../src/app/format.ts';
import { fuelLabel } from '../src/app/models.ts';
import { validateTarget } from '../src/app/alarm.ts';
import { EMPTY_LOG, toCsv } from '../src/app/fuel-log.ts';

const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');

test('Varsayılan dil Türkçedir (Node ortamının dili etkilemez)', () => {
  assert.equal(getLang(), 'tr');
});

test('Her anahtar iki dilde de var', () => {
  const tr = dictionaryKeys('tr');
  const en = dictionaryKeys('en');
  assert.deepEqual(tr.filter(k => !en.includes(k)), [], 'İngilizcesi eksik anahtarlar');
  assert.deepEqual(en.filter(k => !tr.includes(k)), [], 'Türkçesi eksik anahtarlar');
});

test('Yer tutucular iki dilde aynı', () => {
  for (const key of dictionaryKeys('tr')) {
    assert.equal(placeholders(t(key, undefined, 'en')), placeholders(t(key, undefined, 'tr')), key);
  }
});

test('Eksik anahtar Türkçeye, o da yoksa anahtarın kendisine döner', () => {
  assert.equal(t('yok.boyle.bir.anahtar'), 'yok.boyle.bir.anahtar');
  assert.equal(t('ago.now', undefined, 'tr'), 'az önce');
  assert.equal(t('ago.min', { n: 5 }, 'en'), '5 min ago');
});

test('Dil değişince sayı, tarih ve yakıt adları değişir', () => {
  const now = new Date('2026-11-19T12:00:00Z');
  try {
    setLang('en');
    assert.equal(tl(96.4), '96.40');
    assert.equal(fuelLabel('motorin'), 'Diesel');
    assert.equal(ago(new Date(now.getTime() - 10 * 60_000), now), '10 min ago');
    assert.match(validateTarget(null, 50), /target price/i);
    assert.match(toCsv(EMPTY_LOG), /^date;vehicle;litres/);
  } finally {
    setLang('tr');
  }
  assert.equal(tl(96.4), '96,40');
  assert.equal(fuelLabel('motorin'), 'Motorin');
  assert.equal(ago(new Date(now.getTime() - 10 * 60_000), now), '10 dk önce');
});
