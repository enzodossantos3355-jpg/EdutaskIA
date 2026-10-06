import React, { useEffect } from "react";
import { Sparkles, Star, Megaphone, X, CheckCircle2, Bell, Calendar } from "lucide-react";
import { formatDateBR } from "@/lib/priority";

/**
 * SpecialAnnouncementModal
 * 
 * Elegant neobrutalist pop-up dialog that displays high-priority/special
 * announcements to students automatically upon opening the app (once per announcement).
 */
export default function SpecialAnnouncementModal({
  announcement,
  isOpen,
  onClose,
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !announcement) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      data-testid="special-announcement-popup"
      role="dialog"
      aria-modal="true"
      aria-labelledby="special-announcement-title"
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl border-3 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Header */}
        <div className="relative bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-5 sm:px-6 py-4 border-b-2 border-black flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-black text-amber-300 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] flex-shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="bg-black text-white text-[10px] sm:text-[11px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
                  Aviso Especial
                </span>
                <Star className="w-3.5 h-3.5 text-black fill-black" />
              </div>
              <p className="text-xs font-bold text-neutral-900 mt-0.5">
                Comunicado prioritário da escola
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/90 hover:bg-white text-black border border-black flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            aria-label="Fechar pop-up"
            data-testid="close-special-popup-x"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
            <Calendar className="w-3.5 h-3.5 text-neutral-400" />
            <span>Publicado em {formatDateBR(announcement.created_at)}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-amber-700 font-bold">
              <Bell className="w-3 h-3" /> Leitura recomendada
            </span>
          </div>

          <h2
            id="special-announcement-title"
            className="font-heading font-black text-xl sm:text-2xl text-neutral-900 leading-tight tracking-tight"
          >
            {announcement.title}
          </h2>

          <div className="bg-amber-50/80 rounded-xl border border-amber-200/80 p-4 sm:p-5 text-neutral-800 text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
            {announcement.message}
          </div>

          <div className="text-xs text-neutral-500 bg-neutral-100 rounded-lg p-3 flex items-start gap-2">
            <span className="text-base leading-none">💡</span>
            <span>
              Este comunicado continuará fixado em destaque no seu painel de avisos para consulta a qualquer momento.
            </span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-neutral-50 border-t-2 border-black flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs text-neutral-500 hidden sm:inline">
            Aparece apenas 1 vez ao entrar no app
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto nb-btn bg-amber-300 hover:bg-amber-400 px-6 py-2.5 text-sm sm:text-base font-bold flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
            data-testid="confirm-special-announcement-btn"
          >
            <CheckCircle2 className="w-4 h-4 text-neutral-900" strokeWidth={2.5} />
            Entendi o comunicado
          </button>
        </div>
      </div>
    </div>
  );
}
