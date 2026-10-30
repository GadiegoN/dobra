import { GameTheme, RankingEntry } from "@/types/game";

const RANKING_KEY = "dobra-2048-ranking-v2";
const BEST_KEY = "dobra-2048-best-score-v2";
const THEME_KEY = "dobra-2048-theme-v2";
const MAX_RANKING_ITEMS = 10;

export function getStoredRanking(): RankingEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RANKING_KEY);
    return raw ? (JSON.parse(raw) as RankingEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveRanking(ranking: RankingEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RANKING_KEY, JSON.stringify(ranking));
  } catch {
    // Ignore storage quota errors
  }
}

export function isScoreEligibleForRanking(score: number): boolean {
  if (score <= 0) return false;
  const current = getStoredRanking();
  if (current.length < MAX_RANKING_ITEMS) return true;
  return score > current[current.length - 1].score;
}

export function addRankingEntry(
  initials: string,
  score: number,
  highestTile: number
): RankingEntry[] {
  const current = getStoredRanking();
  const cleanInitials = initials
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 3)
    .padEnd(3, "X");

  const newEntry: RankingEntry = {
    id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    initials: cleanInitials,
    score,
    highestTile,
    date: new Date().toISOString(),
  };

  const updated = [...current, newEntry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RANKING_ITEMS);

  saveRanking(updated);
  return updated;
}

export function clearRanking(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RANKING_KEY);
  } catch {
    // Ignore
  }
}

export function getStoredBestScore(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(localStorage.getItem(BEST_KEY) || 0);
  } catch {
    return 0;
  }
}

export function saveBestScore(score: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Ignore
  }
}

export function getStoredTheme(): GameTheme {
  if (typeof window === "undefined") return "classic";
  try {
    const theme = localStorage.getItem(THEME_KEY) as GameTheme;
    if (["classic", "cyberpunk", "retro", "midnight"].includes(theme)) {
      return theme;
    }
    return "classic";
  } catch {
    return "classic";
  }
}

export function saveStoredTheme(theme: GameTheme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignore
  }
}

