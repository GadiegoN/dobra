import { Board, Direction, GameMode, ModeRules } from "@/types/game";

export const BOARD_SIZE = 4;

export type RngFn = () => number;

/**
 * Deterministic 32-bit PRNG (Mulberry32).
 * Given a seed, produces identical sequence across all platforms.
 */
export function createRng(seed: number): RngFn {
  let s = (Math.floor(seed) >>> 0) || 1;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function emptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

export function getEmptyCells(board: Board): Array<[number, number]> {
  const empty: Array<[number, number]> = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) {
        empty.push([r, c]);
      }
    }
  }
  return empty;
}

export function addRandomTile(
  board: Board,
  rng: RngFn = Math.random
): { board: Board; added: [number, number] | null; value: number } {
  const next = board.map((row) => [...row]);
  const emptyCells = getEmptyCells(next);

  if (emptyCells.length === 0) {
    return { board: next, added: null, value: 0 };
  }

  const index = Math.floor(rng() * emptyCells.length);
  const [r, c] = emptyCells[Math.min(index, emptyCells.length - 1)];
  const value = rng() < 0.9 ? 2 : 4;
  next[r][c] = value;

  return { board: next, added: [r, c], value };
}

export function newGame(rng: RngFn = Math.random): Board {
  const board = emptyBoard();
  const step1 = addRandomTile(board, rng);
  const step2 = addRandomTile(step1.board, rng);
  return step2.board;
}

/**
 * Slide and merge a single 1D line of tiles.
 * Guarantees that each tile can merge at most once per move.
 */
export function slideLine(line: number[]): { line: number[]; gained: number } {
  const nonZero = line.filter((v) => v > 0);
  const result: number[] = [];
  let gained = 0;
  let i = 0;

  while (i < nonZero.length) {
    if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
      const merged = nonZero[i] * 2;
      result.push(merged);
      gained += merged;
      i += 2; // skip both merged tiles so result won't merge again
    } else {
      result.push(nonZero[i]);
      i += 1;
    }
  }

  while (result.length < BOARD_SIZE) {
    result.push(0);
  }

  return { line: result, gained };
}

export function moveBoard(
  board: Board,
  direction: Direction,
  rng: RngFn = Math.random
): { board: Board; gained: number; changed: boolean } {
  const next = emptyBoard();
  let gained = 0;

  for (let i = 0; i < BOARD_SIZE; i++) {
    let line =
      direction === "left" || direction === "right"
        ? [...board[i]]
        : board.map((row) => row[i]);

    if (direction === "right" || direction === "down") {
      line.reverse();
    }

    const res = slideLine(line);
    line = res.line;
    gained += res.gained;

    if (direction === "right" || direction === "down") {
      line.reverse();
    }

    for (let j = 0; j < BOARD_SIZE; j++) {
      if (direction === "left" || direction === "right") {
        next[i][j] = line[j];
      } else {
        next[j][i] = line[j];
      }
    }
  }

  const changed = next.some((row, r) =>
    row.some((val, c) => val !== board[r][c])
  );

  if (changed) {
    const tileResult = addRandomTile(next, rng);
    return { board: tileResult.board, gained, changed: true };
  }

  return { board, gained: 0, changed: false };
}

export function canMove(board: Board): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === 0) return true;
      if (c < BOARD_SIZE - 1 && board[r][c] === board[r][c + 1]) return true;
      if (r < BOARD_SIZE - 1 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

export function getHighestTile(board: Board): number {
  let highest = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] > highest) highest = board[r][c];
    }
  }
  return highest;
}

/**
 * Deterministic replay of a sequence of moves from an initial seed.
 * Used for server-side anti-cheat verification and challenge comparisons.
 */
export function replayGame(
  seed: number,
  moves: Direction[],
  mode: GameMode = "classic",
  rules?: ModeRules
): {
  finalBoard: Board;
  score: number;
  highestTile: number;
  movesPlayed: number;
  valid: boolean;
  won: boolean;
  gameOver: boolean;
} {
  const rng = createRng(seed);
  let board = newGame(rng);
  let score = 0;
  let movesPlayed = 0;
  const maxMoves = rules?.maxMoves ?? (mode === "move-limit" ? 80 : Infinity);
  const targetTile = rules?.targetTile ?? (mode === "target" ? 1024 : 2048);

  for (const dir of moves) {
    if (movesPlayed >= maxMoves) {
      break;
    }
    if (!canMove(board)) {
      break;
    }

    const res = moveBoard(board, dir, rng);
    if (res.changed) {
      board = res.board;
      score += res.gained;
      movesPlayed += 1;

      if (mode === "target" && getHighestTile(board) >= targetTile) {
        return {
          finalBoard: board,
          score,
          highestTile: getHighestTile(board),
          movesPlayed,
          valid: true,
          won: true,
          gameOver: true,
        };
      }
    }
  }

  const highestTile = getHighestTile(board);
  const won = highestTile >= (mode === "target" ? targetTile : 2048);
  const gameOver = !canMove(board) || movesPlayed >= maxMoves;

  return {
    finalBoard: board,
    score,
    highestTile,
    movesPlayed,
    valid: true,
    won,
    gameOver,
  };
}
