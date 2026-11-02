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
