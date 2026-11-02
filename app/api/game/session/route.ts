import { NextResponse } from "next/server";
import { getPlayerSession } from "@/lib/auth";
import { createGameSessionToken } from "@/lib/security";

export async function POST() {
  const player = await getPlayerSession();
  const seed = (Math.floor(Math.random() * 2147483647) >>> 0) || 1;

  if (!player) {
    return NextResponse.json({ token: null, seed, message: "Não autenticado" });
  }

  const token = createGameSessionToken(player.githubId, seed);
  return NextResponse.json({ token, seed });
}
