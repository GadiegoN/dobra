import { DailyChallengeConfig, FlameTier, StreakInfo } from "@/types/game";

/**
 * Retorna a data no formato YYYY-MM-DD com base no Horário de Brasília (America/Sao_Paulo, UTC-3).
 * Isso garante que o desafio diário vire e reinicie exatamente às 00:00 no Brasil.
 */
export function getDailyDate(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

// Mantido para compatibilidade onde getDailyDateUTC era importado
export const getDailyDateUTC = getDailyDate;

/**
 * Transforma deterministicamente uma string YYYY-MM-DD em uma semente inteira de 32 bits positiva.
 */
export function getDailySeed(dateStr: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateStr.length; i++) {
    hash ^= dateStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

export function getDailyConfig(dateStr: string = getDailyDate()): DailyChallengeConfig {
  const seed = getDailySeed(dateStr);
  return {
    date: dateStr,
    seed,
    description: `Desafio Diário DOBRA • ${dateStr}`,
  };
}

const DAILY_HISTORY_KEY = "dobra_daily_history_v1";
const STREAK_FREEZE_KEY = "dobra_streak_freeze_v1";

export interface StoredDailyRecord {
  id: string;
  date: string; // YYYY-MM-DD
  score: number;
  highestTile: number;
  movesCount: number;
  durationSeconds: number;
  createdAt: string;
}

export function getLocalDailyHistory(): StoredDailyRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DAILY_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalDailyResult(result: StoredDailyRecord): void {
  if (typeof window === "undefined") return;
  try {
    const current = getLocalDailyHistory();
    const updated = [result, ...current.filter((item) => item.date !== result.date)].slice(0, 365);
    localStorage.setItem(DAILY_HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Error saving local daily result", e);
  }
}

export function getLocalStreakFreeze(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(STREAK_FREEZE_KEY) === "true") return true;

    // Auto-detect if user has scored >= 2048 or reached tile >= 2048 in any stored data:
    // a) Local Best Score
    const bestScoreStr = localStorage.getItem("dobra_best_score_v1");
    if (bestScoreStr && Number(bestScoreStr) >= 2048) {
      localStorage.setItem(STREAK_FREEZE_KEY, "true");
      return true;
    }

    // b) Local Matches History
    const rawMatches = localStorage.getItem("dobra_matches_history_v1");
    if (rawMatches) {
      const matches = JSON.parse(rawMatches);
      if (
        Array.isArray(matches) &&
        matches.some((m) => Number(m.score) >= 2048 || Number(m.highestTile) >= 2048)
      ) {
        localStorage.setItem(STREAK_FREEZE_KEY, "true");
        return true;
      }
    }

    // c) Local Ranking Entries
    const rawRanking = localStorage.getItem("dobra_ranking_v1");
    if (rawRanking) {
      const ranking = JSON.parse(rawRanking);
      if (
        Array.isArray(ranking) &&
        ranking.some((r) => Number(r.score) >= 2048 || Number(r.highestTile) >= 2048)
      ) {
        localStorage.setItem(STREAK_FREEZE_KEY, "true");
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

export function saveLocalStreakFreeze(available: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STREAK_FREEZE_KEY, available ? "true" : "false");
  } catch {
    // ignore
  }
}

export function dateStringToDays(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

export function daysToDateString(days: number): string {
  const d = new Date(days * 86400000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Calcula a sequência (streak) de desafios diários concluídos.
 * Considera dias consecutivos, proteção de congelamento (streak freeze) e regras de premiação.
 */
export function calculateStreak(
  dates: string[],
  freezeAvailable: boolean = false,
  todayStr: string = getDailyDate()
): StreakInfo {
  const uniqueDates = Array.from(new Set(dates)).filter(Boolean);
  const totalCompleted = uniqueDates.length;

  if (uniqueDates.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      totalCompleted: 0,
      flameTier: "gray",
      title: "Novato da Dobra",
      hasPlayedToday: false,
      streakFreezeAvailable: freezeAvailable,
      streakBonusPercent: 0,
    };
  }

  const todayDays = dateStringToDays(todayStr);
  const playedDaySet = new Set(uniqueDates.map(dateStringToDays));
  const hasPlayedToday = playedDaySet.has(todayDays);

  // 1. Sequência Atual
  let currentStreak = 0;
  let checkDay = hasPlayedToday ? todayDays : todayDays - 1;
  let usedFreeze = false;

  // Se hoje não foi jogado e ontem também não foi jogado:
  if (!hasPlayedToday && !playedDaySet.has(todayDays - 1)) {
    // Se o escudo de congelamento estiver disponível e anteontem foi jogado:
    if (freezeAvailable && playedDaySet.has(todayDays - 2)) {
      usedFreeze = true;
      checkDay = todayDays - 2;
    } else {
      checkDay = -1; // Quebrou a sequência
    }
  }

  if (checkDay > 0) {
    while (playedDaySet.has(checkDay)) {
      currentStreak++;
      checkDay--;
    }
  }

  // 2. Melhor Sequência Histórica
  const sortedDays = Array.from(playedDaySet).sort((a, b) => a - b);
  let bestStreak = 0;
  let running = 0;
  let prev = -999999;

  for (const day of sortedDays) {
    if (day === prev + 1) {
      running++;
    } else {
      running = 1;
    }
    if (running > bestStreak) bestStreak = running;
    prev = day;
  }

  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  // 3. Nível da Chama Visual (Flame Tier)
  let flameTier: FlameTier = "gray";
  if (currentStreak >= 30) flameTier = "gold";
  else if (currentStreak >= 14) flameTier = "purple";
  else if (currentStreak >= 7) flameTier = "blue";
  else if (currentStreak >= 1) flameTier = "orange";

  // 4. Título Honorário Arcade
  let title = "Novato da Dobra";
  if (currentStreak >= 100) title = "Lenda Viva do 2048";
  else if (currentStreak >= 30) title = "Mestre do Hábito";
  else if (currentStreak >= 14) title = "Disciplinado de Ferro";
  else if (currentStreak >= 7) title = "Semana Perfeita";
  else if (currentStreak >= 3) title = "Iniciado da Dobra";

  // 5. Bônus Percentual na Temporada Semanal
  let streakBonusPercent = 0;
  if (currentStreak >= 7) streakBonusPercent = 10;
  else if (currentStreak >= 5) streakBonusPercent = 5;
  else if (currentStreak >= 3) streakBonusPercent = 3;

  return {
    currentStreak,
    bestStreak,
    totalCompleted,
    flameTier,
    title,
    hasPlayedToday,
    streakFreezeAvailable: freezeAvailable && !usedFreeze,
    streakBonusPercent,
  };
}
