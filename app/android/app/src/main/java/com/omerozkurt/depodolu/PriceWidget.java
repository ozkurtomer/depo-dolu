package com.omerozkurt.depodolu;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.text.format.DateFormat;
import android.widget.RemoteViews;
import java.util.Date;

/** Ana ekran kutusu: seçili ilin seçili yakıt fiyatı. Veriyi PriceWorker getirir. */
public class PriceWidget extends AppWidgetProvider {

    private static final long STALE_MS = 6 * 60 * 60 * 1000L;

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        render(context, manager, ids);
        PriceWorker.schedule(context);
        PriceWorker.refreshNow(context);
    }

    @Override
    public void onEnabled(Context context) {
        PriceWorker.schedule(context);
    }

    static int[] ids(Context context) {
        return AppWidgetManager.getInstance(context).getAppWidgetIds(new ComponentName(context, PriceWidget.class));
    }

    static void updateAll(Context context) {
        int[] ids = ids(context);
        if (ids.length > 0) render(context, AppWidgetManager.getInstance(context), ids);
    }

    private static void render(Context context, AppWidgetManager manager, int[] ids) {
        SharedPreferences store = WidgetStore.prefs(context);
        String cityName = store.getString("cityName", null);
        String fuel = store.getString("fuel", "benzin");
        String price = store.getString("price", null);
        long fetchedAt = store.getLong("fetchedAt", 0);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_price);
        if (cityName == null || price == null) {
            views.setTextViewText(R.id.widget_title, "Depo Dolu");
            views.setTextViewText(R.id.widget_price, "–");
            views.setTextViewText(R.id.widget_sub, "İl seçmek için dokun");
        } else {
            views.setTextViewText(R.id.widget_title, cityName + " · " + WidgetStore.fuelLabel(fuel));
            views.setTextViewText(R.id.widget_price, WidgetStore.money(Double.parseDouble(price)) + " ₺");
            String time = DateFormat.getTimeFormat(context).format(new Date(fetchedAt));
            boolean stale = System.currentTimeMillis() - fetchedAt > STALE_MS;
            views.setTextViewText(R.id.widget_sub, (stale ? "Son veri " : "Kontrol ") + time);
        }

        Intent open = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tap = PendingIntent.getActivity(context, 1, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        views.setOnClickPendingIntent(R.id.widget_root, tap);
        manager.updateAppWidget(ids, views);
    }
}
