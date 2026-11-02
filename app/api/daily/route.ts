import { NextRequest, NextResponse } from "next/server";
import { getPlayerSession } from "@/lib/auth";
import { getDb, ensureDatabaseSchema } from "@/lib/db";
import { getDailyConfig, getDailyDate } from "@/lib/daily";
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
    }

    return NextResponse.json({
      config,
      hasPlayed,
      userResult,
      ranking,
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

    // Also record score to current weekly season leaderboard
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
          ${replay.score},
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
      highestTile: replay.highestTile,
      movesCount: replay.movesPlayed,
    });
  } catch (error) {
    console.error("Error saving daily challenge result:", error);
    return NextResponse.json(
      { error: "Erro ao registrar resultado do desafio diário" },
      { status: 500 }
    );
  }
}

