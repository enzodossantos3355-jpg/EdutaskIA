import { Lock, ArrowRight } from "lucide-react";

const AREA_TITLES = {
  tasks: "Tarefas",
  announcements: "Avisos",
  resumos: "Resumos de Estudo",
};

export default function LockedAreaScreen({ areaKey, availableArea, onGoToAvailableArea }) {
  const areaTitle = AREA_TITLES[areaKey] || "Área do Aluno";

  return (
    <div
      className="py-6 sm:py-10 px-1 flex items-center justify-center grayscale"
      data-testid={`locked-area-screen-${areaKey}`}
    >
      <div className="mentalist-surface-keep w-full max-w-lg rounded-2xl bg-neutral-100 border-2 border-neutral-700 shadow-[4px_4px_0_0_#404040] p-6 sm:p-8 text-center text-neutral-900">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-neutral-200 border-2 border-neutral-700 flex items-center justify-center shadow-[2px_2px_0_0_#525252]">
          <Lock className="w-8 h-8 text-neutral-700" strokeWidth={2.4} />
        </div>

        <span className="inline-block px-3 py-1 rounded-md bg-neutral-200 border border-neutral-500 text-neutral-800 text-xs font-bold mb-3">
          {areaTitle}
        </span>

        <p
          className="font-heading font-black text-base sm:text-xl text-neutral-900 leading-snug mb-5"
          data-testid="locked-area-message"
        >
          Esta área está temporariamente desativada pelo administrador.
        </p>

        {availableArea && onGoToAvailableArea && (
          <button
            type="button"
            onClick={() => onGoToAvailableArea(availableArea.key)}
            className="mentalist-btn-keep inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-900 text-white border-2 border-neutral-950 font-heading font-bold text-xs sm:text-sm shadow-[2px_2px_0_0_#171717] transition-colors cursor-pointer"
            data-testid="go-to-available-area-btn"
          >
            <span>Ir para área disponível</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
