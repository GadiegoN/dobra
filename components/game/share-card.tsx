"use client";

import { useRef, useState } from "react";
import { GameMode } from "@/types/game";
import { Share2, Download, Copy, Check, X } from "lucide-react";

interface ShareCardProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  highestTile: number;
  mode: GameMode;
  confirmedRank?: number | null;
  username?: string | null;
}

const MODE_LABELS: Record<GameMode, string> = {
  classic: "Modo Clássico",
  "time-rush": "Contra o Relógio",
  "move-limit": "Movimentos Limitados",
  survival: "Sobrevivência",
  target: "Modo Alvo",
};

export function ShareCardDialog({
  isOpen,
  onClose,
  score,
  highestTile,
  mode,
  confirmedRank,
  username,
}: ShareCardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://dobra.vercel.app";
  const shareText = `Joguei DOBRA no ${MODE_LABELS[mode]} e fiz ${score.toLocaleString("pt-BR")} pontos com a peça ${highestTile}!${
    confirmedRank ? ` Posição global confirmada: #${confirmedRank}º.` : ""
  } Desafie meu recorde em: ${siteUrl}`;

  const renderToCanvas = (): HTMLCanvasElement => {
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 630);
    bgGrad.addColorStop(0, "#191233");
    bgGrad.addColorStop(1, "#090813");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 630);

    // Accent glow circle
    const glowGrad = ctx.createRadialGradient(900, 200, 10, 900, 200, 400);
    glowGrad.addColorStop(0, "rgba(255, 0, 127, 0.25)");
    glowGrad.addColorStop(1, "rgba(255, 0, 127, 0)");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, 1200, 630);

    // Border
    ctx.strokeStyle = "rgba(255, 0, 127, 0.4)";
    ctx.lineWidth = 12;
    ctx.strokeRect(30, 30, 1140, 570);

    // Brand Name: DOBRA
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 72px sans-serif";
    ctx.fillText("DOBRA", 80, 130);

    // Subtitle / Mode
    ctx.fillStyle = "#00f3ff";
    ctx.font = "700 28px sans-serif";
    ctx.fillText(MODE_LABELS[mode].toUpperCase(), 80, 180);

    // Main Score Card Box
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(80, 230, 480, 220);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 3;
    ctx.strokeRect(80, 230, 480, 220);

    ctx.fillStyle = "#ff60b0";
    ctx.font = "800 24px sans-serif";
    ctx.fillText("PONTUAÇÃO FINAL", 110, 280);

    ctx.fillStyle = "#ffffff";
    ctx.font = "900 68px sans-serif";
    ctx.fillText(score.toLocaleString("pt-BR"), 110, 370);

    // Highest Tile Box
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.fillRect(600, 230, 480, 220);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 3;
    ctx.strokeRect(600, 230, 480, 220);

    ctx.fillStyle = "#ff60b0";
    ctx.font = "800 24px sans-serif";
    ctx.fillText("MAIOR BLOCO", 630, 280);

    ctx.fillStyle = "#ffe600";
    ctx.font = "900 68px sans-serif";
    ctx.fillText(String(highestTile), 630, 370);

    // Confirmed Rank (if any)
    if (confirmedRank) {
      ctx.fillStyle = "#39ff14";
      ctx.font = "800 26px sans-serif";
      ctx.fillText(`★ RANKING GLOBAL: #${confirmedRank}º LUGAR`, 80, 490);
    } else if (username) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "600 24px sans-serif";
      ctx.fillText(`Jogador: @${username}`, 80, 490);
    }

    // Public URL Footer
    ctx.fillStyle = "#8f7a66";
    ctx.font = "600 22px sans-serif";
    ctx.fillText(siteUrl.replace(/^https?:\/\//, ""), 80, 545);

    return canvas;
  };

  const handleDownloadImage = () => {
    setIsGenerating(true);
    try {
      const canvas = renderToCanvas();
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dobra-resultado-${score}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setIsGenerating(false);
      });
    } catch (e) {
      console.error(e);
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        const canvas = renderToCanvas();
        canvas.toBlob(async (blob) => {
          if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], "dobra.png", { type: "image/png" })] })) {
            const file = new File([blob], "dobra-resultado.png", { type: "image/png" });
            await navigator.share({
              title: "Meu Resultado no DOBRA",
              text: shareText,
              files: [file],
            });
          } else {
            await navigator.share({
              title: "Meu Resultado no DOBRA",
              text: shareText,
              url: siteUrl,
            });
          }
        });
        return;
      } catch {
        // Fallback to text copy
      }
    }

    handleCopyText();
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border-2 border-game-border bg-game-bg-subtle p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between border-b border-game-border pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-game-accent" />
            <h2 className="text-base font-black text-game-text">Compartilhar Resultado</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-game-text-muted hover:bg-game-border hover:text-game-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Visual Card Preview */}
        <div className="my-2 rounded-xl border border-game-border bg-game-bg p-4 text-center shadow-md">
          <div className="text-2xl font-black tracking-tight text-game-text mb-1">
            DOBRA
          </div>
          <div className="text-xs font-bold uppercase tracking-wider text-game-accent mb-4">
            {MODE_LABELS[mode]}
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="rounded-lg bg-game-bg-subtle p-2.5">
              <span className="block text-[10px] font-bold uppercase text-game-text-muted">
                Pontos
              </span>
              <span className="text-xl font-black text-game-text">
                {score.toLocaleString("pt-BR")}
              </span>
            </div>

            <div className="rounded-lg bg-game-bg-subtle p-2.5">
              <span className="block text-[10px] font-bold uppercase text-game-text-muted">
                Maior Peça
              </span>
              <span className="text-xl font-black text-game-accent">
                {highestTile}
              </span>
            </div>
          </div>

          {confirmedRank && (
            <div className="mb-2 rounded-md bg-emerald-500/10 border border-emerald-500/30 py-1 text-xs font-black text-emerald-600 dark:text-emerald-400">
              Posição Confirmada no Ranking: #{confirmedRank}º
            </div>
          )}

          <div className="text-[10px] text-game-text-muted">
            {siteUrl}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center justify-center gap-2 rounded-xl bg-game-accent px-4 py-2.5 text-xs font-black text-game-accent-text hover:bg-game-accent-hover transition-colors shadow-sm"
          >
            <Share2 className="h-4 w-4" />
            <span>Compartilhar Agora</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isGenerating}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-game-border bg-game-bg px-3 py-2 text-xs font-bold text-game-text hover:bg-game-bg-subtle transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isGenerating ? "Gerando..." : "Baixar Imagem"}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-game-border bg-game-bg px-3 py-2 text-xs font-bold text-game-text hover:bg-game-bg-subtle transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar Texto</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

