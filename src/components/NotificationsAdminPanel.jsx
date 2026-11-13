import { useState, useEffect, useCallback } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  Bell,
  BellRing,
  BellOff,
  ListTodo,
  Pencil,
  Megaphone,
  BookOpen,
  Smartphone,
  Send,
  Check,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Radio,
  Trash2,
} from "lucide-react";

const TRIGGER_ITEMS = [
  {
    key: "task_created",
    title: "Tarefas Criadas",
    description: "Envia alerta no dispositivo quando uma nova tarefa é publicada para os alunos.",
    icon: ListTodo,
    accent: "bg-sky-200 text-sky-950",
  },
  {
    key: "task_edited",
    title: "Tarefas Editadas",
    description: "Avisa os alunos quando prazo, descrição, pontos ou arquivos de uma tarefa são alterados.",
    icon: Pencil,
    accent: "bg-amber-200 text-amber-950",
  },
  {
    key: "announcement_created",
    title: "Avisos Criados",
    description: "Notifica imediatamente quando um aviso normal ou aviso especial em destaque é publicado.",
    icon: Megaphone,
    accent: "bg-violet-200 text-violet-950",
  },
  {
    key: "announcement_edited",
    title: "Avisos Editados",
    description: "Informa os destinatários quando o título, mensagem ou destaque de um aviso é atualizado.",
    icon: Pencil,
    accent: "bg-pink-200 text-pink-950",
  },
  {
    key: "summary_published",
    title: "Novos Resumos Disponibilizados",
    description: "Dispara notificação na matéria correspondente assim que você liberar um resumo para os alunos.",
    icon: BookOpen,
    accent: "bg-emerald-200 text-emerald-950",
  },
];

function detectDeviceLabel(ua = "") {
  const s = ua.toLowerCase();
  if (s.includes("iphone") || s.includes("ipad")) return "iPhone / iPad";
  if (s.includes("android")) return "Android";
  if (s.includes("windows")) return "Windows";
  if (s.includes("macintosh") || s.includes("mac os")) return "Mac";
  if (s.includes("linux")) return "Linux";
  return "Navegador Web";
}

