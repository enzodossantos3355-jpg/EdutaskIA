import { useState } from "react";
import { Download, X, Smartphone, ArrowRight, Share2, PlusSquare, ExternalLink, Sparkles } from "lucide-react";
import { usePWA } from "@/context/PWAContext";
import ModalPortal from "@/components/ModalPortal";

export function PWAInstallGuideModal() {
  const { showGuide, setShowGuide, guideMode } = usePWA();

  if (!showGuide) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-5 modal-backdrop"
        data-testid="pwa-guide-modal"
      >
      <div className="nb-card bg-white w-full max-w-md p-5 sm:p-6 border-2 border-black shadow-[6px_6px_0_0_#000] modal-window relative">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 nb-card bg-sky-300 border-2 border-black flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_0_#000]">
              <Smartphone className="w-5 h-5 text-sky-950" />
            </div>
            <div>
              <h3 className="font-heading font-black text-lg text-black leading-tight">
                {guideMode === "ios"
                  ? "Instalar no iPhone / iPad"
                  : guideMode === "inapp"
                  ? "Abrir no Navegador Externo"
                  : "Adicionar à Tela Inicial"}
              </h3>
              <p className="text-xs font-bold text-neutral-600">EduTask IA no seu dispositivo</p>
            </div>
          </div>
          <button
            onClick={() => setShowGuide(false)}
            className="nb-btn bg-white hover:bg-neutral-100 p-1.5"
            aria-label="Fechar"
            data-testid="close-pwa-guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {guideMode === "ios" && (
          <div className="space-y-3.5 text-xs sm:text-sm text-neutral-900 font-medium">
            <p className="bg-sky-100 border border-black/20 p-2.5 rounded-lg text-sky-950 font-bold">
              No Safari da Apple, você pode adicionar o EduTask IA direto na tela inicial em 3 passos rápidos:
            </p>
            <ol className="space-y-2.5">
              <li className="flex items-start gap-2.5 bg-neutral-50 p-2.5 rounded-lg border border-black/10">
                <span className="w-6 h-6 rounded-full bg-sky-400 text-black font-black text-xs flex items-center justify-center flex-shrink-0 border border-black">
                  1
                </span>
                <div>
                  Toque no botão <strong className="font-black text-sky-900 inline-flex items-center gap-1">Compartilhar <Share2 className="w-3.5 h-3.5 inline" /></strong> na barra inferior do Safari.
                </div>
              </li>
              <li className="flex items-start gap-2.5 bg-neutral-50 p-2.5 rounded-lg border border-black/10">
                <span className="w-6 h-6 rounded-full bg-amber-300 text-black font-black text-xs flex items-center justify-center flex-shrink-0 border border-black">
                  2
                </span>
                <div>
                  Role as opções para cima e selecione <strong className="font-black text-neutral-900 inline-flex items-center gap-1">Adicionar à Tela de Início <PlusSquare className="w-3.5 h-3.5 inline" /></strong>.
                </div>
              </li>
              <li className="flex items-start gap-2.5 bg-neutral-50 p-2.5 rounded-lg border border-black/10">
                <span className="w-6 h-6 rounded-full bg-emerald-300 text-black font-black text-xs flex items-center justify-center flex-shrink-0 border border-black">
                  3
                </span>
                <div>
                  No canto superior direito da tela, toque em <strong className="font-black text-emerald-950">Adicionar</strong> para confirmar.
                </div>
              </li>
            </ol>
            <p className="text-[11px] text-neutral-500 font-bold">
              Pronto! O ícone do EduTask IA aparecerá na tela inicial como um app nativo.
            </p>
          </div>
        )}

        {guideMode === "inapp" && (
          <div className="space-y-3 text-xs sm:text-sm text-neutral-900 font-medium">
            <p className="bg-amber-100 border border-black/20 p-2.5 rounded-lg text-amber-950 font-bold">
              Você está em um navegador interno (como Instagram, Facebook ou TikTok).
            </p>
            <div className="space-y-2">
              <div className="flex items-start gap-2.5 bg-neutral-50 p-2.5 rounded-lg border border-black/10">
                <span className="w-6 h-6 rounded-full bg-sky-400 text-black font-black text-xs flex items-center justify-center flex-shrink-0 border border-black">
                  1
                </span>
                <div>
                  Toque nos <strong>três pontos (...)</strong> ou no ícone de menu no topo do aplicativo.
                </div>
              </div>
              <div className="flex items-start gap-2.5 bg-neutral-50 p-2.5 rounded-lg border border-black/10">
                <span className="w-6 h-6 rounded-full bg-emerald-300 text-black font-black text-xs flex items-center justify-center flex-shrink-0 border border-black">
                  2
                </span>
                <div>
                  Escolha <strong>"Abrir no Chrome"</strong> ou <strong>"Abrir no Safari"</strong>.
                </div>
              </div>
            </div>
            <p className="text-xs text-neutral-600">
              Após abrir no navegador padrão, o botão de instalação funcionará imediatamente!
            </p>
          </div>
        )}

        {guideMode === "generic" && (
          <div className="space-y-3 text-xs sm:text-sm text-neutral-900 font-medium">
            <p className="text-neutral-800">
              Para colocar o EduTask IA na sua tela inicial:
            </p>
            <ol className="space-y-2">
              <li className="flex items-start gap-2 bg-neutral-50 p-2.5 rounded-lg border border-black/10">
                <span>1.</span>
                <span>Abra o menu de opções do seu navegador (três pontos ou menu principal).</span>
              </li>
              <li className="flex items-start gap-2 bg-neutral-50 p-2.5 rounded-lg border border-black/10">
                <span>2.</span>
                <span>Toque em <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</span>
              </li>
            </ol>
          </div>
        )}

        <div className="mt-5 pt-3 border-t border-black/10 flex justify-end">
          <button
            onClick={() => setShowGuide(false)}
            className="nb-btn bg-sky-400 hover:bg-sky-500 text-black px-4 py-2 text-xs font-black"
          >
            Entendi
          </button>
        </div>
      </div>
      </div>
    </ModalPortal>
  );
}

