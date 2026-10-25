import { isDevMode } from '@angular/core';

/**
 * Fiyat verisinin okunduğu adres.
 *
 * Toplayıcı (GitHub Actions) fiyatları reponun data/ klasörüne commit'ler,
 * uygulama da onları doğrudan GitHub'dan okur — sunucu yok, maliyet yok.
 *
 * Kendi reponu açtıktan sonra KULLANICI_ADI kısmını değiştir.
 * Geliştirirken (ng serve) yerel ../data klasörü /data adresinden sunulur.
 */
const GITHUB_DATA_URL = 'https://raw.githubusercontent.com/KULLANICI_ADI/depo-dolu/main/data';

export const DATA_BASE_URL = isDevMode() ? '/data' : GITHUB_DATA_URL;
