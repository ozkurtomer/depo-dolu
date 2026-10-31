import type { FuelKey } from './models';

/**
 * data/announcements.json: yaklaşan zam/indirim duyuruları. Gözlenen pompa fiyatından
 * ayrı tutulur; bakımcı resmi ya da basında çıkan bir duyuruyu kaynağıyla ekler
 * (bkz. .github/workflows/announce.yml). Uygulama bunu "beklenen" diye gösterir,
 * fiyat değişene kadar asıl fiyatın yerine koymaz.
 */
export interface Announcement {
  id: string;
  fuel: FuelKey;
  /** Litre başına beklenen değişim, ₺. Zam pozitif, indirim negatif. */
  change: number;
  effectiveAt: string;
  source: string;
  sourceUrl?: string;
  publishedAt: string;
}

export interface AnnouncementsFile {
  items: Announcement[];
}

const FUELS: FuelKey[] = ['benzin', 'motorin', 'lpg'];

export function isAnnouncement(value: unknown): value is Announcement {
  if (!value || typeof value !== 'object') return false;
  const a = value as Announcement;
  return typeof a.id === 'string' && FUELS.includes(a.fuel) &&
    typeof a.change === 'number' && Number.isFinite(a.change) && a.change !== 0 && Math.abs(a.change) < 50 &&
    typeof a.effectiveAt === 'string' && Number.isFinite(Date.parse(a.effectiveAt)) &&
    typeof a.source === 'string' && a.source.trim().length > 0 &&
    (a.sourceUrl === undefined || (typeof a.sourceUrl === 'string' && /^https:\/\//.test(a.sourceUrl)));
}

/**
 * Gösterilecek duyurular: geçerli olanlar, yürürlüğe girmemiş ya da girmesinin üzerinden
 * en çok `graceHours` geçmiş olanlar (toplayıcı fiyatı birkaç dakika gecikmeli görür).
 */
export function upcoming(file: unknown, now = new Date(), graceHours = 3): Announcement[] {
  const items = (file && typeof file === 'object' && Array.isArray((file as AnnouncementsFile).items))
    ? (file as AnnouncementsFile).items : [];
  const cutoff = now.getTime() - graceHours * 3_600_000;
  return items
    .filter(isAnnouncement)
    .filter(a => Date.parse(a.effectiveAt) >= cutoff)
    .sort((a, b) => Date.parse(a.effectiveAt) - Date.parse(b.effectiveAt));
}
