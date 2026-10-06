CREATE TABLE IF NOT EXISTS shares (
  id TEXT PRIMARY KEY,
  owner_uid TEXT NOT NULL DEFAULT '',
  games TEXT NOT NULL DEFAULT '[]',
  month TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shares_owner
  ON shares (owner_uid);
