"use client";

import { Board, Direction, GameTheme, PlayerProfile } from "@/types/game";
import { BoardTile } from "../board-tile";
import { ThemePicker } from "../theme-picker";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface PlaySceneProps {
  board: Board;
  score: number;
  bestScore: number;
  lastGained: number;
  currentTheme: GameTheme;
  player: PlayerProfile | null;
  onMove: (dir: Direction) => void;
  onRestart: () => void;
  onBackToMenu: () => void;
  onSelectTheme: (theme: GameTheme) => void;
}

export function PlayScene({
  board,
  score,
  bestScore,
  lastGained,
  currentTheme,
  player,
  onMove,
  onRestart,
  onBackToMenu,
  onSelectTheme,
}: PlaySceneProps) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const [showGainAnim, setShowGainAnim] = useState(false);

  useEffect(() => {
    if (lastGained > 0) {
      setShowGainAnim(true);
      const timer = setTimeout(() => setShowGainAnim(false), 600);
      return () => clearTimeout(timer);
    }
  }, [lastGained, score]);

  // Keyboard navigation strictly active during play scene
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "up",
        ArrowDown: "down",
        a: "left",
        A: "left",
        d: "right",
        D: "right",
        w: "up",
        W: "up",
        s: "down",
        S: "down",
      };

      const direction = keyMap[e.key];
      if (direction) {
        e.preventDefault();
        onMove(direction);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onMove]);

  // Touch swipe handling for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const threshold = 25;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      onMove(dx > 0 ? "right" : "left");
    } else {
      onMove(dy > 0 ? "down" : "up");
    }
  };

  return (
    <div className="flex w-full max-w-[480px] flex-col items-center animate-in fade-in duration-150">
      {/* Top Bar / Navigation */}
      <div className="mb-4 flex w-full items-center justify-between">
        <button
          onClick={onBackToMenu}
          className="flex items-center gap-1.5 rounded-xl border border-game-border bg-game-bg-subtle px-3 py-2 text-xs font-black uppercase tracking-wider text-game-text hover:bg-game-border/40 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Menu</span>
        </button>

        {player && (
          <div className="flex items-center gap-1.5 rounded-full border border-game-border bg-game-bg-subtle px-2.5 py-1 text-[11px] font-bold text-game-text-muted">
            <img
              src={player.avatarUrl}
              alt={player.username}
              className="h-4 w-4 rounded-full"
            />
            <span>@{player.username}</span>
          </div>
        )}

        <ThemePicker
          currentTheme={currentTheme}
          onSelectTheme={onSelectTheme}
          compact
        />
      </div>

      {/* Game HUD Header */}
      <div className="mb-4 flex w-full items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-game-text sm:text-5xl">
            2048
          </h1>
          <p className="text-xs font-semibold text-game-text-muted">Dobre e combine</p>
        </div>

        <div className="flex gap-2">
          {/* Score Box */}
          <div className="relative min-w-[80px] rounded-xl bg-game-card-bg px-3 py-2 text-center shadow-xs">
            <span className="block text-[10px] font-black uppercase tracking-wider text-game-card-label">
              Pontos
            </span>
            <span className="block text-xl font-black text-game-card-text tabular-nums">
              {score}
            </span>
            {showGainAnim && lastGained > 0 && (
              <span className="absolute -top-3 right-2 text-xs font-black text-game-accent animate-out fade-out slide-out-to-top-3 duration-500">
                +{lastGained}
              </span>
            )}
          </div>

          {/* Best Score Box */}
          <div className="min-w-[80px] rounded-xl bg-game-card-bg px-3 py-2 text-center shadow-xs">
            <span className="block text-[10px] font-black uppercase tracking-wider text-game-card-label">
              Recorde
            </span>
            <span className="block text-xl font-black text-game-card-text tabular-nums">
              {bestScore}
            </span>
          </div>
        </div>
      </div>

      {/* Sub-bar with quick restart and hint */}
      <div className="mb-3 flex w-full items-center justify-between text-xs text-game-text-muted">
        <span className="hidden sm:inline">Use as setas ou WASD</span>
        <span className="sm:hidden">Deslize para mover</span>
        <button
          onClick={onRestart}
          className="flex items-center gap-1 rounded-lg border border-game-border bg-game-bg-subtle px-2.5 py-1 font-bold text-game-text hover:bg-game-border/30"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reiniciar</span>
        </button>
      </div>

      {/* The 4x4 Grid Board */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="grid aspect-square w-full grid-cols-4 grid-rows-4 gap-2.5 rounded-2xl bg-game-board p-2.5 shadow-md sm:gap-3.5 sm:p-3.5"
        aria-label="Tabuleiro do jogo 2048"
      >
        {board.map((row, r) =>
          row.map((value, c) => (
            <BoardTile
              key={`${r}-${c}`}
              row={r}
              col={c}
              value={value}
            />
          ))
        )}
      </div>

      <div className="mt-4 text-center text-xs text-game-text-muted">
        Dica: mantenha o seu maior número em um dos cantos do tabuleiro.
      </div>
    </div>
  );
}
