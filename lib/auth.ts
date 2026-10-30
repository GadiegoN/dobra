import { PlayerProfile } from "@/types/game";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "dobra_player_session";

export async function getPlayerSession(): Promise<PlayerProfile | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) return null;

    const data = JSON.parse(
      Buffer.from(cookie.value, "base64").toString("utf-8")
    ) as PlayerProfile;

    if (!data.githubId || !data.username) return null;
    return data;
  } catch {
    return null;
  }
}

export async function setPlayerSession(profile: PlayerProfile): Promise<void> {
  const cookieStore = await cookies();
  const value = Buffer.from(JSON.stringify(profile)).toString("base64");

  cookieStore.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearPlayerSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

