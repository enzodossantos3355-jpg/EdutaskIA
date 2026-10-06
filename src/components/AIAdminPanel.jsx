import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Power, Trophy, X, Award, FileText, Loader2 } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAIStatus } from "@/context/AIStatusContext";
import Avatar from "@/components/Avatar";

/**
 * Admin AI control panel: global on/off toggle, monthly report generator,
 * AI prize winner evaluation.
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

  useEffect(() => {
    api.get("/users").then(({ data }) => setStudents(data.filter((u) => u.role === "aluno"))).catch(() => {});
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

  const [confirmingWinner, setConfirmingWinner] = useState(false);

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
        justification: prizeEval.justification,
        criteria: prizeEval.criteria,
      });
      toast.success(`🎉 ${prizeEval.winner_name} foi oficializado como vencedor(a) do mês!`);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao confirmar vencedor");
    } finally {
      setConfirmingWinner(false);
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
                      Vencedor(a) Sugerido(a) pela IA
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
                  {confirmingWinner ? "Publicando..." : "Oficializar Vencedor e Publicar no Mural"}
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
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3 sm:p-4" data-testid="monthly-report-dialog">
      <div className="nb-card bg-white w-full max-w-2xl max-h-[92vh] overflow-auto p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <h3 className="font-heading font-black text-xl sm:text-2xl">Relatório de {student.name}</h3>
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
              <StatBox label="Pontos (loja)" value={data.student.points} />
              <StatBox label="No prazo" value={data.metrics.on_time} good />
              <StatBox label="Concluídas / total" value={`${data.metrics.total_completed}/${data.metrics.total_assigned}`} />
              <StatBox label="% conclusão" value={`${data.metrics.completion_pct}%`} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="No prazo (mês)" value={data.metrics.on_time} good />
              <StatBox label="Atrasadas (mês)" value={data.metrics.late} bad />
            </div>
            <div className="nb-card bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wider mb-2">Bilhete pedagógico</p>
              <p className="text-sm whitespace-pre-wrap" data-testid="monthly-report-text">{data.report}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(data.report);
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
