import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Power, Trophy, X, Award, FileText, Loader2, RotateCcw, Calendar, CheckCircle2, History } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAIStatus } from "@/context/AIStatusContext";
import Avatar from "@/components/Avatar";
import { effectClass } from "@/lib/effects";

/**
 * Admin AI control panel: global on/off toggle, monthly report generator,
 * AI prize winner evaluation, tied top 1 support, and monthly cycle reset.
 */
export default function AIAdminPanel() {
  const { enabled, refresh } = useAIStatus();
  const [toggling, setToggling] = useState(false);
  const [students, setStudents] = useState([]);
  const [reportStudent, setReportStudent] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [prizeEval, setPrizeEval] = useState(null);
  const [prizeEvalLoading, setPrizeEvalLoading] = useState(false);
  const [confirmingWinner, setConfirmingWinner] = useState(false);
  const [finalizingMonth, setFinalizingMonth] = useState(false);
  const [monthHistory, setMonthHistory] = useState([]);

  useEffect(() => {
    api.get("/users").then(({ data }) => setStudents(data.filter((u) => u.role === "aluno"))).catch(() => {});
    api.get("/monthly-prize/history").then(({ data }) => setMonthHistory(data?.history || [])).catch(() => {});
  }, []);

  const toggle = async () => {
    setToggling(true);
    try {
      await api.put("/ai/status", { enabled: !enabled });
      await refresh();
      toast.success(!enabled ? "IA ativada" : "IA desativada");
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao alterar");
    } finally {
      setToggling(false);
    }
  };

  const runReport = async (s) => {
    setReportStudent(s);
    setReportData(null);
    setReportLoading(true);
    try {
      const { data } = await api.get(`/ai/monthly-report/${s.id}`);
      setReportData(data);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao gerar relatório");
      setReportStudent(null);
    } finally {
      setReportLoading(false);
    }
  };

  const runEval = async () => {
    setPrizeEvalLoading(true);
    setPrizeEval(null);
    try {
      const { data } = await api.get("/ai/prize-evaluate");
      setPrizeEval(data);
      toast.success("Análise mensal concluída pela IA!");
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha na análise da IA");
    } finally {
      setPrizeEvalLoading(false);
    }
  };

  const confirmWinner = async () => {
    if (!prizeEval || !prizeEval.winner_name) return;
    setConfirmingWinner(true);
    try {
      await api.post("/monthly-prize/confirm-winner", {
        winner_id: prizeEval.winner_id,
        winner_name: prizeEval.winner_name,
        score: prizeEval.winner_score,
        is_tie: prizeEval.is_tie,
        tied_winners: prizeEval.tied_winners,
        justification: prizeEval.justification,
        criteria: prizeEval.criteria,
      });
      toast.success(`🎉 ${prizeEval.winner_name} foi oficializado como vencedor(a) do mês!`);
      window.dispatchEvent(new CustomEvent("prize-updated"));
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao confirmar vencedor");
    } finally {
      setConfirmingWinner(false);
    }
  };

  const chooseTiedWinner = async (chosen) => {
    setConfirmingWinner(true);
    try {
      const onTimeVal = chosen.on_time_month || 0;
      await api.post("/monthly-prize/confirm-winner", {
        winner_id: chosen.id,
        winner_name: chosen.name,
        score: chosen.score || prizeEval?.winner_score || 98,
        is_tie: false,
        tied_winners: null,
        on_time_month: onTimeVal,
        justification: `Aluno(a) escolhido(a) oficialmente pelo administrador para o Prêmio do Mês entre os alunos empatados no 1º lugar (${onTimeVal} tarefas no prazo e zero pendências).`,
        criteria: [
          `${onTimeVal} entrega(s) rigorosamente no prazo`,
          "Zero pendências no mês",
          "Decisão administrativa de desempate"
        ],
      });
      toast.success(`🎉 ${chosen.name} foi escolhido(a) como vencedor(a) do prêmio!`);
      window.dispatchEvent(new CustomEvent("prize-updated"));
      runEval();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao escolher vencedor");
    } finally {
      setConfirmingWinner(false);
    }
  };

  const removeWinnerChoice = async () => {
    try {
      await api.delete("/monthly-prize/winner");
      toast.success("Escolha de vencedor removida! O resultado retornou ao empate.");
      window.dispatchEvent(new CustomEvent("prize-updated"));
      runEval();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao remover escolha");
    }
  };

  const finalizeMonthAndReset = async () => {
    if (!window.confirm("Deseja realmente finalizar o mês atual? O resultado deste mês será registrado no histórico e o ciclo resetará para um novo mês.")) {
      return;
    }
    setFinalizingMonth(true);
    try {
      const { data } = await api.post("/monthly-prize/finalize-month");
      toast.success(data.message || "Mês finalizado e ciclo resetado com sucesso!");
      setMonthHistory(data.history || []);
      setPrizeEval(null);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao finalizar mês");
    } finally {
      setFinalizingMonth(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="ai-admin-panel">
      <div>
        <h1 className="font-heading font-black text-3xl sm:text-5xl tracking-tight flex items-center gap-3">
          <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-violet-600" strokeWidth={2.2} />
          Central de IA
        </h1>
        <p className="text-neutral-600 mt-1">Controle todos os recursos de inteligência artificial.</p>
      </div>

      {/* Global toggle */}
      <div className={`nb-card p-5 sm:p-6 ${enabled ? "bg-gradient-to-br from-emerald-100 to-sky-100" : "bg-gradient-to-br from-red-100 to-amber-100"}`} data-testid="ai-global-toggle-card">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-11 h-11 nb-card flex items-center justify-center ${enabled ? "bg-emerald-300" : "bg-red-300"}`}>
              <Power className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-heading font-black text-xl">Recursos de IA no app</h2>
              <p className="text-sm text-neutral-700 mt-0.5">
                {enabled ? "IA ativada — botões de IA aparecem para admin e alunos." : "IA desativada — todas as funções de IA estão bloqueadas (inclusive para o admin)."}
              </p>
            </div>
          </div>
          <button
            onClick={toggle}
            disabled={toggling}
            className={`nb-btn px-4 py-2.5 flex items-center gap-2 ${enabled ? "bg-red-300 hover:bg-red-400" : "bg-emerald-300 hover:bg-emerald-400"}`}
            data-testid="ai-toggle-button"
          >
            <Power className="w-4 h-4" strokeWidth={2.5} />
            {toggling ? "Aplicando..." : enabled ? "Desativar IA" : "Ativar IA"}
          </button>
        </div>
      </div>

      {/* Monthly reports */}
      <div className={`nb-card p-5 bg-white ${!enabled ? "opacity-60 pointer-events-none" : ""}`} data-testid="monthly-report-card">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5" strokeWidth={2.5} />
          <h2 className="font-heading font-bold text-lg">Relatório mensal por aluno</h2>
        </div>
        <p className="text-sm text-neutral-600 mb-3">Escolha um aluno para gerar um bilhete pedagógico com análise do desempenho no mês.</p>
        {students.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum aluno cadastrado.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => runReport(s)}
                className="nb-btn bg-white hover:bg-sky-100 px-3 py-2 flex items-center gap-2 text-sm"
                data-testid={`report-btn-${s.id}`}
              >
                <Avatar userId={s.id} name={s.name} size={26} hasAvatar={s.has_avatar} bg="bg-sky-200" />
                <span className="truncate flex-1 text-left">{s.name}</span>
                <FileText className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Prize evaluation */}
      <div className={`nb-card p-5 bg-gradient-to-br from-amber-50 to-amber-100 ${!enabled ? "opacity-60 pointer-events-none" : ""}`} data-testid="prize-eval-card">
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="w-5 h-5 text-amber-700" strokeWidth={2.5} />
          <h2 className="font-heading font-black text-xl">Avaliação Mensal do Vencedor por IA</h2>
        </div>
        <p className="text-sm text-neutral-800 mb-2">
          A Inteligência Artificial analisa o desempenho mensal de cada aluno com foco em <strong>pontualidade nas entregas</strong> e penalização por <strong>tarefas não concluídas</strong>.
        </p>
        <div className="p-3 bg-amber-200/70 border border-amber-900/30 rounded-lg text-xs text-amber-950 font-medium mb-4">
          ⚠️ <strong>Regra Ativa:</strong> O sistema de níveis está permanentemente desligado. Os pontos de tarefas servem <strong>somente para comprar molduras</strong> na loja e não influenciam a escolha do vencedor mensal!
        </div>

        <button
          onClick={runEval}
          disabled={prizeEvalLoading}
          className="nb-btn bg-amber-400 hover:bg-amber-500 px-5 py-2.5 flex items-center gap-2 font-bold shadow-sm"
          data-testid="ai-evaluate-prize-button"
        >
          {prizeEvalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" strokeWidth={2.5} />}
          {prizeEvalLoading ? "A IA está analisando os alunos do mês..." : "Executar Análise Mensal com IA"}
        </button>

        {prizeEval && (
          <div className="mt-5 space-y-4 nb-fade-in" data-testid="prize-eval-result">
            {/* Winner Spotlight Card */}
            <div className="nb-card bg-white p-5 border-2 border-black">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-300 border-2 border-black flex items-center justify-center text-2xl flex-shrink-0">
                    🏆
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200 px-2 py-0.5 rounded">
                      {prizeEval.is_tie ? `👑 Empate no 1º Lugar (${prizeEval.tied_winners?.length || 2} Alunos)` : "Vencedor(a) Sugerido(a) pela IA"}
                    </span>
                    <h3 className="font-heading font-black text-2xl text-neutral-900 mt-0.5">
                      {prizeEval.winner_name}
                    </h3>
                  </div>
                </div>
                {prizeEval.winner_score && (
                  <div className="nb-card bg-emerald-200 px-3 py-1 text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Nota IA</span>
                    <div className="font-heading font-black text-lg leading-none">{prizeEval.winner_score}/100</div>
                  </div>
                )}
              </div>

              {/* Se houver empate no 1º lugar, exibe os avatares de todos os empatados em primeiro */}
              {prizeEval.tied_winners && prizeEval.tied_winners.length > 1 && (
                <div className="space-y-2 mb-4">
                  <div className="text-xs font-bold text-amber-950 flex items-center justify-between">
                    <span>👑 Alunos Empatados no 1º Lugar:</span>
                    <span className="text-[10px] text-neutral-600 font-normal">Você pode oficializar todos ou escolher um(a):</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {prizeEval.tied_winners.map((tw) => (
                      <div key={tw.id} className="p-3 bg-amber-50 rounded-xl border-2 border-black flex flex-col justify-between shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center gap-3">
                          <Avatar
                            userId={tw.id}
                            name={tw.name}
                            size={46}
                            hasAvatar={tw.has_avatar}
                            bg="bg-amber-200"
                            effect={effectClass(tw.equipped_effect)}
                          />
                          <div className="min-w-0">
                            <div className="font-heading font-black text-sm text-neutral-900 truncate">{tw.name}</div>
                            <div className="text-[10px] font-bold text-amber-900">👑 1º Lugar Empatado(a)</div>
                            <div className="text-[10px] text-neutral-700 font-medium">
                              {tw.on_time_month || 0} no prazo • {tw.uncompleted_count === 0 ? "zero pendências" : `${tw.uncompleted_count} pend.`}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => chooseTiedWinner(tw)}
                          disabled={confirmingWinner}
                          className="mt-2.5 nb-btn bg-white hover:bg-emerald-200 text-neutral-900 text-xs py-1 px-2 font-bold flex items-center justify-center gap-1 shadow-[1px_1px_0px_0px_#000]"
                          title={`Escolher ${tw.name} para vencer o prêmio individualmente`}
                        >
                          👉 Escolher {tw.name} como Vencedor(a)
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-amber-50/80 p-4 rounded-lg border border-amber-200 mb-3">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" /> Parecer da Análise Pedagógica da IA:
                </div>
                <p className="text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed">
                  {prizeEval.justification}
                </p>
              </div>

              {prizeEval.criteria?.length > 0 && (
                <div className="mb-4">
                  <div className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider mb-1.5">
                    Destaques e Critérios Identificados:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {prizeEval.criteria.map((c, i) => (
                      <span key={i} className="nb-badge bg-amber-200 text-amber-950 text-xs font-semibold">
                        ✓ {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2 border-t border-neutral-200 flex-wrap">
                <button
                  onClick={confirmWinner}
                  disabled={confirmingWinner}
                  className="nb-btn bg-emerald-300 hover:bg-emerald-400 px-4 py-2 text-sm flex items-center gap-2 font-bold"
                  data-testid="confirm-winner-btn"
                >
                  <Trophy className="w-4 h-4 text-emerald-950" />
                  {confirmingWinner ? "Publicando..." : prizeEval.is_tie ? "Oficializar Vencedores Empatados no Mural" : "Oficializar Vencedor e Publicar no Mural"}
                </button>
                <button
                  type="button"
                  onClick={removeWinnerChoice}
                  className="nb-btn bg-red-200 hover:bg-red-300 text-red-950 px-3 py-2 text-xs flex items-center gap-1.5 font-bold"
                  title="Tirar a escolha e voltar ao resultado original de empate"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Tirar a Escolha
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `🏆 VENCEDOR DO MÊS: ${prizeEval.winner_name}\n\n${prizeEval.justification}`
                    );
                    toast.success("Parecer da IA copiado para a área de transferência!");
                  }}
                  className="nb-btn bg-white hover:bg-sky-100 px-3 py-2 text-xs flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" /> Copiar Parecer
                </button>
              </div>
            </div>

            {/* Individual Student Monthly Evaluations */}
            {prizeEval.rankings && prizeEval.rankings.length > 0 && (
              <div className="nb-card bg-white p-4">
                <h4 className="font-heading font-bold text-base mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-neutral-700" />
                  Análise Mensal Individual de Todos os Alunos
                </h4>
                <div className="space-y-2.5">
                  {prizeEval.rankings.map((r) => (
                    <div
                      key={r.id || r.name}
                      className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex items-start gap-3"
                    >
                      <div className="w-7 h-7 rounded-full bg-neutral-200 font-heading font-black text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                        #{r.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                          <span className="font-bold text-sm text-neutral-900">{r.name}</span>
                          {r.score && (
                            <span className="nb-badge bg-sky-100 text-sky-900 text-[10px]">
                              Avaliação: {r.score} pts
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-700 leading-relaxed">
                          {r.ai_feedback || "Aluno com participação registrada neste mês."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {reportStudent && (
        <MonthlyReportDialog
          open={Boolean(reportStudent)}
          onClose={() => { setReportStudent(null); setReportData(null); }}
          student={reportStudent}
          data={reportData}
          loading={reportLoading}
        />
      )}
    </div>
  );
}

function MonthlyReportDialog({ open, onClose, student, data, loading }) {
  if (!open) return null;

  const points = data?.student?.points ?? data?.points ?? student?.points ?? 0;
  const onTime = data?.metrics?.on_time ?? data?.on_time_completions ?? 0;
  const totalCompleted = data?.metrics?.total_completed ?? data?.total_completions ?? 0;
  const totalAssigned = data?.metrics?.total_assigned ?? ((data?.total_completions ?? 0) + (data?.uncompleted_tasks ?? 0));
  const completionPct = data?.metrics?.completion_pct ?? (totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 100);
  const late = data?.metrics?.late ?? Math.max(0, totalCompleted - onTime);
  const reportText = data?.report ?? "";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-4" data-testid="monthly-report-dialog">
      <div className="nb-card bg-white w-full max-w-2xl max-h-[92vh] overflow-auto p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <h3 className="font-heading font-black text-xl sm:text-2xl">Relatório de {student?.name || data?.student_name || "Aluno"}</h3>
            <p className="text-xs text-neutral-500">Gerado por IA — revise antes de compartilhar</p>
          </div>
          <button onClick={onClose} className="nb-btn bg-white px-2 py-2"><X className="w-4 h-4" /></button>
        </div>
        {loading || !data ? (
          <div className="text-center py-10 text-neutral-500">
            <Sparkles className="w-6 h-6 mx-auto mb-2 animate-spin text-violet-500" />
            A IA está analisando o mês...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatBox label="Pontos (loja)" value={points} />
              <StatBox label="No prazo" value={onTime} good />
              <StatBox label="Concluídas / total" value={`${totalCompleted}/${totalAssigned}`} />
              <StatBox label="% conclusão" value={`${completionPct}%`} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="No prazo (mês)" value={onTime} good />
              <StatBox label="Atrasadas (mês)" value={late} bad />
            </div>
            <div className="nb-card bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider mb-2">Bilhete pedagógico</p>
              <p className="text-sm whitespace-pre-wrap" data-testid="monthly-report-text">{reportText}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(reportText);
                toast.success("Copiado! ✓");
              }}
              className="nb-btn w-full bg-emerald-300 hover:bg-emerald-400 py-2.5"
              data-testid="copy-report-button"
            >
              Copiar bilhete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, good, bad }) {
  const cls = good ? "bg-emerald-100" : bad ? "bg-red-100" : "bg-sky-100";
  return (
    <div className={`nb-card ${cls} p-2 text-center`}>
      <div className="text-[9px] font-bold uppercase tracking-wider text-neutral-600">{label}</div>
      <div className="font-heading font-black text-lg mt-0.5">{value}</div>
    </div>
  );
}
