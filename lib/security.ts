import crypto from "crypto";

const VALID_TILES = new Set([
  2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072,
]);

// Absolute theoretical maximum score in 4x4 2048
export const ABSOLUTE_MAX_SCORE = 3932156;

// In-memory set of recently consumed session IDs to prevent replay attacks
const consumedSessions = new Set<string>();

// Keep memory clean by pruning periodically
setInterval(() => {
  if (consumedSessions.size > 5000) {
    consumedSessions.clear();
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
  startedAt: number;
}

export function createGameSessionToken(githubId: string): string {
  const payload: GameSessionPayload = {
    sessionId: crypto.randomUUID(),
    githubId,
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

    if (consumedSessions.has(payload.sessionId)) {
      return { valid: false, reason: "Esta partida já foi registrada (replay attack)" };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: "Falha ao decodificar token" };
  }
}

export function markSessionConsumed(sessionId: string) {
  consumedSessions.add(sessionId);
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

  // Calculate theoretical minimum score to produce this tile alone:
  // k = log2(highestTile)
  // minScore ≈ (k - 1) * 2^k * 0.8
  const k = Math.round(Math.log2(highestTile));
  if (k >= 2) {
    const theoreticalMin = Math.floor((k - 1) * Math.pow(2, k) * 0.75);
    if (score < theoreticalMin) {
      return {
        valid: false,
        reason: `Pontuação (${score}) insuficiente para ter atingido o bloco ${highestTile} (mínimo esperado: ${theoreticalMin})`,
      };
    }
  }

  // Calculate maximum plausible score for a given highest tile:
  // E.g., you cannot achieve 200,000 points while your highest tile is only 256.
  // In a 4x4 grid, if you have 200k points, tiles inevitably merge into higher tiers.
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
 * - A human player needs at least ~40ms per move.
 * - Higher scores require minimum moves.
 */
export function validateGameDuration(
  startedAt: number,
  score: number,
  movesCount: number
): { valid: boolean; reason?: string } {
  const durationMs = Date.now() - startedAt;

  // Game must have started in the past, but not more than 48 hours ago
  if (durationMs < 500) {
    return { valid: false, reason: "Partida rápida demais para ser humana (< 0.5s)" };
  }

  if (durationMs > 1000 * 60 * 60 * 48) {
    return { valid: false, reason: "Sessão de partida expirada (> 48h)" };
  }

  // To achieve a score of X, you need at least (score / 40) moves
  if (score >= 1000) {
    const minEstimatedMoves = Math.floor(score / 45);
    if (movesCount > 0 && movesCount < minEstimatedMoves) {
      return {
        valid: false,
        reason: `Contagem de movimentos (${movesCount}) incompatível com a pontuação (${score})`,
      };
    }

    // Minimum time: at least 35ms per estimated move
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