export default function PWAInstallCard() {
  const { showCard, isInstalled, isInstallable, isIOS, isInAppBrowser, installApp, dismissCard } = usePWA();

  if (!showCard || isInstalled) return null;

  const actionLabel = isInstallable
    ? "Instalar app"
    : isIOS
    ? "Como instalar"
    : isInAppBrowser
    ? "Ver como instalar"
    : "Como instalar";

  return (
    <>
      <div
        className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-40 max-w-[340px] sm:max-w-sm w-[calc(100%-1.5rem)] nb-card bg-amber-100 border-2 border-black p-3.5 sm:p-4 shadow-[4px_4px_0_0_#000] animate-in fade-in slide-in-from-bottom-3 duration-200"
        data-testid="pwa-install-invitation-card"
        role="region"
        aria-label="Convite para adicionar à tela inicial"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-sky-300 border-2 border-black flex items-center justify-center flex-shrink-0 shadow-[1px_1px_0_0_#000]">
              <Smartphone className="w-4 h-4 text-black" />
            </span>
            <h4 className="font-heading font-black text-xs sm:text-sm text-black leading-tight">
              Tenha o EduTask IA na tela inicial
            </h4>
          </div>
          <button
            onClick={dismissCard}
            className="text-neutral-500 hover:text-black p-1 transition-colors"
            title="Fechar por 7 dias"
            aria-label="Dispensar convite"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-xs text-neutral-700 font-medium mb-3 pl-7">
          Acesse suas tarefas com mais facilidade.
        </p>

        <div className="flex items-center justify-end gap-2 pl-7">
          <button
            onClick={dismissCard}
            className="nb-btn bg-white hover:bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-800"
            data-testid="pwa-dismiss-btn"
          >
            Agora não
          </button>
          <button
            onClick={installApp}
            className="nb-btn bg-sky-400 hover:bg-sky-500 px-3.5 py-1.5 text-xs font-black text-black flex items-center gap-1.5 shadow-[2px_2px_0_0_#000]"
            data-testid="pwa-install-btn"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{actionLabel}</span>
          </button>
        </div>
      </div>

      <PWAInstallGuideModal />
    </>
  );
}
