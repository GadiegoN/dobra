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

  // Security & anti-cheat session state
  const [movesCount, setMovesCount] = useState<number>(0);
  const gameSessionTokenRef = useRef<string | null>(null);

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

    fetchPlayerSession();
    fetchGlobalRanking();
    setMounted(true);
  }, [fetchPlayerSession, fetchGlobalRanking]);

  const handleSelectTheme = (newTheme: GameTheme) => {
    setTheme(newTheme);
    saveStoredTheme(newTheme);
  };

  const handleStartNewGame = async () => {
    const initialBoard = newGame();
    setBoard(initialBoard);
    setScore(0);
    setLastGained(0);
    setMovesCount(0);
    setIsNewBest(false);
    setGlobalSynced(false);
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

      setBoard((currentBoard) => {
        const result = moveBoard(currentBoard, direction);
        if (!result.changed) return currentBoard;

        setMovesCount((prev) => prev + 1);
        setLastGained(result.gained);

        setScore((oldScore) => {
          const newScore = oldScore + result.gained;

          setBestScore((prevBest) => {
            if (newScore > prevBest) {
              setIsNewBest(true);
              saveBestScore(newScore);
              return newScore;
            }
            return prevBest;
          });

          // Check game over
          if (!canMove(result.board)) {
            setHasGameInProgress(false);
            const highest = getHighestTile(result.board);
            setMovesCount((currentMoves) => {
              syncScoreToGlobal(newScore, highest, currentMoves + 1);
              return currentMoves + 1;
            });

            setTimeout(() => {
              setScene("gameover");
            }, 400);
          }

          return newScore;
        });

        return result.board;
      });
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
    </div>
  );
}
