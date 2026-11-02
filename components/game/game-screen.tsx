"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Board,
  Direction,
  FriendChallenge,
  GameMode,
  GameScene,
  GameTheme,
  GlobalRankingEntry,
  MatchHistoryItem,
  PlayerProfile,
  RankingEntry,
  StreakInfo,
} from "@/types/game";
import {
  emptyBoard,
  newGame,
  moveBoard,
  canMove,
  getHighestTile,
  addRandomTile,
  createRng,
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
import { saveLocalMatch } from "@/lib/stats";
import {
  getDailyConfig,
  getDailyDate,
  saveLocalDailyResult,
  getLocalDailyHistory,
  calculateStreak,
  getLocalStreakFreeze,
  saveLocalStreakFreeze,
} from "@/lib/daily";
import { MenuScene } from "./scenes/menu-scene";
import { PlayScene } from "./scenes/play-scene";
import { GameOverScene } from "./scenes/game-over-scene";
import { RankingDialog } from "./ranking-dialog";
import { StatsDialog } from "./scenes/stats-dialog";
import { DailyCalendarDialog } from "./scenes/daily-calendar-dialog";
import { WinDialog } from "./scenes/win-dialog";
import { IframeNoticeDialog } from "./scenes/iframe-notice-dialog";
import { soundManager } from "@/lib/audio";
import { ExternalLink } from "lucide-react";
import { initClientAuthFetch, setClientAuthToken } from "@/lib/client-auth";

initClientAuthFetch();

export default function GameScreen() {
  const [scene, setScene] = useState<GameScene>("menu");
  const [theme, setTheme] = useState<GameTheme>("classic");
  const [mode, setMode] = useState<GameMode>("classic");
  const [board, setBoard] = useState<Board>(emptyBoard);
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(0);
  const [lastGained, setLastGained] = useState<number>(0);
  const [localRanking, setLocalRanking] = useState<RankingEntry[]>([]);
  const [globalRanking, setGlobalRanking] = useState<GlobalRankingEntry[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [isRankingOpen, setIsRankingOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isDailyCalendarOpen, setIsDailyCalendarOpen] = useState(false);
  const [hasGameInProgress, setHasGameInProgress] = useState(false);
  const [isNewBest, setIsNewBest] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [globalSynced, setGlobalSynced] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isWinDialogOpen, setIsWinDialogOpen] = useState<boolean>(false);
  const [hasAcknowledgedWin, setHasAcknowledgedWin] = useState<boolean>(false);

  // Daily Challenge & Friend Challenge state
  const [isDailyChallengeActive, setIsDailyChallengeActive] = useState(false);
  const [dailyPlayed, setDailyPlayed] = useState(false);
  const [streakInfo, setStreakInfo] = useState<StreakInfo | null>(null);
  const [isInIframe, setIsInIframe] = useState(false);
  const [isIframeNoticeOpen, setIsIframeNoticeOpen] = useState(false);
  const [friendChallenge, setFriendChallenge] = useState<FriendChallenge | null>(null);

  // Mode rules state
  const [remainingSeconds, setRemainingSeconds] = useState<number>(60);
  const [remainingMoves, setRemainingMoves] = useState<number>(80);
  const [survivalCountdown, setSurvivalCountdown] = useState<number>(3);

  // Security, tracking and replay history
  const [movesCount, setMovesCount] = useState<number>(0);
  const movesLogRef = useRef<Direction[]>([]);
  const gameSeedRef = useRef<number>(Date.now());
  const gameStartTimeRef = useRef<number>(Date.now());
  const gameSessionTokenRef = useRef<string | null>(null);

  // Synchronous game refs
  const boardRef = useRef<Board>(board);
  const scoreRef = useRef<number>(score);
  const bestScoreRef = useRef<number>(bestScore);
  const movesCountRef = useRef<number>(movesCount);
  const hasWonRef = useRef<boolean>(hasAcknowledgedWin);
  const sceneRef = useRef<GameScene>(scene);
  const modeRef = useRef<GameMode>(mode);

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

  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

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

  // Check Daily challenge status and streak info
  const checkDailyStatus = useCallback(async () => {
    const freezeAvail = getLocalStreakFreeze();
    const today = getDailyDate();
    try {
      const res = await fetch(`/api/daily?freeze=${freezeAvail}`);
      if (res.ok) {
        const data = await res.json();
        setDailyPlayed(Boolean(data.hasPlayed));
        if (data.streakInfo) {
          if (data.streakInfo.streakFreezeAvailable) {
            saveLocalStreakFreeze(true);
          }
          setStreakInfo(data.streakInfo);
          return;
        }
      }
    } catch {
      // ignore
    }

    // Fallback: calculate streak from local storage
    const localHistory = getLocalDailyHistory();
    const localStreak = calculateStreak(
      localHistory.map((h) => h.date),
      freezeAvail,
      today
    );
    setStreakInfo(localStreak);
  }, []);

  // Request new signed game session token from server
  const requestGameSession = useCallback(async () => {
    try {
      const res = await fetch("/api/game/session", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        gameSessionTokenRef.current = data.token || null;
        if (data.seed && !isDailyChallengeActive && !friendChallenge) {
          gameSeedRef.current = data.seed;
        }
      }
    } catch (err) {
      console.error("Failed to request game session", err);
    }
  }, [isDailyChallengeActive, friendChallenge]);

  // Save match to persistent history (Local + Neon DB)
  const recordMatchOutcome = useCallback(
    async (completed: boolean, won: boolean) => {
      const durationSeconds = Math.max(
        1,
        Math.round((Date.now() - gameStartTimeRef.current) / 1000)
      );
      const matchItem: MatchHistoryItem = {
        id: "m_" + Date.now(),
        date: new Date().toISOString(),
        mode: modeRef.current,
        score: scoreRef.current,
        highestTile: getHighestTile(boardRef.current),
        movesCount: movesCountRef.current,
        durationSeconds,
        completed,
        won,
      };

      // 1. Local storage
      saveLocalMatch(matchItem);

      // 2. Server database if authenticated
      if (player) {
        fetch("/api/stats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(matchItem),
        }).catch(() => {});
      }
    },
    [player]
  );

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
            moves: movesLogRef.current,
            gameToken: gameSessionTokenRef.current,
          }),
        });
        if (res.ok) {
          setGlobalSynced(true);
          fetchGlobalRanking();
        }

        // Also record to current season
        fetch("/api/seasons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score: finalScore, highestTile: highest }),
        }).catch(() => {});
      } catch (err) {
        console.error("Failed to sync score to global", err);
      }
    },
    [player, fetchGlobalRanking]
  );

  // Submit daily challenge
  const submitDailyResult = useCallback(async () => {
    if (!isDailyChallengeActive || !player) return;
    try {
      const durationSeconds = Math.max(
        1,
        Math.round((Date.now() - gameStartTimeRef.current) / 1000)
      );
      const dateStr = getDailyDate();
      saveLocalDailyResult({
        id: "daily_" + dateStr,
        date: dateStr,
        score: scoreRef.current,
        highestTile: getHighestTile(boardRef.current),
        movesCount: movesCountRef.current,
        durationSeconds,
        createdAt: new Date().toISOString(),
      });

      await fetch("/api/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          moves: movesLogRef.current,
          durationSeconds,
        }),
      });
      setDailyPlayed(true);
      checkDailyStatus();
    } catch (err) {
      console.error("Error submitting daily challenge:", err);
    }
  }, [isDailyChallengeActive, player]);

  // Submit friend challenge attempt
  const submitFriendChallengeAttempt = useCallback(async () => {
    if (!friendChallenge) return;
    try {
      await fetch(`/api/challenges/${friendChallenge.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: scoreRef.current,
          highestTile: getHighestTile(boardRef.current),
          movesCount: movesCountRef.current,
        }),
      });
    } catch (err) {
      console.error("Error submitting friend challenge attempt:", err);
    }
  }, [friendChallenge]);

  // End Game handler
  const triggerGameOver = useCallback(
    (won: boolean = false) => {
      if (sceneRef.current !== "play") return;
      soundManager.playGameOver();
      setHasGameInProgress(false);

      const finalScore = scoreRef.current;
      const highest = getHighestTile(boardRef.current);
      const totalMoves = movesCountRef.current;

      recordMatchOutcome(true, won);

      if (isDailyChallengeActive) {
        submitDailyResult();
      } else if (friendChallenge) {
        submitFriendChallengeAttempt();
      }
      
      if (modeRef.current === "classic") {
        syncScoreToGlobal(finalScore, highest, totalMoves);
        if (highest >= 2048 || finalScore >= 2048) {
          saveLocalStreakFreeze(true);
        }
      }

      // Record any legitimate game mode score to current weekly season
      if (player && finalScore > 0) {
        fetch("/api/seasons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score: finalScore, highestTile: highest }),
        }).catch(() => {});
      }

      setTimeout(() => {
        setScene("gameover");
      }, 400);
    },
    [
      recordMatchOutcome,
      isDailyChallengeActive,
      submitDailyResult,
      friendChallenge,
      submitFriendChallengeAttempt,
      syncScoreToGlobal,
    ]
  );

  // Initialize client state
  useEffect(() => {
    setIsInIframe(typeof window !== "undefined" && window.self !== window.top);

    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === "DOBRA_AUTH_SUCCESS") {
        if (event.data.token) {
          setClientAuthToken(event.data.token);
        }
        if (event.data.profile) {
          setPlayer(event.data.profile);
        }
        fetchGlobalRanking();
        checkDailyStatus();
      }
    };
    window.addEventListener("message", handleAuthMessage);

    const loadedTheme = getStoredTheme();
    const loadedBest = getStoredBestScore();
    const loadedLocalRanking = getStoredRanking();

    if (loadedBest >= 2048) {
      saveLocalStreakFreeze(true);
    }

    setTheme(loadedTheme);
    setBestScore(loadedBest);
    setLocalRanking(loadedLocalRanking);
    setSoundEnabled(soundManager.isEnabled());

    fetchPlayerSession();
    fetchGlobalRanking();
    checkDailyStatus();

    // Check if challenge parameter in URL (?challenge=ch_xxx)
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const challengeId = urlParams.get("challenge");
      if (challengeId) {
        fetch(`/api/challenges/${challengeId}`)
          .then((res) => res.json())
          .then((data) => {
            if (data?.challenge) {
              setFriendChallenge(data.challenge);
              setMode(data.challenge.mode);
            }
          })
          .catch(() => {});
      }
    }

    setMounted(true);

    return () => {
      window.removeEventListener("message", handleAuthMessage);
    };
  }, [fetchPlayerSession, fetchGlobalRanking, checkDailyStatus]);

  // Mode: Time Rush countdown interval
  useEffect(() => {
    if (scene !== "play" || mode !== "time-rush") return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerGameOver(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [scene, mode, triggerGameOver]);

  // Mode: Survival automatic tile spawn interval
  useEffect(() => {
    if (scene !== "play" || mode !== "survival") return;

    const interval = setInterval(() => {
      setSurvivalCountdown((prev) => {
        if (prev <= 1) {
          // Spawn extra random tile
          const currentBoard = boardRef.current;
          const res = addRandomTile(currentBoard);
          if (res.added) {
            boardRef.current = res.board;
            setBoard(res.board);
            if (!canMove(res.board)) {
              triggerGameOver(false);
            }
          }
          return 3;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [scene, mode, triggerGameOver]);

  const handleToggleSound = () => {
    const nextState = soundManager.toggle();
    setSoundEnabled(nextState);
  };

  const handleSelectTheme = (newTheme: GameTheme) => {
    setTheme(newTheme);
    saveStoredTheme(newTheme);
  };

  const handleStartNewGame = async (overrideSeed?: number) => {
    const seed = overrideSeed ?? ((Math.floor(Math.random() * 2147483647) >>> 0) || 1);
    gameSeedRef.current = seed;
    gameStartTimeRef.current = Date.now();
    movesLogRef.current = [];

    const rng = createRng(seed);
    const initialBoard = newGame(rng);

    boardRef.current = initialBoard;
    scoreRef.current = 0;
    movesCountRef.current = 0;
    hasWonRef.current = false;

    setBoard(initialBoard);
    setScore(0);
    setLastGained(0);
    setMovesCount(0);
    setRemainingSeconds(60);
    setRemainingMoves(80);
    setSurvivalCountdown(3);
    setIsNewBest(false);
    setGlobalSynced(false);
    setIsWinDialogOpen(false);
    setHasAcknowledgedWin(false);
    setHasGameInProgress(true);
    setScene("play");

    await requestGameSession();
  };

  const handleStartDailyChallenge = () => {
    const config = getDailyConfig();
    setIsDailyChallengeActive(true);
    setMode("classic");
    handleStartNewGame(config.seed);
  };

  const handleContinueOrPlay = () => {
    if (!hasGameInProgress) {
      setIsDailyChallengeActive(false);
      handleStartNewGame(friendChallenge?.seed);
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

      // Track moves log for deterministic replay validation
      movesLogRef.current.push(direction);

      // 1. Update Board
      boardRef.current = result.board;
      setBoard(result.board);

      // 2. Update Moves count
      const nextMoves = movesCountRef.current + 1;
      movesCountRef.current = nextMoves;
      setMovesCount(nextMoves);
      setLastGained(result.gained);

      // Mode: Move-limit countdown
      if (modeRef.current === "move-limit") {
        const remaining = 80 - nextMoves;
        setRemainingMoves(Math.max(0, remaining));
        if (remaining <= 0) {
          triggerGameOver(false);
          return;
        }
      }

      // 3. Audio Feedback
      if (result.gained > 0) {
        const merged = Math.min(2048, result.gained);
        soundManager.playMerge(merged);
      } else {
        soundManager.playMove();
      }

      // 4. Update Score
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

      const currentHighest = getHighestTile(result.board);

      // Mode: Target win condition
      if (modeRef.current === "target" && currentHighest >= 1024) {
        soundManager.playWin();
        triggerGameOver(true);
        return;
      }

      // 6. Win check (2048 reached in classic/other modes)
      if (currentHighest >= 2048 && !hasWonRef.current) {
        hasWonRef.current = true;
        setHasAcknowledgedWin(true);
        setIsWinDialogOpen(true);
        soundManager.playWin();
      }

      // Streak Freeze Shield award (reached 2048 tile OR score >= 2048 in classic mode)
      if (modeRef.current === "classic" && (currentHighest >= 2048 || newScore >= 2048)) {
        saveLocalStreakFreeze(true);
      }

      // 7. Game Over check
      if (!canMove(result.board)) {
        triggerGameOver(false);
      }
    },
    [scene, triggerGameOver]
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
    // If inside a sandboxed iframe, popup is blocked; inform player via dialog
    if (isInIframe) {
      setIsIframeNoticeOpen(true);
      return;
    }

    // Open in popup to avoid iframe X-Frame-Options: DENY restriction from GitHub
    const width = 580;
    const height = 700;
    const left = typeof window !== "undefined" ? window.screenX + (window.outerWidth - width) / 2 : 100;
    const top = typeof window !== "undefined" ? window.screenY + (window.outerHeight - height) / 2 : 100;

    let popup: Window | null = null;
    try {
      popup = window.open(
        "/api/auth/github/login",
        "dobra_github_auth",
        `width=${width},height=${height},left=${left},top=${top},status=0,menubar=0,toolbar=0`
      );
    } catch {
      popup = null;
    }

    // Fallback if popup is blocked by browser
    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      window.location.href = "/api/auth/github/login";
    }
  };

  const handleLogoutGithub = async () => {
    try {
      setClientAuthToken(null);
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
          <div className="text-4xl">DOBRA</div>
          <div className="mt-2 text-xs font-semibold opacity-70">
            Carregando...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-game-theme={theme}
      className="flex min-h-screen w-full flex-col items-center justify-center bg-game-bg px-4 py-6 transition-colors duration-300 relative"
    >
      {isInIframe && (
        <a
          href={typeof window !== "undefined" ? window.location.href : "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed top-2 right-2 z-50 flex items-center gap-1.5 rounded-full border border-game-border bg-game-bg-subtle/90 px-3 py-1.5 text-xs font-bold text-game-text-muted backdrop-blur-xs shadow-md hover:border-game-accent hover:text-game-text transition-all"
          title="Abrir jogo em nova aba para tela cheia e login direto"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Abrir em nova aba</span>
        </a>
      )}

      <main className="flex w-full flex-col items-center justify-center">
        {scene === "menu" && (
          <MenuScene
            bestScore={bestScore}
            hasGameInProgress={hasGameInProgress}
            selectedMode={mode}
            onSelectMode={(m) => setMode(m)}
            onPlay={handleContinueOrPlay}
            onNewGame={() => {
              setIsDailyChallengeActive(false);
              handleStartNewGame();
            }}
            onOpenRanking={() => setIsRankingOpen(true)}
            onOpenStats={() => setIsStatsOpen(true)}
            onOpenDailyCalendar={() => setIsDailyCalendarOpen(true)}
            onStartDailyChallenge={handleStartDailyChallenge}
            dailyPlayed={dailyPlayed}
            streakInfo={streakInfo}
            friendChallenge={friendChallenge}
            localRankingCount={localRanking.length}
            globalRankingCount={globalRanking.length}
            currentTheme={theme}
            onSelectTheme={handleSelectTheme}
            player={player}
            onLoginGithub={handleLoginGithub}
            onLogoutGithub={handleLogoutGithub}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            isInIframe={isInIframe}
            onOpenIframeNotice={() => setIsIframeNoticeOpen(true)}
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
            mode={mode}
            movesCount={movesCount}
            remainingSeconds={remainingSeconds}
            remainingMoves={remainingMoves}
            survivalSecondsToNext={survivalCountdown}
            targetTile={1024}
            highestTile={highestTile}
            soundEnabled={soundEnabled}
            onToggleSound={handleToggleSound}
            onMove={handleMove}
            onRestart={() => handleStartNewGame(gameSeedRef.current)}
            onBackToMenu={() => {
              recordMatchOutcome(false, false);
              setScene("menu");
            }}
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
            mode={mode}
            onSaveLocalRanking={handleSaveLocalRanking}
            onLoginGithub={handleLoginGithub}
            onPlayAgain={() => handleStartNewGame()}
            onGoToMenu={() => setScene("menu")}
          />
        )}
      </main>

      {/* Global & Local Ranking Dialog with Seasons Tab */}
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

      {/* Personal Player Stats Dialog */}
      <StatsDialog
        isOpen={isStatsOpen}
        onClose={() => setIsStatsOpen(false)}
        player={player}
      />

      {/* Daily Challenge Calendar Dialog */}
      <DailyCalendarDialog
        isOpen={isDailyCalendarOpen}
        onClose={() => setIsDailyCalendarOpen(false)}
        player={player}
        onStartDailyChallenge={() => {
          setIsDailyCalendarOpen(false);
          handleStartDailyChallenge();
        }}
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

      {/* Iframe Sandbox Explanatory Notice Dialog */}
      <IframeNoticeDialog
        isOpen={isIframeNoticeOpen}
        onClose={() => setIsIframeNoticeOpen(false)}
      />
    </div>
  );
}
