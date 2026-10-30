import { isDevMode } from '@angular/core';

/**
 * Fiyat verisinin okunduğu adres.
 * Toplayıcı (GitHub Actions) fiyatları reponun data/ klasörüne commit'ler,
 * uygulama da onları doğrudan GitHub'dan okur. Sunucu yok, maliyet yok.
 * Geliştirirken (ng serve) yerel ../data klasörü /data adresinden sunulur.
 */
const GITHUB_DATA_URL = 'https://raw.githubusercontent.com/ozkurtomer/depo-dolu/main/data';

export const DATA_BASE_URL = isDevMode() ? '/data' : GITHUB_DATA_URL;

/**
 * Telegram kanalının adresi (herkese tüm Türkiye özeti), ör. 'https://t.me/depodolu'.
 */
export const TELEGRAM_URL = 'https://t.me/depodolu';

/**
 * Kişisel Telegram botu: kullanıcı sadece kendi ilinin bildirimini alır.
 * Web'deki düğme seçili ili ve yakıtı bota taşır: t.me/depodolu_bot?start=bursa_motorin
 * Boşsa düğme kanala yönlenir.
 */
export const TELEGRAM_BOT_URL = 'https://t.me/depodolu_bot';

export const REPO_URL = 'https://github.com/ozkurtomer/depo-dolu';
export const WEB_URL = 'https://ozkurtomer.github.io/depo-dolu/';
