-- Single-row dataset revision for cheap admin polls (avoid scanning all tables).
CREATE TABLE IF NOT EXISTS dataset_revision (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
