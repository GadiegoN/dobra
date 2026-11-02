import { NextRequest, NextResponse } from "next/server";
import { getPlayerSession } from "@/lib/auth";
import { getDb, ensureDatabaseSchema } from "@/lib/db";
import { GameMode, MatchHistoryItem } from "@/types/game";
import { computeStatsFromHistory } from "@/lib/stats";

interface DbMatchHistoryRow {
  id: string;
  github_id: string | null;
  mode: string;
  score: number;
  highest_tile: number;
  moves_count: number;
  duration_seconds: number;
  won: boolean;
  completed: boolean;
  created_at: string | Date;
}

export async function GET() {
  try {
    const player = await getPlayerSession();
    if (!player) {
      return NextResponse.json({ authenticated: false, stats: null, history: [] });
    }

    const sql = getDb();
    await ensureDatabaseSchema();

    const rows = (await sql`
      SELECT 
        id,
        github_id,
        mode,
        score,
        highest_tile,
        moves_count,
        duration_seconds,
        won,
        completed,
        created_at
      FROM game_match_history
      WHERE github_id = ${player.githubId}
      ORDER BY created_at DESC
      LIMIT 100;
    `) as unknown as DbMatchHistoryRow[];

    const history: MatchHistoryItem[] = rows.map((r) => ({
      id: String(r.id),
      date: new Date(r.created_at).toISOString(),
      mode: (r.mode as GameMode) || "classic",
      score: Number(r.score),
      highestTile: Number(r.highest_tile),
      movesCount: Number(r.moves_count),
      durationSeconds: Number(r.duration_seconds),
      completed: Boolean(r.completed),
      won: Boolean(r.won),
    }));

    const stats = computeStatsFromHistory(history);

    return NextResponse.json({
      authenticated: true,
      stats,
      history,
    });
  } catch (error) {
    console.error("Error fetching player stats:", error);
    return NextResponse.json(
      { error: "Erro ao buscar estatísticas do jogador" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const player = await getPlayerSession();
    const body = await request.json();

    const mode = (body.mode as GameMode) || "classic";
    const score = Number(body.score || 0);
    const highestTile = Number(body.highestTile || 2);
    const movesCount = Number(body.movesCount || 0);
    const durationSeconds = Number(body.durationSeconds || 0);
    const won = Boolean(body.won);
    const completed = body.completed !== undefined ? Boolean(body.completed) : true;

    if (player) {
      const sql = getDb();
      await ensureDatabaseSchema();

      await sql`
        INSERT INTO game_match_history (
          github_id,
          mode,
          score,
          highest_tile,
          moves_count,
          duration_seconds,
          won,
          completed,
          created_at
        )
        VALUES (
          ${player.githubId},
          ${mode},
          ${score},
          ${highestTile},
          ${movesCount},
          ${durationSeconds},
          ${won},
          ${completed},
          NOW()
        );
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving match history:", error);
    return NextResponse.json(
      { error: "Erro ao registrar histórico de partida" },
      { status: 500 }
    );
  }
}

