"use client";

import { GlobalRankingEntry, PlayerProfile, RankingEntry } from "@/types/game";
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
} from "lucide-react";
import { useState } from "react";

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
  const [activeTab, setActiveTab] = useState<"global" | "local">("global");
  const [confirmClearLocal, setConfirmClearLocal] = useState(false);

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
                Dispute o topo do ranking local e global
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-game-border bg-game-bg text-game-text-muted hover:text-game-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs: Global vs Local */}
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-game-border bg-game-bg/60 p-1">
          <button
            onClick={() => setActiveTab("global")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "global"
                ? "bg-game-accent text-game-accent-text shadow-sm"
                : "text-game-text-muted hover:text-game-text"
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Ranking Global</span>
          </button>

          <button
            onClick={() => setActiveTab("local")}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "local"
                ? "bg-game-accent text-game-accent-text shadow-sm"
                : "text-game-text-muted hover:text-game-text"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Ranking Local</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* ================= GLOBAL TAB ================= */}
          {activeTab === "global" && (
            <div className="space-y-2">
              {/* Login Banner if player is not logged in */}
              {!player ? (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-game-accent/40 bg-game-accent/10 p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-game-accent shrink-0" />
                    <span className="text-xs font-bold text-game-text">
                      Conecte seu GitHub para registrar seu recorde mundial!
                    </span>
                  </div>
                  <button
                    onClick={onLoginGithub}
                    className="shrink-0 rounded-lg bg-black px-3 py-1.5 text-xs font-bold text-white hover:bg-neutral-800"
                  >
                    Entrar com GitHub
                  </button>
                </div>
              ) : (
                <div className="mb-2 flex items-center justify-between rounded-xl border border-game-border bg-game-bg/80 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={player.avatarUrl}
                      alt={player.username}
                      className="h-6 w-6 rounded-full border border-game-border"
                    />
                    <span className="font-bold text-game-text">
                      Conectado como <span className="text-game-accent">@{player.username}</span>
                    </span>
                  </div>
                  <button
                    onClick={onRefreshGlobal}
                    disabled={isLoadingGlobal}
                    title="Atualizar ranking"
                    className="flex items-center gap-1 text-game-text-muted hover:text-game-text"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isLoadingGlobal ? "animate-spin" : ""}`}
                    />
                    <span className="hidden sm:inline">Atualizar</span>
                  </button>
                </div>
              )}

              {/* Global List */}
              {isLoadingGlobal && globalRanking.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-game-text-muted">
                  <RefreshCw className="mb-2 h-6 w-6 animate-spin" />
                  <span className="text-xs font-bold">Carregando ranking global no Neon...</span>
                </div>
              ) : globalRanking.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Globe className="mb-3 h-12 w-12 text-game-text-muted/40" />
                  <p className="text-sm font-bold text-game-text">
                    Nenhum recorde global registrado ainda
                  </p>
                  <p className="mt-1 text-xs text-game-text-muted">
                    Conecte seu GitHub e seja o primeiro no placar mundial!
                  </p>
                </div>
              ) : (
                globalRanking.map((entry, index) => {
                  const isCurrentPlayer = player && player.githubId === entry.githubId;
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between rounded-xl border p-2.5 transition-all ${
                        isCurrentPlayer
                          ? "border-game-accent bg-game-accent/10 shadow-sm"
                          : index === 0
                          ? "border-game-highlight/60 bg-game-bg shadow-xs"
                          : "border-game-border/60 bg-game-bg/70"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex w-6 justify-center shrink-0">
                          {getRankBadge(index)}
                        </div>

                        <img
                          src={entry.avatarUrl}
                          alt={entry.username}
                          className="h-8 w-8 rounded-full border border-game-border shrink-0 object-cover"
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-xs font-black text-game-text">
                              {entry.displayName || entry.username}
                            </span>
                            {entry.highestTile > 0 && (
                              <span className="rounded-md border border-game-border bg-game-card-bg/20 px-1 py-0.2 text-[9px] font-black text-game-text-muted shrink-0">
                                {entry.highestTile}
                              </span>
                            )}
                          </div>
                          <a
                            href={entry.githubProfileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-game-text-muted hover:text-game-accent"
                          >
                            <span>@{entry.username}</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <div className="text-sm font-black tabular-nums text-game-text">
                          {entry.score.toLocaleString("pt-BR")}
                        </div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-game-text-muted">
                          Pontos
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ================= LOCAL TAB ================= */}
          {activeTab === "local" && (
            <div className="space-y-2">
              <div className="mb-2 text-[11px] text-game-text-muted">
                Recordes salvos exclusivamente no armazenamento deste navegador.
              </div>

              {localRanking.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Smartphone className="mb-3 h-12 w-12 text-game-text-muted/40" />
                  <p className="text-sm font-bold text-game-text">
                    Nenhum recorde local salvo ainda
                  </p>
                  <p className="mt-1 text-xs text-game-text-muted">
                    Termine uma partida para salvar seu Top 10 local com 3 iniciais!
                  </p>
                </div>
              ) : (
                localRanking.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                      index === 0
                        ? "border-game-highlight/60 bg-game-bg shadow-sm"
                        : "border-game-border/60 bg-game-bg/70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex w-6 justify-center shrink-0">
                        {getRankBadge(index)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-base font-black tracking-widest text-game-text">
                            {entry.initials}
                          </span>
                          {entry.highestTile > 0 && (
                            <span className="rounded-md border border-game-border bg-game-card-bg/20 px-1.5 py-0.5 text-[10px] font-black text-game-text-muted">
                              {entry.highestTile}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-game-text-muted">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(entry.date)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black tabular-nums text-game-text">
                        {entry.score.toLocaleString("pt-BR")}
                      </div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-game-text-muted">
                        Pontos
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="mt-4 flex items-center justify-between border-t border-game-border pt-3">
          {activeTab === "local" && localRanking.length > 0 && (
            <div>
              {confirmClearLocal ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      onClearLocalRanking();
                      setConfirmClearLocal(false);
                    }}
                    className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-700"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setConfirmClearLocal(false)}
                    className="rounded-lg border border-game-border bg-game-bg px-2 py-1 text-xs font-bold text-game-text"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClearLocal(true)}
                  className="flex items-center gap-1 text-xs text-game-text-muted hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Limpar Local</span>
                </button>
              )}
            </div>
          )}

          <button
            onClick={onClose}
            className="ml-auto rounded-xl bg-game-accent px-4 py-2 text-xs font-black uppercase tracking-wider text-game-accent-text hover:bg-game-accent-hover"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