export default function NotificationsAdminPanel() {
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingSelfTest, setSendingSelfTest] = useState(false);
  const [deletingSubId, setDeletingSubId] = useState(null);

  const [settings, setSettings] = useState({
    task_created: true,
    task_edited: true,
    announcement_created: true,
    announcement_edited: true,
    summary_published: true,
  });

  const [stats, setStats] = useState({
    total_subscriptions: 0,
    active_student_devices: 0,
    admin_devices: 0,
    recent_subscribers: [],
  });
  const [envMode, setEnvMode] = useState("preview");

  const [testTitle, setTestTitle] = useState("EduTask IA — Teste do Professor");
  const [testBody, setTestBody] = useState("As notificações da turma estão ativas e funcionando corretamente!");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/push-settings");
      if (data?.settings) {
        setSettings((prev) => ({ ...prev, ...data.settings }));
      }
      if (data?.stats) {
        setStats(data.stats);
      }
      if (data?.env_mode) {
        setEnvMode(data.env_mode);
      }
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Erro ao carregar configurações de notificação");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleToggleTrigger = async (key) => {
    const nextValue = !settings[key];
    setSavingKey(key);
    setSettings((prev) => ({ ...prev, [key]: nextValue }));
    try {
      const { data } = await api.put("/admin/push-settings", { [key]: nextValue });
      if (data?.settings) {
        setSettings(data.settings);
      }
      const item = TRIGGER_ITEMS.find((t) => t.key === key);
      toast.success(
        `${item?.title || "Notificação"} ${nextValue ? "ativada" : "desativada"}!`
      );
    } catch (err) {
      setSettings((prev) => ({ ...prev, [key]: !nextValue }));
      toast.error(formatApiError(err?.response?.data?.detail) || "Não foi possível salvar alteração");
    } finally {
      setSavingKey(null);
    }
  };

  const handleBulkToggle = async (enableAll) => {
    setBulkSaving(true);
    const payload = {
      task_created: enableAll,
      task_edited: enableAll,
      announcement_created: enableAll,
      announcement_edited: enableAll,
      summary_published: enableAll,
    };
    const prev = settings;
    setSettings(payload);
    try {
      const { data } = await api.put("/admin/push-settings", payload);
      if (data?.settings) setSettings(data.settings);
      toast.success(enableAll ? "Todas as notificações foram ligadas!" : "Todas as notificações foram desligadas.");
    } catch (err) {
      setSettings(prev);
      toast.error(formatApiError(err?.response?.data?.detail) || "Erro ao atualizar notificações");
    } finally {
      setBulkSaving(false);
    }
  };

  const handleBroadcastTest = async (e) => {
    e.preventDefault();
    setSendingTest(true);
    try {
      const { data } = await api.post("/admin/push/broadcast-test", {
        title: testTitle,
        body: testBody,
      });
      if ((data?.sent || 0) === 0) {
        toast.info("Nenhum dispositivo inscrito ainda para receber a notificação.");
      } else {
        toast.success(`Notificação de teste enviada para ${data.sent} dispositivo(s)!`);
      }
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Erro ao enviar notificação para a turma");
    } finally {
      setSendingTest(false);
    }
  };

  const handleSelfTest = async () => {
    setSendingSelfTest(true);
    try {
      const { data } = await api.post("/push/test");
      if ((data?.sent || 0) === 0) {
        toast.info("Ative as notificações neste navegador primeiro para testar.");
      } else {
        toast.success("Notificação enviada para seu dispositivo!");
      }
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Falha no teste local");
    } finally {
      setSendingSelfTest(false);
    }
  };

  const handleRemoveSubscriber = async (sub) => {
    if (!sub?.id) return;
    setDeletingSubId(sub.id);
    try {
      await api.delete(`/admin/push-subscriptions/${sub.id}`);
      toast.success(`Dispositivo de ${sub.user_name} removido!`);
      await loadSettings();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Erro ao remover inscrição");
    } finally {
      setDeletingSubId(null);
    }
  };

  const enabledCount = TRIGGER_ITEMS.filter((t) => Boolean(settings[t.key])).length;

  return (
    <div className="space-y-6" data-testid="notifications-admin-panel">
      {/* Header Banner */}
      <div className="nb-card bg-amber-300 p-5 sm:p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-amber-400 border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#000]">
              <BellRing className="w-6 h-6 text-black" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-heading font-black text-black uppercase tracking-tight">
                  Central de Notificações
                </h1>
                <span
                  data-testid="push-env-mode-badge"
                  className={`nb-badge text-[11px] font-heading font-black uppercase px-2.5 py-0.5 border-2 border-black ${
                    envMode === "preview"
                      ? "bg-sky-200 text-sky-950"
                      : "bg-emerald-300 text-emerald-950"
                  }`}
                >
                  {envMode === "preview" ? "Ambiente Preview (Isolado)" : "Ambiente Produção (Turma)"}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-neutral-800">
                {envMode === "preview"
                  ? "Dispositivos e chaves Push deste Preview são 100% isolados e nunca disparam notificações para os alunos da versão publicada."
                  : "Ligue ou desligue quais eventos enviam alertas Web Push para os dispositivos dos alunos."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={loadSettings}
            disabled={loading}
            className="nb-btn bg-white hover:bg-neutral-100 px-3.5 py-2 text-xs font-black flex items-center gap-1.5"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Atualizar</span>
          </button>
          <button
            type="button"
            onClick={() => handleBulkToggle(true)}
            disabled={bulkSaving || enabledCount === TRIGGER_ITEMS.length}
            className="nb-btn bg-emerald-300 hover:bg-emerald-400 px-3.5 py-2 text-xs font-black flex items-center gap-1.5 disabled:opacity-50"
            data-testid="push-enable-all-btn"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Ligar Todas</span>
          </button>
          <button
            type="button"
            onClick={() => handleBulkToggle(false)}
            disabled={bulkSaving || enabledCount === 0}
            className="nb-btn bg-white hover:bg-rose-100 px-3.5 py-2 text-xs font-black flex items-center gap-1.5 disabled:opacity-50"
            data-testid="push-disable-all-btn"
          >
            <BellOff className="w-3.5 h-3.5 text-rose-700" />
            <span>Desligar Todas</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="nb-card bg-sky-100 p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-black uppercase text-sky-950">Dispositivos de Alunos</span>
            <Smartphone className="w-5 h-5 text-sky-800" />
          </div>
          <div className="font-heading font-black text-3xl text-black mt-1 tabular-nums" data-testid="push-active-students-count">
            {stats.active_student_devices}
          </div>
          <p className="text-[11px] font-bold text-neutral-700 mt-0.5">
            Aparelhos com Push ativo recebendo avisos
          </p>
        </div>

        <div className="nb-card bg-emerald-100 p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-black uppercase text-emerald-950">Gatilhos Ligados</span>
            <ShieldCheck className="w-5 h-5 text-emerald-800" />
          </div>
          <div className="font-heading font-black text-3xl text-black mt-1 tabular-nums" data-testid="push-enabled-triggers-count">
            {enabledCount}/{TRIGGER_ITEMS.length}
          </div>
          <p className="text-[11px] font-bold text-neutral-700 mt-0.5">
            Tipos de alertas automáticos habilitados
          </p>
        </div>

        <div className="nb-card bg-violet-100 p-4 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-heading font-black uppercase text-violet-950">Total de Inscrições</span>
            <Radio className="w-5 h-5 text-violet-800" />
          </div>
          <div className="font-heading font-black text-3xl text-black mt-1 tabular-nums">
            {stats.total_subscriptions}
          </div>
          <p className="text-[11px] font-bold text-neutral-700 mt-0.5">
            Inclui {stats.admin_devices || 0} dispositivo(s) de admin
          </p>
        </div>
      </div>

      {/* Individual Trigger Controls */}
      <div className="nb-card bg-white p-5 sm:p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] space-y-4">
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <h2 className="text-base sm:text-lg font-heading font-black text-black uppercase flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-600" />
            <span>Controle de Disparos por Evento</span>
          </h2>
          <span className="nb-badge bg-neutral-100 border border-black text-[11px] font-black">
            Salvo automaticamente
          </span>
        </div>

        {loading ? (
          <div className="py-10 flex items-center justify-center gap-2 text-neutral-600 font-bold">
            <Loader2 className="w-5 h-5 animate-spin text-black" />
            <span>Carregando preferências de notificação...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TRIGGER_ITEMS.map((item) => {
              const Icon = item.icon;
              const isEnabled = Boolean(settings[item.key]);
              const isSaving = savingKey === item.key;

              return (
                <div
                  key={item.key}
                  className={`p-4 rounded-xl border-2 border-black transition-all flex items-start justify-between gap-4 ${
                    isEnabled
                      ? "bg-white shadow-[3px_3px_0_0_#000]"
                      : "bg-neutral-100 opacity-85"
                  }`}
                  data-testid={`push-toggle-card-${item.key}`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center shrink-0 ${item.accent}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-heading font-black text-sm text-black">
                          {item.title}
                        </h3>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border border-black ${
                            isEnabled ? "bg-emerald-300 text-emerald-950" : "bg-neutral-300 text-neutral-800"
                          }`}
                        >
                          {isEnabled ? "Ligada" : "Desligada"}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-neutral-700 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    disabled={isSaving || bulkSaving}
                    onClick={() => handleToggleTrigger(item.key)}
                    className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-2 border-black transition-colors duration-200 ${
                      isEnabled ? "bg-emerald-400" : "bg-neutral-300"
                    }`}
                    data-testid={`push-switch-${item.key}`}
                    title={isEnabled ? "Clique para desligar" : "Clique para ligar"}
                  >
                    <span
                      className={`inline-flex h-6 w-6 transform items-center justify-center rounded-full bg-white border-2 border-black transition-transform duration-200 ${
                        isEnabled ? "translate-x-6" : "translate-x-0.5"
                      }`}
                    >
                      {isSaving ? (
                        <Loader2 className="w-3 h-3 animate-spin text-black" />
                      ) : isEnabled ? (
                        <Check className="w-3 h-3 stroke-[3] text-emerald-700" />
                      ) : (
                        <BellOff className="w-3 h-3 text-neutral-500" />
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Broadcast Test + Recent Connected Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Broadcast / Test */}
        <form
          onSubmit={handleBroadcastTest}
          className="nb-card bg-sky-50 p-5 sm:p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] space-y-4"
        >
          <div className="flex items-center justify-between border-b-2 border-black/20 pb-3">
            <h3 className="text-base font-heading font-black text-black uppercase flex items-center gap-2">
              <Send className="w-4 h-4 text-sky-700" />
              <span>Enviar Notificação Manual / Teste</span>
            </h3>
            <button
              type="button"
              onClick={handleSelfTest}
              disabled={sendingSelfTest}
              className="nb-btn bg-white hover:bg-neutral-100 px-3 py-1.5 text-[11px] font-black flex items-center gap-1"
            >
              {sendingSelfTest ? <Loader2 className="w-3 h-3 animate-spin" /> : <BellRing className="w-3 h-3" />}
              <span>Testar no Meu Aparelho</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-heading font-black uppercase text-black mb-1">
              Título da Notificação
            </label>
            <input
              type="text"
              required
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              className="nb-input bg-white"
              placeholder="Ex: Lembrete importante da prova!"
              data-testid="push-test-title-input"
            />
          </div>

          <div>
            <label className="block text-xs font-heading font-black uppercase text-black mb-1">
              Mensagem
            </label>
            <textarea
              rows={3}
              required
              value={testBody}
              onChange={(e) => setTestBody(e.target.value)}
              className="nb-input bg-white resize-y"
              placeholder="Digite a mensagem que aparecerá na barra de notificações..."
              data-testid="push-test-body-input"
            />
          </div>

          <button
            type="submit"
            disabled={sendingTest}
            className="nb-btn w-full py-3 bg-sky-400 hover:bg-sky-500 text-black font-heading font-black text-xs uppercase flex items-center justify-center gap-2 shadow-[3px_3px_0_0_#000]"
            data-testid="push-broadcast-test-btn"
          >
            {sendingTest ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Disparando para dispositivos...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Enviar Alerta para Todos Conectados ({stats.total_subscriptions})</span>
              </>
            )}
          </button>
        </form>

        {/* Connected Devices List */}
        <div className="nb-card bg-white p-5 sm:p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] space-y-4">
          <div className="flex items-center justify-between border-b-2 border-black/20 pb-3">
            <h3 className="text-base font-heading font-black text-black uppercase flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-700" />
              <span>Dispositivos Conectados Recentemente</span>
            </h3>
            <span className="nb-badge bg-emerald-200 border border-black text-[11px] font-black tabular-nums">
              {stats.recent_subscribers?.length || 0} recente(s)
            </span>
          </div>

          {!stats.recent_subscribers || stats.recent_subscribers.length === 0 ? (
            <div className="py-8 text-center bg-neutral-50 rounded-xl border-2 border-dashed border-black/40">
              <BellOff className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              <p className="text-sm font-heading font-black text-black">
                Nenhum dispositivo conectado ainda
              </p>
              <p className="text-xs font-medium text-neutral-600 mt-1 max-w-xs mx-auto">
                Os alunos podem ativar os alertas na aba "Meu Perfil" ou pelo banner de notificações.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {stats.recent_subscribers.map((sub) => {
                const subEnvLabel =
                  sub.env === "preview"
                    ? "Preview"
                    : sub.env === "production"
                    ? "Produção"
                    : "Legado";
                const subEnvClass =
                  sub.env === "preview"
                    ? "bg-sky-200 text-sky-950"
                    : sub.env === "production"
                    ? "bg-emerald-200 text-emerald-950"
                    : "bg-neutral-200 text-neutral-800";
                return (
                  <div
                    key={sub.id}
                    className="p-3 rounded-xl border-2 border-black bg-neutral-50 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-heading font-black text-sm text-black truncate">
                          {sub.user_name}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border border-black ${
                            sub.role === "admin" ? "bg-amber-300 text-black" : "bg-sky-200 text-sky-950"
                          }`}
                        >
                          {sub.role === "admin" ? "Admin" : "Aluno"}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded border border-black ${subEnvClass}`}
                          title={sub.origin_host || "Sem registro de origem"}
                        >
                          {subEnvLabel}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-neutral-600 mt-0.5 truncate">
                        {detectDeviceLabel(sub.user_agent)}
                        {sub.origin_host ? ` • ${sub.origin_host.replace(/^https?:\/\//, "")}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-[11px] font-mono font-bold text-neutral-700 tabular-nums">
                        {sub.updated_at ? new Date(sub.updated_at).toLocaleDateString("pt-BR") : "—"}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSubscriber(sub)}
                        disabled={deletingSubId === sub.id}
                        className="p-1.5 rounded-lg border-2 border-black bg-white hover:bg-rose-100 text-rose-700 disabled:opacity-50"
                        title="Remover dispositivo"
                        data-testid={`delete-push-sub-${sub.id}`}
                      >
                        {deletingSubId === sub.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
