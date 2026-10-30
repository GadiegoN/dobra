import { NextRequest, NextResponse } from "next/server";
import { getDb, ensureLeaderboardTable } from "@/lib/db";
import { getPlayerSession } from "@/lib/auth";
import { GlobalRankingEntry } from "@/types/game";
import {
  validateScoreSanity,
  verifyGameSessionToken,
  validateGameDuration,
  markSessionConsumed,
} from "@/lib/security";

export async function GET() {
  try {
    const sql = getDb();
    await ensureLeaderboardTable();

    const rows = await sql`
      SELECT 
        id,
        github_id,
        username,
        display_name,
        avatar_url,
        score,
        highest_tile,
        github_profile_url,
        created_at,
        updated_at
      FROM leaderboard
      ORDER BY score DESC, updated_at ASC
      LIMIT 50;
    `;

    const ranking: GlobalRankingEntry[] = rows.map((r: any) => ({
      id: String(r.id),
      githubId: String(r.github_id),
      username: String(r.username),
      displayName: r.display_name ? String(r.display_name) : null,
      avatarUrl: String(r.avatar_url),
      score: Number(r.score),
      highestTile: Number(r.highest_tile),
      githubProfileUrl: String(r.github_profile_url),
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));

    return NextResponse.json({ ranking });
  } catch (error) {
    console.error("Error fetching global ranking:", error);
    return NextResponse.json(
      { error: "Erro ao buscar ranking global", ranking: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Player Authentication
    const player = await getPlayerSession();
    if (!player) {
      return NextResponse.json(
        { error: "Você precisa estar conectado com o GitHub para salvar no ranking global" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const score = Number(body.score || 0);
    const highestTile = Number(body.highestTile || 2);
    const movesCount = Number(body.movesCount || 0);
    const gameToken = body.gameToken as string | undefined;

    // 2. Mathematical Sanity Checks (Multiples of 4, power of 2, logical bounds)
    const sanityCheck = validateScoreSanity(score, highestTile);
    if (!sanityCheck.valid) {
      console.warn(`[Anti-Cheat] Score sanity violation for @${player.username}:`, sanityCheck.reason);
      return NextResponse.json(
        { error: `Validação rejeitada: ${sanityCheck.reason}` },
        { status: 400 }
      );
    }

    // 3. Game Session & Duration Validation
    if (gameToken) {
      const tokenVerification = verifyGameSessionToken(gameToken, player.githubId);
      if (!tokenVerification.valid || !tokenVerification.payload) {
        console.warn(`[Anti-Cheat] Invalid token for @${player.username}:`, tokenVerification.reason);
        return NextResponse.json(
          { error: `Sessão inválida: ${tokenVerification.reason}` },
          { status: 403 }
        );
      }

      const durationCheck = validateGameDuration(
        tokenVerification.payload.startedAt,
        score,
        movesCount
      );
      if (!durationCheck.valid) {
        console.warn(`[Anti-Cheat] Duration violation for @${player.username}:`, durationCheck.reason);
        return NextResponse.json(
          { error: `Partida rejeitada: ${durationCheck.reason}` },
          { status: 400 }
        );
      }

      // Mark token consumed to prevent replay attack
      markSessionConsumed(tokenVerification.payload.sessionId);
    }

    const sql = getDb();
    await ensureLeaderboardTable();

    // 4. Rate Limiting: Minimum 5 seconds between consecutive score saves per user
    const existing = await sql`
      SELECT updated_at, score FROM leaderboard WHERE github_id = ${player.githubId} LIMIT 1;
    `;

    if (existing.length > 0) {
      const lastUpdated = new Date(existing[0].updated_at).getTime();
      const timeSinceLastUpdate = Date.now() - lastUpdated;
      if (timeSinceLastUpdate < 5000) {
        return NextResponse.json(
          { error: "Aguarde alguns segundos entre envios de pontuação" },
          { status: 429 }
        );
      }
    }

    // 5. Secure Upsert in Neon: only increases if the new score is strictly greater
    await sql`
      INSERT INTO leaderboard (
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
        ${player.githubId},
        ${player.username},
        ${player.displayName},
        ${player.avatarUrl},
        ${score},
        ${highestTile},
        ${player.githubProfileUrl},
        NOW(),
        NOW()
      )
      ON CONFLICT (github_id)
      DO UPDATE SET
        score = GREATEST(leaderboard.score, EXCLUDED.score),
        highest_tile = GREATEST(leaderboard.highest_tile, EXCLUDED.highest_tile),
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        github_profile_url = EXCLUDED.github_profile_url,
        updated_at = NOW();
    `;

    return NextResponse.json({
      success: true,
      player,
      score,
      highestTile,
    });
  } catch (error) {
    console.error("Error saving global score:", error);
    return NextResponse.json(
      { error: "Erro interno ao processar pontuação" },
      { status: 500 }
    );
  }
}
