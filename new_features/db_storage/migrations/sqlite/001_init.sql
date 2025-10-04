-- SQLite initialization migration
CREATE TABLE IF NOT EXISTS configs (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
