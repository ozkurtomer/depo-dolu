import { getLang, locale, t } from './i18n';

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();
function nf(key: string, options: Intl.NumberFormatOptions) {
  const id = `n|${key}|${locale()}`;
  if (!cache.has(id)) cache.set(id, new Intl.NumberFormat(locale(), options));
  return cache.get(id) as Intl.NumberFormat;
}
function df(key: string, options: Intl.DateTimeFormatOptions) {
  const id = `d|${key}|${locale()}`;
  if (!cache.has(id)) cache.set(id, new Intl.DateTimeFormat(locale(), options));
  return cache.get(id) as Intl.DateTimeFormat;
}

export const tl = (v: number) => nf('money', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
export const tlWhole = (v: number) => nf('whole', { maximumFractionDigits: 0 }).format(v);
export const shortDate = (d: Date) => df('short', { day: 'numeric', month: 'short' }).format(d);

/** Yüzde yazımı: Türkçede "%1,43", İngilizcede "1.43%". */
export const pct = (v: number) => (getLang() === 'en' ? `${tl(v)}%` : `%${tl(v)}`);

/** Ondalık ayracı dile göre değişir ("96,40" ya da "96.40"). */
export const decimalSeparator = () => (getLang() === 'en' ? '.' : ',');

/** "az önce", "3 saat önce", "dün", "4 gün önce", "12 Ekim" */
export function ago(input: string | Date, now = new Date()): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const mins = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (mins < 2) return t('ago.now');
  if (mins < 60) return t('ago.min', { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24 && d.getDate() === now.getDate()) return t('ago.hour', { n: hours });
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days <= 1) return t('ago.yesterday');
  if (days < 7) return t('ago.days', { n: days });
  return df('day', { day: 'numeric', month: 'long' }).format(d);
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Türkçe sıralama için: "Çanakkale" C'den sonra, "İzmir" I'dan sonra gelsin. */
export const trCompare = new Intl.Collator('tr-TR').compare;

/** Arama için sadeleştirme: "Şanlı" → "sanli", "izm" → "izmir"i bulur. */
export function fold(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}
