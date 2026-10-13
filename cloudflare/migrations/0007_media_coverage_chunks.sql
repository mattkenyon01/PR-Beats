-- Large media-coverage CSVs exceed D1's per-row size limit when stored as one
-- TEXT blob on announcements. Store them as chunked JSON arrays instead.
CREATE TABLE IF NOT EXISTS media_coverage_chunks (
  game_title_key TEXT NOT NULL,
  game_title TEXT NOT NULL DEFAULT '',
  chunk_index INTEGER NOT NULL,
  data_json TEXT NOT NULL DEFAULT '[]',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (game_title_key, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_media_coverage_chunks_game
  ON media_coverage_chunks (game_title_key, chunk_index);
