package com.omerozkurt.depodolu;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Yerel eklenti super.onCreate'ten önce kaydedilmeli.
        registerPlugin(WidgetBridge.class);
        super.onCreate(savedInstanceState);
        // Ana ekran kutusu ve fiyat alarmı için saatlik kontrol (kutu ya da alarm yoksa ağa çıkmaz).
        PriceWorker.schedule(this);
    }
}
