-- Z Route Master — Database Setup Script
-- Run this ONCE on a fresh PostgreSQL database

-- 1. Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id"           SERIAL PRIMARY KEY,
  "username"     TEXT NOT NULL UNIQUE,
  "password"     TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "planner_name" TEXT NOT NULL,
  "role"         TEXT NOT NULL DEFAULT 'user',
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Sites table
CREATE TABLE IF NOT EXISTS "sites" (
  "id"         SERIAL PRIMARY KEY,
  "site_id"    TEXT NOT NULL UNIQUE,
  "name"       TEXT NOT NULL,
  "code"       TEXT NOT NULL DEFAULT '',
  "lat"        REAL NOT NULL,
  "lng"        REAL NOT NULL,
  "gov"        TEXT NOT NULL DEFAULT '',
  "dist"       TEXT NOT NULL DEFAULT '',
  "subdist"    TEXT NOT NULL DEFAULT '',
  "key"        TEXT NOT NULL DEFAULT '',
  "pwrclass"   TEXT NOT NULL DEFAULT '',
  "vendor"     TEXT NOT NULL DEFAULT '',
  "cat"        TEXT NOT NULL DEFAULT '',
  "owner"      TEXT NOT NULL DEFAULT '',
  "tl"         TEXT NOT NULL DEFAULT 'No',
  "mw"         TEXT NOT NULL DEFAULT 'No',
  "fiber"      TEXT NOT NULL DEFAULT 'No',
  "dwdm"       TEXT NOT NULL DEFAULT 'No',
  "olt"        TEXT NOT NULL DEFAULT 'No',
  "ipran"      TEXT NOT NULL DEFAULT 'No',
  "fttm"       TEXT NOT NULL DEFAULT 'No',
  "epa"        TEXT NOT NULL DEFAULT 'No',
  "freecool"   TEXT NOT NULL DEFAULT 'No',
  "gen"        TEXT NOT NULL DEFAULT 'No',
  "sharing"    TEXT NOT NULL DEFAULT 'No',
  "ibs"        TEXT NOT NULL DEFAULT 'No',
  "extra"      JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Plans table
CREATE TABLE IF NOT EXISTS "plans" (
  "id"           SERIAL PRIMARY KEY,
  "client_id"    INTEGER NOT NULL,
  "team_name"    TEXT NOT NULL,
  "planner_name" TEXT NOT NULL,
  "plan_name"    TEXT NOT NULL DEFAULT '',
  "color"        TEXT NOT NULL DEFAULT '#00d4ff',
  "km"           REAL NOT NULL DEFAULT 0,
  "is_new_sites" BOOLEAN NOT NULL DEFAULT FALSE,
  "hq_site_id"   TEXT,
  "day_groups"   JSONB NOT NULL DEFAULT '[]',
  "site_ids"     TEXT[] NOT NULL DEFAULT '{}',
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Session store table (required by connect-pg-simple)
CREATE TABLE IF NOT EXISTS "user_sessions" (
  "sid"    VARCHAR NOT NULL COLLATE "default",
  "sess"   JSON NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire");

-- 5. Seed the admin user (change password as needed)
INSERT INTO "users" ("username", "password", "display_name", "planner_name", "role")
VALUES ('Adm.Zain', 'Zain@1202', 'Admin', 'Admin', 'admin')
ON CONFLICT ("username") DO NOTHING;
