import crypto from "crypto";
import { getDb, ensureDatabaseSchema } from "./db";

const VALID_TILES = new Set([
  2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072,
]);

// Absolute theoretical maximum score in 4x4 2048
export const ABSOLUTE_MAX_SCORE = 3932156;

// In-memory fallback cache of recently consumed session IDs
const memoryConsumedSessions = new Set<string>();

setInterval(() => {
  if (memoryConsumedSessions.size > 5000) {
    memoryConsumedSessions.clear();
  }
}, 1000 * 60 * 30); // 30 minutes

function getSigningSecret(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.GITHUB_CLIENT_SECRET ||
    "dobra-2048-fallback-secret-production"
  );
}

export interface GameSessionPayload {
  sessionId: string;
  githubId: string;
  seed: number;
  startedAt: number;
}

export function createGameSessionToken(githubId: string, seed: number = Date.now()): string {
  const payload: GameSessionPayload = {
    sessionId: crypto.randomUUID(),
    githubId,
    seed,
    startedAt: Date.now(),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSigningSecret())
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

export function verifyGameSessionToken(
  token: string,
  expectedGithubId: string
): { valid: boolean; payload?: GameSessionPayload; reason?: string } {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "Token de sessão ausente" };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, reason: "Formato de token inválido" };
  }

  const [payloadB64, signature] = parts;
  const expectedSig = crypto
    .createHmac("sha256", getSigningSecret())
    .update(payloadB64)
    .digest("base64url");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return { valid: false, reason: "Assinatura do token inválida (adulterado)" };
  }

  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    ) as GameSessionPayload;

    if (payload.githubId !== expectedGithubId) {
      return { valid: false, reason: "Token não pertence a este usuário" };
    }

    if (memoryConsumedSessions.has(payload.sessionId)) {
      return { valid: false, reason: "Esta partida já foi registrada (replay attack)" };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: "Falha ao decodificar token" };
  }
}

export async function isSessionConsumed(sessionId: string): Promise<boolean> {
  if (memoryConsumedSessions.has(sessionId)) return true;
  try {
    const sql = getDb();
    await ensureDatabaseSchema();
    const rows = await sql`
      SELECT session_id FROM consumed_game_sessions WHERE session_id = ${sessionId} LIMIT 1;
    `;
    return rows.length > 0;
  } catch {
    return memoryConsumedSessions.has(sessionId);
  }
}

export async function markSessionConsumed(sessionId: string, githubId: string = "anonymous") {
  memoryConsumedSessions.add(sessionId);
  try {
    const sql = getDb();
    await ensureDatabaseSchema();
    await sql`
      INSERT INTO consumed_game_sessions (session_id, github_id)
      VALUES (${sessionId}, ${githubId})
      ON CONFLICT (session_id) DO NOTHING;
    `;
  } catch (error) {
    console.error("Error marking session consumed in db:", error);
  }
}

/**
 * Mathematical Sanity Check for 2048:
 * - Score must be an integer >= 0 and <= absolute cap.
 * - Score must be a multiple of 4 (all merges are 2+2=4, 4+4=8, 8+8=16...).
 * - Highest tile must be a valid power of 2.
 * - Score must be compatible with the claimed highest tile.
 */
export function validateScoreSanity(
  score: number,
  highestTile: number
): { valid: boolean; reason?: string } {
  if (!Number.isInteger(score) || score < 0) {
    return { valid: false, reason: "Pontuação deve ser um número inteiro positivo" };
  }

  if (score > ABSOLUTE_MAX_SCORE) {
    return { valid: false, reason: "Pontuação excede o limite teórico mundial" };
  }

  if (score > 0 && score % 4 !== 0) {
    return { valid: false, reason: "Pontuação matemática inválida no 2048 (deve ser múltipla de 4)" };
  }

  if (!VALID_TILES.has(highestTile)) {
    return { valid: false, reason: `Bloco ${highestTile} não é uma potência válida de 2` };
  }

  // Calculate theoretical minimum score to produce this tile alone (with safety margin for 4-spawns):
  const k = Math.round(Math.log2(highestTile));
  if (k >= 3) {
    const theoreticalMin = Math.floor((k - 2) * Math.pow(2, k) * 0.5);
    if (score < theoreticalMin) {
      return {
        valid: false,
        reason: `Pontuação (${score}) insuficiente para ter atingido o bloco ${highestTile} (mínimo esperado: ${theoreticalMin})`,
      };
    }
  }

  // Calculate maximum plausible score for a given highest tile:
  const maxPlausibleForTile: Record<number, number> = {
    2: 100,
    4: 400,
    8: 1200,
    16: 3000,
    32: 6000,
    64: 12000,
    128: 24000,
    256: 45000,
    512: 85000,
    1024: 160000,
    2048: 320000,
    4096: 650000,
    8192: 1200000,
    16384: 2200000,
    32768: 3500000,
    65536: ABSOLUTE_MAX_SCORE,
    131072: ABSOLUTE_MAX_SCORE,
  };

  const allowedMax = maxPlausibleForTile[highestTile] ?? ABSOLUTE_MAX_SCORE;
  if (score > allowedMax) {
    return {
      valid: false,
      reason: `Pontuação (${score}) inconsistente com o maior bloco (${highestTile}). Máximo coerente: ${allowedMax}`,
    };
  }

  return { valid: true };
}

/**
 * Validates gameplay duration and move speed:
 * - A human player needs at least ~35ms per move.
 * - Higher scores require minimum moves.
 */
export function validateGameDuration(
  startedAt: number,
  score: number,
  movesCount: number
): { valid: boolean; reason?: string } {
  const durationMs = Date.now() - startedAt;

  if (durationMs < 500) {
    return { valid: false, reason: "Partida rápida demais para ser humana (< 0.5s)" };
  }

  if (durationMs > 1000 * 60 * 60 * 24 * 7) {
    return { valid: false, reason: "Sessão de partida expirada (> 7 dias)" };
  }

  if (score >= 1000) {
    const minEstimatedMoves = Math.floor(score / 60);
    if (movesCount > 0 && movesCount < minEstimatedMoves) {
      return {
        valid: false,
        reason: `Contagem de movimentos (${movesCount}) incompatível com a pontuação (${score})`,
      };
    }

    const minTimeMs = minEstimatedMoves * 35;
    if (durationMs < minTimeMs) {
      return {
        valid: false,
        reason: `Duração da partida (${Math.round(durationMs / 1000)}s) incompatível com a pontuação`,
      };
    }
  }

  return { valid: true };
}
