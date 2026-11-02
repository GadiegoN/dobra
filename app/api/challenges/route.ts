import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPlayerSession } from "@/lib/auth";
import { getDb, ensureDatabaseSchema } from "@/lib/db";
import { FriendChallenge, GameMode } from "@/types/game";

export async function POST(request: NextRequest) {
  try {
    const player = await getPlayerSession();
    const body = await request.json();

    const creatorName = player?.displayName || player?.username || String(body.creatorName || "Jogador").slice(0, 30);
    const creatorGithubId = player?.githubId || null;
    const mode = (body.mode as GameMode) || "classic";
    const seed = Number(body.seed) || (Math.floor(Math.random() * 2147483647) >>> 0) || 1;
    const targetScore = Number(body.targetScore || 0);
    const targetTile = Number(body.targetTile || 2);
    const creatorMovesCount = Number(body.creatorMovesCount || 0);

    const challengeId = "ch_" + crypto.randomBytes(4).toString("hex");

    const sql = getDb();
    await ensureDatabaseSchema();

    await sql`
      INSERT INTO friend_challenges (
        id,
        creator_name,
        creator_github_id,
        mode,
        seed,
        target_score,
        target_tile,
        creator_moves_count,
        created_at
      )
      VALUES (
        ${challengeId},
        ${creatorName},
        ${creatorGithubId},
        ${mode},
        ${seed},
        ${targetScore},
        ${targetTile},
        ${creatorMovesCount},
        NOW()
      );
    `;

    return NextResponse.json({
      success: true,
      challengeId,
      challenge: {
        id: challengeId,
        creatorName,
        mode,
        seed,
        targetScore,
        targetTile,
        creatorMovesCount,
        createdAt: new Date().toISOString(),
      } as FriendChallenge,
    });
  } catch (error) {
    console.error("Error creating challenge:", error);
    return NextResponse.json(
      { error: "Erro ao criar desafio entre amigos" },
      { status: 500 }
    );
  }
}

