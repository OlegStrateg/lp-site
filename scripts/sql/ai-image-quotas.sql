CREATE TABLE IF NOT EXISTS ai_image_usage(request_id TEXT PRIMARY KEY,day_utc TEXT NOT NULL,client_id TEXT NOT NULL,created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS ai_image_usage_day ON ai_image_usage(day_utc);
CREATE INDEX IF NOT EXISTS ai_image_usage_ip ON ai_image_usage(day_utc,client_id);
CREATE TABLE IF NOT EXISTS ai_owner_failures(id INTEGER PRIMARY KEY AUTOINCREMENT,client_id TEXT NOT NULL,time INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS ai_owner_failures_recent ON ai_owner_failures(client_id,time);
