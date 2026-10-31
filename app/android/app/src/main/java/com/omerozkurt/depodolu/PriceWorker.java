package com.omerozkurt.depodolu;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.TimeUnit;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Saatte bir latest.json'u okur: ana ekran kutusunu günceller ve fiyat alarmını kontrol eder.
 * Ayarlar, web tarafının Capacitor Preferences ile yazdığı kayıttan okunur (CapacitorStorage).
 * Alarm kuralı alarm.ts'teki ile aynıdır: fiyat hedefe eşit ya da altındaysa bir kez bildir.
 */
public class PriceWorker extends Worker {

    static final String DATA_URL = "https://raw.githubusercontent.com/ozkurtomer/depo-dolu/main/data/latest.json";
    static final String SETTINGS_KEY = "depodolu.settings.v1";
    static final String CHANNEL_ID = "alarm";
    private static final String PERIODIC = "depodolu-price-periodic";
    private static final String ONCE = "depodolu-price-once";
    private static final int ALARM_NOTIFICATION_ID = 4501;

    public PriceWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    private static Constraints online() {
        return new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
    }

    /** Saatlik kontrolü kurar; zaten kuruluysa dokunmaz. */
    public static void schedule(Context context) {
        PeriodicWorkRequest request = new PeriodicWorkRequest.Builder(PriceWorker.class, 1, TimeUnit.HOURS)
            .setConstraints(online())
            .build();
        WorkManager.getInstance(context).enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, request);
    }

    /** Ayar değişince ya da kutu eklenince hemen bir kez çalıştır. */
    public static void refreshNow(Context context) {
        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(PriceWorker.class).setConstraints(online()).build();
        WorkManager.getInstance(context).enqueueUniqueWork(ONCE, ExistingWorkPolicy.REPLACE, request);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context context = getApplicationContext();
        JSONObject settings = readSettings(context);
        String city = settings == null || settings.isNull("city") ? null : settings.optString("city", null);
        String fuel = settings == null ? "benzin" : settings.optString("fuel", "benzin");
        JSONObject alarm = settings == null ? null : settings.optJSONObject("alarm");
        boolean hasWidget = PriceWidget.ids(context).length > 0;

        // Ne kutu ne alarm varsa internete çıkma; pil ve veri harcama.
        if (!hasWidget && alarm == null) return Result.success();
        if (city == null) {
            WidgetStore.clear(context);
            PriceWidget.updateAll(context);
            if (alarm == null) return Result.success();
        }

        JSONObject latest;
        try {
            latest = fetchLatest();
        } catch (IOException | JSONException e) {
            PriceWidget.updateAll(context); // Son bilinen fiyatı "son veri" saatiyle gösterir.
            return getRunAttemptCount() < 3 ? Result.retry() : Result.success();
        }
        JSONObject prices = latest.optJSONObject("prices");
        if (prices == null) return Result.success();

        if (city != null) {
            JSONObject c = prices.optJSONObject(city);
            if (c != null && !c.isNull(fuel)) {
                WidgetStore.save(context, c.optString("name", city), fuel, c.optDouble(fuel), System.currentTimeMillis());
            } else {
                WidgetStore.clear(context);
            }
            PriceWidget.updateAll(context);
        }

        checkAlarm(context, alarm, prices);
        return Result.success();
    }

    static JSONObject readSettings(Context context) {
        String raw = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE).getString(SETTINGS_KEY, null);
        if (raw == null) return null;
        try {
            return new JSONObject(raw);
        } catch (JSONException e) {
            return null;
        }
    }

    private static JSONObject fetchLatest() throws IOException, JSONException {
        // raw.githubusercontent birkaç dakika önbellekler; dakika damgası taze veri getirir.
        URL url = new URL(DATA_URL + "?t=" + (System.currentTimeMillis() / 60000));
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(15000);
        conn.setRequestProperty("Accept", "application/json");
        try {
            if (conn.getResponseCode() != 200) throw new IOException("HTTP " + conn.getResponseCode());
            try (InputStream in = conn.getInputStream()) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buffer = new byte[8192];
                int n;
                while ((n = in.read(buffer)) > 0) out.write(buffer, 0, n);
                return new JSONObject(new String(out.toByteArray(), StandardCharsets.UTF_8));
            }
        } finally {
            conn.disconnect();
        }
    }

    private static void checkAlarm(Context context, JSONObject alarm, JSONObject prices) {
        SharedPreferences store = WidgetStore.prefs(context);
        if (alarm == null) {
            store.edit().remove("alarmNotified").apply();
            return;
        }
        String city = alarm.optString("city", "");
        String fuel = alarm.optString("fuel", "");
        double below = alarm.optDouble("below", Double.NaN);
        JSONObject c = prices.optJSONObject(city);
        if (c == null || c.isNull(fuel) || Double.isNaN(below)) return;
        double price = c.optDouble(fuel);

        String key = city + "_" + fuel + "_" + below + "_" + price;
        if (price > below + 0.001) {
            // Fiyat yeniden hedefin üstüne çıktı: bir sonraki inişte tekrar haber ver.
            store.edit().remove("alarmNotified").apply();
            return;
        }
        if (key.equals(store.getString("alarmNotified", null))) return;

        String name = c.optString("name", city);
        String title = name + " " + WidgetStore.fuelName(fuel) + ": " + WidgetStore.money(price) + " ₺";
        String text = "Hedefin " + WidgetStore.money(below) + " ₺ idi. Depoyu doldurmanın tam zamanı.";
        if (notify(context, title, text)) store.edit().putString("alarmNotified", key).apply();
    }

    private static boolean notify(Context context, String title, String text) {
        NotificationManagerCompat manager = NotificationManagerCompat.from(context);
        if (!manager.areNotificationsEnabled()) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Fiyat alarmı", NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Fiyat belirlediğin seviyeye inince");
            context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
        }
        Intent open = new Intent(context, MainActivity.class).setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent tap = PendingIntent.getActivity(context, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_fuel)
            .setColor(context.getColor(R.color.depodolu_brand))
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setContentIntent(tap);
        try {
            manager.notify(ALARM_NOTIFICATION_ID, builder.build());
            return true;
        } catch (SecurityException e) {
            return false; // Android 13+: bildirim izni verilmemiş.
        }
    }
}
