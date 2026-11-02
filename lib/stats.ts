import { GameMode, MatchHistoryItem, PersonalStats } from "@/types/game";
import { safeStorage } from "./safe-storage";

const HISTORY_STORAGE_KEY = "dobra_match_history_v1";

const DEFAULT_STATS: PersonalStats = {
  bestScore: 0,
  highestTile: 2,
  totalGames: 0,
  completedGames: 0,
  abandonedGames: 0,
  totalScore: 0,
  averageScore: 0,
  currentWinStreak: 0,
  bestWinStreak: 0,
  tileDistribution: {
    64: 0,
    128: 0,
    256: 0,
    512: 0,
    1024: 0,
    2048: 0,
    4096: 0,
    8192: 0,
  },
  recentScores: [],
  modeStats: {
    classic: { games: 0, bestScore: 0, highestTile: 2 },
    "time-rush": { games: 0, bestScore: 0, highestTile: 2 },
    "move-limit": { games: 0, bestScore: 0, highestTile: 2 },
    survival: { games: 0, bestScore: 0, highestTile: 2 },
    target: { games: 0, bestScore: 0, highestTile: 2 },
  },
};

export function computeStatsFromHistory(history: MatchHistoryItem[]): PersonalStats {
  if (!history || history.length === 0) {
    return { ...DEFAULT_STATS };
  }

  let bestScore = 0;
  let highestTile = 2;
  let totalScore = 0;
  let completedGames = 0;
  let abandonedGames = 0;
  let currentWinStreak = 0;
  let bestWinStreak = 0;
  let runningStreak = 0;

  const tileDistribution: Record<number, number> = {
    64: 0,
    128: 0,
    256: 0,
    512: 0,
    1024: 0,
    2048: 0,
    4096: 0,
    8192: 0,
  };

  const modeStats: Record<GameMode, { games: number; bestScore: number; highestTile: number }> = {
    classic: { games: 0, bestScore: 0, highestTile: 2 },
    "time-rush": { games: 0, bestScore: 0, highestTile: 2 },
    "move-limit": { games: 0, bestScore: 0, highestTile: 2 },
    survival: { games: 0, bestScore: 0, highestTile: 2 },
    target: { games: 0, bestScore: 0, highestTile: 2 },
  };

  // Sort chronological (oldest to newest) to compute streaks
  const chronological = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  for (const match of chronological) {
    totalScore += match.score;
    if (match.score > bestScore) bestScore = match.score;
    if (match.highestTile > highestTile) highestTile = match.highestTile;

    if (match.completed) {
      completedGames++;
    } else {
      abandonedGames++;
    }

    // Tile distribution
    if (match.highestTile >= 64) {
      tileDistribution[match.highestTile] = (tileDistribution[match.highestTile] || 0) + 1;
    }

    // Win streak calculation (win = target reached or 2048+)
    if (match.won) {
      runningStreak++;
      if (runningStreak > bestWinStreak) {
        bestWinStreak = runningStreak;
      }
    } else {
      runningStreak = 0;
    }

    // Mode stats
    const m = match.mode || "classic";
    if (modeStats[m]) {
      modeStats[m].games += 1;
      if (match.score > modeStats[m].bestScore) {
        modeStats[m].bestScore = match.score;
      }
      if (match.highestTile > modeStats[m].highestTile) {
        modeStats[m].highestTile = match.highestTile;
      }
    }
  }

  currentWinStreak = runningStreak;

  // Recent scores (last 10 matches, newest first)
  const recentScores = [...history]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
    .map((m) => ({
      score: m.score,
      highestTile: m.highestTile,
      date: m.date,
      mode: m.mode,
    }));

  const totalGames = history.length;
  const averageScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;

  return {
    bestScore,
    highestTile,
    totalGames,
    completedGames,
    abandonedGames,
    totalScore,
    averageScore,
    currentWinStreak,
    bestWinStreak,
    tileDistribution,
    recentScores,
    modeStats,
  };
}

export function getLocalHistory(): MatchHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = safeStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalMatch(match: MatchHistoryItem): PersonalStats {
  if (typeof window === "undefined") {
    return computeStatsFromHistory([match]);
  }

  try {
    const current = getLocalHistory();
    // Prepend newest match
    const updated = [match, ...current].slice(0, 200); // retain last 200 matches locally
    safeStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updated));
    return computeStatsFromHistory(updated);
  } catch (e) {
    console.error("Failed to save match to storage", e);
    return computeStatsFromHistory([match]);
  }
}

export function clearLocalStats(): void {
  if (typeof window === "undefined") return;
  safeStorage.removeItem(HISTORY_STORAGE_KEY);
}

