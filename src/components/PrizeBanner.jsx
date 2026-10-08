import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Trophy, Calendar as CalendarIcon, Star, Sparkles, ChevronDown, Loader2 } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import Avatar from "@/components/Avatar";
import { effectClass } from "@/lib/effects";
import { useAuth } from "@/context/AuthContext";
import { useAIStatus } from "@/context/AIStatusContext";

/**
 * Banner showing the monthly prize, current leader and days remaining.
 * Visible to anyone authenticated (student dashboard).
 */
export default function PrizeBanner() {
  const [data, setData] = useState(null);
  const [tips, setTips] = useState(null);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const { user } = useAuth();
  const { enabled: aiEnabled } = useAIStatus();

  const fetchPrize = useCallback(async () => {
    try {
      const { data } = await api.get("/monthly-prize");
      setData(data);
    } catch {}
  }, []);

  useEffect(() => {
    fetchPrize();
    const handleRefresh = () => fetchPrize();
    window.addEventListener("task-completed", handleRefresh);
    window.addEventListener("tasks-updated", handleRefresh);
    window.addEventListener("prize-updated", handleRefresh);
    return () => {
      window.removeEventListener("task-completed", handleRefresh);
      window.removeEventListener("tasks-updated", handleRefresh);
      window.removeEventListener("prize-updated", handleRefresh);
    };
  }, [fetchPrize]);

  const loadTips = async () => {
    setTipsOpen(true);
    if (tips) return;
    setTipsLoading(true);
    try {
      const { data } = await api.get("/ai/prize-tips");
      setTips(data);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao buscar dicas");
      setTipsOpen(false);
    } finally {
      setTipsLoading(false);
    }
  };

  if (!data || !data.prize) return null;
  const { prize, ai_winner, leader, leaders, is_tie_top1, days_remaining, month_label } = data;
  const showAiButton = aiEnabled && user?.role === "aluno";
  const isWinner = Boolean(
    ai_winner && (
      user?.id === ai_winner.winner_id ||
      user?.name === ai_winner.winner_name ||
      ai_winner.tied_winners?.some((tw) => tw.id === user?.id) ||
      ai_winner.is_me
    )
  );

  const topLeaders = leaders && leaders.length > 0 ? leaders : leader ? [leader] : [];
  const hasTie = Boolean(is_tie_top1 || topLeaders.length > 1);

  return (
    <div className="nb-card p-3 sm:p-5 mb-4 sm:mb-8 bg-gradient-to-br from-amber-200 via-amber-100 to-amber-200 relative overflow-hidden" data-testid="prize-banner">
      <div className="absolute top-0 right-0 w-32 h-32 opacity-15 text-9xl select-none pointer-events-none">{prize.emoji}</div>
      
      {/* Barra compacta para celular (evita rolagem excessiva) */}
      <div className="sm:hidden flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl flex-shrink-0">{prize.emoji}</span>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-900 truncate">
              {ai_winner ? `🏆 Vencedor • ${month_label}` : hasTie ? `👑 Empate Top 1 • ${days_remaining}d` : `Prêmio do mês • ${days_remaining}d restantes`}
            </div>
            <div className="font-heading font-black text-xs text-neutral-900 truncate">
              {ai_winner ? `🎉 ${ai_winner.winner_name}` : hasTie ? `👑 ${topLeaders.map(l => l.name).join(' & ')}` : leader ? `👑 ${leader.name}` : prize.title}
            </div>
          </div>
        </div>
        <button
          onClick={() => setMobileExpanded(!mobileExpanded)}
          className="nb-btn bg-white hover:bg-amber-50 px-2 py-1 text-[11px] font-bold flex items-center gap-1 flex-shrink-0"
          data-testid="toggle-mobile-prize-details"
        >
          <span>{mobileExpanded ? "Ocultar" : "Ver prêmio"}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${mobileExpanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Conteúdo completo (visível se expandido no celular ou sempre em telas maiores) */}
      <div className={`${mobileExpanded ? "block mt-3 pt-3 border-t border-amber-900/15" : "hidden sm:block"}`}>
        {/* Vencedor oficial do mês eleito pela IA */}
        {ai_winner && (
        <div className="relative z-10 mb-4 nb-card bg-amber-300 p-3.5 sm:p-4 border-2 border-black" data-testid="ai-winner-banner">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-amber-950" strokeWidth={2.5} />
            <span className="text-xs font-black uppercase tracking-wider text-amber-950">
              {isWinner ? "🎉 Você Venceu a Premiação do Mês!" : (ai_winner.tied_winners?.length > 1 || ai_winner.is_tie) ? `Vencedores Empatados do Mês • ${month_label}` : `Vencedor(a) do Mês • ${month_label}`}
            </span>
          </div>

          {/* Exibe o ícone de todos os vencedores empatados */}
          {ai_winner.tied_winners && ai_winner.tied_winners.length > 1 ? (
            <div className="flex items-center gap-3 my-2 flex-wrap">
              {ai_winner.tied_winners.map((tw) => (
                <div key={tw.id} className="flex items-center gap-2 bg-white/90 px-3 py-1.5 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Avatar
                    userId={tw.id}
                    name={tw.name}
                    size={36}
                    hasAvatar={tw.has_avatar}
                    bg="bg-amber-200"
                    effect={effectClass(tw.equipped_effect)}
                  />
                  <div>
                    <div className="font-heading font-black text-sm text-neutral-900 leading-tight">{tw.name}</div>
                    <span className="text-[10px] font-bold text-amber-900">👑 1º Lugar Empatado</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="font-heading font-black text-xl sm:text-2xl text-neutral-900 flex items-center gap-2 flex-wrap">
              <span>🎉 {ai_winner.winner_name}</span>
              {isWinner && (
                <span className="nb-badge bg-emerald-300 text-emerald-950 text-xs font-bold">É você! Parabéns!</span>
              )}
            </div>
          )}

          {/* O motivo da vitória aparece APENAS para o ganhador */}
          {isWinner && ai_winner.justification ? (
            <div className="mt-2.5 p-3 bg-white/95 rounded-lg border border-black/20 text-xs sm:text-sm text-neutral-900">
              <p className="font-bold text-amber-950 text-xs uppercase tracking-wide mb-1">Motivo da sua vitória (Avaliação da IA):</p>
              <p className="font-medium whitespace-pre-wrap">{ai_winner.justification}</p>
              {ai_winner.criteria?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {ai_winner.criteria.map((c, i) => (
                    <span key={i} className="nb-badge bg-amber-100 text-neutral-900 text-[10px]">
                      ✓ {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : !isWinner && (
            <p className="text-xs text-neutral-800 mt-1 font-medium">
              Parabéns ao destaque deste mês! Continue entregando suas tarefas com pontualidade.
            </p>
          )}
        </div>
      )}

      <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 nb-card flex items-center justify-center bg-amber-300 text-2xl flex-shrink-0">
            {prize.emoji}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-900">Prêmio do mês • {month_label}</div>
            <h3 className="font-heading font-black text-lg sm:text-2xl leading-tight">{prize.title}</h3>
            {prize.description && (
              <p className="text-xs sm:text-sm text-neutral-700 mt-1 max-w-md">{prize.description}</p>
            )}
            <div className="mt-2 text-xs font-medium bg-white/80 inline-block px-2.5 py-1 rounded-md border border-amber-900/20 text-neutral-900">
              ✨ Pontos de tarefas servem exclusivamente para a Loja de Molduras.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Se houver empate no 1º lugar, aparecem os ícones de TODOS os empatados em primeiro */}
          {hasTie && topLeaders.length > 1 && !ai_winner ? (
            <div className="flex items-center gap-2.5 nb-card bg-white px-3 py-2 border-2 border-black" data-testid="prize-leaders-tied">
              <div className="flex items-center -space-x-2.5 flex-shrink-0">
                {topLeaders.map((ld) => (
                  <Avatar
                    key={ld.id}
                    userId={ld.id}
                    name={ld.name}
                    size={36}
                    hasAvatar={ld.has_avatar}
                    bg="bg-amber-200"
                    effect={effectClass(ld.equipped_effect)}
                  />
                ))}
              </div>
              <div className="leading-tight min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-800 flex items-center gap-1">
                  👑 Empate no 1º Lugar ({topLeaders.length})
                </div>
                <div className="font-heading font-bold text-xs sm:text-sm text-neutral-900 flex items-center gap-1 truncate max-w-[200px]">
                  {topLeaders.map((l) => l.name).join(" & ")}
                </div>
                <div className="text-[10px] font-bold text-emerald-700">
                  {topLeaders[0]?.on_time_month || 0} no prazo • {topLeaders[0]?.uncompleted_count === 0 ? "0 pendências" : `${topLeaders[0]?.uncompleted_count} pend.`}
                </div>
              </div>
            </div>
          ) : leader && !ai_winner ? (
            <div className="flex items-center gap-2 nb-card bg-white px-3 py-2" data-testid="prize-leader">
              <Avatar userId={leader.id} name={leader.name} size={32} hasAvatar={leader.has_avatar} bg="bg-amber-200" effect={effectClass(leader.equipped_effect)} />
              <div className="leading-tight">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">Destaque Pontualidade</div>
                <div className="font-heading font-bold text-sm flex items-center gap-1">{leader.name} <Star className="w-3 h-3 text-amber-500" fill="currentColor" /></div>
                <div className="text-[10px] font-bold text-emerald-700">{leader.on_time_month || 0} no prazo</div>
              </div>
            </div>
          ) : null}
          <div className="nb-card bg-white px-3 py-2 flex items-center gap-2" data-testid="prize-countdown">
            <CalendarIcon className="w-4 h-4" />
            <div className="leading-tight">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-600">Decisão IA em</div>
              <div className="font-heading font-black text-base">{days_remaining}d</div>
            </div>
          </div>
        </div>
      </div>
      </div>

      {showAiButton && (
        <div className="relative z-10 mt-3 sm:mt-4">
          {!tipsOpen ? (
            <button
              onClick={loadTips}
              className="nb-btn bg-gradient-to-r from-violet-300 to-pink-300 hover:from-violet-400 hover:to-pink-400 px-3 py-1.5 text-xs sm:text-sm flex items-center gap-1.5"
              data-testid="prize-tips-button"
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} />
              Como a IA avalia o vencedor do mês?
            </button>
          ) : (
            <div className="nb-card bg-white p-3.5 sm:p-4 text-xs sm:text-sm" data-testid="prize-tips-panel">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-900">
                  <Sparkles className="w-3.5 h-3.5 text-violet-500" strokeWidth={2.5} />
                  Critérios da Avaliação Mensal por IA
                </div>
                <button onClick={() => setTipsOpen(false)} className="text-xs text-neutral-500 hover:underline">Fechar</button>
              </div>
              {tipsLoading ? (
                <div className="flex items-center gap-2 text-neutral-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> consultando IA...
                </div>
              ) : tips ? (
                <div className="space-y-2">
                  <ul className="space-y-1 list-disc list-inside text-neutral-800">
                    {Array.isArray(tips.tips) ? (
                      tips.tips.map((t, idx) => <li key={idx}>{t}</li>)
                    ) : (
                      <li>{tips.tips}</li>
                    )}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
