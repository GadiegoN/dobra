"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Board,
  Direction,
  GameScene,
  GameTheme,
  GlobalRankingEntry,
  PlayerProfile,
  RankingEntry,
} from "@/types/game";
import {
  emptyBoard,
  newGame,
  moveBoard,
  canMove,
  getHighestTile,
} from "@/lib/game-engine";
import {
  getStoredRanking,
  addRankingEntry,
  clearRanking,
  getStoredBestScore,
  saveBestScore,
  getStoredTheme,
  saveStoredTheme,
  isScoreEligibleForRanking,
} from "@/lib/storage";
import { MenuScene } from "./scenes/menu-scene";
import { PlayScene } from "./scenes/play-scene";
import { GameOverScene } from "./scenes/game-over-scene";
import { RankingDialog } from "./ranking-dialog";
import { WinDialog } from "./scenes/win-dialog";
import { soundManager } from "@/lib/audio";

export default function GameScreen() {
  const [scene, setScene] = useState<GameScene>("menu");
  const [theme, setTheme] = useState<GameTheme>("classic");
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(0);
  const [lastGained, setLastGained] = useState<number>(0);
  const [localRanking, setLocalRanking] = useState<RankingEntry[]>([]);
  const [globalRanking, setGlobalRanking] = useState<GlobalRankingEntry[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [isRankingOpen, setIsRankingOpen] = useState(false);
  const [hasGameInProgress, setHasGameInProgress] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [globalSynced, setGlobalSynced] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isWinDialogOpen, setIsWinDialogOpen] = useState<boolean>(false);
  const [hasAcknowledgedWin, setHasAcknowledgedWin] = useState<boolean>(false);

  // Security & anti-cheat session state
  const [movesCount, setMovesCount] = useState<number>(0);
  const gameSessionTokenRef = useRef<string | null>(null);

  // Synchronous game refs to prevent React StrictMode double-execution and input lag
  const boardRef = useRef<Board>(board);
  const scoreRef = useRef<number>(score);
  const bestScoreRef = useRef<number>(bestScore);
  const movesCountRef = useRef<number>(movesCount);
  const hasWonRef = useRef<boolean>(hasAcknowledgedWin);

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    bestScoreRef.current = bestScore;
  }, [bestScore]);

  useEffect(() => {
    movesCountRef.current = movesCount;
  }, [movesCount]);

  useEffect(() => {
    hasWonRef.current = hasAcknowledgedWin;
  }, [hasAcknowledgedWin]);

  // Fetch global ranking from Neon
  const fetchGlobalRanking = useCallback(async () => {
    try {
      setIsLoadingGlobal(true);
      const res = await fetch("/api/ranking/global");
      if (res.ok) {
        const data = await res.json();
        setGlobalRanking(data.ranking || []);
      }
    } catch (err) {
      console.error("Failed to fetch global ranking", err);
    } finally {
      setIsLoadingGlobal(false);
    }
  }, []);

  // Fetch current authenticated player
  const fetchPlayerSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/github/me");
      if (res.ok) {
        const data = await res.json();
        setPlayer(data.player || null);
      }
    } catch (err) {
      console.error("Failed to fetch player session", err);
    }
  }, []);

  // Request new signed game session token from server
  const requestGameSession = useCallback(async () => {
    try {
      const res = await fetch("/api/game/session", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        gameSessionTokenRef.current = data.token || null;
      }
    } catch (err) {
      console.error("Failed to request game session", err);
    }
  }, []);

  // Sync score to Neon Global Leaderboard with anti-cheat payload
  const syncScoreToGlobal = useCallback(
    async (finalScore: number, highest: number, totalMoves: number) => {
      if (!player || finalScore <= 0) return;
      try {
        const res = await fetch("/api/ranking/global", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score: finalScore,
            highestTile: highest,
            movesCount: totalMoves,
            gameToken: gameSessionTokenRef.current,
          }),
        });
        if (res.ok) {
          setGlobalSynced(true);
          fetchGlobalRanking();
        } else {
          const errData = await res.json();
          console.warn("Global sync rejected by server:", errData.error);
        }
      } catch (err) {
        console.error("Failed to sync score to global", err);
      }
    },
    [player, fetchGlobalRanking]
  );

  // Initialize client state
  useEffect(() => {
    const loadedTheme = getStoredTheme();
    const loadedBest = getStoredBestScore();
    const loadedLocalRanking = getStoredRanking();

    setTheme(loadedTheme);
    setBestScore(loadedBest);
    setLocalRanking(loadedLocalRanking);
    setSoundEnabled(soundManager.isEnabled());

    fetchPlayerSession();
    fetchGlobalRanking();
    setMounted(true);
  }, [fetchPlayerSession, fetchGlobalRanking]);

  const handleToggleSound = () => {
    const nextState = soundManager.toggle();
    setSoundEnabled(nextState);
  };

  const handleSelectTheme = (newTheme: GameTheme) => {
    setTheme(newTheme);
    saveStoredTheme(newTheme);
  };

  const handleStartNewGame = async () => {
    const initialBoard = newGame();
    boardRef.current = initialBoard;
    scoreRef.current = 0;
    movesCountRef.current = 0;
    hasWonRef.current = false;

    setBoard(initialBoard);
    setScore(0);
    setLastGained(0);
    setMovesCount(0);
    setIsNewBest(false);
    setGlobalSynced(false);
    setIsWinDialogOpen(false);
    setHasAcknowledgedWin(false);
    setHasGameInProgress(true);
    setScene("play");

    // Request fresh signed game session token
    await requestGameSession();
  };

  const handleContinueOrPlay = () => {
    if (!hasGameInProgress) {
      handleStartNewGame();
    } else {
      setScene("play");
    }
  };

  const handleMove = useCallback(
    (direction: Direction) => {
      if (scene !== "play") return;

      const currentBoard = boardRef.current;
      const result = moveBoard(currentBoard, direction);
      if (!result.changed) return;

      // 1. Update Board synchronously in ref and reactively in state
      boardRef.current = result.board;
      setBoard(result.board);

      // 2. Update Moves count
      const nextMoves = movesCountRef.current + 1;
      movesCountRef.current = nextMoves;
      setMovesCount(nextMoves);
      setLastGained(result.gained);

      // 3. Audio Feedback (executed strictly once per move)
      if (result.gained > 0) {
        const merged = Math.min(2048, result.gained);
        soundManager.playMerge(merged);
      } else {
        soundManager.playMove();
      }

      // 4. Update Score (strictly single addition, no StrictMode double-execution)
      const newScore = scoreRef.current + result.gained;
      scoreRef.current = newScore;
      setScore(newScore);

      // 5. Update Best Score
      if (newScore > bestScoreRef.current) {
        bestScoreRef.current = newScore;
        setIsNewBest(true);
        setBestScore(newScore);
        saveBestScore(newScore);
      }

      // 6. Win check (2048 reached for the first time)
      const currentHighest = getHighestTile(result.board);
      if (currentHighest >= 2048 && !hasWonRef.current) {
        hasWonRef.current = true;
        setHasAcknowledgedWin(true);
        setIsWinDialogOpen(true);
        soundManager.playWin();
      }

      // 7. Game Over check
      if (!canMove(result.board)) {
        soundManager.playGameOver();
        setHasGameInProgress(false);
        syncScoreToGlobal(newScore, currentHighest, nextMoves);

        setTimeout(() => {
          setScene("gameover");
        }, 400);
      }
    },
    [scene, syncScoreToGlobal]
  );

  const handleSaveLocalRanking = (initials: string) => {
    const highest = getHighestTile(board);
    const updated = addRankingEntry(initials, score, highest);
    setLocalRanking(updated);
  };

  const handleClearLocalRanking = () => {
    clearRanking();
    setLocalRanking([]);
  };

  const handleLoginGithub = () => {
    window.location.href = "/api/auth/github/login";
  };

  const handleLogoutGithub = async () => {
    try {
      await fetch("/api/auth/github/logout", { method: "POST" });
      setPlayer(null);
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  const highestTile = getHighestTile(board);
  const eligibleForLocal = isScoreEligibleForRanking(score);

  if (!mounted) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#faf8ef] p-4 text-[#776e65]">
        <div className="text-center font-black">
          <div className="text-4xl">2048</div>
          <div className="mt-2 text-xs font-semibold opacity-70">
            Carregando jogo...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-game-theme={theme}
      className="flex min-h-screen w-full flex-col items-center justify-center bg-game-bg px-4 py-6 transition-colors duration-300"
    >
      <main className="flex w-full flex-col items-center justify-center">
        {scene === "menu" && (
          <MenuScene
            bestScore={bestScore}
            hasGameInProgress={hasGameInProgress}
            onPlay={handleContinueOrPlay}
            onNewGame={handleStartNewGame}
            onOpenRanking={() => setIsRankingOpen(true)}
            localRankingCount={localRanking.length}
            globalRankingCount={globalRanking.length}
            currentTheme={theme}
            onSelectTheme={handleSelectTheme}
            player={player}
            onLoginGithub={handleLoginGithub}
            onLogoutGithub={handleLogoutGithub}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
          />
        )}

        {scene === "play" && (
          <PlayScene
            board={board}
            score={score}
            bestScore={bestScore}
            lastGained={lastGained}
            currentTheme={theme}
            player={player}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            onMove={handleMove}
            onRestart={handleStartNewGame}
            onBackToMenu={() => setScene("menu")}
            onSelectTheme={handleSelectTheme}
          />
        )}

        {scene === "gameover" && (
          <GameOverScene
            score={score}
            highestTile={highestTile}
            bestScore={bestScore}
            isNewBest={isNewBest}
            isEligibleForLocalRanking={eligibleForLocal}
            localRanking={localRanking}
            globalRanking={globalRanking}
            player={player}
            globalSynced={globalSynced}
            onSaveLocalRanking={handleSaveLocalRanking}
            onLoginGithub={handleLoginGithub}
            onPlayAgain={handleStartNewGame}
            onGoToMenu={() => setScene("menu")}
          />
        )}
      </main>

      {/* Global & Local Ranking Dialog */}
      <RankingDialog
        isOpen={isRankingOpen}
        onClose={() => setIsRankingOpen(false)}
        localRanking={localRanking}
        globalRanking={globalRanking}
        isLoadingGlobal={isLoadingGlobal}
        onRefreshGlobal={fetchGlobalRanking}
        onClearLocalRanking={handleClearLocalRanking}
        player={player}
        onLoginGithub={handleLoginGithub}
      />

      {/* 2048 Victory Celebration Dialog */}
      <WinDialog
        isOpen={isWinDialogOpen}
        score={score}
        onContinue={() => setIsWinDialogOpen(false)}
        onViewRanking={() => {
          setIsWinDialogOpen(false);
          setIsRankingOpen(true);
        }}
      />
    </div>
  );
}
