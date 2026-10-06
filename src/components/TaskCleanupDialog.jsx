import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Clock, X, Trash2, AlertTriangle, Check, RefreshCw, Calendar, ShieldCheck, Play } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { formatDateBR } from "@/lib/priority";
import AdminSystemClock from "@/components/AdminSystemClock";

/**
 * Dialog for Admin to configure automatic task deletion by hour of day
 * and preview which tasks (if any) are scheduled to be deleted today.
 */
export default function TaskCleanupDialog({ open, onClose, onSaved }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [confirmManual, setConfirmManual] = useState(false);

  // Form states
  const [enabled, setEnabled] = useState(true);
  const [cleanupTime, setCleanupTime] = useState("23:59");
  const [daysAfterDue, setDaysAfterDue] = useState(0);
  const [deleteOnlyIfCompleted, setDeleteOnlyIfCompleted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await api.get("/admin/task-cleanup");
      setData(res);
      if (res.config) {
        setEnabled(Boolean(res.config.enabled));
        setCleanupTime(res.config.cleanup_time || "23:59");
        setDaysAfterDue(res.config.days_after_due || 0);
        setDeleteOnlyIfCompleted(Boolean(res.config.delete_only_if_completed));
      }
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao carregar configurações de limpeza");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  if (!open) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/admin/task-cleanup", {
        enabled,
        cleanup_time: cleanupTime,
        days_after_due: Number(daysAfterDue),
        delete_only_if_completed: deleteOnlyIfCompleted,
      });
      toast.success("Configuração de auto-exclusão salva com sucesso!");
      await load();
      if (onSaved) onSaved();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const { data: res } = await api.post("/admin/task-cleanup/run");
      toast.success(`Limpeza concluída! ${res.deleted_count} tarefa(s) apagadas.`);
      setConfirmManual(false);
      await load();
      if (onSaved) onSaved();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao executar limpeza");
    } finally {
      setRunning(false);
    }
  };

  const tasksToday = data?.tasks_to_delete_today || [];
  const willDeleteToday = data?.will_delete_today;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" data-testid="task-cleanup-dialog">
      <div className="nb-card bg-white w-full max-w-2xl max-h-[92vh] overflow-y-auto p-5 sm:p-7 nb-fade-in my-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5 border-b border-black/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 nb-card bg-amber-300 flex items-center justify-center text-xl flex-shrink-0">
              <Clock className="w-6 h-6 text-neutral-900" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-black text-xl sm:text-2xl text-neutral-900">
                  Auto-Exclusão de Tarefas
                </h2>
                <span className="nb-badge bg-red-200 text-red-950 text-[10px] font-bold">
                  Admin Exclusivo
                </span>
              </div>
              <p className="text-xs text-neutral-600 mt-0.5">
                Configure o horário diário e verifique se há tarefas programadas para serem apagadas hoje.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="nb-btn bg-white px-2 py-1.5" aria-label="Fechar">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-neutral-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-500" />
            Carregando agendamentos...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status do Dia (Preview de tarefas hoje) */}
            <div className={`nb-card p-4 border-2 border-black ${willDeleteToday ? "bg-amber-100" : "bg-emerald-50"}`}>
              <div className="flex items-start gap-3">
                {willDeleteToday ? (
                  <AlertTriangle className="w-5 h-5 text-amber-800 flex-shrink-0 mt-0.5" />
                ) : (
                  <Check className="w-5 h-5 text-emerald-800 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Status da Limpeza de Hoje ({data?.server_date})
                  </div>
                  <h3 className="font-heading font-black text-lg text-neutral-900 mt-0.5">
                    {data?.status_summary}
                  </h3>

                  {tasksToday.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-bold text-amber-950">
                        📋 {tasksToday.length} tarefa(s) cumprem a regra e serão excluídas no horário {cleanupTime}:
                      </p>
                      <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                        {tasksToday.map((t) => (
                          <div key={t.id} className="nb-card bg-white p-2.5 flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0 flex-1">
                              <span className="nb-badge bg-sky-100 text-sky-900 text-[10px] mr-1.5 font-bold">
                                {t.subject}
                              </span>
                              <span className="font-bold text-neutral-900">{t.title}</span>
                              <div className="text-[10px] text-neutral-500 mt-0.5">
                                Vencimento: {formatDateBR(t.due_date)} • Conclusões: {t.completions_count}
                              </div>
                            </div>
                            <span className="nb-badge bg-red-100 text-red-900 text-[10px]">
                              Será apagada
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Formulário de Configuração */}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="nb-card bg-neutral-50 p-4 border border-neutral-300 space-y-4">
                <h4 className="font-heading font-bold text-base text-neutral-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-600" />
                  Regras de Agendamento
                </h4>

                {/* Ativar/Desativar */}
                <div className="flex items-center justify-between gap-4 p-3 bg-white rounded-lg border border-neutral-200">
                  <div>
                    <label className="font-bold text-sm text-neutral-900 block cursor-pointer" htmlFor="enable-cleanup">
                      Ativar Limpeza Automática Diária
                    </label>
                    <p className="text-xs text-neutral-600">
                      O servidor verifica diariamente e apaga as tarefas vencidas no horário definido.
                    </p>
                  </div>
                  <input
                    id="enable-cleanup"
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="w-5 h-5 accent-sky-500 cursor-pointer"
                    data-testid="toggle-cleanup-enabled"
                  />
                </div>

                {/* Horário */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                      Horário no Dia (HH:MM)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={cleanupTime}
                        onChange={(e) => setCleanupTime(e.target.value)}
                        className="nb-input font-mono font-bold text-base"
                        required
                        data-testid="cleanup-time-input"
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-neutral-600 font-bold uppercase tracking-wider">
                        Relógio do Servidor:
                      </span>
                      <AdminSystemClock compact />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                      Critério de Vencimento
                    </label>
                    <select
                      value={daysAfterDue}
                      onChange={(e) => setDaysAfterDue(Number(e.target.value))}
                      className="nb-input cursor-pointer"
                      data-testid="days-after-due-select"
                    >
                      <option value={0}>No mesmo dia em que vence (0 dias)</option>
                      <option value={1}>1 dia após a data de vencimento</option>
                      <option value={2}>2 dias após a data de vencimento</option>
                      <option value={3}>3 dias após a data de vencimento</option>
                      <option value={7}>7 dias após a data de vencimento</option>
                      <option value={14}>14 dias após a data de vencimento</option>
                      <option value={30}>30 dias após a data de vencimento</option>
                    </select>
                    <span className="text-[10px] text-neutral-500 block mt-1">
                      Controla quanto tempo após o prazo a tarefa é removida.
                    </span>
                  </div>
                </div>

                {/* Checkbox condicional */}
                <div className="flex items-center gap-2.5 pt-1">
                  <input
                    id="only-completed"
                    type="checkbox"
                    checked={deleteOnlyIfCompleted}
                    onChange={(e) => setDeleteOnlyIfCompleted(e.target.checked)}
                    className="w-4 h-4 accent-sky-500 cursor-pointer"
                    data-testid="delete-only-completed-checkbox"
                  />
                  <label htmlFor="only-completed" className="text-xs text-neutral-800 font-medium cursor-pointer">
                    Apagar somente se <strong>todos os alunos ativos</strong> já tiverem entregue a tarefa
                  </label>
                </div>
              </div>

              {/* Botões do Formulário */}
              <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="nb-btn bg-sky-400 hover:bg-sky-500 px-5 py-2.5 text-sm font-bold flex items-center gap-2"
                    data-testid="save-cleanup-config-btn"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={3} />}
                    {saving ? "Salvando..." : "Salvar Configuração"}
                  </button>
                  <button type="button" onClick={onClose} className="nb-btn bg-white hover:bg-neutral-100 px-4 py-2.5 text-sm">
                    Cancelar
                  </button>
                </div>

                {/* Botão de Execução Manual */}
                <button
                  type="button"
                  onClick={() => setConfirmManual(true)}
                  disabled={running || tasksToday.length === 0}
                  className={`nb-btn px-4 py-2.5 text-sm flex items-center gap-2 ${
                    tasksToday.length > 0 ? "bg-red-300 hover:bg-red-400 font-bold" : "bg-neutral-200 opacity-60 cursor-not-allowed"
                  }`}
                  data-testid="run-cleanup-now-btn"
                >
                  <Trash2 className="w-4 h-4" />
                  {running ? "Executando..." : `Apagar Agora (${tasksToday.length})`}
                </button>
              </div>
            </form>

            {/* Histórico da última execução */}
            {data?.config?.last_run_at && (
              <div className="p-3 bg-neutral-100 rounded-lg border border-neutral-300 text-xs text-neutral-700">
                <span className="font-bold">Última execução:</span>{" "}
                {new Date(data.config.last_run_at).toLocaleString("pt-BR")} •{" "}
                <strong>{data.config.last_deleted_count}</strong> tarefa(s) apagadas.
              </div>
            )}
          </div>
        )}

        {/* Confirmação de execução manual */}
        {confirmManual && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="nb-card bg-white p-5 max-w-sm w-full space-y-4">
              <h3 className="font-heading font-black text-xl text-neutral-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Confirmar Exclusão Imediata?
              </h3>
              <p className="text-xs text-neutral-700">
                Isso irá apagar permanentemente as <strong>{tasksToday.length} tarefa(s)</strong> que atendem ao critério agora mesmo.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmManual(false)}
                  className="nb-btn bg-white px-3 py-1.5 text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRunNow}
                  disabled={running}
                  className="nb-btn bg-red-400 hover:bg-red-500 px-4 py-1.5 text-xs font-bold text-neutral-900"
                  data-testid="confirm-run-cleanup"
                >
                  {running ? "Apagando..." : "Sim, Apagar Agora"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
