"use client";

import { useEffect, useState, useMemo } from "react";
import {
  X,
  Trophy,
  Flame,
  Shield,
  Sparkles,
  Play,
  CheckCircle2,
  Award,
} from "lucide-react";
import { DailyChallengeResult, PlayerProfile, FlameTier, StreakInfo } from "@/types/game";
import {
  getDailyDate,
  getLocalDailyHistory,
  StoredDailyRecord,
  calculateStreak,
  getLocalStreakFreeze,
  saveLocalStreakFreeze,
  dateStringToDays,
  daysToDateString,
} from "@/lib/daily";
import { getLocalHistory } from "@/lib/stats";

interface DailyCalendarDialogProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile | null;
  onStartDailyChallenge: () => void;
}

const FLAME_TIER_STYLES: Record<
  FlameTier,
  { text: string; bg: string; fill: string; border: string; glow: string }
> = {
  gray: {
    text: "text-game-text-muted",
    bg: "bg-game-border/30",
    fill: "fill-transparent",
    border: "border-game-border",
    glow: "",
  },
  orange: {
    text: "text-amber-500",
    bg: "bg-amber-500/15",
    fill: "fill-amber-500",
    border: "border-amber-500/30",
    glow: "shadow-[0_0_12px_rgba(245,158,11,0.25)]",
  },
  blue: {
    text: "text-cyan-400",
    bg: "bg-cyan-500/15",
    fill: "fill-cyan-400",
    border: "border-cyan-500/30",
    glow: "shadow-[0_0_12px_rgba(34,211,238,0.25)]",
  },
  purple: {
    text: "text-purple-400",
    bg: "bg-purple-500/15",
    fill: "fill-purple-400",
    border: "border-purple-500/30",
    glow: "shadow-[0_0_12px_rgba(168,85,247,0.25)]",
  },
  gold: {
    text: "text-yellow-400",
    bg: "bg-yellow-500/15",
    fill: "fill-yellow-400",
    border: "border-yellow-500/30",
    glow: "shadow-[0_0_16px_rgba(250,204,21,0.35)] animate-pulse",
  },
};

const DAY_LABELS = ["D", "S", "T", "Q", "Q", "S", "S"];

const HEATMAP_LEVEL_STYLES: Record<number, string> = {
  0: "bg-game-border/40 hover:bg-game-border/70",
  1: "bg-purple-900/50 border border-purple-500/30 hover:bg-purple-800/70",
  2: "bg-purple-700/80 hover:bg-purple-600 shadow-2xs",
  3: "bg-purple-600 hover:bg-purple-500 shadow-xs",
  4: "bg-purple-500 hover:bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)] ring-1 ring-purple-300",
};

