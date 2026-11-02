"use client";

import { useEffect, useState } from "react";
import { MatchHistoryItem, PersonalStats, PlayerProfile } from "@/types/game";
import {
  BarChart3,
  X,
  Trophy,
  Flame,
  Clock,
  RotateCcw,
  Cloud,
  HardDrive,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { getLocalHistory, computeStatsFromHistory, clearLocalStats } from "@/lib/stats";

interface StatsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile | null;
}

export function StatsDialog({ isOpen, onClose, player }: StatsDialogProps) {
  const [stats, setStats] = useState<PersonalStats | null>(null);
  const [history, setHistory] = useState<MatchHistoryItem[]>([]);
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Load local history first
    const local = getLocalHistory();
    setHistory(local);
    setStats(computeStatsFromHistory(local));

    // If player logged in, try fetching cloud stats
    if (player) {
      fetch("/api/stats")
        .then((res) => res.json())
        .then((data) => {
          if (data?.authenticated && data.stats) {
            setStats(data.stats);
            if (data.history && data.history.length > 0) {
              setHistory(data.history);
            }
            setIsCloudSynced(true);
          }
        })
        .catch(() => {
          // fallback to local stats
        });
    } else {
      setIsCloudSynced(false);
    }
  }, [isOpen, player]);

  if (!isOpen) return null;

  const handleClearHistory = () => {
    clearLocalStats();
    setHistory([]);
    setStats(computeStatsFromHistory([]));
    setConfirmClear(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const maxRecentScore = Math.max(
    ...(stats?.recentScores.map((s) => s.score) || [1]),
    1
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border-2 border-game-border bg-game-bg-subtle p-5 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-game-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-game-accent text-game-accent-text shadow-sm">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-game-text">Estatísticas Pessoais</h2>
              <div className="flex items-center gap-1.5 text-xs text-game-text-muted">
                {isCloudSynced ? (
                  <>
                    <Cloud className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Sincronizado na Nuvem (@{player?.username})</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="h-3.5 w-3.5 text-amber-500" />
                    <span>Salvo neste navegador</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-game-text-muted hover:bg-game-border hover:text-game-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-game-border bg-game-bg/60 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-game-text-muted mb-1">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <span>Recorde</span>
              </div>
              <div className="text-xl font-black text-game-text">
                {stats?.bestScore.toLocaleString("pt-BR") || 0}
              </div>
            </div>

            <div className="rounded-xl border border-game-border bg-game-bg/60 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-game-text-muted mb-1">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span>Maior Peça</span>
              </div>
              <div className="text-xl font-black text-game-accent">
                {stats?.highestTile || 2}
              </div>
            </div>

            <div className="rounded-xl border border-game-border bg-game-bg/60 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-game-text-muted mb-1">
                <RotateCcw className="h-3.5 w-3.5 text-blue-500" />
                <span>Partidas</span>
              </div>
              <div className="text-xl font-black text-game-text">
                {stats?.totalGames || 0}
              </div>
              <div className="text-[10px] text-game-text-muted">
                {stats?.completedGames || 0} concluídas • {stats?.abandonedGames || 0} reset
              </div>
            </div>

            <div className="rounded-xl border border-game-border bg-game-bg/60 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-game-text-muted mb-1">
                <Clock className="h-3.5 w-3.5 text-purple-500" />
                <span>Média</span>
              </div>
              <div className="text-xl font-black text-game-text">
                {stats?.averageScore.toLocaleString("pt-BR") || 0}
              </div>
              <div className="text-[10px] text-game-text-muted">
                Sequência: {stats?.currentWinStreak || 0} (Max: {stats?.bestWinStreak || 0})
              </div>
            </div>
          </div>

          {/* Recent Score Evolution (Visual Bars) */}
          {stats && stats.recentScores.length > 0 && (
            <div className="rounded-xl border border-game-border bg-game-bg/40 p-3.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-game-text-muted mb-2">
                Evolução Recente (Últimas 10 Partidas)
              </h3>
              <div className="flex items-end justify-between gap-1.5 h-28 pt-4 pb-1">
                {stats.recentScores
                  .slice()
                  .reverse()
                  .map((item, idx) => {
                    const heightPercent = Math.max(
                      Math.round((item.score / maxRecentScore) * 100),
                      8
                    );
                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center justify-end h-full group"
                      >
                        <span className="text-[9px] font-bold text-game-text-muted opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                          {item.score}
                        </span>
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full rounded-t-md bg-game-accent transition-all duration-300 group-hover:opacity-80"
                        />
                        <span className="text-[9px] font-black text-game-text-muted mt-1">
                          {item.highestTile}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Highest Tile Frequency Distribution */}
          {stats && Object.keys(stats.tileDistribution).length > 0 && (
            <div className="rounded-xl border border-game-border bg-game-bg/40 p-3.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-game-text-muted mb-2">
                Distribuição de Peças Finais
              </h3>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {[64, 128, 256, 512, 1024, 2048, 4096, 8192].map((tile) => {
                  const count = stats.tileDistribution[tile] || 0;
                  return (
                    <div
                      key={tile}
                      className="flex flex-col items-center justify-center rounded-lg border border-game-border/60 bg-game-bg p-2 text-center"
                    >
                      <span className="text-[10px] font-bold text-game-text-muted">
                        {tile}
                      </span>
                      <span className="text-sm font-black text-game-text">
                        {count}x
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Match History Table */}
          <div className="rounded-xl border border-game-border bg-game-bg/40 p-3.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-game-text-muted mb-2">
              Histórico Detalhado
            </h3>
            {history.length === 0 ? (
              <div className="py-6 text-center text-xs text-game-text-muted">
                Nenhuma partida registrada ainda. Jogue para acumular histórico!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {history.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-game-border/60 bg-game-bg p-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-game-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-game-accent uppercase">
                        {m.mode}
                      </span>
                      <span className="font-black text-game-text">
                        {m.score.toLocaleString("pt-BR")} pts
                      </span>
                      <span className="text-game-text-muted text-[11px]">
                        (Peça: {m.highestTile})
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-game-text-muted">
                      <span>{m.movesCount} mov</span>
                      {m.durationSeconds > 0 && <span>{formatDuration(m.durationSeconds)}</span>}
                      <span>{formatDate(m.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer with Clear Options */}
        <div className="mt-4 flex items-center justify-between border-t border-game-border pt-3">
          {!confirmClear ? (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              disabled={history.length === 0}
              className="flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-rose-500 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Limpar histórico local</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-rose-500 font-bold">Confirmar exclusão?</span>
              <button
                type="button"
                onClick={handleClearHistory}
                className="rounded bg-rose-500 px-2 py-1 text-xs font-bold text-white hover:bg-rose-600"
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="rounded border border-game-border px-2 py-1 text-xs text-game-text-muted hover:text-game-text"
              >
                Não
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-game-accent px-4 py-2 text-xs font-black text-game-accent-text hover:bg-game-accent-hover transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

