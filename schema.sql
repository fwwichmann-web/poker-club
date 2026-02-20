-- Poker Club Stats Tracker — Supabase Schema
-- Run this in Supabase SQL Editor (https://app.supabase.com → SQL Editor)

-- 1. Players table
CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Games table
CREATE TABLE games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 3. Results table
CREATE TABLE results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id),
  position smallint CHECK (position IN (1, 2, 3, 4)),
  is_bubble boolean DEFAULT false,
  points smallint NOT NULL CHECK (points IN (1, 2, 3, 5, 10)),
  UNIQUE (game_id, player_id)
);

-- 4. Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- 5. Public read/write policies (trust-based, no auth)
CREATE POLICY "Public read players" ON players FOR SELECT USING (true);
CREATE POLICY "Public insert players" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update players" ON players FOR UPDATE USING (true);

CREATE POLICY "Public read games" ON games FOR SELECT USING (true);
CREATE POLICY "Public insert games" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update games" ON games FOR UPDATE USING (true);
CREATE POLICY "Public delete games" ON games FOR DELETE USING (true);

CREATE POLICY "Public read results" ON results FOR SELECT USING (true);
CREATE POLICY "Public insert results" ON results FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update results" ON results FOR UPDATE USING (true);
CREATE POLICY "Public delete results" ON results FOR DELETE USING (true);

-- 6. Indexes for performance
CREATE INDEX idx_results_game_id ON results(game_id);
CREATE INDEX idx_results_player_id ON results(player_id);
CREATE INDEX idx_games_date ON games(game_date DESC);
