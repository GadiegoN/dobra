import { NextRequest, NextResponse } from "next/server";
import { getPlayerSession } from "@/lib/auth";
import { getDb, ensureDatabaseSchema } from "@/lib/db";
import { FriendChallenge, FriendChallengeAttempt, GameMode } from "@/types/game";

interface DbChallengeRow {
  id: string;
  creator_name: string;
  creator_github_id: string | null;
  mode: string;
  seed: string | number;
  target_score: number;
  target_tile: number;
  creator_moves_count: number;
  created_at: string | Date;
}

interface DbAttemptRow {
  id: string;
  challenge_id: string;
  player_name: string;
  score: number;
  highest_tile: number;
  moves_count: number;
  created_at: string | Date;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const sql = getDb();
    await ensureDatabaseSchema();

    const challenges = (await sql`
      SELECT 
        id,
        creator_name,
        creator_github_id,
        mode,
        seed,
        target_score,
        target_tile,
        creator_moves_count,
        created_at
      FROM friend_challenges
      WHERE id = ${id}
      LIMIT 1;
    `) as unknown as DbChallengeRow[];

    if (challenges.length === 0) {
      return NextResponse.json({ error: "Desafio não encontrado" }, { status: 404 });
    }

    const c = challenges[0];
    const challenge: FriendChallenge = {
      id: String(c.id),
      creatorName: String(c.creator_name),
      mode: (c.mode as GameMode) || "classic",
      seed: Number(c.seed),
      targetScore: Number(c.target_score),
      targetTile: Number(c.target_tile),
      creatorMovesCount: Number(c.creator_moves_count),
      createdAt: new Date(c.created_at).toISOString(),
    };

    const attemptsRows = (await sql`
      SELECT 
        id,
        challenge_id,
        player_name,
        score,
        highest_tile,
        moves_count,
        created_at
      FROM friend_challenge_attempts
      WHERE challenge_id = ${id}
      ORDER BY score DESC, moves_count ASC, created_at ASC
      LIMIT 20;
    `) as unknown as DbAttemptRow[];

    const attempts: FriendChallengeAttempt[] = attemptsRows.map((a) => ({
      id: String(a.id),
      challengeId: String(a.challenge_id),
      playerName: String(a.player_name),
      score: Number(a.score),
      highestTile: Number(a.highest_tile),
      movesCount: Number(a.moves_count),
      createdAt: new Date(a.created_at).toISOString(),
    }));

    return NextResponse.json({ challenge, attempts });
  } catch (error) {
    console.error("Error fetching challenge:", error);
    return NextResponse.json({ error: "Erro ao carregar desafio" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const player = await getPlayerSession();
    const body = await request.json();

    const playerName =
      player?.displayName || player?.username || String(body.playerName || "Desafiante").slice(0, 30);
    const score = Number(body.score || 0);
    const highestTile = Number(body.highestTile || 2);
    const movesCount = Number(body.movesCount || 0);

    const sql = getDb();
    await ensureDatabaseSchema();

    await sql`
      INSERT INTO friend_challenge_attempts (
        challenge_id,
        player_name,
        score,
        highest_tile,
        moves_count,
        created_at
      )
      VALUES (
        ${id},
        ${playerName},
        ${score},
        ${highestTile},
        ${movesCount},
        NOW()
      );
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error submitting challenge attempt:", error);
    return NextResponse.json(
      { error: "Erro ao registrar tentativa de desafio" },
      { status: 500 }
    );
  }
}

