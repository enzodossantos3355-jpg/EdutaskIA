import React, { useEffect } from "react";
import { Sparkles, Star, Megaphone, X, CheckCircle2, Bell, Calendar } from "lucide-react";
import { formatDateBR } from "@/lib/priority";

/**
 * SpecialAnnouncementModal
 * 
 * Pop-up de Aviso Especial em estilo neobrutalist para comunicados prioritários da escola.
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-6 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
      data-testid="special-announcement-popup"
      role="dialog"
      aria-modal="true"
      aria-labelledby="special-announcement-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl border-3 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Header */}
        <div className="relative bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 px-5 sm:px-6 py-4 border-b-2 border-black flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-black text-amber-300 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] shrink-0 border border-black">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="bg-black text-amber-300 text-[10px] sm:text-[11px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md border border-black">
                  Aviso Especial
                </span>
                <Star className="w-3.5 h-3.5 text-black fill-black" />
              </div>
              <p className="text-xs font-black text-neutral-900 mt-0.5">
                Comunicado Prioritário da Escola
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white hover:bg-neutral-100 text-black border-2 border-black flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            aria-label="Fechar pop-up"
            data-testid="close-special-popup-x"
          >
            <X className="w-4 h-4 stroke-[3]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-bold text-neutral-700 bg-amber-50/90 p-2.5 rounded-xl border border-amber-300">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-700" />
              <span>Publicado em {formatDateBR(announcement.created_at)}</span>
            </div>
            <div className="flex items-center gap-1 text-amber-950 font-black">
              <Megaphone className="w-3.5 h-3.5 text-amber-600" /> Leitura Recomendada
            </div>
          </div>

          <h2
            id="special-announcement-title"
            className="font-heading font-black text-xl sm:text-2xl text-neutral-900 leading-tight tracking-tight"
          >
            {announcement.title}
          </h2>

          <div className="bg-white rounded-xl border-2 border-black p-4 sm:p-5 text-neutral-900 text-sm sm:text-base whitespace-pre-wrap leading-relaxed shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            {announcement.message}
          </div>

          <div className="text-xs text-neutral-800 bg-neutral-100 rounded-xl p-3 border border-neutral-300 flex items-start gap-2.5">
            <span className="text-base leading-none shrink-0">📌</span>
            <span className="font-bold leading-snug">
              Este comunicado permanece fixado em destaque no seu painel de avisos para consulta sempre que precisar.
            </span>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-neutral-100 border-t-2 border-black flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-black text-neutral-700">
            <Bell className="w-4 h-4 text-amber-600" />
            <span>Notificação Institucional</span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto nb-btn bg-amber-400 hover:bg-amber-300 text-amber-950 px-6 py-2.5 text-sm sm:text-base font-black flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 border-2 border-black"
            data-testid="confirm-special-announcement-btn"
          >
            <CheckCircle2 className="w-4.5 h-4.5 text-amber-950" strokeWidth={2.5} />
            Ciente do Comunicado
          </button>
        </div>
      </div>
    </div>
  );
}
