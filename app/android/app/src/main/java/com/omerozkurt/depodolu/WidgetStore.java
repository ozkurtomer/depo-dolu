package com.omerozkurt.depodolu;

import android.content.Context;
import android.content.SharedPreferences;
import java.text.NumberFormat;
import java.util.Locale;

/** Ana ekran kutusunun son bilinen fiyatı. İnternet yokken kutu bunu gösterir. */
final class WidgetStore {

    private WidgetStore() {}

    static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences("depodolu_widget", Context.MODE_PRIVATE);
    }

    static void save(Context context, String cityName, String fuel, double price, long fetchedAt) {
        prefs(context).edit()
            .putString("cityName", cityName)
            .putString("fuel", fuel)
            .putString("price", Double.toString(price))
            .putLong("fetchedAt", fetchedAt)
            .apply();
    }

    static void clear(Context context) {
        prefs(context).edit().remove("cityName").remove("fuel").remove("price").remove("fetchedAt").apply();
    }

    static String money(double value) {
        NumberFormat format = NumberFormat.getNumberInstance(new Locale("tr", "TR"));
        format.setMinimumFractionDigits(2);
        format.setMaximumFractionDigits(2);
        return format.format(value);
    }

    static String fuelName(String fuel) {
        switch (fuel) {
            case "motorin": return "motorin";
            case "lpg": return "LPG";
            default: return "benzin";
        }
    }

    static String fuelLabel(String fuel) {
        switch (fuel) {
            case "motorin": return "Motorin";
            case "lpg": return "LPG";
            default: return "Benzin";
        }
    }
}
