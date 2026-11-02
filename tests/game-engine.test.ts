import { describe, it, expect } from "vitest";
import {
  BOARD_SIZE,
  emptyBoard,
  slideLine,
  moveBoard,
  canMove,
  getHighestTile,
  createRng,
  newGame,
  replayGame,
} from "@/lib/game-engine";
import { getDailyDate, getDailySeed, getDailyConfig } from "@/lib/daily";
import { Board, Direction } from "@/types/game";

describe("Game Engine - Core Logic", () => {
  describe("slideLine", () => {
    it("should compress zeros to the right without merging distinct numbers", () => {
      const res = slideLine([0, 2, 0, 4]);
      expect(res.line).toEqual([2, 4, 0, 0]);
      expect(res.gained).toBe(0);
    });

    it("should merge adjacent equal numbers and calculate gained score", () => {
      const res = slideLine([2, 2, 0, 0]);
      expect(res.line).toEqual([4, 0, 0, 0]);
      expect(res.gained).toBe(4);
    });

    it("should merge pairs from left to right for [2, 2, 2, 0]", () => {
      const res = slideLine([2, 2, 2, 0]);
      expect(res.line).toEqual([4, 2, 0, 0]);
      expect(res.gained).toBe(4);
    });

    it("should merge two distinct pairs [2, 2, 2, 2] into [4, 4, 0, 0]", () => {
      const res = slideLine([2, 2, 2, 2]);
      expect(res.line).toEqual([4, 4, 0, 0]);
      expect(res.gained).toBe(8);
    });

    it("guarantees a tile is never merged more than once per move: [2, 2, 4, 0] -> [4, 4, 0, 0]", () => {
      const res = slideLine([2, 2, 4, 0]);
      expect(res.line).toEqual([4, 4, 0, 0]);
      expect(res.gained).toBe(4);
    });

    it("guarantees a tile is never merged more than once per move: [4, 2, 2, 0] -> [4, 4, 0, 0]", () => {
      const res = slideLine([4, 2, 2, 0]);
      expect(res.line).toEqual([4, 4, 0, 0]);
      expect(res.gained).toBe(4);
    });

    it("handles higher powers of 2 correctly: [4, 4, 8, 8] -> [8, 16, 0, 0]", () => {
      const res = slideLine([4, 4, 8, 8]);
      expect(res.line).toEqual([8, 16, 0, 0]);
      expect(res.gained).toBe(24);
    });
  });

  describe("moveBoard in all 4 directions", () => {
    // Fixed RNG that always returns 0 (picks first empty cell and places 2)
    const mockRng = () => 0;

    it("should slide and merge to the left", () => {
      const board: Board = [
        [2, 2, 0, 0],
        [0, 4, 4, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      const res = moveBoard(board, "left", mockRng);
      expect(res.changed).toBe(true);
      expect(res.gained).toBe(12);
      expect(res.board[0][0]).toBe(4);
      expect(res.board[1][0]).toBe(8);
    });

    it("should slide and merge to the right", () => {
      const board: Board = [
        [2, 0, 2, 0],
        [4, 4, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      const res = moveBoard(board, "right", mockRng);
      expect(res.changed).toBe(true);
      expect(res.gained).toBe(12);
      expect(res.board[0][3]).toBe(4);
      expect(res.board[1][3]).toBe(8);
    });

    it("should slide and merge upwards", () => {
      const board: Board = [
        [2, 0, 0, 0],
        [2, 4, 0, 0],
        [0, 4, 0, 0],
        [0, 0, 0, 0],
      ];
      const res = moveBoard(board, "up", mockRng);
      expect(res.changed).toBe(true);
      expect(res.gained).toBe(12);
      expect(res.board[0][0]).toBe(4);
      expect(res.board[0][1]).toBe(8);
    });

    it("should slide and merge downwards", () => {
      const board: Board = [
        [2, 0, 0, 0],
        [2, 4, 0, 0],
        [0, 4, 0, 0],
        [0, 0, 0, 0],
      ];
      const res = moveBoard(board, "down", mockRng);
      expect(res.changed).toBe(true);
      expect(res.gained).toBe(12);
      expect(res.board[3][0]).toBe(4);
      expect(res.board[3][1]).toBe(8);
    });

    it("should return changed: false when no tiles can move", () => {
      const board: Board = [
        [2, 4, 8, 16],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ];
      const res = moveBoard(board, "up", mockRng);
      expect(res.changed).toBe(false);
      expect(res.gained).toBe(0);
      expect(res.board).toBe(board);
    });
  });

  describe("canMove", () => {
    it("returns true when empty cells exist", () => {
      const board = emptyBoard();
      board[0][0] = 2;
      expect(canMove(board)).toBe(true);
    });

    it("returns true on full board with horizontal merge available", () => {
      const board: Board = [
        [2, 2, 4, 8],
        [16, 32, 64, 128],
        [256, 512, 1024, 2048],
        [2, 4, 8, 16],
      ];
      expect(canMove(board)).toBe(true);
    });

    it("returns true on full board with vertical merge available", () => {
      const board: Board = [
        [2, 4, 8, 16],
        [2, 32, 64, 128],
        [256, 512, 1024, 2048],
        [4, 8, 16, 32],
      ];
      expect(canMove(board)).toBe(true);
    });

    it("returns false on full board with no adjacent matches (game over)", () => {
      const board: Board = [
        [2, 4, 2, 4],
        [4, 2, 4, 2],
        [2, 4, 2, 4],
        [4, 2, 4, 2],
      ];
      expect(canMove(board)).toBe(false);
    });
  });

  describe("getHighestTile", () => {
    it("finds the highest tile on the board", () => {
      const board = emptyBoard();
      board[1][2] = 1024;
      board[3][3] = 2048;
      expect(getHighestTile(board)).toBe(2048);
    });
  });

  describe("Deterministic RNG (Mulberry32)", () => {
    it("produces identical sequence for identical seeds", () => {
      const rng1 = createRng(42);
      const rng2 = createRng(42);

      const seq1 = Array.from({ length: 10 }, () => rng1());
      const seq2 = Array.from({ length: 10 }, () => rng2());

      expect(seq1).toEqual(seq2);
    });

    it("produces numbers strictly within [0, 1)", () => {
      const rng = createRng(999);
      for (let i = 0; i < 100; i++) {
        const val = rng();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });

    it("creates identical initial boards for identical seeds", () => {
      const board1 = newGame(createRng(12345));
      const board2 = newGame(createRng(12345));
      expect(board1).toEqual(board2);
    });
  });

  describe("replayGame - Deterministic replay & anti-cheat", () => {
    it("reliably replays a series of moves and produces deterministic results", () => {
      const moves: Direction[] = [
        "left",
        "down",
        "right",
        "up",
        "left",
        "down",
        "right",
        "up",
      ];
      const result1 = replayGame(777, moves, "classic");
      const result2 = replayGame(777, moves, "classic");

      expect(result1.score).toBe(result2.score);
      expect(result1.highestTile).toBe(result2.highestTile);
      expect(result1.finalBoard).toEqual(result2.finalBoard);
      expect(result1.movesPlayed).toBe(result2.movesPlayed);
      expect(result1.valid).toBe(true);
    });

    it("respects maxMoves in move-limit mode", () => {
      const moves: Direction[] = Array(100).fill("left");
      const result = replayGame(123, moves, "move-limit", { maxMoves: 10 });
      expect(result.movesPlayed).toBeLessThanOrEqual(10);
    });

    it("detects win condition in target mode when target tile is reached", () => {
      // Artificially trigger target mode with target tile 4
      const moves: Direction[] = ["left", "right", "up", "down", "left", "down"];
      const result = replayGame(1, moves, "target", { targetTile: 4 });
      if (result.highestTile >= 4) {
        expect(result.won).toBe(true);
      }
    });
  });

  describe("Daily Challenge - Brasília Timezone (America/Sao_Paulo, UTC-3)", () => {
    it("keeps the same day at 21:00 BRT instead of switching early at UTC midnight", () => {
      // 2026-11-01 21:30 BRT is 2026-11-02 00:30 UTC
      const dateAt2130BRT = new Date("2026-11-01T21:30:00-03:00");
      expect(getDailyDate(dateAt2130BRT)).toBe("2026-11-01");
    });

    it("resets exactly after midnight (00:00) in Brasília", () => {
      const dateBeforeMidnight = new Date("2026-11-01T23:59:59-03:00");
      const dateAfterMidnight = new Date("2026-11-02T00:00:01-03:00");

      expect(getDailyDate(dateBeforeMidnight)).toBe("2026-11-01");
      expect(getDailyDate(dateAfterMidnight)).toBe("2026-11-02");
    });

    it("produces deterministic seeds for a given day in Brazil", () => {
      const seed1 = getDailySeed("2026-11-01");
      const seed2 = getDailySeed("2026-11-01");
      const seedNextDay = getDailySeed("2026-11-02");

      expect(seed1).toBe(seed2);
      expect(seed1).not.toBe(seedNextDay);
    });
  });
});

