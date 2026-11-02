"use client";

import { useState, useEffect } from "react";
import { GameTheme, GameThemeOption, PersonalStats } from "@/types/game";
import { Palette, Check, Lock } from "lucide-react";
import { getLocalHistory, computeStatsFromHistory } from "@/lib/stats";
import { calculateStreak, getLocalDailyHistory } from "@/lib/daily";

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
  {
    id: "sunset",
    name: "Sunset",
    description: "Gradiente crepuscular âmbar e carmesim",
    previewColors: ["#2b1329", "#ff6b6b", "#ffe46b"],
    condition: {
      type: "tile",
      value: 1024,
      description: "Desbloqueie alcançando a peça 1024",
    },
  },
  {
    id: "emerald",
    name: "Esmeralda",
    description: "Verde jade místico com destaques dourados",
    previewColors: ["#062319", "#10b981", "#fbbf24"],
    condition: {
      type: "score",
      value: 10000,
      description: "Desbloqueie atingindo 10.000 pontos",
    },
  },
  {
    id: "inferno",
    name: "Inferno",
    description: "Lava incandescente e brasas vulcânicas",
    previewColors: ["#1c0808", "#ff3d00", "#ffea00"],
    condition: {
      type: "daily_streak",
      value: 7,
      description: "Desbloqueie com 7 dias seguidos no Desafio Diário",
    },
  },
  {
    id: "cosmos",
    name: "Cosmos",
    description: "Nebulosa estrelada e ultravioleta cósmico",
    previewColors: ["#0b071a", "#818cf8", "#38bdf8"],
    condition: {
      type: "daily_streak",
      value: 14,
      description: "Desbloqueie com 14 dias seguidos no Desafio Diário",
    },
  },
];

export function isThemeUnlocked(
  theme: GameThemeOption,
  stats: PersonalStats | null,
  streakDays: number = 0
): boolean {
  if (!theme.condition) return true;

  if (theme.condition.type === "daily_streak") {
    return streakDays >= Number(theme.condition.value);
  }

  if (!stats) return false;

  if (theme.condition.type === "tile") {
    return stats.highestTile >= Number(theme.condition.value);
  }
  if (theme.condition.type === "score") {
    return stats.bestScore >= Number(theme.condition.value);
  }
  if (theme.condition.type === "games_played") {
    return stats.totalGames >= Number(theme.condition.value);
  }
  return false;
}

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
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const history = getLocalHistory();
      setStats(computeStatsFromHistory(history));

      const dailyHistory = getLocalDailyHistory();
      const streakInfo = calculateStreak(dailyHistory.map((d) => d.date));
      setStreakDays(streakInfo.bestStreak);
    } catch {
      // ignore
    }
  }, []);

  const handleSelect = (theme: GameThemeOption) => {
    const unlocked = isThemeUnlocked(theme, stats, streakDays);
    if (!unlocked) {
      setLockedNotice(
        theme.condition?.description || "Bloqueado: cumpra os requisitos do jogo para liberar!"
      );
      setTimeout(() => setLockedNotice(null), 3500);
      return;
    }
    setLockedNotice(null);
    onSelectTheme(theme.id);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1 rounded-xl border border-game-border bg-game-bg-subtle p-1 shadow-xs">
        <Palette className="ml-1 h-3.5 w-3.5 shrink-0 text-game-text-muted" />
        <div className="flex gap-1">
          {THEMES.map((t) => {
            const isActive = t.id === currentTheme;
            const unlocked = isThemeUnlocked(t, stats, streakDays);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelect(t)}
                title={unlocked ? `${t.name}: ${t.description}` : `🔒 ${t.name}: ${t.condition?.description}`}
                className={`flex h-6.5 items-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-game-accent text-game-accent-text shadow-xs"
                    : unlocked
                    ? "text-game-text-muted hover:text-game-text"
                    : "opacity-60 text-game-text-muted hover:opacity-100"
                }`}
              >
                {!unlocked ? (
                  <Lock className="h-3 w-3 shrink-0 text-game-text-muted" />
                ) : (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/20"
                    style={{ backgroundColor: t.previewColors[1] }}
                  />
                )}
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

      {lockedNotice && (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs font-semibold text-amber-500 animate-in fade-in slide-in-from-top-1">
          🔒 {lockedNotice}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {THEMES.map((theme) => {
          const isActive = theme.id === currentTheme;
          const unlocked = isThemeUnlocked(theme, stats, streakDays);

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => handleSelect(theme)}
              className={`group relative flex w-full min-w-0 flex-col items-start rounded-xl border-2 p-3 text-left transition-all overflow-hidden ${
                isActive
                  ? "border-game-accent bg-game-bg-subtle shadow-md scale-[1.01]"
                  : unlocked
                  ? "border-game-border bg-game-bg/70 hover:border-game-accent/50 hover:bg-game-bg-subtle"
                  : "border-game-border/50 bg-game-bg/40 opacity-75 hover:opacity-100 hover:border-game-border"
              }`}
            >
              <div className="mb-1.5 flex w-full min-w-0 items-center justify-between gap-1.5">
                <span className="truncate text-sm font-black text-game-text flex items-center gap-1.5">
                  {!unlocked && <Lock className="h-3.5 w-3.5 shrink-0 text-game-text-muted" />}
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
                  {isActive && <Check className="h-3.5 w-3.5 text-game-accent shrink-0" />}
                </div>
              </div>

              <p className="w-full text-[11px] leading-snug text-game-text-muted break-words line-clamp-2">
                {!unlocked && theme.condition
                  ? `🔒 ${theme.condition.description}`
                  : theme.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
