import { neon } from "@neondatabase/serverless";

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not defined in environment variables");
  }
  return neon(url);
}

export async function ensureLeaderboardTable() {
  const sql = getDb();
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

  await sql`
    CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard (score DESC);
  `;
}

