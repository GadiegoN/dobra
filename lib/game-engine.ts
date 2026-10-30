import { Board, Direction } from "@/types/game";

export const BOARD_SIZE = 4;

export function emptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
}

export function addRandomTile(board: Board): Board {
  const next = board.map((row) => [...row]);
  const emptyCells: Array<[number, number]> = [];

  next.forEach((row, r) => {
    row.forEach((value, c) => {
      if (value === 0) emptyCells.push([r, c]);
    });
  });

  if (emptyCells.length === 0) return next;

  const [r, c] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

export function newGame(): Board {
  return addRandomTile(addRandomTile(emptyBoard()));
}

function slideLine(line: number[]) {
  const values = line.filter(Boolean);
  let gained = 0;

  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] === values[i + 1]) {
      values[i] *= 2;
      gained += values[i];
      values.splice(i + 1, 1);
    }
  }

  while (values.length < BOARD_SIZE) {
    values.push(0);
  }

  return { line: values, gained };
}

export function moveBoard(
  board: Board,
  direction: Direction
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

    const result = slideLine(line);
    line = result.line;
    gained += result.gained;

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
    row.some((value, c) => value !== board[r][c])
  );

  return {
    board: changed ? addRandomTile(next) : board,
    gained,
    changed,
  };
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

