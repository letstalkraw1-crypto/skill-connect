-- Skill Connect Platform - SQLite Schema

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  short_id    TEXT UNIQUE,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE,
  phone       TEXT UNIQUE,
  password    TEXT,
  bio         TEXT,
  avatar_url  TEXT,
  lat         REAL,
  lng         REAL,
  location    TEXT,
  strava_id   TEXT,
  garmin_id   TEXT,
  instagram_id TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caption     TEXT,
  image_url   TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skills (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS user_skills (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id   INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  level      TEXT,
  years_exp  INTEGER,
  UNIQUE(user_id, skill_id)
);

CREATE INDEX IF NOT EXISTS idx_user_skills_skill_id ON user_skills(skill_id);
CREATE INDEX IF NOT EXISTS idx_users_lat_lng ON users(lat, lng);

CREATE TABLE IF NOT EXISTS connections (
  id           TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   TEXT DEFAULT (datetime('now')),
  updated_at   TEXT DEFAULT (datetime('now')),
  UNIQUE(requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id         TEXT PRIMARY KEY,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text            TEXT NOT NULL,
  sent_at         TEXT DEFAULT (datetime('now')),
  read_at         TEXT
);

CREATE TABLE IF NOT EXISTS otps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  phone      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used       INTEGER DEFAULT 0
);

-- New tables for enhanced features

CREATE TABLE IF NOT EXISTS proficiency_levels (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS skill_verifications (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id         INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  verification_type TEXT NOT NULL, -- 'certificate', 'third_party'
  url              TEXT, -- for third_party links or certificate files
  status           TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
  verified_at      TEXT,
  created_at       TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skill_endorsements (
  id          TEXT PRIMARY KEY,
  endorser_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endorsee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id    INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  comment     TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(endorser_id, endorsee_id, skill_id)
);

CREATE TABLE IF NOT EXISTS resources (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  type        TEXT NOT NULL, -- 'pdf', 'video', 'link', 'text'
  url         TEXT,
  category    TEXT, -- 'tutorial', 'guide', 'review', etc.
  skill_id    INTEGER REFERENCES skills(id),
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS resource_favorites (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
  created_at  TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, resource_id)
);

CREATE TABLE IF NOT EXISTS documents (
  id         TEXT PRIMARY KEY,
  skill_id   INTEGER REFERENCES skills(id),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  version    INTEGER DEFAULT 1,
  author_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS challenges (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  skill_id    INTEGER REFERENCES skills(id),
  difficulty  TEXT, -- 'beginner', 'intermediate', 'expert'
  start_date  TEXT,
  end_date    TEXT,
  points      INTEGER DEFAULT 10,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS challenge_submissions (
  id           TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  submission_data TEXT, -- JSON or text
  score        INTEGER,
  submitted_at TEXT DEFAULT (datetime('now')),
  UNIQUE(challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS qa_rooms (
  id          TEXT PRIMARY KEY,
  host_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill_id    INTEGER REFERENCES skills(id),
  title       TEXT NOT NULL,
  scheduled_at TEXT,
  status      TEXT DEFAULT 'scheduled', -- 'scheduled', 'live', 'ended'
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS qa_questions (
  id         TEXT PRIMARY KEY,
  room_id    TEXT NOT NULL REFERENCES qa_rooms(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question   TEXT NOT NULL,
  answer     TEXT,
  answered_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS feedback (
  id         TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT NOT NULL, -- 'connection', 'event', 'collaboration'
  reference_id TEXT, -- connection_id or event_id
  rating     INTEGER CHECK(rating >= 1 AND rating <= 5),
  comment    TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
