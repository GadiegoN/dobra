import { NextRequest, NextResponse } from "next/server";
import { getPlayerSession } from "@/lib/auth";
import { getDb, ensureDatabaseSchema } from "@/lib/db";
import { getDailyConfig, getDailyDate, calculateStreak } from "@/lib/daily";
import { getCurrentSeason, ensureSeasonExists } from "@/lib/seasons";
import { DailyChallengeResult, Direction } from "@/types/game";
import { replayGame } from "@/lib/game-engine";

interface DbDailyRow {
  id: string;
  challenge_date: string | Date;
  github_id: string | null;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  score: number;
  highest_tile: number;
  moves_count: number;
  duration_seconds: number;
  created_at: string | Date;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date") || getDailyDate();
    const config = getDailyConfig(dateParam);

    const player = await getPlayerSession();
    const sql = getDb();
    await ensureDatabaseSchema();

    // Fetch ranking for this date
    const rows = (await sql`
      SELECT 
        id,
        challenge_date,
        github_id,
        username,
        display_name,
        avatar_url,
        score,
        highest_tile,
        moves_count,
        duration_seconds,
        created_at
      FROM daily_challenge_results
      WHERE challenge_date = ${dateParam}::date
      ORDER BY score DESC, duration_seconds ASC, created_at ASC
      LIMIT 50;
    `) as unknown as DbDailyRow[];

    const ranking: DailyChallengeResult[] = rows.map((r) => ({
      id: String(r.id),
      date: dateParam,
      githubId: r.github_id ? String(r.github_id) : undefined,
      username: String(r.username),
      displayName: r.display_name ? String(r.display_name) : null,
      avatarUrl: r.avatar_url ? String(r.avatar_url) : undefined,
      score: Number(r.score),
      highestTile: Number(r.highest_tile),
      movesCount: Number(r.moves_count),
      durationSeconds: Number(r.duration_seconds),
      createdAt: new Date(r.created_at).toISOString(),
    }));

    let hasPlayed = false;
    let userResult: DailyChallengeResult | null = null;
    let userHistory: DailyChallengeResult[] = [];

    if (player) {
      const match = ranking.find((r) => r.githubId === player.githubId);
      if (match) {
        hasPlayed = true;
        userResult = match;
      } else {
        const userRows = (await sql`
          SELECT 
            id,
            challenge_date,
            github_id,
            username,
            display_name,
            avatar_url,
            score,
            highest_tile,
            moves_count,
            duration_seconds,
            created_at
          FROM daily_challenge_results
          WHERE challenge_date = ${dateParam}::date AND github_id = ${player.githubId}
          LIMIT 1;
        `) as unknown as DbDailyRow[];

        if (userRows.length > 0) {
          hasPlayed = true;
          const u = userRows[0];
          userResult = {
            id: String(u.id),
            date: dateParam,
            githubId: u.github_id ? String(u.github_id) : undefined,
            username: String(u.username),
            displayName: u.display_name ? String(u.display_name) : null,
            avatarUrl: u.avatar_url ? String(u.avatar_url) : undefined,
            score: Number(u.score),
            highestTile: Number(u.highest_tile),
            movesCount: Number(u.moves_count),
            durationSeconds: Number(u.duration_seconds),
            createdAt: new Date(u.created_at).toISOString(),
          };
        }
      }

      // Fetch all historical daily attempts for this player
      const historyRows = (await sql`
        SELECT 
          id,
          to_char(challenge_date, 'YYYY-MM-DD') as challenge_date_str,
          github_id,
          username,
          display_name,
          avatar_url,
          score,
          highest_tile,
          moves_count,
          duration_seconds,
          created_at
        FROM daily_challenge_results
        WHERE github_id = ${player.githubId}
        ORDER BY challenge_date DESC
        LIMIT 100;
      `) as unknown as Array<{
        id: string;
        challenge_date_str: string;
        github_id: string | null;
        username: string;
        display_name: string | null;
        avatar_url: string | null;
        score: number;
        highest_tile: number;
        moves_count: number;
        duration_seconds: number;
        created_at: string | Date;
      }>;

      userHistory = historyRows.map((r) => ({
        id: String(r.id),
        date: String(r.challenge_date_str),
        githubId: r.github_id ? String(r.github_id) : undefined,
        username: String(r.username),
        displayName: r.display_name ? String(r.display_name) : null,
        avatarUrl: r.avatar_url ? String(r.avatar_url) : undefined,
        score: Number(r.score),
        highestTile: Number(r.highest_tile),
        movesCount: Number(r.moves_count),
        durationSeconds: Number(r.duration_seconds),
        createdAt: new Date(r.created_at).toISOString(),
      }));
    }

