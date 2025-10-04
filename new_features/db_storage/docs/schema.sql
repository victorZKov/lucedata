-- Placeholder schema derived from common configuration storage patterns.
-- Replace with an extracted schema from the real sqlite DB during Phase 2.

CREATE TABLE IF NOT EXISTS configs (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_configs_key ON configs(key);
