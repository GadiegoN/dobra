import { NextRequest, NextResponse } from "next/server";
import { getPlayerSession } from "@/lib/auth";
import { getDb, ensureDatabaseSchema } from "@/lib/db";
import { getCurrentSeason, ensureSeasonExists } from "@/lib/seasons";
import { Season, SeasonLeaderboardEntry, FlameTier } from "@/types/game";
import { validateScoreSanity } from "@/lib/security";
import { calculateStreak, getDailyDate } from "@/lib/daily";

interface DbSeasonRow {
  id: string;
  name: string;
  starts_at: string | Date;
  ends_at: string | Date;
  is_active: boolean;
}

interface DbSeasonLbRow {
  id: string;
  season_id: string;
  github_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string;
  score: number;
  highest_tile: number;
  github_profile_url: string;
  updated_at: string | Date;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const current = getCurrentSeason();
    await ensureSeasonExists(current);

    const targetSeasonId = searchParams.get("seasonId") || current.id;
    const sql = getDb();
    await ensureDatabaseSchema();

    // Fetch all recorded seasons
    const seasonRows = (await sql`
      SELECT id, name, starts_at, ends_at, is_active
      FROM seasons
      ORDER BY starts_at DESC
      LIMIT 20;
    `) as unknown as DbSeasonRow[];

    const allSeasons: Season[] = seasonRows.map((s) => ({
      id: String(s.id),
      name: String(s.name),
      startsAt: new Date(s.starts_at).toISOString(),
      endsAt: new Date(s.ends_at).toISOString(),
      isActive: Boolean(s.is_active),
    }));

    // Fetch leaderboard for requested season (tie break: score DESC, updated_at ASC)
    const lbRows = (await sql`
      SELECT 
        id,
        season_id,
        github_id,
        username,
        display_name,
        avatar_url,
        score,
        highest_tile,
        github_profile_url,
        updated_at
      FROM season_leaderboard
      WHERE season_id = ${targetSeasonId}
      ORDER BY score DESC, updated_at ASC
      LIMIT 50;
    `) as unknown as DbSeasonLbRow[];

    // Fetch streaks for players in leaderboard
    const githubIds = lbRows.map((r) => String(r.github_id)).filter(Boolean);
    const streaksByGithubId: Record<string, { streak: number; flameTier: FlameTier; title: string }> = {};

    if (githubIds.length > 0) {
      try {
        const dailyRows = (await sql`
          SELECT github_id, to_char(challenge_date, 'YYYY-MM-DD') as c_date
          FROM daily_challenge_results
          WHERE github_id = ANY(${githubIds})
        `) as unknown as Array<{ github_id: string; c_date: string }>;

        const datesByPlayer: Record<string, string[]> = {};
        for (const row of dailyRows) {
          if (!datesByPlayer[row.github_id]) datesByPlayer[row.github_id] = [];
          datesByPlayer[row.github_id].push(row.c_date);
        }

        for (const gId of githubIds) {
          const dates = datesByPlayer[gId] || [];
          const s = calculateStreak(dates, false, getDailyDate());
          streaksByGithubId[gId] = {
            streak: s.currentStreak,
            flameTier: s.flameTier,
            title: s.title,
          };
        }
      } catch (err) {
        console.error("Error computing streaks for seasons:", err);
      }
    }

    const ranking: SeasonLeaderboardEntry[] = lbRows.map((r) => {
      const gId = String(r.github_id);
      const st = streaksByGithubId[gId];
      return {
        id: String(r.id),
        seasonId: String(r.season_id),
        githubId: gId,
        username: String(r.username),
        displayName: r.display_name ? String(r.display_name) : null,
        avatarUrl: String(r.avatar_url),
        score: Number(r.score),
        highestTile: Number(r.highest_tile),
        githubProfileUrl: String(r.github_profile_url),
        streak: st?.streak,
        flameTier: st?.flameTier,
        title: st?.title,
        updatedAt: new Date(r.updated_at).toISOString(),
      };
    });

    return NextResponse.json({
      currentSeason: current,
      allSeasons,
      ranking,
    });
  } catch (error) {
    console.error("Error fetching season ranking:", error);
    return NextResponse.json(
      { error: "Erro ao buscar ranking de temporadas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const player = await getPlayerSession();
    if (!player) {
      return NextResponse.json(
        { error: "Você precisa estar conectado com o GitHub para pontuar na temporada" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const score = Number(body.score || 0);
    const highestTile = Number(body.highestTile || 2);

    const sanity = validateScoreSanity(score, highestTile);
    if (!sanity.valid) {
      return NextResponse.json({ error: sanity.reason }, { status: 400 });
    }

    const current = getCurrentSeason();
    await ensureSeasonExists(current);

    const sql = getDb();

    // Check if player has streak bonus
    let finalScore = score;
    let streakBonus = 0;
    try {
      const dailyRows = (await sql`
        SELECT to_char(challenge_date, 'YYYY-MM-DD') as c_date
        FROM daily_challenge_results
        WHERE github_id = ${player.githubId}
      `) as unknown as Array<{ c_date: string }>;
      const streak = calculateStreak(dailyRows.map((r) => r.c_date), false, getDailyDate());
      if (streak.streakBonusPercent > 0) {
        streakBonus = streak.streakBonusPercent;
        finalScore = Math.round(score * (1 + streak.streakBonusPercent / 100));
      }
    } catch (streakErr) {
      console.error("Error computing season streak bonus:", streakErr);
    }

    await sql`
      INSERT INTO season_leaderboard (
        season_id,
        github_id,
        username,
        display_name,
        avatar_url,
        score,
        highest_tile,
        github_profile_url,
        created_at,
        updated_at
      )
      VALUES (
        ${current.id},
        ${player.githubId},
        ${player.username},
        ${player.displayName},
        ${player.avatarUrl},
        ${finalScore},
        ${highestTile},
        ${player.githubProfileUrl},
        NOW(),
        NOW()
      )
      ON CONFLICT (season_id, github_id)
      DO UPDATE SET
        score = GREATEST(season_leaderboard.score, EXCLUDED.score),
        highest_tile = GREATEST(season_leaderboard.highest_tile, EXCLUDED.highest_tile),
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        github_profile_url = EXCLUDED.github_profile_url,
        updated_at = NOW();
    `;

    return NextResponse.json({
      success: true,
      seasonId: current.id,
      baseScore: score,
      finalScore,
      streakBonusPercent: streakBonus,
    });
  } catch (error) {
    console.error("Error saving season score:", error);
    return NextResponse.json(
      { error: "Erro ao salvar pontuação na temporada" },
      { status: 500 }
    );
  }
}

