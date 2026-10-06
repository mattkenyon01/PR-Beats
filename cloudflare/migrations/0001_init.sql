CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  owner_uid TEXT NOT NULL,
  game_title TEXT NOT NULL DEFAULT '',
  announcement_title TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  month TEXT NOT NULL DEFAULT '',
  platforms TEXT NOT NULL DEFAULT '',
  trailer TEXT NOT NULL DEFAULT '',
  press_release_pdf TEXT NOT NULL DEFAULT '',
  estimated_reach TEXT NOT NULL DEFAULT '',
  highlights TEXT NOT NULL DEFAULT '',
  total_wishlists TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_announcements_owner
  ON announcements (owner_uid);

CREATE INDEX IF NOT EXISTS idx_announcements_owner_game
  ON announcements (owner_uid, game_title);
