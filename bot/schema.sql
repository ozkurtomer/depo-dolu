-- Depo Dolu bot aboneleri. Sadece Telegram sohbet kimliği ve seçilen il/yakıt tutulur.
CREATE TABLE IF NOT EXISTS subscribers (
  chat_id    INTEGER PRIMARY KEY,
  city       TEXT NOT NULL,             -- ör. bursa, istanbul-avrupa
  fuel       TEXT NOT NULL,             -- benzin | motorin | lpg | hepsi
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscribers_city ON subscribers (city);
