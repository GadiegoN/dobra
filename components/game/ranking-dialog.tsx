"use client";

import { GlobalRankingEntry, PlayerProfile, RankingEntry, Season, SeasonLeaderboardEntry } from "@/types/game";
import {
  Trophy,
  X,
  Trash2,
  Calendar,
  Globe,
  Smartphone,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Flame,
  Clock,
} from "lucide-react";
import { useState, useEffect } from "react";

interface RankingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  localRanking: RankingEntry[];
  globalRanking: GlobalRankingEntry[];
  isLoadingGlobal: boolean;
  onRefreshGlobal: () => void;
  onClearLocalRanking: () => void;
  player: PlayerProfile | null;
  onLoginGithub: () => void;
}

export function RankingDialog({
  isOpen,
  onClose,
  localRanking,
  globalRanking,
  isLoadingGlobal,
  onRefreshGlobal,
  onClearLocalRanking,
  player,
  onLoginGithub,
}: RankingDialogProps) {
  const [activeTab, setActiveTab] = useState<"seasons" | "global" | "local">("seasons");
  const [confirmClearLocal, setConfirmClearLocal] = useState(false);

  // Seasons state
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [seasonRanking, setSeasonRanking] = useState<SeasonLeaderboardEntry[]>([]);
  const [allSeasons, setAllSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [isLoadingSeason, setIsLoadingSeason] = useState(false);
  const [seasonCountdown, setSeasonCountdown] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingSeason(true);
    fetch(`/api/seasons${selectedSeasonId ? `?seasonId=${selectedSeasonId}` : ""}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.currentSeason) {
          setCurrentSeason(data.currentSeason);
          if (!selectedSeasonId) {
            setSelectedSeasonId(data.currentSeason.id);
          }
        }
        if (data.ranking) {
          setSeasonRanking(data.ranking);
        }
        if (data.allSeasons) {
          setAllSeasons(data.allSeasons);
        }
      })
      .catch((err) => console.error("Error fetching season leaderboard:", err))
      .finally(() => setIsLoadingSeason(false));
  }, [isOpen, selectedSeasonId]);

  // Live countdown timer for the current season
  useEffect(() => {
    if (!currentSeason) return;

    const updateTimer = () => {
      const diff = new Date(currentSeason.endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setSeasonCountdown("Encerrada");
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setSeasonCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [currentSeason]);

  if (!isOpen) return null;

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <span className="text-xl">🥇</span>;
    if (index === 1) return <span className="text-xl">🥈</span>;
    if (index === 2) return <span className="text-xl">🥉</span>;
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-game-bg text-xs font-black text-game-text-muted">
        {index + 1}º
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border-2 border-game-border bg-game-bg-subtle p-5 shadow-2xl">
        {/* Header with Title and Close Button */}
        <div className="mb-3 flex items-center justify-between border-b border-game-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-game-accent text-game-accent-text shadow-sm">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-game-text">Salão dos Recordes</h2>
              <p className="text-xs text-game-text-muted">
                Competições, temporadas e recordes mundiais
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-game-text-muted hover:bg-game-border hover:text-game-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-3 flex rounded-xl border border-game-border bg-game-bg p-1">
          <button
            onClick={() => setActiveTab("seasons")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "seasons"
                ? "bg-game-accent text-game-accent-text shadow-xs"
                : "text-game-text-muted hover:text-game-text"
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Temporada</span>
          </button>

          <button
            onClick={() => setActiveTab("global")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "global"
                ? "bg-game-accent text-game-accent-text shadow-xs"
                : "text-game-text-muted hover:text-game-text"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Geral (All-Time)</span>
          </button>

          <button
            onClick={() => setActiveTab("local")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "local"
                ? "bg-game-accent text-game-accent-text shadow-xs"
                : "text-game-text-muted hover:text-game-text"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Local</span>
          </button>
        </div>

        {/* SEASONS TAB CONTENT */}
        {activeTab === "seasons" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Season header banner */}
            <div className="mb-2.5 rounded-xl border border-game-border bg-game-bg/60 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-game-accent">
                    Competição Ativa
                  </span>
                  <h3 className="text-sm font-black text-game-text">
                    {currentSeason?.name || "Temporada Semanal"}
                  </h3>
                </div>

                {seasonCountdown && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-game-bg px-2.5 py-1 text-xs font-bold text-amber-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{seasonCountdown}</span>
                  </div>
                )}
              </div>

              {allSeasons.length > 1 && (
                <div className="mt-2 flex items-center gap-2 pt-2 border-t border-game-border/50 text-[11px]">
                  <span className="text-game-text-muted">Ver temporada:</span>
                  <select
                    value={selectedSeasonId}
                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                    className="rounded border border-game-border bg-game-bg px-2 py-0.5 text-xs text-game-text"
                  >
                    {allSeasons.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.isActive ? "(Atual)" : "(Encerrada)"}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pr-1">
              {isLoadingSeason ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-xs text-game-text-muted">
                  <RefreshCw className="h-5 w-5 animate-spin text-game-accent" />
                  <span>Carregando ranking da temporada...</span>
                </div>
              ) : seasonRanking.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-center p-4 text-xs text-game-text-muted">
                  <Sparkles className="h-8 w-8 mb-2 text-game-accent/50" />
                  <p className="font-bold text-game-text">Seja o primeiro a pontuar nesta temporada!</p>
                  <p className="mt-1 text-[11px]">Jogue qualquer modo para registrar sua pontuação semanal.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {seasonRanking.map((entry, index) => {
                    const isCurrentPlayer = player?.githubId === entry.githubId;
                    return (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between rounded-xl border p-2 text-xs transition-colors ${
                          isCurrentPlayer
                            ? "border-game-accent bg-game-accent/10"
                            : "border-game-border/60 bg-game-bg/60 hover:bg-game-bg"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex w-6 justify-center shrink-0">
                            {getRankBadge(index)}
                          </div>
                          <img
                            src={entry.avatarUrl}
                            alt={entry.username}
                            className="h-6 w-6 rounded-full border border-game-border shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="truncate font-bold text-game-text">
                                {entry.displayName || `@${entry.username}`}
                              </span>
                              {entry.streak && entry.streak > 0 ? (
                                <span
                                  title={`Sequência diária: ${entry.streak} dias (${entry.title || "Novato"})`}
                                  className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                                    entry.flameTier === "gold"
                                      ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                                      : entry.flameTier === "purple"
                                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                                      : entry.flameTier === "blue"
                                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                                      : "bg-amber-500/20 text-amber-500 border border-amber-500/40"
                                  }`}
                                >
                                  <Flame className="h-2.5 w-2.5 fill-current" />
                                  <span>{entry.streak}</span>
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[10px] text-game-text-muted">
                              Maior Bloco: {entry.highestTile}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <span className="block font-black text-sm text-game-text tabular-nums">
                            {entry.score.toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* GLOBAL TAB CONTENT */}
        {activeTab === "global" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="mb-2 flex items-center justify-between text-xs text-game-text-muted">
              <span>Top 50 Recordes Mundiais (Neon Database)</span>
              <button
                onClick={onRefreshGlobal}
                disabled={isLoadingGlobal}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-game-text-muted hover:bg-game-border hover:text-game-text disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-3 w-3 ${isLoadingGlobal ? "animate-spin" : ""}`} />
                <span>Atualizar</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {isLoadingGlobal ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-xs text-game-text-muted">
                  <RefreshCw className="h-5 w-5 animate-spin text-game-accent" />
                  <span>Carregando ranking global...</span>
                </div>
              ) : globalRanking.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-center p-4 text-xs text-game-text-muted">
                  <Globe className="h-8 w-8 mb-2 text-game-text-muted/40" />
                  <p className="font-bold text-game-text">Nenhum recorde registrado ainda</p>
                  <p className="mt-1">Entre com o GitHub e registre sua pontuação!</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {globalRanking.map((entry, index) => {
                    const isCurrentPlayer = player?.githubId === entry.githubId;
                    return (
                      <div
                        key={entry.id}
                        className={`flex items-center justify-between rounded-xl border p-2 text-xs transition-colors ${
                          isCurrentPlayer
                            ? "border-game-accent bg-game-accent/10"
                            : "border-game-border/60 bg-game-bg/60 hover:bg-game-bg"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex w-6 justify-center shrink-0">
                            {getRankBadge(index)}
                          </div>
                          <img
                            src={entry.avatarUrl}
                            alt={entry.username}
                            className="h-6 w-6 rounded-full border border-game-border shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <a
                                href={entry.githubProfileUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="truncate font-bold text-game-text hover:text-game-accent hover:underline flex items-center gap-1"
                              >
                                <span>{entry.displayName || `@${entry.username}`}</span>
                                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                              </a>
                              {entry.streak && entry.streak > 0 ? (
                                <span
                                  title={`Sequência diária: ${entry.streak} dias (${entry.title || "Novato"})`}
                                  className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.2 text-[9px] font-black ${
                                    entry.flameTier === "gold"
                                      ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40"
                                      : entry.flameTier === "purple"
                                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                                      : entry.flameTier === "blue"
                                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                                      : "bg-amber-500/20 text-amber-500 border border-amber-500/40"
                                  }`}
                                >
                                  <Flame className="h-2.5 w-2.5 fill-current" />
                                  <span>{entry.streak}</span>
                                </span>
                              ) : null}
                            </div>
                            <span className="text-[10px] text-game-text-muted">
                              Bloco: {entry.highestTile} • {formatDate(entry.updatedAt)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <span className="block font-black text-sm text-game-text tabular-nums">
                            {entry.score.toLocaleString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {!player && (
              <div className="mt-3 rounded-xl border border-game-accent/30 bg-game-accent/10 p-2.5 text-center text-xs">
                <span className="font-semibold text-game-text">
                  Conecte seu GitHub para participar do ranking mundial:
                </span>
                <button
                  onClick={onLoginGithub}
                  className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-game-accent py-1.5 text-xs font-black text-game-accent-text hover:bg-game-accent-hover transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" />
                  <span>Entrar com GitHub</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* LOCAL TAB CONTENT */}
        {activeTab === "local" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="mb-2 flex items-center justify-between text-xs text-game-text-muted">
              <span>Top 10 deste dispositivo</span>
              {localRanking.length > 0 && !confirmClearLocal && (
                <button
                  onClick={() => setConfirmClearLocal(true)}
                  className="flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Limpar</span>
                </button>
              )}
              {confirmClearLocal && (
                <div className="flex items-center gap-2">
                  <span className="text-red-500 font-bold">Limpar?</span>
                  <button
                    onClick={() => {
                      onClearLocalRanking();
                      setConfirmClearLocal(false);
                    }}
                    className="font-bold text-red-600 hover:underline"
                  >
                    Sim
                  </button>
                  <button
                    onClick={() => setConfirmClearLocal(false)}
                    className="text-game-text-muted hover:underline"
                  >
                    Não
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {localRanking.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center text-center p-4 text-xs text-game-text-muted">
                  <Smartphone className="h-8 w-8 mb-2 text-game-text-muted/40" />
                  <p className="font-bold text-game-text">Nenhum recorde local registrado</p>
                  <p className="mt-1">Jogue uma partida e salve suas 3 iniciais!</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {localRanking.map((entry, index) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-xl border border-game-border/60 bg-game-bg/60 p-2.5 text-xs hover:bg-game-bg transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex w-6 justify-center shrink-0">
                          {getRankBadge(index)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-mono text-sm font-black tracking-widest text-game-text">
                            {entry.initials}
                          </span>
                          <span className="text-[10px] text-game-text-muted flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            {formatDate(entry.date)} • Bloco {entry.highestTile}
                          </span>
                        </div>
                      </div>
                      <span className="font-black text-sm text-game-text tabular-nums">
                        {entry.score.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
