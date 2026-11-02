export type Board = number[][];

export type Direction = "left" | "right" | "up" | "down";

export type GameScene = "menu" | "play" | "gameover";

export type GameMode =
  | "classic"
  | "time-rush"
  | "move-limit"
  | "survival"
  | "target";

export type GameTheme =
  | "classic"
  | "cyberpunk"
  | "retro"
  | "midnight"
  | "sunset"
  | "emerald";

export interface RankingEntry {
  id: string;
  initials: string;
  score: number;
  highestTile: number;
  date: string;
}

export interface GlobalRankingEntry {
  id: string;
  githubId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string;
  score: number;
  highestTile: number;
  githubProfileUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerProfile {
  githubId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string;
  githubProfileUrl: string;
}

export interface ThemeUnlockCondition {
  type: "score" | "tile" | "games_played" | "daily_challenge" | "mode_win";
  value: number | string;
  description: string;
}

export interface GameThemeOption {
  id: GameTheme;
  name: string;
  description: string;
  previewColors: [string, string, string];
  condition?: ThemeUnlockCondition;
}

// Mode configurations
export interface ModeRules {
  timeLimitSeconds?: number;
  maxMoves?: number;
  survivalIntervalSeconds?: number;
  targetTile?: number;
}

// Match & Stats types
export interface MatchHistoryItem {
  id: string;
  date: string;
  mode: GameMode;
  score: number;
  highestTile: number;
  movesCount: number;
  durationSeconds: number;
  completed: boolean;
  won: boolean;
}

export interface PersonalStats {
  bestScore: number;
  highestTile: number;
  totalGames: number;
  completedGames: number;
  abandonedGames: number;
  totalScore: number;
  averageScore: number;
  currentWinStreak: number;
  bestWinStreak: number;
  tileDistribution: Record<number, number>;
  recentScores: Array<{
    score: number;
    highestTile: number;
    date: string;
    mode: GameMode;
  }>;
  modeStats: Record<
    GameMode,
    { games: number; bestScore: number; highestTile: number }
  >;
}

// Daily Challenge
export interface DailyChallengeConfig {
  date: string; // YYYY-MM-DD (Horário de Brasília / America/Sao_Paulo, UTC-3)
  seed: number;
  description: string;
}

export interface DailyChallengeResult {
  id: string;
  date: string;
  githubId?: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string;
  score: number;
  highestTile: number;
  movesCount: number;
  durationSeconds: number;
  createdAt: string;
}

// Friend Challenge
export interface FriendChallenge {
  id: string;
  creatorName: string;
  mode: GameMode;
  seed: number;
  targetScore: number;
  targetTile: number;
  creatorMovesCount: number;
  createdAt: string;
}

export interface FriendChallengeAttempt {
  id: string;
  challengeId: string;
  playerName: string;
  score: number;
  highestTile: number;
  movesCount: number;
  createdAt: string;
}

// Competitive Seasons
export interface Season {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
}

export interface SeasonLeaderboardEntry {
  id: string;
  seasonId: string;
  githubId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string;
  score: number;
  highestTile: number;
  githubProfileUrl: string;
  updatedAt: string;
}
