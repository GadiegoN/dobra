import { describe, it, expect } from "vitest";
import {
  validateScoreSanity,
  validateGameDuration,
  createGameSessionToken,
  verifyGameSessionToken,
  verifyGameReplay,
} from "@/lib/security";
import { signProfileToken, verifyProfileToken } from "@/lib/auth";
import { Direction, PlayerProfile } from "@/types/game";
import { replayGame } from "@/lib/game-engine";

describe("Security & Anti-Cheat Validation", () => {
  describe("validateScoreSanity", () => {
    it("should accept valid 2048 scores and power-of-two tiles", () => {
      expect(validateScoreSanity(0, 2).valid).toBe(true);
      expect(validateScoreSanity(4, 4).valid).toBe(true);
      expect(validateScoreSanity(20480, 2048).valid).toBe(true);
      expect(validateScoreSanity(52800, 4096).valid).toBe(true);
    });

    it("should reject negative or non-integer scores", () => {
      expect(validateScoreSanity(-10, 2).valid).toBe(false);
      expect(validateScoreSanity(4.5, 4).valid).toBe(false);
    });

    it("should reject scores that are not multiples of 4", () => {
      const res = validateScoreSanity(15, 4);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("múltipla de 4");
    });

    it("should reject invalid tile values (non power-of-two)", () => {
      const res = validateScoreSanity(100, 3);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("não é uma potência válida");
    });

    it("should reject implausible score vs highest tile combinations", () => {
      // 100,000 points with highest tile 8 is mathematically impossible
      const res = validateScoreSanity(100000, 8);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("inconsistente com o maior bloco");
    });
  });

  describe("validateGameDuration", () => {
    it("rejects impossibly fast games (< 500ms)", () => {
      const now = Date.now();
      const res = validateGameDuration(now - 100, 4000, 50);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("rápida demais");
    });

    it("rejects expired sessions (> 48h)", () => {
      const longAgo = Date.now() - 1000 * 60 * 60 * 50;
      const res = validateGameDuration(longAgo, 400, 10);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("expirada");
    });

    it("rejects high scores with impossibly low move counts", () => {
      const now = Date.now();
      // 10,000 points with only 5 moves is impossible
      const res = validateGameDuration(now - 60000, 10000, 5);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("incompatível com a pontuação");
    });
  });

  describe("HMAC Game Session Tokens", () => {
    it("generates and verifies valid session tokens", () => {
      const token = createGameSessionToken("user-12345");
      const verified = verifyGameSessionToken(token, "user-12345");
      expect(verified.valid).toBe(true);
      expect(verified.payload?.githubId).toBe("user-12345");
    });

    it("rejects tampered tokens", () => {
      const token = createGameSessionToken("user-12345");
      const tampered = token.slice(0, -4) + "XXXX";
      const verified = verifyGameSessionToken(tampered, "user-12345");
      expect(verified.valid).toBe(false);
    });

    it("rejects tokens for mismatched githubIds", () => {
      const token = createGameSessionToken("user-12345");
      const verified = verifyGameSessionToken(token, "other-user");
      expect(verified.valid).toBe(false);
      expect(verified.reason).toContain("não pertence a este usuário");
    });
  });

  describe("verifyGameReplay", () => {
    it("validates exact score and highest tile from deterministically replayed moves", () => {
      const seed = 98765;
      const moves: Direction[] = ["left", "down", "right", "up", "left", "down"];
      const actual = replayGame(seed, moves, "classic");

      const checkValid = verifyGameReplay(
        seed,
        moves,
        actual.score,
        actual.highestTile,
        "classic"
      );
      expect(checkValid.valid).toBe(true);

      const checkTampered = verifyGameReplay(
        seed,
        moves,
        actual.score + 100, // fake claimed score
        actual.highestTile,
        "classic"
      );
      expect(checkTampered.valid).toBe(false);
    });
  });

  describe("HMAC Session Cookie Security", () => {
    const mockProfile: PlayerProfile = {
      githubId: "12345678",
      username: "testplayer",
      displayName: "Test Player",
      avatarUrl: "https://github.com/testplayer.png",
      githubProfileUrl: "https://github.com/testplayer",
    };

    it("signs and verifies valid player profile session cookies", () => {
      const signed = signProfileToken(mockProfile);
      const verified = verifyProfileToken(signed);

      expect(verified).not.toBeNull();
      expect(verified?.githubId).toBe("12345678");
      expect(verified?.username).toBe("testplayer");
    });

    it("rejects forged or tampered session tokens", () => {
      const signed = signProfileToken(mockProfile);
      const parts = signed.split(".");
      // Tamper with payload (e.g. change githubId)
      const fakePayload = Buffer.from(
        JSON.stringify({ ...mockProfile, githubId: "99999999" })
      ).toString("base64url");
      const forged = `${fakePayload}.${parts[1]}`;

      const verified = verifyProfileToken(forged);
      expect(verified).toBeNull();
    });

    it("gracefully falls back to valid legacy base64 cookies", () => {
      const legacy = Buffer.from(JSON.stringify(mockProfile)).toString("base64");
      const verified = verifyProfileToken(legacy);

      expect(verified).not.toBeNull();
      expect(verified?.githubId).toBe("12345678");
    });
  });
});