export function DailyCalendarDialog({
  isOpen,
  onClose,
  player,
  onStartDailyChallenge,
}: DailyCalendarDialogProps) {
  const [historyMap, setHistoryMap] = useState<Record<string, StoredDailyRecord>>({});
  const [selectedDateStr, setSelectedDateStr] = useState<string>(getDailyDate());
  const [isLoading, setIsLoading] = useState(false);
  const [dayRanking, setDayRanking] = useState<DailyChallengeResult[]>([]);
  const [isLoadingDayRanking, setIsLoadingDayRanking] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [streakFreeze, setStreakFreeze] = useState(false);
  const [serverStreak, setServerStreak] = useState<StreakInfo | null>(null);
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});

  const todayStr = getDailyDate();

  // Load history from API + localStorage
  useEffect(() => {
    if (!isOpen) return;

    const initialFreeze = getLocalStreakFreeze();
    setStreakFreeze(initialFreeze);
    setSelectedDateStr(getDailyDate());

    // 1. Initial load from localStorage
    const local = getLocalDailyHistory();
    const map: Record<string, StoredDailyRecord> = {};
    for (const item of local) {
      map[item.date] = item;
    }
    setHistoryMap({ ...map });

    // Aggregate all local matches for gradual heatmap levels
    const counts: Record<string, number> = {};
    const localMatches = getLocalHistory();
    for (const m of localMatches) {
      if (m.date) {
        const dStr = getDailyDate(new Date(m.date));
        counts[dStr] = (counts[dStr] || 0) + 1;
      }
    }
    setMatchCounts({ ...counts });

    // 2. Fetch server history if authenticated
    setIsLoading(true);
    fetch(`/api/daily?freeze=${initialFreeze}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.streakInfo) {
          setServerStreak(data.streakInfo);
          if (data.streakInfo.streakFreezeAvailable) {
            setStreakFreeze(true);
            saveLocalStreakFreeze(true);
          }
        }
        if (data?.userHistory && Array.isArray(data.userHistory)) {
          for (const item of data.userHistory) {
            map[item.date] = {
              id: item.id,
              date: item.date,
              score: item.score,
              highestTile: item.highestTile,
              movesCount: item.movesCount,
              durationSeconds: item.durationSeconds,
              createdAt: item.createdAt,
            };
          }
          setHistoryMap({ ...map });
        }
      })
      .catch((err) => console.error("Error fetching daily history:", err))
      .finally(() => setIsLoading(false));

    // Also fetch match history from server if authenticated
    if (player) {
      fetch("/api/stats")
        .then((res) => res.json())
        .then((data) => {
          if (data?.history && Array.isArray(data.history)) {
            const serverCounts: Record<string, number> = {};
            for (const m of data.history) {
              if (m.date) {
                const dStr = getDailyDate(new Date(m.date));
                serverCounts[dStr] = (serverCounts[dStr] || 0) + 1;
              }
            }
            for (const [dStr, sCount] of Object.entries(serverCounts)) {
              counts[dStr] = Math.max(counts[dStr] || 0, sCount);
            }
            setMatchCounts({ ...counts });
          }
        })
        .catch(() => {});
    }
  }, [isOpen, player]);

  // Compute Streak Details
  const streakInfo: StreakInfo = useMemo(() => {
    const dates = Object.keys(historyMap);
    const local = calculateStreak(dates, streakFreeze || getLocalStreakFreeze(), todayStr);
    if (serverStreak?.streakFreezeAvailable || streakFreeze || getLocalStreakFreeze()) {
      local.streakFreezeAvailable = true;
    }
    return local;
  }, [historyMap, streakFreeze, todayStr, serverStreak]);

  const flameStyle = FLAME_TIER_STYLES[streakInfo.flameTier];

  // 14-week Activity Heatmap (GitHub-style 7x14 grid) with Gradual Intensity Levels (0 to 4)
  const heatmapData = useMemo(() => {
    const todayDays = dateStringToDays(todayStr);
    const todayDate = new Date(todayDays * 86400000);
    const todayDayOfWeek = todayDate.getUTCDay(); // 0 is Sunday, 6 is Saturday

    const numWeeks = 14;
    // Align start so that current week ends at the current column
    const startDays = todayDays - todayDayOfWeek - (numWeeks - 1) * 7;

    const weeks: Array<{
      monthLabel?: string;
      days: Array<{
        dateStr: string;
        played: boolean;
        totalCount: number;
        level: number;
        isToday: boolean;
        isSelected: boolean;
        isFuture: boolean;
        dayOfWeek: number;
        dayOfMonth: number;
      }>;
    }> = [];

    let lastMonth = -1;

    for (let w = 0; w < numWeeks; w++) {
      const days = [];
      let weekMonthLabel: string | undefined = undefined;

      for (let d = 0; d < 7; d++) {
        const currentDays = startDays + w * 7 + d;
        const dStr = daysToDateString(currentDays);
        const cellDate = new Date(currentDays * 86400000);
        const cellMonth = cellDate.getUTCMonth();
        const isFuture = currentDays > todayDays;

        if (cellMonth !== lastMonth && d === 0) {
          weekMonthLabel = cellDate
            .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
            .replace(".", "")
            .slice(0, 3);
          lastMonth = cellMonth;
        }

        const dailyDone = Boolean(historyMap[dStr]);
        const otherMatches = matchCounts[dStr] || 0;
        const totalActivities = (dailyDone ? 1 : 0) + otherMatches;

        let level = 0;
        if (totalActivities >= 6) level = 4;
        else if (totalActivities >= 4) level = 3;
        else if (totalActivities >= 2) level = 2;
        else if (totalActivities >= 1) level = 1;

        days.push({
          dateStr: dStr,
          played: dailyDone,
          totalCount: totalActivities,
          level,
          isToday: dStr === todayStr,
          isSelected: dStr === selectedDateStr,
          isFuture,
          dayOfWeek: d,
          dayOfMonth: cellDate.getUTCDate(),
        });
      }

      weeks.push({ monthLabel: weekMonthLabel, days });
    }

    return weeks;
  }, [historyMap, matchCounts, todayStr, selectedDateStr]);

  const selectedRecord = historyMap[selectedDateStr];

  // Fetch ranking for selected date when requested
  useEffect(() => {
    if (!showRanking || !selectedDateStr) return;
    setIsLoadingDayRanking(true);
    fetch(`/api/daily?date=${selectedDateStr}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.ranking) {
          setDayRanking(data.ranking);
        }
      })
      .catch((err) => console.error("Error fetching day ranking:", err))
      .finally(() => setIsLoadingDayRanking(false));
  }, [showRanking, selectedDateStr]);

  if (!isOpen) return null;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toString().padStart(2, "0")}s`;
  };

  const formatFullDate = (dStr: string) => {
    try {
      const [y, m, d] = dStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return dStr;
    }
  };

  const isToday = selectedDateStr === todayStr;
  const isPast = selectedDateStr < todayStr;
  const isFuture = selectedDateStr > todayStr;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex max-h-[94vh] w-full max-w-lg flex-col rounded-2xl border-2 border-game-border bg-game-bg-subtle p-5 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between border-b border-game-border pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${flameStyle.bg} ${flameStyle.text} border ${flameStyle.border} ${flameStyle.glow}`}
            >
              <Flame className={`h-5 w-5 ${flameStyle.fill}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-game-text">Desafios & Sequência</h2>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${flameStyle.bg} ${flameStyle.text} border ${flameStyle.border}`}
                >
                  {streakInfo.title}
                </span>
              </div>
              <p className="text-xs text-game-text-muted">
                Histórico de atividade, sequência de vitórias e recordes
              </p>
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

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {/* Top Streak Gamification KPI Banner */}
          <div
            className={`rounded-2xl border ${flameStyle.border} ${flameStyle.bg} p-3.5 flex flex-col gap-2.5 shadow-xs`}
          >
            {/* Top row: Streak + Best Streak + Shield */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <Flame className={`h-7 w-7 ${flameStyle.text} ${flameStyle.fill}`} />
                  <span className="text-2xl font-black text-game-text tabular-nums">
                    {streakInfo.currentStreak}
                  </span>
                  <span className="text-xs font-bold text-game-text-muted uppercase">
                    {streakInfo.currentStreak === 1 ? "dia" : "dias"}
                  </span>
                </div>
                <div className="h-7 w-px bg-game-border/60" />
                <div className="text-left">
                  <span className="block text-[10px] font-bold uppercase text-game-text-muted">
                    Melhor Sequência
                  </span>
                  <span className="text-xs font-black text-game-text tabular-nums">
                    {streakInfo.bestStreak} dias
                  </span>
                </div>
              </div>

              {/* Shield Status */}
              <div className="flex items-center gap-1.5 rounded-xl border border-game-border/60 bg-game-bg/70 px-2.5 py-1 text-right">
                <Shield
                  className={`h-4 w-4 ${
                    streakInfo.streakFreezeAvailable
                      ? "text-blue-400 fill-blue-400/20"
                      : "text-game-text-muted opacity-40"
                  }`}
                />
                <div className="text-[10px]">
                  <span className="block font-black leading-tight text-game-text">
                    {streakInfo.streakFreezeAvailable ? "Escudo Ativo" : "Sem Escudo"}
                  </span>
                  <span className="text-[9px] text-game-text-muted">
                    {streakInfo.streakFreezeAvailable ? "Protege 1 falta" : "Faça 2048 p/ recarregar"}
                  </span>
                </div>
              </div>
            </div>

            {/* Middle row: Prominent Honorary Title Banner */}
            <div className="flex items-center justify-between rounded-xl bg-game-bg/70 px-3 py-2 border border-game-border/60 shadow-2xs">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-[11px] font-bold text-game-text-muted">Título Honorário:</span>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-black uppercase tracking-wide ${flameStyle.bg} ${flameStyle.text} border ${flameStyle.border}`}
                >
                  {streakInfo.title}
                </span>
              </div>
              <div className="text-[10px] font-semibold text-game-text-muted">
                {streakInfo.currentStreak < 3 ? (
                  <span>
                    Falta {3 - streakInfo.currentStreak}{" "}
                    {3 - streakInfo.currentStreak === 1 ? "dia" : "dias"} p/ Iniciado
                  </span>
                ) : streakInfo.currentStreak < 7 ? (
                  <span>Faltam {7 - streakInfo.currentStreak} dias p/ Semana Perfeita</span>
                ) : streakInfo.currentStreak < 14 ? (
                  <span>Faltam {14 - streakInfo.currentStreak} dias p/ Disciplinado</span>
                ) : streakInfo.currentStreak < 30 ? (
                  <span>Faltam {30 - streakInfo.currentStreak} dias p/ Mestre</span>
                ) : (
                  <span className="text-amber-400 font-bold">Grau Máximo Conquistado!</span>
                )}
              </div>
            </div>

            {/* Bottom row: Multiplier & Theme Progress Bar */}
            <div className="flex flex-wrap items-center justify-between gap-1 border-t border-game-border/40 pt-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-game-text">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>
                  Bônus na Temporada:{" "}
                  <strong className="text-game-accent">
                    +{streakInfo.streakBonusPercent}% de pontos
                  </strong>
                </span>
              </div>
              <div className="text-[10px] font-bold text-game-text-muted">
                {streakInfo.currentStreak < 7 ? (
                  <span>Faltam {7 - streakInfo.currentStreak} dias p/ Tema Inferno 🔥</span>
                ) : streakInfo.currentStreak < 14 ? (
                  <span>Faltam {14 - streakInfo.currentStreak} dias p/ Tema Cosmos 🌌</span>
                ) : (
                  <span className="text-purple-400">Todos os temas liberados! 🌟</span>
                )}
              </div>
            </div>
          </div>

          {/* Activity Heatmap Grid (GitHub style) - Centerpiece */}
          <div className="rounded-2xl border border-game-border bg-game-bg p-3.5 shadow-xs">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-game-text">
                Frequência de Atividade (Últimas 14 semanas)
              </span>
              <span className="text-[11px] font-bold text-game-text-muted">
                {streakInfo.totalCompleted} desafios concluídos
              </span>
            </div>

            {/* Heatmap Grid with Weekday Labels */}
            <div className="flex justify-center overflow-x-auto py-1">
              <div className="flex gap-1.5">
                {/* Weekday indicators on left */}
                <div className="flex flex-col justify-between py-0.5 text-[9px] font-bold text-game-text-muted select-none">
                  {DAY_LABELS.map((label, idx) => (
                    <span key={idx} className="h-3 leading-3 w-2.5 text-center">
                      {idx % 2 === 1 ? label : ""}
                    </span>
                  ))}
                </div>

                {/* Weeks columns */}
                <div className="flex gap-1">
                  {heatmapData.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-1">
                      {week.days.map((cell) => (
                        <button
                          key={cell.dateStr}
                          type="button"
                          disabled={cell.isFuture}
                          title={`${cell.dateStr}: ${
                            cell.isFuture
                              ? "Data futura"
                              : cell.totalCount === 0
                              ? "Nenhuma partida jogada"
                              : `${cell.totalCount} ${cell.totalCount === 1 ? "partida jogada" : "partidas jogadas"}`
                          }${cell.played ? " • Desafio Diário Concluído ✓" : ""}`}
                          onClick={() => {
                            if (!cell.isFuture) {
                              setSelectedDateStr(cell.dateStr);
                              setShowRanking(false);
                            }
                          }}
                          className={`h-3 w-3 rounded-xs transition-all ${
                            cell.isFuture
                              ? "opacity-15 bg-game-border cursor-not-allowed"
                              : `${HEATMAP_LEVEL_STYLES[cell.level]} cursor-pointer`
                          } ${
                            cell.isSelected
                              ? "ring-2 ring-game-accent ring-offset-1 ring-offset-game-bg scale-125 z-10"
                              : ""
                          } ${cell.isToday && !cell.isSelected ? "border border-game-accent" : ""}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Heatmap Footer Legend */}
            <div className="mt-2.5 flex items-center justify-between border-t border-game-border/50 pt-2 text-[10px] text-game-text-muted">
              <span>Clique em qualquer quadrado para inspecionar</span>
              <div className="flex items-center gap-1.5">
                <span>Menos</span>
                <span title="0 partidas" className="h-2.5 w-2.5 rounded-xs bg-game-border/40" />
                <span title="1 partida" className="h-2.5 w-2.5 rounded-xs bg-purple-900/50 border border-purple-500/30" />
                <span title="2 a 3 partidas" className="h-2.5 w-2.5 rounded-xs bg-purple-700/80" />
                <span title="4 a 5 partidas" className="h-2.5 w-2.5 rounded-xs bg-purple-600" />
                <span title="6+ partidas" className="h-2.5 w-2.5 rounded-xs bg-purple-500 shadow-xs ring-1 ring-purple-300" />
                <span>Mais</span>
              </div>
            </div>
          </div>

          {/* Details Card for Selected Date */}
          <div className="rounded-2xl border border-game-border bg-game-bg/60 p-4 shadow-xs">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-game-text-muted capitalize">
                  {formatFullDate(selectedDateStr)}
                </span>
                {matchCounts[selectedDateStr] ? (
                  <div className="text-[11px] font-medium text-game-text-muted mt-0.5">
                    Partidas registradas no dia:{" "}
                    <strong className="text-game-text font-black">{matchCounts[selectedDateStr]}</strong>
                  </div>
                ) : null}
              </div>

              {selectedRecord ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black text-emerald-500">
                  <CheckCircle2 className="h-3 w-3" /> Concluído
                </span>
              ) : isToday ? (
                <span className="flex items-center gap-1 rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-black text-purple-400">
                  Disponível Hoje
                </span>
              ) : (
                <span className="text-[10px] font-bold text-game-text-muted">
                  {isFuture ? "Em Breve" : "Não Jogado"}
                </span>
              )}
            </div>

            {selectedRecord ? (
              <div className="space-y-3">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="rounded-xl border border-game-border/60 bg-game-bg p-2.5 text-center">
                    <span className="block text-[10px] font-bold uppercase text-game-text-muted mb-0.5">
                      Pontos
                    </span>
                    <span className="text-base font-black text-game-text tabular-nums">
                      {selectedRecord.score.toLocaleString("pt-BR")}
                    </span>
                  </div>

                  <div className="rounded-xl border border-game-border/60 bg-game-bg p-2.5 text-center">
                    <span className="block text-[10px] font-bold uppercase text-game-text-muted mb-0.5">
                      Maior Peça
                    </span>
                    <span className="text-base font-black text-game-accent tabular-nums">
                      {selectedRecord.highestTile}
                    </span>
                  </div>

                  <div className="rounded-xl border border-game-border/60 bg-game-bg p-2.5 text-center">
                    <span className="block text-[10px] font-bold uppercase text-game-text-muted mb-0.5">
                      Movimentos
                    </span>
                    <span className="text-base font-black text-game-text tabular-nums">
                      {selectedRecord.movesCount}
                    </span>
                  </div>

                  <div className="rounded-xl border border-game-border/60 bg-game-bg p-2.5 text-center">
                    <span className="block text-[10px] font-bold uppercase text-game-text-muted mb-0.5">
                      Duração
                    </span>
                    <span className="text-base font-black text-game-text tabular-nums">
                      {selectedRecord.durationSeconds > 0
                        ? formatDuration(selectedRecord.durationSeconds)
                        : "--"}
                    </span>
                  </div>
                </div>

                {/* Toggle Day Ranking */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowRanking(!showRanking)}
                    className="flex items-center gap-1.5 text-xs font-bold text-game-accent hover:underline cursor-pointer"
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    <span>
                      {showRanking
                        ? "Ocultar ranking do dia"
                        : "Ver ranking de jogadores deste dia"}
                    </span>
                  </button>

                  {showRanking && (
                    <div className="mt-2.5 rounded-xl border border-game-border bg-game-bg p-3 animate-in fade-in slide-in-from-top-1">
                      <div className="mb-2 text-xs font-black text-game-text">
                        Top Jogadores • {selectedDateStr}
                      </div>

                      {isLoadingDayRanking ? (
                        <div className="py-4 text-center text-xs text-game-text-muted">
                          Carregando ranking...
                        </div>
                      ) : dayRanking.length === 0 ? (
                        <div className="py-3 text-center text-xs text-game-text-muted">
                          Nenhum resultado registrado para esta data.
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {dayRanking.slice(0, 10).map((r, i) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between rounded-lg bg-game-bg-subtle px-2 py-1 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[10px] w-4 text-center">
                                  {i + 1}º
                                </span>
                                {r.avatarUrl && (
                                  <img
                                    src={r.avatarUrl}
                                    alt={r.username}
                                    className="h-4 w-4 rounded-full"
                                  />
                                )}
                                <span className="font-bold text-game-text">
                                  @{r.username}
                                </span>
                              </div>
                              <span className="font-black text-game-text tabular-nums">
                                {r.score.toLocaleString("pt-BR")}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : isToday ? (
              <div className="flex flex-col items-center justify-center py-3 text-center">
                <p className="text-xs text-game-text font-bold mb-3">
                  Você ainda não realizou o desafio de hoje! Todos os jogadores recebem o mesmo tabuleiro.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartDailyChallenge();
                  }}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-black text-white hover:bg-purple-700 transition-colors shadow-sm cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Jogar Desafio de Hoje</span>
                </button>
              </div>
            ) : isPast ? (
              <div className="py-3 text-center text-xs text-game-text-muted">
                Você não realizou a tentativa deste desafio diário nesta data.
              </div>
            ) : (
              <div className="py-3 text-center text-xs text-game-text-muted">
                O desafio desta data será liberado à meia-noite (00:00 Horário de Brasília).
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between border-t border-game-border pt-3">
          <div className="text-xs text-game-text-muted">
            Total concluídos:{" "}
            <span className="font-bold text-game-text">
              {streakInfo.totalCompleted} dias
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-game-accent px-4 py-2 text-xs font-black text-game-accent-text hover:bg-game-accent-hover transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
