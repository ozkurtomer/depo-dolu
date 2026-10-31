import { Injectable } from '@angular/core';
import { Capacitor, registerPlugin } from '@capacitor/core';

/** Android tarafındaki küçük köprü (WidgetBridge.java): ana ekran kutusunu ve alarm kontrolünü tetikler. */
interface DepoDoluWidgetPlugin {
  refresh(): Promise<void>;
}

const Native = registerPlugin<DepoDoluWidgetPlugin>('DepoDoluWidget');

@Injectable({ providedIn: 'root' })
export class WidgetService {
  readonly supported = Capacitor.getPlatform() === 'android';
  private timer: ReturnType<typeof setTimeout> | null = null;

  /** Ayarlar art arda değişebilir (il + yakıt); son değişiklikten kısa süre sonra bir kez yenile. */
  refresh(): void {
    if (!this.supported) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      Native.refresh().catch(err => console.warn('Ana ekran kutusu yenilenemedi', err));
    }, 800);
  }
}
