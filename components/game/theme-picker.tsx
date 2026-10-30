"use client";

import { GameTheme, GameThemeOption } from "@/types/game";
import { Palette, Check } from "lucide-react";

export const THEMES: GameThemeOption[] = [
  {
    id: "classic",
    name: "Clássico",
    description: "Tons quentes e acolhedores tradicionais",
    previewColors: ["#faf8ef", "#bbada0", "#edc22e"],
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    description: "Neon magenta e ciano vibrante",
    previewColors: ["#090813", "#ff007f", "#00f3ff"],
  },
  {
    id: "retro",
    name: "Retrô 8-bit",
    description: "Estilo Game Boy arcade clássico",
    previewColors: ["#8b956d", "#306230", "#9bbc0f"],
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Dark slate moderno com acentos índigo",
    previewColors: ["#0f172a", "#334155", "#6366f1"],
  },
];

interface ThemePickerProps {
  currentTheme: GameTheme;
  onSelectTheme: (theme: GameTheme) => void;
  compact?: boolean;
}

export function ThemePicker({
  currentTheme,
  onSelectTheme,
  compact = false,
}: ThemePickerProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-1 rounded-xl border border-game-border bg-game-bg-subtle p-1 shadow-xs">
        <Palette className="ml-1 h-3.5 w-3.5 shrink-0 text-game-text-muted" />
        <div className="flex gap-1">
          {THEMES.map((t) => {
            const isActive = t.id === currentTheme;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTheme(t.id)}
                title={`${t.name}: ${t.description}`}
                className={`flex h-6.5 items-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-game-accent text-game-accent-text shadow-xs"
                    : "text-game-text-muted hover:text-game-text"
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/20"
                  style={{ backgroundColor: t.previewColors[1] }}
                />
                <span className="hidden md:inline">{t.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-game-accent" />
          <span className="text-xs font-black tracking-wider uppercase text-game-text-muted">
            Escolha o Tema Visual
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {THEMES.map((theme) => {
          const isActive = theme.id === currentTheme;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelectTheme(theme.id)}
              className={`group relative flex w-full min-w-0 flex-col items-start rounded-xl border-2 p-3 text-left transition-all overflow-hidden ${
                isActive
                  ? "border-game-accent bg-game-bg-subtle shadow-md scale-[1.01]"
                  : "border-game-border bg-game-bg/70 hover:border-game-accent/50 hover:bg-game-bg-subtle"
              }`}
            >
              <div className="mb-1.5 flex w-full min-w-0 items-center justify-between gap-1.5">
                <span className="truncate text-sm font-black text-game-text">
                  {theme.name}
                </span>

                <div className="flex shrink-0 items-center gap-1.5">
                  <div className="flex -space-x-1">
                    {theme.previewColors.map((color, i) => (
                      <span
                        key={i}
                        className="h-3 w-3 rounded-full border border-black/20 shadow-xs"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  {isActive && (
                    <Check className="h-3.5 w-3.5 text-game-accent shrink-0" />
                  )}
                </div>
              </div>

              <p className="w-full text-[11px] leading-snug text-game-text-muted break-words line-clamp-2">
                {theme.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
