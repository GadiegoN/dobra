import { neon } from "@neondatabase/serverless";

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not defined in environment variables");
  }
  return neon(url);
}

let schemaInitialized = false;

export async function ensureDatabaseSchema() {
  if (schemaInitialized) return;
  const sql = getDb();

  // 1. Leaderboard (All-time)
  await sql`
    CREATE TABLE IF NOT EXISTS leaderboard (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      github_id VARCHAR(100) NOT NULL UNIQUE,
      username VARCHAR(100) NOT NULL,
      display_name VARCHAR(150),
      avatar_url TEXT,
      score INT NOT NULL DEFAULT 0,
      highest_tile INT NOT NULL DEFAULT 2,
      github_profile_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard (score DESC);`;

  // 2. Seasons & Season Leaderboard
  await sql`
    CREATE TABLE IF NOT EXISTS seasons (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
      ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS season_leaderboard (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      season_id VARCHAR(50) NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
      github_id VARCHAR(100) NOT NULL,
      username VARCHAR(100) NOT NULL,
      display_name VARCHAR(150),
      avatar_url TEXT,
      score INT NOT NULL DEFAULT 0,
      highest_tile INT NOT NULL DEFAULT 2,
      github_profile_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT uq_season_player UNIQUE (season_id, github_id)
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_season_lb_score ON season_leaderboard (season_id, score DESC);`;

  // 3. Daily Challenge Results
  await sql`
    CREATE TABLE IF NOT EXISTS daily_challenge_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      challenge_date DATE NOT NULL,
      github_id VARCHAR(100),
      username VARCHAR(100) NOT NULL,
      display_name VARCHAR(150),
      avatar_url TEXT,
      score INT NOT NULL DEFAULT 0,
      highest_tile INT NOT NULL DEFAULT 2,
      moves_count INT NOT NULL DEFAULT 0,
      duration_seconds INT NOT NULL DEFAULT 0,
      seed BIGINT NOT NULL,
      moves_log TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT uq_daily_user_attempt UNIQUE (challenge_date, github_id)
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_daily_date_score ON daily_challenge_results (challenge_date, score DESC);`;

  // 4. Friend Challenges & Attempts
  await sql`
    CREATE TABLE IF NOT EXISTS friend_challenges (
      id VARCHAR(64) PRIMARY KEY,
      creator_name VARCHAR(100) NOT NULL,
      creator_github_id VARCHAR(100),
      mode VARCHAR(50) NOT NULL DEFAULT 'classic',
      seed BIGINT NOT NULL,
      target_score INT NOT NULL DEFAULT 0,
      target_tile INT NOT NULL DEFAULT 2,
      creator_moves_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS friend_challenge_attempts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      challenge_id VARCHAR(64) NOT NULL REFERENCES friend_challenges(id) ON DELETE CASCADE,
      player_name VARCHAR(100) NOT NULL,
      score INT NOT NULL DEFAULT 0,
      highest_tile INT NOT NULL DEFAULT 2,
      moves_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_fc_attempts ON friend_challenge_attempts (challenge_id, score DESC);`;

  // 5. Match History
  await sql`
    CREATE TABLE IF NOT EXISTS game_match_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      github_id VARCHAR(100),
      mode VARCHAR(50) NOT NULL DEFAULT 'classic',
      score INT NOT NULL DEFAULT 0,
      highest_tile INT NOT NULL DEFAULT 2,
      moves_count INT NOT NULL DEFAULT 0,
      duration_seconds INT NOT NULL DEFAULT 0,
      won BOOLEAN NOT NULL DEFAULT false,
      completed BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_history_user ON game_match_history (github_id, created_at DESC);`;

  // 6. Consumed Sessions (Anti-Replay)
  await sql`
    CREATE TABLE IF NOT EXISTS consumed_game_sessions (
      session_id VARCHAR(100) PRIMARY KEY,
      github_id VARCHAR(100) NOT NULL,
      consumed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `;

  schemaInitialized = true;
}

export async function ensureLeaderboardTable() {
  await ensureDatabaseSchema();
}
