"use client";

import { GameTheme, PlayerProfile } from "@/types/game";
import { ThemePicker } from "../theme-picker";
import {
  Play,
  Trophy,
  RotateCcw,
  Sparkles,
  Smartphone,
  Keyboard,
  LogOut,
  Globe,
  ExternalLink,
} from "lucide-react";

interface MenuSceneProps {
  bestScore: number;
  hasGameInProgress: boolean;
  onPlay: () => void;
  onNewGame: () => void;
  onOpenRanking: () => void;
  localRankingCount: number;
  globalRankingCount: number;
  currentTheme: GameTheme;
  onSelectTheme: (theme: GameTheme) => void;
  player: PlayerProfile | null;
  onLoginGithub: () => void;
  onLogoutGithub: () => void;
}

export function MenuScene({
  bestScore,
  hasGameInProgress,
  onPlay,
  onNewGame,
  onOpenRanking,
  localRankingCount,
  globalRankingCount,
  currentTheme,
  onSelectTheme,
  player,
  onLoginGithub,
  onLogoutGithub,
}: MenuSceneProps) {
  return (
    <div className="flex w-full max-w-lg flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
      {/* Top GitHub User Bar */}
      <div className="mb-4 flex w-full items-center justify-between">
        {player ? (
          <div className="flex items-center gap-2 rounded-full border border-game-border bg-game-bg-subtle py-1 px-3 shadow-2xs">
            <img
              src={player.avatarUrl}
              alt={player.username}
              className="h-5 w-5 rounded-full border border-game-border object-cover"
            />
            <span className="text-xs font-bold text-game-text">
              @{player.username}
            </span>
            <button
              onClick={onLogoutGithub}
              title="Desconectar do GitHub"
              className="ml-1 text-game-text-muted hover:text-red-500"
            >
              <LogOut className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={onLoginGithub}
            className="flex items-center gap-1.5 rounded-full border border-game-border bg-game-bg-subtle py-1 px-3 text-xs font-bold text-game-text shadow-2xs hover:bg-game-border/30 transition-colors"
          >
            <svg
              className="h-3.5 w-3.5 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span>Conectar GitHub</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] font-bold text-game-text-muted">
            <Globe className="h-3 w-3 text-game-accent" />
            <span className="hidden sm:inline">Ranking Neon Ativo</span>
          </div>

          <a
            href="https://github.com/GadiegoN/dobra"
            target="_blank"
            rel="noopener noreferrer"
            title="Ver código no GitHub"
            className="flex h-7 items-center gap-1.5 rounded-full border border-game-border bg-game-bg-subtle px-2.5 text-xs font-bold text-game-text hover:bg-game-border/30 transition-colors"
          >
            <svg
              className="h-3.5 w-3.5 fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span className="hidden sm:inline">Repositório</span>
          </a>
        </div>
      </div>

      {/* Arcade Title Badge */}
      <div className="mb-6 flex flex-col items-center">
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-game-border bg-game-bg-subtle px-3 py-1 text-xs font-black uppercase tracking-widest text-game-accent">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Edição Arcade</span>
        </div>
        <h1 className="text-6xl font-black tracking-tight text-game-text sm:text-8xl">
          DOBRA
        </h1>
        <p className="mt-1 text-sm font-bold tracking-wide text-game-text-muted sm:text-base">
          Deslize, funda os blocos e alcance o{" "}
          <span className="text-game-text underline decoration-game-accent decoration-2 underline-offset-4">
            2048
          </span>
        </p>
      </div>

      {/* Score Snapshot Badge */}
      <div className="mb-6 flex w-full justify-center gap-3">
        <div className="flex items-center gap-2.5 rounded-2xl border border-game-border bg-game-bg-subtle px-5 py-3 shadow-xs">
          <Trophy className="h-5 w-5 text-game-accent" />
          <div className="text-left">
            <div className="text-[10px] font-black uppercase tracking-wider text-game-text-muted">
              Seu Recorde Pessoal
            </div>
            <div className="text-xl font-black text-game-text">
              {bestScore.toLocaleString("pt-BR")}
            </div>
          </div>
        </div>
      </div>

      {/* Main Action Buttons */}
      <div className="mb-8 flex w-full flex-col gap-3">
        <button
          onClick={onPlay}
          className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-game-accent py-4 px-6 text-lg font-black uppercase tracking-wider text-game-accent-text shadow-lg transition-all hover:bg-game-accent-hover hover:scale-[1.02] active:scale-[0.98]"
        >
          <Play className="h-6 w-6 fill-current transition-transform group-hover:scale-110" />
          <span>{hasGameInProgress ? "Continuar Partida" : "Iniciar Jogo"}</span>
        </button>

        {hasGameInProgress && (
          <button
            onClick={onNewGame}
            className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-game-border bg-game-bg-subtle py-3 px-6 text-sm font-black uppercase tracking-wider text-game-text transition-all hover:bg-game-border/40 hover:scale-[1.01] active:scale-[0.99]"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Começar Nova Partida</span>
          </button>
        )}

        <button
          onClick={onOpenRanking}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl border border-game-border bg-game-bg-subtle py-3 px-6 text-sm font-black uppercase tracking-wider text-game-text transition-all hover:bg-game-border/40 hover:scale-[1.01] active:scale-[0.99]"
        >
          <Trophy className="h-4 w-4 text-game-accent" />
          <span>Rankings (Global & Local)</span>
          {globalRankingCount > 0 && (
            <span className="rounded-full bg-game-accent/20 px-2 py-0.5 text-xs font-black text-game-text">
              {globalRankingCount} devs
            </span>
          )}
        </button>
      </div>

      {/* Theme Picker Section */}
      <div className="mb-8 w-full rounded-2xl border border-game-border bg-game-bg-subtle/80 p-4 shadow-xs">
        <ThemePicker
          currentTheme={currentTheme}
          onSelectTheme={onSelectTheme}
        />
      </div>

      {/* Controls Guide */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium text-game-text-muted">
        <div className="flex items-center gap-1.5">
          <Keyboard className="h-4 w-4" />
          <span>Setas ou WASD no teclado</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1.5">
          <Smartphone className="h-4 w-4" />
          <span>Deslize na tela do celular</span>
        </div>
      </div>

      {/* GitHub Repository Link */}
      <div className="mt-6 flex items-center justify-center">
        <a
          href="https://github.com/GadiegoN/dobra"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 rounded-full border border-game-border bg-game-bg-subtle/80 px-3.5 py-1.5 text-xs font-bold text-game-text-muted hover:border-game-accent hover:bg-game-bg-subtle hover:text-game-text hover:shadow-xs transition-all"
        >
          <svg
            className="h-3.5 w-3.5 fill-current transition-transform group-hover:scale-110"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            />
          </svg>
          <span>github.com/GadiegoN/dobra</span>
          <ExternalLink className="h-3 w-3 text-game-text-muted" />
        </a>
      </div>
    </div>
  );
}
