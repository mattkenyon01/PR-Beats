CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL UNIQUE,
  key_art TEXT NOT NULL DEFAULT '',
  press_kit TEXT NOT NULL DEFAULT '',
  store_links TEXT NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_games_title
  ON games (title);

CREATE INDEX IF NOT EXISTS idx_games_sort
  ON games (sort_order, title);
