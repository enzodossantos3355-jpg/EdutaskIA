import React, { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Trophy, Calendar, Lock, Play, RefreshCw, CheckCircle2, Clock, AlertTriangle, ShieldCheck, User, Sparkles, History, ChevronDown, ChevronUp } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import Avatar from "@/components/Avatar";
import { effectClass } from "@/lib/effects";

export default function AnnualRankingPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [confirmNextYearOpen, setConfirmNextYearOpen] = useState(false);
  const [expandedYear, setExpandedYear] = useState(null);

  const loadRanking = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/ranking/annual");
      setData(res.data);
    } catch (err) {
      toast.error("Erro ao carregar Ranking Anual: " + formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRanking();
  }, [loadRanking]);

  const handleCloseAnnualCycle = async () => {
    setActionLoading(true);
    try {
      const res = await api.post("/ranking/annual/close");
      if (res.data?.ok) {
        toast.success("Ranking Anual encerrado! O aplicativo agora está desativado para os alunos.");
        setConfirmCloseOpen(false);
        loadRanking();
      }
    } catch (err) {
      toast.error("Erro ao encerrar ano letivo: " + formatApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartNextYear = async () => {
    setActionLoading(true);
    try {
      const res = await api.post("/ranking/annual/start-next-year");
      if (res.data?.ok) {
        toast.success(`Ranking do Ano ${res.data.annual_cycle.active_year} iniciado com sucesso! O aplicativo foi reativado para alunos.`);
        setConfirmNextYearOpen(false);
        loadRanking();
      }
    } catch (err) {
      toast.error("Erro ao iniciar próximo ano letivo: " + formatApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="nb-card bg-white p-8 text-center" data-testid="annual-ranking-panel-loading">
        <RefreshCw className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-3" />
        <p className="font-bold text-neutral-700">Carregando Ranking Anual...</p>
      </div>
    );
  }

  const cycle = data?.annual_cycle || { active_year: 2026, is_closed: false, closed_at: null };
  const rankings = data?.rankings || [];
  const history = data?.annual_history || [];

  return (
    <div className="space-y-6" data-testid="annual-ranking-panel">
      {/* Header Banner */}
      <div className="nb-card bg-gradient-to-r from-amber-300 via-amber-200 to-sky-200 p-6 relative overflow-hidden border-4 border-black shadow-[6px_6px_0_0_#000]">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="nb-badge bg-black text-amber-300 border-black font-black text-xs px-3 py-1 uppercase tracking-wider">
                <Trophy className="w-3.5 h-3.5 text-amber-300 inline mr-1" />
                Ano Letivo {cycle.active_year}
              </span>
              <span className={`nb-badge font-black text-xs px-3 py-1 ${cycle.is_closed ? "bg-red-500 text-white" : "bg-emerald-400 text-black"} border-black`}>
                {cycle.is_closed ? "🔒 Encerrado / App Desativado para Alunos" : "🟢 Ano Ativo / Alunos Liberados"}
              </span>
            </div>
            <h2 className="font-heading font-black text-3xl text-black leading-tight drop-shadow-[1px_1px_0_#fff]">
              Ranking Anual dos Alunos
            </h2>
            <p className="text-neutral-900 font-medium text-sm mt-1 max-w-2xl">
              Acompanhe todas as tarefas feitas, pendentes e a pontuação acumulada de cada aluno no ano letivo.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {!cycle.is_closed ? (
              <button
                onClick={() => setConfirmCloseOpen(true)}
                className="nb-btn bg-red-500 hover:bg-red-600 text-white px-5 py-3 text-sm flex items-center justify-center gap-2 font-black shadow-[3px_3px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] w-full sm:w-auto"
                data-testid="btn-close-annual-cycle"
              >
                <Lock className="w-4 h-4" />
                Encerrar Ranking Anual
              </button>
            ) : (
              <button
                onClick={() => setConfirmNextYearOpen(true)}
                className="nb-btn bg-emerald-400 hover:bg-emerald-500 text-black px-5 py-3 text-sm flex items-center justify-center gap-2 font-black shadow-[3px_3px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] w-full sm:w-auto"
                data-testid="btn-start-next-year"
              >
                <Play className="w-4 h-4" />
                Iniciar Ranking do Próximo Ano ({cycle.active_year + 1})
              </button>
            )}

            <button
              onClick={loadRanking}
              className="nb-btn bg-white hover:bg-neutral-100 text-black px-3.5 py-3 text-sm flex items-center justify-center gap-1.5 font-bold shadow-[3px_3px_0_0_#000]"
              title="Atualizar dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal: Close Annual Cycle */}
      {confirmCloseOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full nb-card bg-white p-6 border-4 border-black shadow-[8px_8px_0_0_#000] space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-8 h-8 flex-shrink-0" />
              <h3 className="font-heading font-black text-xl text-black">Encerrar Ranking Anual {cycle.active_year}?</h3>
            </div>
            <p className="text-sm text-neutral-700 leading-relaxed">
              Ao encerrar o Ranking Anual do ano <strong>{cycle.active_year}</strong>:
            </p>
            <ul className="text-xs text-neutral-800 space-y-2 bg-amber-50 p-3 rounded-lg border-2 border-black font-semibold">
              <li>⚠️ O aplicativo ficará <strong>desativado para todos os alunos</strong>.</li>
              <li>⚠️ Alunos verão a tela informativa de encerramento do ano letivo ao tentar acessar.</li>
              <li>✔️ O administrador continuará com acesso livre para consultar o ranking e iniciar o próximo ano quando desejar.</li>
            </ul>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmCloseOpen(false)}
                disabled={actionLoading}
                className="nb-btn bg-neutral-200 hover:bg-neutral-300 text-black px-4 py-2 text-sm flex-1 font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleCloseAnnualCycle}
                disabled={actionLoading}
                className="nb-btn bg-red-500 hover:bg-red-600 text-white px-4 py-2 text-sm flex-1 font-black shadow-[3px_3px_0_0_#000]"
              >
                {actionLoading ? "Encerrando..." : "Sim, Encerrar Ano"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Start Next Year */}
      {confirmNextYearOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full nb-card bg-white p-6 border-4 border-black shadow-[8px_8px_0_0_#000] space-y-4">
            <div className="flex items-center gap-3 text-emerald-600">
              <Sparkles className="w-8 h-8 flex-shrink-0 text-emerald-500" />
              <h3 className="font-heading font-black text-xl text-black">Iniciar Ranking do Ano {cycle.active_year + 1}?</h3>
            </div>
            <p className="text-sm text-neutral-700 leading-relaxed">
              Você está prestes a iniciar o ciclo escolar do ano <strong>{cycle.active_year + 1}</strong>:
            </p>
            <ul className="text-xs text-neutral-800 space-y-2 bg-emerald-50 p-3 rounded-lg border-2 border-black font-semibold">
              <li>🏆 Os resultados finais do ano <strong>{cycle.active_year}</strong> serão salvos no histórico permanente.</li>
              <li>🚀 O acesso do aplicativo para alunos será <strong>reativado imediatamente</strong>.</li>
              <li>📅 O ano letivo ativo passará a ser <strong>{cycle.active_year + 1}</strong>.</li>
            </ul>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmNextYearOpen(false)}
                disabled={actionLoading}
                className="nb-btn bg-neutral-200 hover:bg-neutral-300 text-black px-4 py-2 text-sm flex-1 font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={handleStartNextYear}
                disabled={actionLoading}
                className="nb-btn bg-emerald-400 hover:bg-emerald-500 text-black px-4 py-2 text-sm flex-1 font-black shadow-[3px_3px_0_0_#000]"
              >
                {actionLoading ? "Iniciando..." : "Iniciar Ano Novo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="nb-card bg-white p-5 border-4 border-black shadow-[6px_6px_0_0_#000]">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-heading font-black text-xl text-black flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Classificação Geral do Ranking ({rankings.length} alunos)
          </h3>
          <span className="text-xs font-bold bg-amber-100 text-amber-950 border border-black px-2.5 py-1 rounded">
            Pontos de Tarefas & Entregas
          </span>
        </div>

        {rankings.length === 0 ? (
          <p className="text-neutral-500 text-sm py-8 text-center font-bold">
            Nenhum aluno cadastrado no ranking.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-amber-100 border-2 border-black font-heading font-black text-black uppercase text-xs">
                  <th className="p-3 text-center w-16">Posição</th>
                  <th className="p-3">Aluno</th>
                  <th className="p-3 text-center">Pontos</th>
                  <th className="p-3 text-center">Tarefas Feitas</th>
                  <th className="p-3 text-center">Tarefas Pendentes</th>
                  <th className="p-3 text-center">No Prazo</th>
                  <th className="p-3 text-center">Atrasadas</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black font-bold">
                {rankings.map((r, i) => {
                  const isTop1 = r.rank === 1;
                  const isTop2 = r.rank === 2;
                  const isTop3 = r.rank === 3;
                  const rowBg = isTop1
                    ? "bg-amber-50 hover:bg-amber-100/80"
                    : isTop2
                    ? "bg-slate-50 hover:bg-slate-100/80"
                    : isTop3
                    ? "bg-orange-50/60 hover:bg-orange-100/80"
                    : "hover:bg-neutral-50";

                  return (
                    <tr key={r.user_id} className={`border-b-2 border-neutral-200 transition-colors ${rowBg}`}>
                      {/* Rank Position */}
                      <td className="p-3 text-center">
                        {isTop1 ? (
                          <span className="inline-flex items-center justify-center w-9 h-9 bg-amber-400 border-2 border-black rounded-full font-black text-black shadow-[2px_2px_0_0_#000]">
                            🥇 1º
                          </span>
                        ) : isTop2 ? (
                          <span className="inline-flex items-center justify-center w-9 h-9 bg-slate-300 border-2 border-black rounded-full font-black text-black shadow-[2px_2px_0_0_#000]">
                            🥈 2º
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-flex items-center justify-center w-9 h-9 bg-amber-600 text-white border-2 border-black rounded-full font-black shadow-[2px_2px_0_0_#000]">
                            🥉 3º
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-neutral-200 border border-black rounded-md font-bold text-neutral-800">
                            {r.rank}º
                          </span>
                        )}
                      </td>

                      {/* Student Name */}
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            userId={r.user_id}
                            name={r.name}
                            size={40}
                            hasAvatar={r.has_avatar}
                            bg="bg-sky-300"
                            effect={effectClass(r.equipped_effect)}
                          />
                          <div>
                            <p className="font-black text-black text-base leading-snug">
                              {r.name}
                            </p>
                            {r.status === "bot" && (
                              <span className="text-[10px] bg-cyan-200 text-cyan-950 font-black px-1.5 py-0.5 rounded border border-black inline-block mt-0.5">
                                Bot de Teste
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Total Points */}
                      <td className="p-3 text-center">
                        <span className="nb-badge bg-amber-300 text-black border-black font-black text-sm px-3 py-1">
                          ⭐ {r.points} pts
                        </span>
                      </td>

                      {/* Completed Tasks */}
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 border border-black px-2.5 py-1 rounded font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> {r.completed_tasks}
                        </span>
                      </td>

                      {/* Pending Tasks */}
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-bold border border-black ${r.pending_tasks > 0 ? "bg-red-100 text-red-800" : "bg-neutral-100 text-neutral-600"}`}>
                          <Clock className="w-3.5 h-3.5" /> {r.pending_tasks}
                        </span>
                      </td>

                      {/* On time */}
                      <td className="p-3 text-center text-xs font-bold text-emerald-800">
                        {r.on_time_tasks}
                      </td>

                      {/* Late */}
                      <td className="p-3 text-center text-xs font-bold text-amber-800">
                        {r.late_tasks}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History of Past Years */}
      {history.length > 0 && (
        <div className="nb-card bg-white p-5 border-4 border-black shadow-[6px_6px_0_0_#000]">
          <h3 className="font-heading font-black text-xl text-black flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-indigo-600" />
            Histórico dos Anos Anteriores ({history.length})
          </h3>

          <div className="space-y-3">
            {history.map((h) => {
              const isOpen = expandedYear === h.year;
              return (
                <div key={h.year} className="border-2 border-black rounded-xl overflow-hidden bg-neutral-50">
                  <button
                    onClick={() => setExpandedYear(isOpen ? null : h.year)}
                    className="w-full p-4 flex items-center justify-between font-heading font-black text-base text-black bg-amber-100 hover:bg-amber-200 text-left transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Trophy className="w-5 h-5 text-amber-600" />
                      <span>Ranking Final do Ano {h.year}</span>
                      <span className="text-xs font-bold text-neutral-600 bg-white border border-black px-2 py-0.5 rounded">
                        Encerrado em: {new Date(h.closed_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>

                  {isOpen && (
                    <div className="p-4 bg-white border-t-2 border-black overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-neutral-100 font-bold border-b border-black">
                            <th className="p-2">Posição</th>
                            <th className="p-2">Aluno</th>
                            <th className="p-2 text-center">Pontos</th>
                            <th className="p-2 text-center">Tarefas Concluídas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200">
                          {(h.rankings || []).map((hr) => (
                            <tr key={hr.user_id}>
                              <td className="p-2 font-black">{hr.rank}º</td>
                              <td className="p-2 font-bold">{hr.name}</td>
                              <td className="p-2 text-center font-bold">{hr.points} pts</td>
                              <td className="p-2 text-center font-bold text-emerald-700">{hr.completed_tasks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
