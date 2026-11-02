"use client";

import { FriendChallenge, GameMode, GameTheme, PlayerProfile, StreakInfo } from "@/types/game";
import { ThemePicker } from "../theme-picker";
import {
  Play,
  Trophy,
  RotateCcw,
  Sparkles,
  Smartphone,
  Keyboard,
  LogOut,
  ExternalLink,
  Volume2,
  VolumeX,
  Download,
  BarChart3,
  Calendar,
  CalendarDays,
  Timer,
  Footprints,
  ShieldAlert,
  Target,
  Swords,
  CheckCircle2,
  Flame,
} from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface MenuSceneProps {
  bestScore: number;
  hasGameInProgress: boolean;
  selectedMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  onPlay: () => void;
  onNewGame: () => void;
  onOpenRanking: () => void;
  onOpenStats: () => void;
  onOpenDailyCalendar: () => void;
  onStartDailyChallenge: () => void;
  dailyPlayed: boolean;
  streakInfo?: StreakInfo | null;
  friendChallenge: FriendChallenge | null;
  localRankingCount: number;
  globalRankingCount: number;
  currentTheme: GameTheme;
  onSelectTheme: (theme: GameTheme) => void;
  player: PlayerProfile | null;
  onLoginGithub: () => void;
  onLogoutGithub: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

const MODES: Array<{ id: GameMode; name: string; icon: typeof Play; desc: string }> = [
  { id: "classic", name: "Clássico", icon: Play, desc: "Sem limites de tempo ou movimentos" },
  { id: "time-rush", name: "Relógio", icon: Timer, desc: "60 segundos para maior pontuação" },
  { id: "move-limit", name: "80 Movimentos", icon: Footprints, desc: "Máxima pontuação com 80 movimentos" },
  { id: "survival", name: "Sobrevivência", icon: ShieldAlert, desc: "Uma nova peça surge a cada 3s" },
  { id: "target", name: "Modo Alvo", icon: Target, desc: "Atinja o bloco 1024 no menor número de lances" },
];

export function MenuScene({
  bestScore,
  hasGameInProgress,
  selectedMode,
  onSelectMode,
  onPlay,
  onNewGame,
  onOpenRanking,
  onOpenStats,
  onOpenDailyCalendar,
  onStartDailyChallenge,
  dailyPlayed,
  streakInfo,
  friendChallenge,
  localRankingCount,
  globalRankingCount,
  currentTheme,
  onSelectTheme,
  player,
  onLoginGithub,
  onLogoutGithub,
  soundEnabled,
  onToggleSound,
}: MenuSceneProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

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

        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleSound}
            title={soundEnabled ? "Desativar som" : "Ativar som"}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-game-border bg-game-bg-subtle text-game-text-muted hover:text-game-text transition-colors"
          >
            {soundEnabled ? (
              <Volume2 className="h-3.5 w-3.5 text-game-accent" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-game-text-muted" />
            )}
          </button>

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
      <div className="mb-4 flex flex-col items-center">
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-game-border bg-game-bg-subtle px-3 py-1 text-xs font-black uppercase tracking-widest text-game-accent">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Edição Completa</span>
        </div>
        <h1 className="text-6xl font-black tracking-tight text-game-text sm:text-7xl">
          DOBRA
        </h1>
        <p className="mt-1 text-xs font-bold tracking-wide text-game-text-muted sm:text-sm">
          Dobre os blocos e chegue ao{" "}
          <span className="text-game-text underline decoration-game-accent decoration-2 underline-offset-4">
            2048
          </span>
        </p>
      </div>

      {/* Friend Challenge Incoming Alert Banner */}
      {friendChallenge && (
        <div className="mb-4 flex w-full flex-col items-center rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-3 text-left shadow-sm">
          <div className="flex items-center gap-2 text-amber-500 font-black text-xs uppercase tracking-wider mb-1">
            <Swords className="h-4 w-4" />
            <span>Desafio Entre Amigos Ativo!</span>
          </div>
          <p className="text-xs text-game-text font-bold">
            Desafiante: @{friendChallenge.creatorName} • Meta: {friendChallenge.targetScore.toLocaleString("pt-BR")} pts (Bloco {friendChallenge.targetTile})
          </p>
        </div>
      )}

      {/* Game Mode Selector */}
      <div className="mb-4 w-full">
        <span className="block mb-2 text-left text-[11px] font-black uppercase tracking-wider text-game-text-muted">
          Selecione a Modalidade
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {MODES.map((m) => {
            const Icon = m.icon;
            const isSelected = selectedMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelectMode(m.id)}
                className={`flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all ${
                  isSelected
                    ? "border-game-accent bg-game-accent text-game-accent-text shadow-sm scale-[1.02]"
                    : "border-game-border bg-game-bg-subtle text-game-text hover:bg-game-border/30"
                }`}
              >
                <Icon className="h-4 w-4 mb-1 shrink-0" />
                <span className="text-xs font-black leading-tight">{m.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Challenge Card */}
      <div className="mb-4 flex w-full items-center justify-between rounded-2xl border border-game-border bg-game-bg-subtle p-3 shadow-xs">
        <div className="flex items-center gap-2.5 text-left">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-500">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-black text-game-text">Desafio Diário</span>
              {streakInfo && streakInfo.currentStreak > 0 && (
                <span
                  title={`Sequência ativa: ${streakInfo.currentStreak} dias • Título: ${streakInfo.title}`}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                    streakInfo.flameTier === "gold"
                      ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 animate-pulse"
                      : streakInfo.flameTier === "purple"
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                      : streakInfo.flameTier === "blue"
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                      : "bg-amber-500/20 text-amber-500 border border-amber-500/40"
                  }`}
                >
                  <Flame className="h-2.5 w-2.5 fill-current" />
                  <span>{streakInfo.currentStreak}d</span>
                  <span className="font-semibold opacity-90">• {streakInfo.title}</span>
                </span>
              )}
            </div>
            <div className="text-[11px] text-game-text-muted">
              {dailyPlayed ? (
                <span className="flex items-center gap-1 text-emerald-500 font-bold">
                  <CheckCircle2 className="h-3 w-3" /> Concluído por hoje
                </span>
              ) : (
                "Semente única para todos os jogadores"
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenDailyCalendar}
            title="Abrir calendário do Desafio Diário"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-game-border bg-game-bg text-game-text-muted hover:text-purple-400 hover:border-purple-500/40 transition-colors shadow-2xs"
          >
            <CalendarDays className="h-4 w-4 text-purple-400" />
          </button>

          <button
            type="button"
            onClick={onStartDailyChallenge}
            disabled={dailyPlayed}
            className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-black text-white hover:bg-purple-700 disabled:opacity-40 transition-colors shadow-2xs"
          >
            {dailyPlayed ? "Concluído" : "Jogar Desafio"}
          </button>
        </div>
      </div>

      {/* Main Action Buttons */}
      <div className="mb-6 flex w-full flex-col gap-2.5">
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
            <span>Reiniciar Esta Partida</span>
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onOpenRanking}
            className="flex items-center justify-center gap-2 rounded-2xl border border-game-border bg-game-bg-subtle py-3 px-3 text-xs font-black uppercase tracking-wider text-game-text transition-all hover:bg-game-border/40"
          >
            <Trophy className="h-4 w-4 text-game-accent shrink-0" />
            <span>Rankings</span>
          </button>

          <button
            onClick={onOpenStats}
            className="flex items-center justify-center gap-2 rounded-2xl border border-game-border bg-game-bg-subtle py-3 px-3 text-xs font-black uppercase tracking-wider text-game-text transition-all hover:bg-game-border/40"
          >
            <BarChart3 className="h-4 w-4 text-blue-500 shrink-0" />
            <span>Estatísticas</span>
          </button>
        </div>

        {deferredPrompt && (
          <button
            onClick={handleInstallClick}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-game-highlight bg-game-highlight/15 py-3 px-6 text-sm font-black uppercase tracking-wider text-game-text hover:bg-game-highlight/25 transition-all shadow-xs"
          >
            <Download className="h-4 w-4 text-game-highlight" />
            <span>Instalar Aplicativo (PWA)</span>
          </button>
        )}
      </div>

      {/* Theme Picker Section */}
      <div className="mb-6 w-full rounded-2xl border border-game-border bg-game-bg-subtle/80 p-4 shadow-xs">
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
      <div className="mt-5 flex items-center justify-center">
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
