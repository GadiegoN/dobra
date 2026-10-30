"use client";

interface BoardTileProps {
  value: number;
  row: number;
  col: number;
}

export function BoardTile({ value, row, col }: BoardTileProps) {
  if (value === 0) {
    return (
      <div
        data-cell={`${row}-${col}`}
        className="flex aspect-square items-center justify-center rounded-xl bg-game-cell-empty transition-colors duration-200"
      />
    );
  }

  const getFontSize = (val: number) => {
    if (val >= 1024) return "text-xl sm:text-3xl font-black";
    if (val >= 128) return "text-2xl sm:text-4xl font-extrabold";
    return "text-3xl sm:text-5xl font-extrabold";
  };

  const tileBgVar = `var(--tile-${value}-bg, var(--tile-super-bg))`;
  const tileTextVar = `var(--tile-${value}-text, var(--tile-super-text))`;

  return (
    <div
      data-cell={`${row}-${col}`}
      data-value={value}
      style={{
        backgroundColor: tileBgVar,
        color: tileTextVar,
      }}
      className={`flex aspect-square select-none items-center justify-center rounded-xl shadow-sm transition-all duration-150 animate-in zoom-in-75 ${getFontSize(
        value
      )}`}
    >
      <span>{value}</span>
    </div>
  );
}

