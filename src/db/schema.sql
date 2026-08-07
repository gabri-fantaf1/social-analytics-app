-- Un account social collegato (una riga per piattaforma per utente)
CREATE TABLE IF NOT EXISTS accounts (
  id            SERIAL PRIMARY KEY,
  platform      TEXT NOT NULL CHECK (platform IN ('youtube', 'instagram', 'tiktok')),
  external_id   TEXT NOT NULL,        -- channel_id / ig_user_id / open_id
  display_name  TEXT,
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  connected_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (platform, external_id)
);

-- Snapshot giornaliero dei numeri della pagina/canale (follower, iscritti, views totali...)
CREATE TABLE IF NOT EXISTS account_snapshots (
  id           SERIAL PRIMARY KEY,
  account_id   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  followers    INTEGER,
  total_views  BIGINT,
  total_posts  INTEGER,
  extra        JSONB,                 -- eventuali metriche specifiche della piattaforma
  UNIQUE (account_id, snapshot_date)
);

-- Anagrafica dei singoli contenuti (video/reel/post)
CREATE TABLE IF NOT EXISTS content_items (
  id           SERIAL PRIMARY KEY,
  account_id   INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  external_id  TEXT NOT NULL,         -- video_id / media_id
  title        TEXT,
  published_at TIMESTAMPTZ,
  UNIQUE (account_id, external_id)
);

-- Snapshot giornaliero delle performance di ogni singolo contenuto
CREATE TABLE IF NOT EXISTS content_snapshots (
  id              SERIAL PRIMARY KEY,
  content_item_id INTEGER NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
  snapshot_date   DATE NOT NULL,
  views           BIGINT,
  likes           INTEGER,
  comments        INTEGER,
  shares          INTEGER,
  extra           JSONB,
  UNIQUE (content_item_id, snapshot_date)
  -- nota: "views" può restare NULL per Instagram sui post immagine (non hanno una metrica "plays")
);

CREATE INDEX IF NOT EXISTS idx_account_snapshots_date ON account_snapshots (account_id, snapshot_date);
CREATE INDEX IF NOT EXISTS idx_content_snapshots_date ON content_snapshots (content_item_id, snapshot_date);
