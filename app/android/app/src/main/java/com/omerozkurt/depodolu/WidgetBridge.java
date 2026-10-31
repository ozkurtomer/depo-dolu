package com.omerozkurt.depodolu;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Web tarafı (widget.service.ts) ayar değişince bunu çağırır: kutu ve alarm hemen yeni seçimi görür. */
@CapacitorPlugin(name = "DepoDoluWidget")
public class WidgetBridge extends Plugin {

    @PluginMethod
    public void refresh(PluginCall call) {
        PriceWorker.schedule(getContext());
        PriceWorker.refreshNow(getContext());
        call.resolve();
    }
}
