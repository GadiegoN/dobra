"use client";

import { Info, ExternalLink, X, ShieldAlert } from "lucide-react";

interface IframeNoticeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IframeNoticeDialog({ isOpen, onClose }: IframeNoticeDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative flex w-full max-w-md flex-col rounded-3xl border-2 border-amber-500/40 bg-game-bg-subtle p-6 text-left shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl text-game-text-muted hover:bg-game-border hover:text-game-text transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Icon + Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-game-text">
              Modo Prévia (Embutido)
            </h3>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
              Sandbox Restrita do App
            </span>
          </div>
        </div>

        {/* Body Text */}
        <div className="space-y-3 text-xs leading-relaxed text-game-text-muted">
          <p>
            Você está jogando a versão incorporada dentro do aplicativo. Por segurança, a sandbox deste aplicativo <strong>bloqueia popups, cookies e login com o GitHub</strong>.
          </p>

          <div className="rounded-2xl border border-game-border bg-game-bg p-3.5 space-y-2.5">
            <div className="flex items-start gap-2">
              <span className="text-sm shrink-0">🚫</span>
              <div>
                <strong className="block text-game-text font-bold text-[11px]">
                  Login com GitHub desativado
                </strong>
                <span className="text-[11px]">
                  O aplicativo não permite abrir telas de autenticação externa dentro da prévia.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-sm shrink-0">💾</span>
              <div>
                <strong className="block text-game-text font-bold text-[11px]">
                  Progresso e Rankings
                </strong>
                <span className="text-[11px]">
                  Você pode jogar à vontade aqui, mas para competir no <strong>Ranking Global</strong> e salvar suas <strong>Sequências Diárias</strong> é necessário estar logado.
                </span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-sm shrink-0">🚀</span>
              <div>
                <strong className="block text-amber-300 font-bold text-[11px]">
                  Como liberar tudo?
                </strong>
                <span className="text-[11px] text-game-text">
                  Procure a opção <strong>"Abrir no site do criador"</strong> no menu do aplicativo para abrir o jogo direto no seu navegador com 100% dos recursos!
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-5 flex w-full flex-col gap-2">
          <button
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-game-accent py-3 px-4 text-xs font-black uppercase tracking-wider text-game-accent-text hover:bg-game-accent-hover transition-colors"
          >
            <span>Entendi, continuar na prévia</span>
          </button>
        </div>
      </div>
    </div>
  );
}
