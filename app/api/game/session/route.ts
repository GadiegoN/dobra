import { NextResponse } from "next/server";
import { getPlayerSession } from "@/lib/auth";
import { createGameSessionToken } from "@/lib/security";

export async function POST() {
  const player = await getPlayerSession();
  if (!player) {
    return NextResponse.json({ token: null, message: "Não autenticado" });
  }

  const token = createGameSessionToken(player.githubId);
  return NextResponse.json({ token });
}

