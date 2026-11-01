"use client";

import { GlobalRankingEntry, PlayerProfile, RankingEntry } from "@/types/game";
import {
  Trophy,
  RotateCcw,
  Home,
  Sparkles,
  Check,
  Globe,
  Smartphone,
  ExternalLink,
  Share2,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

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
  onSaveLocalRanking,
  onLoginGithub,
  onPlayAgain,
  onGoToMenu,
}: GameOverSceneProps) {
  const [initials, setInitials] = useState("");
  const [hasSavedLocal, setHasSavedLocal] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [previewTab, setPreviewTab] = useState<"global" | "local">("global");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEligibleForLocalRanking && !hasSavedLocal) {
      inputRef.current?.focus();
    }
  }, [isEligibleForLocalRanking, hasSavedLocal]);

  const handleShare = async () => {
    const text = `🎮 Fiz ${score.toLocaleString("pt-BR")} pontos e alcancei o bloco ${highestTile} no DOBRA 2048! 🏆\nSerá que você consegue me passar?`;
    const url = typeof window !== "undefined" ? window.location.origin : "https://dobra.vercel.app";

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "DOBRA 2048 Arcade",
          text,
          url,
        });
        return;
      } catch {
        // Fallback to clipboard if cancelled or unsupported
      }
    }

    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      // Ignore
    }
  };

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

  return (
    <div className="flex w-full max-w-md flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
      {/* Game Over Title */}
      <div className="mb-4">
        <span className="inline-block rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-red-500">
          Sem movimentos possíveis
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
            Maior Bloco Feito
          </span>
          <span className="text-2xl font-black text-game-text tabular-nums">
            {highestTile}
          </span>
          <span className="mt-1 text-[10px] font-bold text-game-text-muted">
            Recorde: {bestScore.toLocaleString("pt-BR")}
          </span>
        </div>
      </div>

      {/* Global Sync Status or GitHub Login Prompt */}
      {player ? (
        <div className="mb-4 flex w-full items-center justify-between rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-xs font-bold text-green-700 dark:text-green-400">
          <div className="flex items-center gap-2">
            <img
              src={player.avatarUrl}
              alt={player.username}
              className="h-6 w-6 rounded-full border border-green-500/40"
            />
            <span>
              {globalSynced
                ? "Pontuação enviada ao Ranking Global no Neon!"
                : `Sincronizando pontuação de @${player.username}...`}
            </span>
          </div>
          {globalSynced && <Check className="h-4 w-4 shrink-0 text-green-600" />}
        </div>
      ) : (
        <div className="mb-4 flex w-full items-center justify-between gap-3 rounded-xl border border-game-border bg-game-bg-subtle p-3 text-left">
          <div className="flex items-center gap-2.5">
            <Globe className="h-5 w-5 text-game-accent shrink-0" />
            <div>
              <div className="text-xs font-black text-game-text">
                Dispute o Ranking Global
              </div>
              <div className="text-[11px] text-game-text-muted">
                Salve com seu avatar e nome do GitHub
              </div>
            </div>
          </div>
          <button
            onClick={onLoginGithub}
            className="shrink-0 rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white hover:bg-neutral-800"
          >
            Entrar
          </button>
        </div>
      )}

      {/* Local Ranking Initials Input */}
      {isEligibleForLocalRanking && !hasSavedLocal && (
        <div className="mb-4 w-full rounded-2xl border-2 border-game-accent bg-game-bg-subtle p-3.5 shadow-md animate-in slide-in-from-bottom-2 duration-200">
          <div className="mb-1.5 flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-game-accent">
            <Smartphone className="h-4 w-4" />
            <span>Top 10 Local neste navegador!</span>
          </div>
          <p className="mb-2 text-xs text-game-text-muted">
            Digite 3 iniciais para registrar localmente:
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
              onChange={(e) =>
                setInitials(
                  e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
                )
              }
              placeholder="AAA"
              className="w-20 rounded-xl border-2 border-game-border bg-game-bg p-2 text-center font-mono text-xl font-black tracking-widest text-game-text uppercase outline-hidden focus:border-game-accent"
            />
            <button
              type="submit"
              disabled={initials.length === 0}
              className="rounded-xl bg-game-accent px-4 py-2.5 text-xs font-black uppercase tracking-wider text-game-accent-text hover:bg-game-accent-hover disabled:opacity-50"
            >
              Salvar
            </button>
          </form>
        </div>
      )}

      {hasSavedLocal && (
        <div className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-2 text-xs font-bold text-green-600">
          <Check className="h-4 w-4" />
          <span>Recorde local salvo!</span>
        </div>
      )}

      {/* Rankings Preview Tabs */}
      <div className="mb-5 w-full rounded-2xl border border-game-border bg-game-bg-subtle p-3.5 text-left shadow-xs">
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
          onClick={handleShare}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-game-accent bg-game-accent/15 py-3.5 px-6 text-sm font-black uppercase tracking-wider text-game-text hover:bg-game-accent/25 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xs"
        >
          {copiedShare ? (
            <>
              <Check className="h-4 w-4 text-green-600" />
              <span>Copiado para a área de transferência!</span>
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4 text-game-accent" />
              <span>Compartilhar Resultado</span>
            </>
          )}
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
    </div>
  );
}