    let freezeAvailable = searchParams.get("freeze") === "true";
    if (player) {
      try {
        const lbRows = (await sql`
          SELECT score, highest_tile FROM leaderboard WHERE github_id = ${player.githubId} LIMIT 1;
        `) as unknown as Array<{ score: number; highest_tile: number }>;

        if (lbRows.length > 0 && (lbRows[0].highest_tile >= 2048 || lbRows[0].score >= 2048)) {
          freezeAvailable = true;
        } else {
          const seasonLbRows = (await sql`
            SELECT score, highest_tile FROM season_leaderboard WHERE github_id = ${player.githubId} LIMIT 1;
          `) as unknown as Array<{ score: number; highest_tile: number }>;
          if (seasonLbRows.length > 0 && (seasonLbRows[0].highest_tile >= 2048 || seasonLbRows[0].score >= 2048)) {
            freezeAvailable = true;
          }
        }
      } catch (err) {
        console.error("Error checking leaderboard for streak freeze:", err);
      }
    }

    const streakInfo = calculateStreak(
      userHistory.map((h) => h.date),
      freezeAvailable,
      getDailyDate()
    );

    return NextResponse.json({
      config,
      hasPlayed,
      userResult,
      ranking,
      userHistory,
      streakInfo,
    });
  } catch (error) {
    console.error("Error fetching daily challenge:", error);
    return NextResponse.json(
      { error: "Erro ao buscar desafio diário" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const player = await getPlayerSession();
    if (!player) {
      return NextResponse.json(
        { error: "Você precisa estar conectado com o GitHub para participar do Desafio Diário" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const dateParam = String(body.date || getDailyDate());
    const moves = Array.isArray(body.moves) ? (body.moves as Direction[]) : [];
    const durationSeconds = Number(body.durationSeconds || 0);

    const config = getDailyConfig(dateParam);
    const sql = getDb();
    await ensureDatabaseSchema();

    // Check if player has already submitted today
    const existing = await sql`
      SELECT id FROM daily_challenge_results 
      WHERE challenge_date = ${dateParam}::date AND github_id = ${player.githubId}
      LIMIT 1;
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Você já realizou sua tentativa no Desafio Diário de hoje!" },
        { status: 400 }
      );
    }

    // Deterministic server replay verification
    const replay = replayGame(config.seed, moves, "classic");

    // Insert verified result
    await sql`
      INSERT INTO daily_challenge_results (
        challenge_date,
        github_id,
        username,
        display_name,
        avatar_url,
        score,
        highest_tile,
        moves_count,
        duration_seconds,
        seed,
        moves_log,
        created_at
      )
      VALUES (
        ${dateParam}::date,
        ${player.githubId},
        ${player.username},
        ${player.displayName},
        ${player.avatarUrl},
        ${replay.score},
        ${replay.highestTile},
        ${replay.movesPlayed},
        ${durationSeconds},
        ${config.seed},
        ${JSON.stringify(moves)},
        NOW()
      );
    `;

    // Calculate streak with the newly added challenge date
    let streakInfo = calculateStreak([dateParam], false, getDailyDate());
    try {
      const pastHistoryRows = (await sql`
        SELECT to_char(challenge_date, 'YYYY-MM-DD') as c_date
        FROM daily_challenge_results
        WHERE github_id = ${player.githubId}
      `) as unknown as Array<{ c_date: string }>;
      const allDates = Array.from(new Set([...pastHistoryRows.map((r) => r.c_date), dateParam]));
      streakInfo = calculateStreak(allDates, false, getDailyDate());
    } catch (e) {
      console.error("Error computing updated streak:", e);
    }

    // Also record score to current weekly season leaderboard (applying streak multiplier!)
    const boostedSeasonScore = streakInfo.streakBonusPercent > 0
      ? Math.round(replay.score * (1 + streakInfo.streakBonusPercent / 100))
      : replay.score;

    try {
      const currentSeason = getCurrentSeason();
      await ensureSeasonExists(currentSeason);
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
          ${currentSeason.id},
          ${player.githubId},
          ${player.username},
          ${player.displayName},
          ${player.avatarUrl},
          ${boostedSeasonScore},
          ${replay.highestTile},
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
    } catch (seasonErr) {
      console.error("Error saving daily score to season:", seasonErr);
    }

    return NextResponse.json({
      success: true,
      score: replay.score,
      boostedSeasonScore,
      highestTile: replay.highestTile,
      movesCount: replay.movesPlayed,
      streakInfo,
    });
  } catch (error) {
    console.error("Error saving daily challenge result:", error);
    return NextResponse.json(
      { error: "Erro ao registrar resultado do desafio diário" },
      { status: 500 }
    );
  }
}

