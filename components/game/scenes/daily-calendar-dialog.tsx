"use client";

import { useEffect, useState, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { ptBR } from "date-fns/locale";
import {
  Calendar as CalendarIcon,
  X,
  Trophy,
  Flame,
  Shield,
  Sparkles,
  Play,
  CheckCircle2,
} from "lucide-react";
import { DailyChallengeResult, PlayerProfile, FlameTier, StreakInfo } from "@/types/game";
import {
  getDailyDate,
  getLocalDailyHistory,
  StoredDailyRecord,
  calculateStreak,
  getLocalStreakFreeze,
  dateStringToDays,
  daysToDateString,
} from "@/lib/daily";

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

export function DailyCalendarDialog({
  isOpen,
  onClose,
  player,
  onStartDailyChallenge,
}: DailyCalendarDialogProps) {
  const [historyMap, setHistoryMap] = useState<Record<string, StoredDailyRecord>>({});
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [dayRanking, setDayRanking] = useState<DailyChallengeResult[]>([]);
  const [isLoadingDayRanking, setIsLoadingDayRanking] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [streakFreeze, setStreakFreeze] = useState(false);

  const todayStr = getDailyDate();

  // Load history from API + localStorage
  useEffect(() => {
    if (!isOpen) return;

    setStreakFreeze(getLocalStreakFreeze());

    // 1. Initial load from localStorage
    const local = getLocalDailyHistory();
    const map: Record<string, StoredDailyRecord> = {};
    for (const item of local) {
      map[item.date] = item;
    }
    setHistoryMap({ ...map });

    // 2. Fetch server history if authenticated
    setIsLoading(true);
    const freezeAvail = getLocalStreakFreeze();
    fetch(`/api/daily?freeze=${freezeAvail}`)
      .then((res) => res.json())
      .then((data) => {
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
  }, [isOpen, player]);

  // Compute Streak Details
  const streakInfo: StreakInfo = useMemo(() => {
    const dates = Object.keys(historyMap);
    return calculateStreak(dates, streakFreeze, todayStr);
  }, [historyMap, streakFreeze, todayStr]);

  const flameStyle = FLAME_TIER_STYLES[streakInfo.flameTier];

  // Played dates for calendar modifier
  const playedDates = useMemo(() => {
    return Object.keys(historyMap).map((dateStr) => {
      const [year, month, day] = dateStr.split("-").map(Number);
      return new Date(year, month - 1, day);
    });
  }, [historyMap]);

  // Selected date formatted as YYYY-MM-DD
  const selectedDateStr = useMemo(() => {
    if (!selectedDate) return getDailyDate();
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  const selectedRecord = historyMap[selectedDateStr];

  // 10-week activity heatmap (70 days)
  const heatmapDays = useMemo(() => {
    const list: Array<{ dateStr: string; played: boolean; isToday: boolean; isSelected: boolean }> = [];
    const todayDays = dateStringToDays(todayStr);
    for (let i = 69; i >= 0; i--) {
      const dStr = daysToDateString(todayDays - i);
      list.push({
        dateStr: dStr,
        played: Boolean(historyMap[dStr]),
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDateStr,
      });
    }
    return list;
  }, [historyMap, todayStr, selectedDateStr]);

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

  const formatFullDate = (d: Date) => {
    try {
      return d.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return selectedDateStr;
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
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${flameStyle.bg} ${flameStyle.text} border ${flameStyle.border} ${flameStyle.glow}`}>
              <Flame className={`h-5 w-5 ${flameStyle.fill}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-game-text">Desafios & Sequência</h2>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${flameStyle.bg} ${flameStyle.text} border ${flameStyle.border}`}>
                  {streakInfo.title}
                </span>
              </div>
              <p className="text-xs text-game-text-muted">
                Mantenha a chama acesa todos os dias para desbloquear bônus e temas
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
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Top Streak Gamification KPI Banner */}
          <div className={`rounded-2xl border ${flameStyle.border} ${flameStyle.bg} p-3.5 flex flex-col gap-2.5 shadow-xs`}>
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

            {/* Streak Multiplier & Theme Progress Bar */}
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
                  <span className="text-purple-400">Todos os temas de sequência liberados! 🌟</span>
                )}
              </div>
            </div>
          </div>

          {/* Activity Heatmap Grid (Last 10 Weeks) */}
          <div className="rounded-2xl border border-game-border bg-game-bg p-3 shadow-xs">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-game-text">
                Frequência de Atividade (Últimas 10 semanas)
              </span>
              <span className="text-[10px] text-game-text-muted">
                {streakInfo.totalCompleted} desafios concluídos
              </span>
            </div>

            <div className="flex items-center justify-center overflow-x-auto py-1">
              <div className="grid grid-flow-col grid-rows-7 gap-1">
                {heatmapDays.map((cell) => (
                  <button
                    key={cell.dateStr}
                    type="button"
                    title={`${cell.dateStr}: ${cell.played ? "Concluído" : "Não jogado"}`}
                    onClick={() => {
                      const [y, m, d] = cell.dateStr.split("-").map(Number);
                      setSelectedDate(new Date(y, m - 1, d));
                      setShowRanking(false);
                    }}
                    className={`h-3 w-3 rounded-xs transition-all ${
                      cell.played
                        ? "bg-purple-600 hover:bg-purple-500 shadow-xs"
                        : "bg-game-border/40 hover:bg-game-border"
                    } ${cell.isSelected ? "ring-2 ring-game-accent ring-offset-1 ring-offset-game-bg scale-125 z-10" : ""} ${
                      cell.isToday && !cell.isSelected ? "border border-game-accent" : ""
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-end gap-2 text-[10px] text-game-text-muted">
              <span>Menos</span>
              <span className="h-2.5 w-2.5 rounded-xs bg-game-border/40" />
              <span className="h-2.5 w-2.5 rounded-xs bg-purple-600" />
              <span>Mais</span>
            </div>
          </div>

          {/* Calendar Picker */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-game-border bg-game-bg p-3 shadow-xs">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                  setShowRanking(false);
                }
              }}
              locale={ptBR}
              modifiers={{
                played: playedDates,
              }}
              modifiersClassNames={{
                played:
                  "!bg-purple-600 !text-white font-black hover:!bg-purple-700 !rounded-full shadow-xs",
              }}
              className="rounded-xl"
            />

            {/* Legend */}
            <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-game-text-muted border-t border-game-border/50 pt-2 w-full">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-600 shadow-xs" />
                <span>Desafio Concluído</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-game-accent bg-transparent" />
                <span>Selecionado</span>
              </div>
            </div>
          </div>

          {/* Details Card for Selected Date */}
          <div className="rounded-2xl border border-game-border bg-game-bg/60 p-4 shadow-xs">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-game-text-muted capitalize">
                {formatFullDate(selectedDate)}
              </span>

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
                    className="flex items-center gap-1.5 text-xs font-bold text-game-accent hover:underline"
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    <span>{showRanking ? "Ocultar ranking do dia" : "Ver ranking de jogadores deste dia"}</span>
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
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-black text-white hover:bg-purple-700 transition-colors shadow-sm"
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
            className="rounded-xl bg-game-accent px-4 py-2 text-xs font-black text-game-accent-text hover:bg-game-accent-hover transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

