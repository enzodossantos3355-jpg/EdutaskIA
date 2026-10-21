import { CheckCircle, ShoppingBag, Trophy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

/**
 * Compact stats card showing points for store frames, on-time completions, and total completions.
 * Streak (ofensiva) permanently removed per user requirement.
 */
export default function StatsCard({ stats, onOpenStore = null }) {
  const { user } = useAuth();
  if (!stats) return null;
  const points = stats.points || 0;
  const onTime = stats.on_time_completed || 0;
  const total = stats.total_completed || 0;
  const isMinecraft = user?.equipped_effect === "minecraft";

  if (isMinecraft) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full font-minecraft" data-testid="stats-card">
        {/* 1. Pontos para Molduras (Bloco de Pedra + Barra de Ouro) */}
        <div
          className={`p-2.5 sm:p-3 bg-[#707070] border-2 border-black rounded shadow-[inset_2px_2px_0_#9c9c9c,inset_-2px_-2px_0_#3f3f3f,2px_2px_0_#000] ${
            onOpenStore ? 'cursor-pointer hover:brightness-110 transition-all' : ''
          }`}
          onClick={onOpenStore || undefined}
          title={onOpenStore ? "Clique para ir à Loja de Molduras" : undefined}
          data-testid="stats-points"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded bg-[#5a4325] border-2 border-black flex items-center justify-center flex-shrink-0 shadow-[inset_1px_1px_0_#8c6738]">
              <span className="text-xl">🪙</span>
            </div>
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-wider text-[#d4af37] flex items-center justify-between gap-1">
                <span>PONTOS P/ MOLDURAS</span>
              </div>
              <div className="font-black text-lg sm:text-xl leading-tight text-white">{points}</div>
              <div className="text-[9px] text-[#e5e5e5] truncate">Saldo para a l...</div>
            </div>
          </div>
        </div>

        {/* 2. No Prazo (Bloco de Pedra + Livro) */}
        <div className="p-2.5 sm:p-3 bg-[#707070] border-2 border-black rounded shadow-[inset_2px_2px_0_#9c9c9c,inset_-2px_-2px_0_#3f3f3f,2px_2px_0_#000]" data-testid="stats-ontime">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded bg-[#54381e] border-2 border-black flex items-center justify-center flex-shrink-0 shadow-[inset_1px_1px_0_#82562d]">
              <span className="text-xl">📖</span>
            </div>
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-wider text-[#d1d5db]">
                NO PRAZO
              </div>
              <div className="font-black text-lg sm:text-xl leading-tight text-white">{onTime} tarefas</div>
              <div className="text-[9px] text-[#e5e5e5] truncate">Pontualidade ...</div>
            </div>
          </div>
        </div>

        {/* 3. Concluídas (Bloco de Pedra + Troféu Dourado) */}
        <div className="p-2.5 sm:p-3 bg-[#707070] border-2 border-black rounded shadow-[inset_2px_2px_0_#9c9c9c,inset_-2px_-2px_0_#3f3f3f,2px_2px_0_#000]" data-testid="stats-total-done">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded bg-[#5a4325] border-2 border-black flex items-center justify-center flex-shrink-0 shadow-[inset_1px_1px_0_#8c6738]">
              <span className="text-xl">🏆</span>
            </div>
            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-wider text-[#d1d5db]">
                CONCLUÍDAS
              </div>
              <div className="font-black text-lg sm:text-xl leading-tight text-white">{total} tarefas</div>
              <div className="text-[9px] text-[#e5e5e5] truncate">Total entregue</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 w-full" data-testid="stats-card">
      {/* 1. Pontos para Molduras */}
      <div
        className={`nb-card p-2.5 sm:p-3 bg-amber-200 ${onOpenStore ? 'cursor-pointer hover:bg-amber-300 transition-colors' : ''}`}
        onClick={onOpenStore || undefined}
        title={onOpenStore ? "Clique para ir à Loja de Molduras" : undefined}
        data-testid="stats-points"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-300 border border-black flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-4 h-4 text-amber-950" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900 opacity-80 flex items-center justify-between gap-1 flex-wrap">
              <span>Pontos p/ Molduras</span>
              {onOpenStore && <span className="text-[9px] font-bold text-amber-950 underline whitespace-nowrap">Abrir Loja →</span>}
            </div>
            <div className="font-heading font-black text-xl sm:text-2xl leading-tight text-neutral-900">{points}</div>
            <div className="text-[10px] text-amber-950 font-medium truncate">Saldo para a loja</div>
          </div>
        </div>
      </div>

      {/* 2. Entregas no Prazo (Critério Principal da IA) */}
      <div className="nb-card p-2.5 sm:p-3 bg-emerald-200" data-testid="stats-ontime">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-300 border border-black flex items-center justify-center flex-shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-950" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-950 opacity-80">
              No Prazo
            </div>
            <div className="font-heading font-black text-xl sm:text-2xl leading-tight text-neutral-900">{onTime} tarefas</div>
            <div className="text-[10px] text-emerald-950 font-medium truncate">Pontualidade na IA</div>
          </div>
        </div>
      </div>

      {/* 3. Total Concluídas */}
      <div className="nb-card p-2.5 sm:p-3 bg-sky-200" data-testid="stats-total-done">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-300 border border-black flex items-center justify-center flex-shrink-0">
            <Trophy className="w-4 h-4 text-sky-950" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-sky-950 opacity-80">
              Concluídas
            </div>
            <div className="font-heading font-black text-xl sm:text-2xl leading-tight text-neutral-900">{total} tarefas</div>
            <div className="text-[10px] text-sky-950 font-medium truncate">Total entregue</div>
          </div>
        </div>
      </div>
    </div>
  );
}
