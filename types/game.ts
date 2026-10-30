export type Board = number[][];

export type Direction = "left" | "right" | "up" | "down";

export type GameScene = "menu" | "play" | "gameover";

export type GameTheme = "classic" | "cyberpunk" | "retro" | "midnight";

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

export interface GameThemeOption {
  id: GameTheme;
  name: string;
  description: string;
  previewColors: [string, string, string];
}
