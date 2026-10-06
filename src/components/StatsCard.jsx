import { CheckCircle, ShoppingBag, Trophy } from "lucide-react";

/**
 * Compact stats card showing points for store frames, on-time completions, and total completions.
 * Streak (ofensiva) permanently removed per user requirement.
 */
export default function StatsCard({ stats, onOpenStore = null }) {
  if (!stats) return null;
  const points = stats.points || 0;
  const onTime = stats.on_time_completed || 0;
  const total = stats.total_completed || 0;

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
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900 opacity-80 flex items-center justify-between">
              <span>Pontos p/ Molduras</span>
              {onOpenStore && <span className="text-[9px] font-bold text-amber-950 underline">Abrir Loja →</span>}
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
