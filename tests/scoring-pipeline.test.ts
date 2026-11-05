import { describe, it, expect } from "vitest";
import { validateScoreSanity, validateGameDuration } from "@/lib/security";
import { calculateStreak } from "@/lib/daily";

describe("Scoring Pipeline & Score Acceptance Validation", () => {
  describe("Legitimate Player Scores Validation", () => {
    it("MUST accept 16,000 points with tile 1024 or 2048 (user's real daily score)", () => {
      const sanity1024 = validateScoreSanity(16000, 1024);
      expect(sanity1024.valid).toBe(true);

      const sanity2048 = validateScoreSanity(16000, 2048);
      expect(sanity2048.valid).toBe(true);
    });

    it("MUST accept 29,000 points with tile 2048 or 4096 (user's real classic high score)", () => {
      // 29,000 is divisible by 4 (29000 / 4 = 7250)
      const sanity2048 = validateScoreSanity(29000, 2048);
      expect(sanity2048.valid).toBe(true);

      const sanity4096 = validateScoreSanity(29000, 4096);
      expect(sanity4096.valid).toBe(true);
    });

    it("MUST accept realistic game duration for human play", () => {
      const now = Date.now();
      // 10 minutes game with 1,200 moves and 29,000 points
      const startedAt = now - 1000 * 60 * 10;
      const durationCheck = validateGameDuration(startedAt, 29000, 1200);
      expect(durationCheck.valid).toBe(true);
    });

    it("MUST accept games left open for up to 7 days", () => {
      const now = Date.now();
      const startedAt = now - 1000 * 60 * 60 * 24 * 3; // 3 days ago
      const durationCheck = validateGameDuration(startedAt, 16000, 800);
      expect(durationCheck.valid).toBe(true);
    });
  });

  describe("Rejection of Illegitimate/Impossible Submissions", () => {
    it("rejects hacked non-multiples of 4", () => {
      const res = validateScoreSanity(16001, 1024);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("múltipla de 4");
    });

    it("rejects negative or fractional scores", () => {
      expect(validateScoreSanity(-500, 2).valid).toBe(false);
      expect(validateScoreSanity(100.5, 4).valid).toBe(false);
    });

    it("rejects impossible tile levels", () => {
      expect(validateScoreSanity(16000, 1000).valid).toBe(false);
    });

    it("rejects absurdly low duration (bot / script < 0.5s)", () => {
      const now = Date.now();
      const res = validateGameDuration(now - 100, 16000, 800);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain("rápida demais");
    });
  });

  describe("Streak & Season Multiplier Calculation", () => {
    it("correctly awards streak bonus for consistent daily challenge players", () => {
      const streak3 = calculateStreak(["2026-11-04", "2026-11-03", "2026-11-02"], false, "2026-11-04");
      expect(streak3.currentStreak).toBe(3);
      expect(streak3.streakBonusPercent).toBe(3);

      const streak7 = calculateStreak(
        ["2026-11-04", "2026-11-03", "2026-11-02", "2026-11-01", "2026-10-31", "2026-10-30", "2026-10-29"],
        false,
        "2026-11-04"
      );
      expect(streak7.currentStreak).toBe(7);
      expect(streak7.streakBonusPercent).toBe(10);
    });
  });
});

