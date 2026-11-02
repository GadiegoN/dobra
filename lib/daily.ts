import { DailyChallengeConfig } from "@/types/game";

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
