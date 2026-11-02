import crypto from "crypto";
import { PlayerProfile } from "@/types/game";
import { cookies, headers } from "next/headers";

const SESSION_COOKIE_NAME = "dobra_player_session";

function getAuthSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.GITHUB_CLIENT_SECRET ||
    "dobra-session-secret-salt-2048"
  );
}

export function signProfileToken(profile: PlayerProfile): string {
  const payloadB64 = Buffer.from(JSON.stringify(profile)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", getAuthSecret())
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${sig}`;
}

export function verifyProfileToken(token: string): PlayerProfile | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length === 2) {
    const [payloadB64, sig] = parts;
    const expectedSig = crypto
      .createHmac("sha256", getAuthSecret())
      .update(payloadB64)
      .digest("base64url");

    if (
      sig.length === expectedSig.length &&
      crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
    ) {
      try {
        const data = JSON.parse(
          Buffer.from(payloadB64, "base64url").toString("utf-8")
        ) as PlayerProfile;
        if (data.githubId && data.username) return data;
      } catch {
        return null;
      }
    }
    return null;
  }

  // Graceful fallback for legacy base64 cookies
  try {
    const data = JSON.parse(
      Buffer.from(token, "base64").toString("utf-8")
    ) as PlayerProfile;
    if (data.githubId && data.username) return data;
  } catch {
    return null;
  }
  return null;
}

export async function getPlayerSession(): Promise<PlayerProfile | null> {
  try {
    // 1. Check Authorization: Bearer <token> (enables authentication inside cross-origin sandboxed iframes)
    try {
      const headerStore = await headers();
      const authHeader = headerStore.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const bearerToken = authHeader.slice(7).trim();
        const profile = verifyProfileToken(bearerToken);
        if (profile) return profile;
      }
    } catch {
      // In tests or environments without headers context, continue to cookie check
    }

    // 2. Fall back to standard session cookie
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) return null;

    return verifyProfileToken(cookie.value);
  } catch {
    return null;
  }
}

export async function setPlayerSession(profile: PlayerProfile): Promise<void> {
  const cookieStore = await cookies();
  const signedValue = signProfileToken(profile);

  cookieStore.set(SESSION_COOKIE_NAME, signedValue, {
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

