"use client";

import { GameMode, GlobalRankingEntry, PlayerProfile, RankingEntry } from "@/types/game";
import {
  Trophy,
  RotateCcw,
  Home,
  Sparkles,
  Check,
  Globe,
  Smartphone,
  Share2,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ShareCardDialog } from "../share-card";

interface GameOverSceneProps {
  score: number;
  highestTile: number;
  bestScore: number;
  isNewBest: boolean;
  isEligibleForLocalRanking: boolean;
  localRanking: RankingEntry[];
  globalRanking: GlobalRankingEntry[];
  player: PlayerProfile | null;
  globalSynced: boolean;
  mode?: GameMode;
  onSaveLocalRanking: (initials: string) => void;
  onLoginGithub: () => void;
  onPlayAgain: () => void;
  onGoToMenu: () => void;
}

export function GameOverScene({
  score,
  highestTile,
  bestScore,
  isNewBest,
  isEligibleForLocalRanking,
  localRanking,
  globalRanking,
  player,
  globalSynced,
  mode = "classic",
  onSaveLocalRanking,
  onLoginGithub,
  onPlayAgain,
  onGoToMenu,
}: GameOverSceneProps) {
  const [initials, setInitials] = useState("");
  const [hasSavedLocal, setHasSavedLocal] = useState(false);
  const [previewTab, setPreviewTab] = useState<"global" | "local">("global");
  const [isShareOpen, setIsShareOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEligibleForLocalRanking && !hasSavedLocal) {
      inputRef.current?.focus();
    }
  }, [isEligibleForLocalRanking, hasSavedLocal]);

  const handleSubmitInitials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initials.trim() || hasSavedLocal) return;
    onSaveLocalRanking(initials.trim().toUpperCase());
    setHasSavedLocal(true);
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}º`;
  };

  // Find if user is in top global ranking
  const userRankIndex = player
    ? globalRanking.findIndex((r) => r.githubId === player.githubId)
    : -1;
  const confirmedRank = userRankIndex >= 0 ? userRankIndex + 1 : undefined;

  return (
    <div className="flex w-full max-w-md flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
      {/* Game Over Title */}
      <div className="mb-4">
        <span className="inline-block rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-red-500">
          Partida Concluída
        </span>
        <h1 className="mt-2 text-5xl font-black tracking-tight text-game-text sm:text-6xl">
          FIM DE JOGO
        </h1>
      </div>

      {/* Score Summary Box */}
      <div className="mb-4 grid w-full grid-cols-2 gap-3">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-game-border bg-game-bg-subtle p-3.5 shadow-xs">
          <span className="text-[11px] font-black uppercase tracking-wider text-game-text-muted">
            Pontuação Final
          </span>
          <span className="text-2xl font-black text-game-text tabular-nums">
            {score.toLocaleString("pt-BR")}
          </span>
          {isNewBest && (
            <span className="mt-1 flex items-center gap-1 text-[10px] font-black text-game-accent">
              <Sparkles className="h-3 w-3" /> NOVO RECORDE!
            </span>
          )}
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-game-border bg-game-bg-subtle p-3.5 shadow-xs">
          <span className="text-[11px] font-black uppercase tracking-wider text-game-text-muted">
            Maior Peça
          </span>
          <span className="text-2xl font-black text-game-accent tabular-nums">
            {highestTile}
          </span>
        </div>
      </div>

      {/* Local Leaderboard Save Form (When Eligible) */}
      {isEligibleForLocalRanking && !hasSavedLocal && (
        <div className="mb-4 w-full rounded-2xl border-2 border-game-accent/50 bg-game-bg-subtle p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
          <div className="mb-2 flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-game-accent">
            <Trophy className="h-4 w-4" />
            <span>Top 10 Local Atingido!</span>
          </div>
          <p className="mb-3 text-xs text-game-text-muted">
            Digite suas 3 iniciais para salvar seu recorde neste dispositivo:
          </p>
          <form
            onSubmit={handleSubmitInitials}
            className="flex items-center justify-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              maxLength={3}
              value={initials}
              onChange={(e) => setInitials(e.target.value.toUpperCase())}
              placeholder="AAA"
              className="h-10 w-24 rounded-xl border-2 border-game-border bg-game-bg px-2 text-center font-mono text-xl font-black uppercase tracking-widest text-game-text placeholder:text-game-text-muted/40 focus:border-game-accent focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={!initials.trim()}
              className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-game-accent px-4 text-xs font-black uppercase tracking-wider text-game-accent-text hover:bg-game-accent-hover disabled:opacity-50 transition-colors"
            >
              <span>Salvar</span>
            </button>
          </form>
        </div>
      )}

      {hasSavedLocal && (
        <div className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4 shrink-0" />
          <span>Recorde salvo no ranking local!</span>
        </div>
      )}

      {/* Global Ranking Status Notification */}
      {player && globalSynced && (
        <div className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-game-accent/30 bg-game-accent/10 p-2.5 text-xs font-bold text-game-text">
          <Globe className="h-4 w-4 text-game-accent shrink-0" />
          <span>Sincronizado no ranking mundial da Neon (@{player.username})</span>
        </div>
      )}

      {!player && (
        <div className="mb-4 flex w-full flex-col items-center gap-1.5 rounded-xl border border-game-border bg-game-bg-subtle p-3 text-xs">
          <span className="text-game-text-muted">
            Conecte-se com o GitHub para salvar sua pontuação no ranking mundial permanente!
          </span>
          <button
            onClick={onLoginGithub}
            className="mt-1 flex items-center gap-1.5 font-bold text-game-accent hover:underline"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Entrar com GitHub</span>
          </button>
        </div>
      )}

      {/* Mini Ranking Preview */}
      <div className="mb-4 w-full rounded-2xl border border-game-border bg-game-bg-subtle p-3.5 text-left shadow-xs">
        <div className="mb-2 flex items-center justify-between border-b border-game-border pb-2">
          <div className="flex gap-2">
            <button
              onClick={() => setPreviewTab("global")}
              className={`flex items-center gap-1 text-xs font-black uppercase tracking-wider transition-colors ${
                previewTab === "global"
                  ? "text-game-accent"
                  : "text-game-text-muted hover:text-game-text"
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Global (Neon)</span>
            </button>
            <span className="text-game-border">|</span>
            <button
              onClick={() => setPreviewTab("local")}
              className={`flex items-center gap-1 text-xs font-black uppercase tracking-wider transition-colors ${
                previewTab === "local"
                  ? "text-game-accent"
                  : "text-game-text-muted hover:text-game-text"
              }`}
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span>Local</span>
            </button>
          </div>
          <span className="text-[10px] font-bold text-game-text-muted">Top 5</span>
        </div>

        <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
          {previewTab === "global" ? (
            globalRanking.length === 0 ? (
              <p className="py-2 text-center text-xs text-game-text-muted">
                Nenhum recorde global registrado ainda.
              </p>
            ) : (
              globalRanking.slice(0, 5).map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg bg-game-bg/60 px-2 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-4 text-center font-bold shrink-0">
                      {getRankBadge(index)}
                    </span>
                    <img
                      src={entry.avatarUrl}
                      alt={entry.username}
                      className="h-5 w-5 rounded-full shrink-0"
                    />
                    <span className="truncate font-bold text-game-text">
                      @{entry.username}
                    </span>
                  </div>
                  <span className="font-black tabular-nums text-game-text shrink-0 pl-2">
                    {entry.score.toLocaleString("pt-BR")}
                  </span>
                </div>
              ))
            )
          ) : localRanking.length === 0 ? (
            <p className="py-2 text-center text-xs text-game-text-muted">
              Nenhum recorde local registrado ainda.
            </p>
          ) : (
            localRanking.slice(0, 5).map((entry, index) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg bg-game-bg/60 px-2.5 py-1.5 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 text-center font-bold">
                    {getRankBadge(index)}
                  </span>
                  <span className="font-mono font-black tracking-wider text-game-text">
                    {entry.initials}
                  </span>
                </div>
                <span className="font-black tabular-nums text-game-text">
                  {entry.score.toLocaleString("pt-BR")}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex w-full flex-col gap-2.5">
        <button
          onClick={() => setIsShareOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-game-accent bg-game-bg-subtle py-3 px-6 text-sm font-black uppercase tracking-wider text-game-accent transition-all hover:bg-game-accent hover:text-game-accent-text"
        >
          <Share2 className="h-4 w-4" />
          <span>Compartilhar Resultado</span>
        </button>

        <button
          onClick={onPlayAgain}
          className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-game-accent py-3.5 px-6 text-base font-black uppercase tracking-wider text-game-accent-text shadow-md transition-all hover:bg-game-accent-hover hover:scale-[1.01] active:scale-[0.99]"
        >
          <RotateCcw className="h-5 w-5" />
          <span>Jogar Novamente</span>
        </button>

        <button
          onClick={onGoToMenu}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-game-border bg-game-bg-subtle py-3 px-6 text-sm font-black uppercase tracking-wider text-game-text transition-all hover:bg-game-border/40"
        >
          <Home className="h-4 w-4" />
          <span>Menu Principal</span>
        </button>
      </div>

      {/* Share Dialog */}
      <ShareCardDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        score={score}
        highestTile={highestTile}
        mode={mode}
        confirmedRank={confirmedRank}
        username={player?.username}
      />
    </div>
  );
}
