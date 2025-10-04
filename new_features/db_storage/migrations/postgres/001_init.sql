-- Initial schema for configs used by adapter tests
CREATE TABLE IF NOT EXISTS configs (
  key text PRIMARY KEY,
  value text
);
-- Postgres initialization migration
CREATE TABLE IF NOT EXISTS configs (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- If you want to use JSONB for values:
-- ALTER TABLE configs ALTER COLUMN value TYPE jsonb USING value::jsonb;
