"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { Sparkles, Trophy, ArrowRight, Play } from "lucide-react";

interface WinDialogProps {
  isOpen: boolean;
  score: number;
  onContinue: () => void;
  onViewRanking: () => void;
}

export function WinDialog({
  isOpen,
  score,
  onContinue,
  onViewRanking,
}: WinDialogProps) {
  useEffect(() => {
    if (isOpen) {
      // Epic multi-burst confetti celebration
      const count = 200;
      const defaults = {
        origin: { y: 0.7 },
        zIndex: 9999,
      };

      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      };

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
      });

      fire(0.2, {
        spread: 60,
      });

      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
      });

      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
      });

      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative flex w-full max-w-sm flex-col items-center rounded-3xl border-2 border-game-highlight bg-game-bg-subtle p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Glow Badge */}
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-game-highlight/60 bg-game-highlight/20 px-3.5 py-1 text-xs font-black uppercase tracking-widest text-game-highlight">
          <Sparkles className="h-4 w-4 animate-spin" />
          <span>Meta Histórica Alcançada!</span>
        </div>

        {/* 2048 Big Tile Display */}
        <div className="my-3 flex h-28 w-28 items-center justify-center rounded-2xl bg-[#edc22e] text-white shadow-xl">
          <span className="font-black text-4xl tracking-tight">2048</span>
        </div>

        <h2 className="text-3xl font-black tracking-tight text-game-text">
          VOCÊ VENCEU!
        </h2>

        <p className="mt-2 text-xs leading-relaxed text-game-text-muted">
          Você dobrou os blocos até o limite lendário e fez{" "}
          <strong className="text-game-text font-black">
            {score.toLocaleString("pt-BR")} pontos
          </strong>
          . Agora você pode continuar e tentar alcançar o 4096!
        </p>

        {/* Action Buttons */}
        <div className="mt-6 flex w-full flex-col gap-2.5">
          <button
            onClick={onContinue}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-game-accent py-3.5 px-4 text-sm font-black uppercase tracking-wider text-game-accent-text shadow-md transition-all hover:bg-game-accent-hover hover:scale-[1.01] active:scale-[0.99]"
          >
            <Play className="h-4 w-4 fill-current" />
            <span>Continuar Jogando (Buscar 4096)</span>
          </button>

          <button
            onClick={onViewRanking}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-game-border bg-game-bg py-3 px-4 text-xs font-black uppercase tracking-wider text-game-text hover:bg-game-border/30 transition-colors"
          >
            <Trophy className="h-4 w-4 text-game-accent" />
            <span>Ver Rankings</span>
          </button>
        </div>
      </div>
    </div>
  );
}

