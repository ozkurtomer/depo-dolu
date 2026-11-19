import { Injectable, signal } from '@angular/core';
import { Lang, getLang, setLang } from '../i18n';

const KEY = 'dd-lang';

function stored(): Lang | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'tr' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

/** Tarayıcının ilk tercihi İngilizceyse İngilizce, aksi halde Türkçe. Seçim cihazda saklanır. */
function detect(): Lang {
  const first = (navigator.languages?.[0] ?? navigator.language ?? '').toLowerCase();
  return first.startsWith('en') ? 'en' : 'tr';
}

/** Arayüz dili. `lang()` sinyalini okuyan computed'lar dil değişince yeniden hesaplanır. */
@Injectable({ providedIn: 'root' })
export class LangService {
  readonly lang = signal<Lang>(getLang());

  constructor() {
    this.apply(stored() ?? detect());
  }

  toggle() {
    const next: Lang = this.lang() === 'tr' ? 'en' : 'tr';
    this.apply(next);
    try {
      localStorage.setItem(KEY, next);
    } catch { /* Saklanamazsa seçim sadece bu oturumda geçerli olur. */ }
  }

  private apply(lang: Lang) {
    setLang(lang);
    this.lang.set(lang);
    document.documentElement.lang = lang;
  }
}
