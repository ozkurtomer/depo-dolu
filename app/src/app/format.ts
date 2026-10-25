const money = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const day = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' });
const shortDay = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' });

export const tl = (v: number) => money.format(v);
export const tlWhole = (v: number) => whole.format(v);
export const shortDate = (d: Date) => shortDay.format(d);

/** "az önce", "3 saat önce", "dün", "4 gün önce", "12 Ekim" */
export function ago(input: string | Date, now = new Date()): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  const mins = Math.round((now.getTime() - d.getTime()) / 60_000);
  if (mins < 2) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.round(mins / 60);
  if (hours < 24 && d.getDate() === now.getDate()) return `${hours} saat önce`;
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days <= 1) return 'dün';
  if (days < 7) return `${days} gün önce`;
  return day.format(d);
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
