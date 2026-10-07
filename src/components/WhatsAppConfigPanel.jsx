import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  MessageSquare,
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Power,
  Users,
  Send,
  Save,
  Search,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  Zap,
  Sparkles,
  Image as ImageIcon,
  FileText,
  Clock,
  Bell,
  Upload,
  X,
  Layers,
  HelpCircle,
} from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import confetti from "canvas-confetti";

const API = import.meta.env.VITE_API_BASE_URL || "/api";

export default function WhatsAppConfigPanel() {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // 2 Grupos do WhatsApp
  const [group1Jid, setGroup1Jid] = useState("");
  const [group1Name, setGroup1Name] = useState("");
  const [group2Jid, setGroup2Jid] = useState("");
  const [group2Name, setGroup2Name] = useState("");
  const [enabled, setEnabled] = useState(true);

  // Fotos Universais Pré-Definidas (Grupo 2)
  const [taskPhotoId, setTaskPhotoId] = useState(null);
  const [taskPhotoUrl, setTaskPhotoUrl] = useState(null);
  const [uploadingTaskPhoto, setUploadingTaskPhoto] = useState(false);

  const [announcementPhotoId, setAnnouncementPhotoId] = useState(null);
  const [announcementPhotoUrl, setAnnouncementPhotoUrl] = useState(null);
  const [uploadingAnnouncementPhoto, setUploadingAnnouncementPhoto] = useState(false);

  const [tomorrowPhotoId, setTomorrowPhotoId] = useState(null);
  const [tomorrowPhotoUrl, setTomorrowPhotoUrl] = useState(null);
  const [uploadingTomorrowPhoto, setUploadingTomorrowPhoto] = useState(false);

  // Modelos Pré-Prontos para o Grupo 2
  const [taskCaption, setTaskCaption] = useState(
    "📚 *{materia} — {titulo}*\n📅 *Entrega:* {data_entrega}\n\n📝 *Enunciado:*\n{descricao}"
  );
  const [announcementCaption, setAnnouncementCaption] = useState("📣 *{titulo}*\n\n{mensagem}");
  const [tomorrowCaption, setTomorrowCaption] = useState(
    "🚨 *LEMBRETE: TAREFAS PARA AMANHÃ ({data_amanha})*\n\nOlá turma! Não se esqueçam das tarefas marcadas para amanhã:\n\n{lista_tarefas}\n\n👉 Acessem o Edutask para conferir e responder no prazo!"
  );

  // Lembrete Diário Automático de Tarefas para Amanhã
  const [dailyReminderEnabled, setDailyReminderEnabled] = useState(true);
  const [dailyReminderTime, setDailyReminderTime] = useState("19:00");
  const [testingTomorrow, setTestingTomorrow] = useState(false);

  // Sistema de Auto-Ativação Programada & Janela Ativa (Mínimo 20 minutos)
  const [autoActivationEnabled, setAutoActivationEnabled] = useState(true);
  const [autoActivationTime, setAutoActivationTime] = useState("18:00");
  const [autoActivationDuration, setAutoActivationDuration] = useState(20);
  const [stayConnected247, setStayConnected247] = useState(false);
  const [dispatchReminderOnActivation, setDispatchReminderOnActivation] = useState(true);
  const [activatingTimer, setActivatingTimer] = useState(false);
  const [extendingTimer, setExtendingTimer] = useState(false);
  const [pausingStandby, setPausingStandby] = useState(false);

  const [groups, setGroups] = useState([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [testingGroup1, setTestingGroup1] = useState(false);
  const [testingGroup2, setTestingGroup2] = useState(false);

  const taskPhotoInputRef = useRef(null);
  const announcementPhotoInputRef = useRef(null);
  const tomorrowPhotoInputRef = useRef(null);
  const prevStatusRef = useRef(null);

  const buildFileUrl = (fileId) => {
    if (!fileId) return null;
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : "";
    return `${API}/files/${fileId}/download?auth=${encodeURIComponent(token || "")}`;
  };

  const loadStatus = useCallback(async (isPolling = false) => {
    if (!isPolling) setLoading(true);
    try {
      const { data } = await api.get("/whatsapp/status");
      setStatusData(data);

      if (!isPolling) {
        setGroup1Jid(data.group1Jid || data.group_1_jid || data.groupJid || "");
        setGroup1Name(data.group1Name || data.group_1_name || "");
        setGroup2Jid(data.group2Jid || data.group_2_jid || "");
        setGroup2Name(data.group2Name || data.group_2_name || "");
        setEnabled(data.enabled !== undefined ? data.enabled : true);

        const cfg = data.config || {};
        if (cfg.templates) {
          if (cfg.templates.task_caption) setTaskCaption(cfg.templates.task_caption);
          if (cfg.templates.announcement_caption) setAnnouncementCaption(cfg.templates.announcement_caption);
          if (cfg.templates.tomorrow_caption) setTomorrowCaption(cfg.templates.tomorrow_caption);

          if (cfg.templates.task_photo_id) {
            setTaskPhotoId(cfg.templates.task_photo_id);
            setTaskPhotoUrl(buildFileUrl(cfg.templates.task_photo_id));
          }
          if (cfg.templates.announcement_photo_id) {
            setAnnouncementPhotoId(cfg.templates.announcement_photo_id);
            setAnnouncementPhotoUrl(buildFileUrl(cfg.templates.announcement_photo_id));
          }
          if (cfg.templates.tomorrow_photo_id) {
            setTomorrowPhotoId(cfg.templates.tomorrow_photo_id);
            setTomorrowPhotoUrl(buildFileUrl(cfg.templates.tomorrow_photo_id));
          }
        }

        if (cfg.daily_reminder) {
          if (cfg.daily_reminder.enabled !== undefined) setDailyReminderEnabled(cfg.daily_reminder.enabled);
          if (cfg.daily_reminder.time) setDailyReminderTime(cfg.daily_reminder.time);
        }

        if (cfg.auto_activation_schedule) {
          if (cfg.auto_activation_schedule.enabled !== undefined) setAutoActivationEnabled(cfg.auto_activation_schedule.enabled);
          if (cfg.auto_activation_schedule.time) setAutoActivationTime(cfg.auto_activation_schedule.time);
          if (cfg.auto_activation_schedule.duration_minutes) setAutoActivationDuration(Math.max(20, cfg.auto_activation_schedule.duration_minutes));
          if (cfg.auto_activation_schedule.stay_connected_24_7 !== undefined) setStayConnected247(cfg.auto_activation_schedule.stay_connected_24_7);
          if (cfg.auto_activation_schedule.dispatch_reminder_on_activation !== undefined) setDispatchReminderOnActivation(cfg.auto_activation_schedule.dispatch_reminder_on_activation);
        }
      }

      if (
        (prevStatusRef.current === "qr_ready" || prevStatusRef.current === "connecting") &&
        data.status === "connected"
      ) {
        toast.success("🎉 WhatsApp conectado com sucesso!");
        try {
          confetti({ particleCount: 70, spread: 50, origin: { y: 0.6 } });
        } catch {
          // ignore
        }
      }
      prevStatusRef.current = data.status;
    } catch (e) {
      if (!isPolling) {
        toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao consultar status");
      }
    } finally {
      if (!isPolling) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  useEffect(() => {
    if (statusData?.status === "qr_ready" || statusData?.status === "connecting") {
      const interval = setInterval(() => {
        loadStatus(true);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [statusData?.status, loadStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data } = await api.post("/whatsapp/connect");
      setStatusData(data);
      if (data.status === "qr_ready") {
        toast.info("QR Code gerado! Aponte a câmera do seu WhatsApp.");
      } else if (data.status === "connected") {
        toast.success("WhatsApp já está conectado e operando 24/7!");
      } else {
        toast.info("Iniciando Baileys WhatsApp com auto-reconexão...");
      }
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao iniciar conexão");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const { data } = await api.post("/whatsapp/disconnect");
      setStatusData(data);
      setGroups([]);
      toast.success("WhatsApp desconectado com sucesso.");
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao desconectar");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleActivateTimer = async (durationMin = 20) => {
    const validMinutes = Math.max(20, durationMin || 20);
    setActivatingTimer(true);
    try {
      const { data } = await api.post("/whatsapp/activate-timer", {
        duration_minutes: validMinutes,
        reason: "manual_trigger_ui",
      });
      setStatusData(data.status);
      toast.success(data.message || `WhatsApp ativado! Permanecerá ativo por pelo menos ${validMinutes} minutos.`);
      loadStatus(true);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao ativar temporizador");
    } finally {
      setActivatingTimer(false);
    }
  };

  const handleExtendTimer = async (addMin = 20) => {
    const validAdd = Math.max(5, addMin || 20);
    setExtendingTimer(true);
    try {
      const { data } = await api.post("/whatsapp/extend-timer", {
        add_minutes: validAdd,
      });
      setStatusData(data.status);
      toast.success(`Tempo de atividade estendido em +${validAdd} minutos com sucesso!`);
      loadStatus(true);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao estender temporizador");
    } finally {
      setExtendingTimer(false);
    }
  };

  const handlePauseStandby = async () => {
    setPausingStandby(true);
    try {
      const { data } = await api.post("/whatsapp/pause");
      setStatusData(data.status);
      toast.success("WhatsApp colocado em modo repouso/standby. Credenciais preservadas para a próxima ativação programada!");
      loadStatus(true);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao pausar");
    } finally {
      setPausingStandby(false);
    }
  };

  const uploadPhotoHelper = async (file, setPhotoId, setPhotoUrl, setUploading, label) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida (PNG, JPG, JPEG).");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/files/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPhotoId(data.id);
      setPhotoUrl(buildFileUrl(data.id));
      toast.success(`${label} carregada com sucesso! Clique em 'Salvar Configurações'.`);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const saveAllConfig = async (overrides = {}) => {
    setSavingConfig(true);
    try {
      const payload = {
        group_1_jid: (overrides.group1Jid !== undefined ? overrides.group1Jid : group1Jid).trim(),
        group_1_name: (overrides.group1Name !== undefined ? overrides.group1Name : group1Name).trim(),
        group_2_jid: (overrides.group2Jid !== undefined ? overrides.group2Jid : group2Jid).trim(),
        group_2_name: (overrides.group2Name !== undefined ? overrides.group2Name : group2Name).trim(),
        enabled: overrides.enabled !== undefined ? overrides.enabled : enabled,
        templates: {
          task_caption: taskCaption,
          task_photo_id: taskPhotoId,
          announcement_caption: announcementCaption,
          announcement_photo_id: announcementPhotoId,
          tomorrow_caption: tomorrowCaption,
          tomorrow_photo_id: tomorrowPhotoId,
        },
        daily_reminder: {
          enabled: dailyReminderEnabled,
          time: dailyReminderTime,
        },
        auto_activation_schedule: {
          enabled: autoActivationEnabled,
          time: autoActivationTime,
          duration_minutes: Math.max(20, parseInt(autoActivationDuration) || 20),
          stay_connected_24_7: stayConnected247,
          dispatch_reminder_on_activation: dispatchReminderOnActivation,
        },
      };

      const { data } = await api.put("/whatsapp/config", payload);
      setStatusData(data.status);
      toast.success("Todas as configurações, fotos universais e agendamento de auto-ativação foram salvos com sucesso!");
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao salvar configuração");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleFetchGroups = async () => {
    if (statusData?.status !== "connected") {
      toast.error("Conecte o WhatsApp primeiro para buscar os grupos.");
      return;
    }
    setLoadingGroups(true);
    try {
      const { data } = await api.get("/whatsapp/groups");
      setGroups(data || []);
      if (!data || data.length === 0) {
        toast.info("Nenhum grupo encontrado na sua conta do WhatsApp.");
      } else {
        toast.success(`${data.length} grupo(s) encontrado(s)! Selecione para o Grupo 1 ou Grupo 2.`);
      }
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao buscar grupos");
    } finally {
      setLoadingGroups(false);
    }
  };

  const assignGroup = async (targetSlot, group) => {
    if (targetSlot === 1) {
      setGroup1Jid(group.id);
      setGroup1Name(group.subject);
      await saveAllConfig({ group1Jid: group.id, group1Name: group.subject });
      toast.success(`Grupo 1 (Aviso Completo) definido como "${group.subject}"!`);
    } else {
      setGroup2Jid(group.id);
      setGroup2Name(group.subject);
      await saveAllConfig({ group2Jid: group.id, group2Name: group.subject });
      toast.success(`Grupo 2 (Foto com Enunciado) definido como "${group.subject}"!`);
    }
  };

  const handleTestGroup1 = async () => {
    if (!group1Jid.trim()) {
      toast.error("Informe o JID do Grupo 1 antes de testar.");
      return;
    }
    setTestingGroup1(true);
    try {
      const { data } = await api.post("/whatsapp/test-message", {
        jid: group1Jid.trim(),
        text: "📚 *Edutask — Teste Grupo 1 (Aviso Completo)*\n\nEste grupo receberá a notificação estruturada completa de cada tarefa com matéria, prazos e orientações.",
      });
      toast.success(`📲 ${data.message || "Mensagem enviada ao Grupo 1 com sucesso!"}`);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao enviar mensagem de teste");
    } finally {
      setTestingGroup1(false);
    }
  };

  const handleTestGroup2 = async () => {
    if (!group2Jid.trim()) {
      toast.error("Informe o JID do Grupo 2 antes de testar.");
      return;
    }
    setTestingGroup2(true);
    try {
      const { data } = await api.post("/whatsapp/test-message", {
        jid: group2Jid.trim(),
        text: "📷 *Edutask — Teste Grupo 2 (Foto com Enunciado)*\n\nEste grupo receberá a foto universal anexada com o enunciado como legenda para respostas rápidas da turma!",
      });
      toast.success(`📲 ${data.message || "Mensagem enviada ao Grupo 2 com sucesso!"}`);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao enviar mensagem de teste");
    } finally {
      setTestingGroup2(false);
    }
  };

  const handleTestTomorrowReminder = async () => {
    setTestingTomorrow(true);
    try {
      const { data } = await api.post("/whatsapp/test-tomorrow-reminder");
      toast.success(`📲 ${data.message || "Lembrete de tarefas para amanhã disparado com sucesso!"}`);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao disparar lembrete de teste");
    } finally {
      setTestingTomorrow(false);
    }
  };

  const filteredGroups = groups.filter((g) => {
    if (!groupSearch.trim()) return true;
    const q = groupSearch.toLowerCase();
    return g.subject?.toLowerCase().includes(q) || g.id?.toLowerCase().includes(q);
  });

  const isConnected = statusData?.status === "connected";
  const isQrReady = statusData?.status === "qr_ready";
  const isConnecting = statusData?.status === "connecting";

  return (
    <div className="space-y-6 max-w-5xl mx-auto nb-fade-in" data-testid="whatsapp-config-panel">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 border-b-2 border-black pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-400 text-emerald-950 border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              <MessageSquare className="w-6 h-6" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="font-heading font-black text-2xl sm:text-4xl tracking-tight text-neutral-900">
                WhatsApp & Automações
              </h1>
              <p className="text-sm text-neutral-600 mt-0.5">
                Fotos universais pré-definidas para o Grupo 2, conexão persistente 24/7 e lembretes automáticos.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => loadStatus()}
            className="nb-btn bg-white hover:bg-neutral-100 px-3 py-2 text-xs flex items-center gap-1.5"
            title="Atualizar Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <button
            onClick={() => saveAllConfig()}
            disabled={savingConfig}
            className="nb-btn bg-emerald-400 hover:bg-emerald-500 text-emerald-950 px-5 py-2 text-sm font-heading font-black flex items-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            data-testid="save-whatsapp-all-config-btn"
          >
            <Save className={`w-4 h-4 ${savingConfig ? "animate-spin" : ""}`} />
            {savingConfig ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>
      </div>

      {/* Grid: Conexão e Grupos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1: Status & QR Code */}
        <div className="lg:col-span-1 space-y-4">
          <div className="nb-card bg-white p-5 space-y-4">
            <h3 className="font-heading font-black text-lg flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              Status da Conexão
            </h3>

            {/* Status Badge */}
            <div
              className={`p-3.5 rounded-xl border-2 border-black flex items-center gap-3 ${
                isConnected
                  ? "bg-emerald-100 text-emerald-950"
                  : isQrReady || isConnecting
                  ? "bg-amber-100 text-amber-950 animate-pulse"
                  : "bg-red-100 text-red-950"
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full border border-black ${
                  isConnected ? "bg-emerald-500 animate-pulse" : isQrReady ? "bg-amber-500" : "bg-red-500"
                }`}
              />
              <div className="text-xs">
                <div className="font-black uppercase tracking-wide">
                  {isConnected
                    ? "Conectado & Ativo 24/7"
                    : isQrReady
                    ? "Aguardando leitura do QR Code"
                    : isConnecting
                    ? "Conectando / Mantendo sessão..."
                    : "Desconectado"}
                </div>
                {isConnected && statusData?.user && (
                  <div className="text-[11px] font-medium text-emerald-800 mt-0.5">
                    {statusData.user.name} (+{statusData.user.phone})
                  </div>
                )}
              </div>
            </div>

            {/* Explicação de Keepalive & Janela Ativa */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 text-[11px] text-emerald-900 space-y-2">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Auto-Reconexão & Sessão em Disco</span>
              </div>
              <p className="text-emerald-800 leading-relaxed">
                As credenciais ficam salvas em disco. Quando o horário programado chegar, o sistema conecta sozinho automaticamente sem precisar escanear QR Code de novo!
              </p>

              {/* Status do Temporizador / Janela Ativa */}
              {statusData?.isWindowActive ? (
                <div className="bg-emerald-200/80 p-2.5 rounded-lg border border-emerald-500 text-emerald-950 font-bold space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping inline-block" />
                      🟢 Janela Ativa:
                    </span>
                    <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-600 text-[11px]">
                      ~{statusData.remainingMinutes || 20} min restantes
                    </span>
                  </div>
                  <div className="text-[10px] text-emerald-900 font-normal">
                    Garantido pelo menos 20 min ativo desde a inicialização.
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleExtendTimer(20)}
                      disabled={extendingTimer}
                      className="nb-btn bg-white hover:bg-emerald-100 text-emerald-950 px-2 py-1 text-[10px] font-bold flex-1"
                    >
                      {extendingTimer ? "..." : "+20 min"}
                    </button>
                    <button
                      type="button"
                      onClick={handlePauseStandby}
                      disabled={pausingStandby}
                      className="nb-btn bg-amber-100 hover:bg-amber-200 text-amber-950 px-2 py-1 text-[10px] font-bold flex-1"
                    >
                      {pausingStandby ? "..." : "Repouso"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-100 p-2.5 rounded-lg border border-neutral-300 text-neutral-800 text-[11px] space-y-1">
                  <div className="font-bold flex items-center justify-between">
                    <span>Modo Temporizador:</span>
                    <span className="text-[10px] text-neutral-600">Mínimo 20 min</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleActivateTimer(autoActivationDuration || 20)}
                    disabled={activatingTimer}
                    className="w-full nb-btn bg-emerald-300 hover:bg-emerald-400 text-emerald-950 py-1.5 text-xs font-bold flex items-center justify-center gap-1 mt-1"
                  >
                    <Zap className="w-3 h-3" />
                    {activatingTimer ? "Ativando..." : `Ativar Agora por ${Math.max(20, autoActivationDuration || 20)} min`}
                  </button>
                </div>
              )}
            </div>

            {/* Botões de Ação de Conexão */}
            <div className="space-y-2">
              {!isConnected ? (
                <button
                  onClick={handleConnect}
                  disabled={connecting || isConnecting}
                  className="w-full nb-btn bg-emerald-400 hover:bg-emerald-500 text-emerald-950 py-3 font-heading font-black text-sm flex items-center justify-center gap-2"
                  data-testid="connect-whatsapp-button"
                >
                  <QrCode className="w-4 h-4" />
                  {connecting ? "Gerando QR Code..." : "Conectar WhatsApp (Gerar QR Code)"}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handlePauseStandby}
                    disabled={pausingStandby}
                    className="flex-1 nb-btn bg-amber-200 hover:bg-amber-300 text-amber-950 py-2 font-bold text-xs flex items-center justify-center gap-1"
                    title="Pausa a conexão sem deslogar (mantém credenciais em disco)"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {pausingStandby ? "..." : "Pausar (Standby)"}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="flex-1 nb-btn bg-red-200 hover:bg-red-300 text-red-950 py-2 font-bold text-xs flex items-center justify-center gap-1"
                    data-testid="disconnect-whatsapp-button"
                    title="Desconecta e apaga as credenciais salvas"
                  >
                    <Power className="w-3.5 h-3.5" />
                    {disconnecting ? "..." : "Deslogar"}
                  </button>
                </div>
              )}
            </div>

            {/* Exibição do QR Code */}
            {isQrReady && statusData?.qrImage && (
              <div className="nb-card bg-amber-50 p-4 text-center space-y-3 border-2 border-dashed border-amber-600">
                <div className="text-xs font-bold text-amber-950">
                  📱 Abra o WhatsApp &gt; Aparelhos Conectados &gt; Conectar Aparelho
                </div>
                <div className="bg-white p-2 rounded-xl border-2 border-black inline-block shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <img
                    src={statusData.qrImage}
                    alt="QR Code WhatsApp"
                    className="w-48 h-48 sm:w-56 sm:h-56 mx-auto object-contain"
                    data-testid="whatsapp-qrcode-img"
                  />
                </div>
                <p className="text-[11px] text-neutral-600">
                  O QR Code é atualizado em tempo real. A conexão será estabelecida automaticamente ao ler.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Coluna 2 e 3: Configuração dos 2 Grupos */}
        <div className="lg:col-span-2 space-y-5">
          <div className="nb-card bg-white p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-heading font-black text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-600" />
                Configuração dos 2 Grupos de Disparo
              </h3>
              {isConnected && (
                <button
                  onClick={handleFetchGroups}
                  disabled={loadingGroups}
                  className="nb-btn bg-sky-200 hover:bg-sky-300 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                  data-testid="fetch-groups-btn"
                >
                  <Search className={`w-3.5 h-3.5 ${loadingGroups ? "animate-spin" : ""}`} />
                  {loadingGroups ? "Buscando..." : "Buscar Meus Grupos"}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Grupo 1: Aviso Completo */}
              <div className="nb-card bg-emerald-50/60 p-4 space-y-2.5 border-2 border-black">
                <div className="flex items-center justify-between">
                  <span className="nb-badge bg-emerald-300 text-emerald-950 font-black text-xs">
                    Grupo 1 (Aviso Completo)
                  </span>
                  <span className="text-[10px] text-neutral-500 font-bold uppercase">Disparo Completo</span>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-neutral-800">
                    Nome / Identificador
                  </label>
                  <input
                    type="text"
                    value={group1Name}
                    onChange={(e) => setGroup1Name(e.target.value)}
                    placeholder="Ex: 8º Ano A — Comunicados"
                    className="nb-input bg-white text-xs"
                    data-testid="input-group1-name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-neutral-800">
                    ID do Grupo (JID)
                  </label>
                  <input
                    type="text"
                    value={group1Jid}
                    onChange={(e) => setGroup1Jid(e.target.value)}
                    placeholder="1203630...@g.us"
                    className="nb-input bg-white text-xs font-mono"
                    data-testid="input-group1-jid"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleTestGroup1}
                    disabled={testingGroup1 || !isConnected || !group1Jid.trim()}
                    className="nb-btn bg-emerald-200 hover:bg-emerald-300 text-emerald-950 px-3 py-1 text-xs font-bold flex items-center gap-1"
                  >
                    <Send className={`w-3 h-3 ${testingGroup1 ? "animate-spin" : ""}`} />
                    Testar Grupo 1
                  </button>
                  <span className="text-[11px] text-emerald-800 font-medium">Card estruturado</span>
                </div>
              </div>

              {/* Grupo 2: Foto com Enunciado */}
              <div className="nb-card bg-sky-50/60 p-4 space-y-2.5 border-2 border-black">
                <div className="flex items-center justify-between">
                  <span className="nb-badge bg-sky-300 text-sky-950 font-black text-xs">
                    Grupo 2 (Foto com Enunciado)
                  </span>
                  <span className="text-[10px] text-neutral-500 font-bold uppercase">Legenda + Foto</span>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-neutral-800">
                    Nome / Identificador
                  </label>
                  <input
                    type="text"
                    value={group2Name}
                    onChange={(e) => setGroup2Name(e.target.value)}
                    placeholder="Ex: 8º Ano A — Respostas Rápidas"
                    className="nb-input bg-white text-xs"
                    data-testid="input-group2-name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-neutral-800">
                    ID do Grupo (JID)
                  </label>
                  <input
                    type="text"
                    value={group2Jid}
                    onChange={(e) => setGroup2Jid(e.target.value)}
                    placeholder="1203630...@g.us"
                    className="nb-input bg-white text-xs font-mono"
                    data-testid="input-group2-jid"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleTestGroup2}
                    disabled={testingGroup2 || !isConnected || !group2Jid.trim()}
                    className="nb-btn bg-sky-200 hover:bg-sky-300 text-sky-950 px-3 py-1 text-xs font-bold flex items-center gap-1"
                  >
                    <Send className={`w-3 h-3 ${testingGroup2 ? "animate-spin" : ""}`} />
                    Testar Grupo 2
                  </button>
                  <span className="text-[11px] text-sky-800 font-medium">Foto + Enunciado</span>
                </div>
              </div>
            </div>

            {/* Lista de Grupos Encontrados */}
            {groups.length > 0 && (
              <div className="nb-card bg-neutral-50 p-4 space-y-3 border-2 border-black">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-black uppercase text-neutral-800">
                    Grupos do seu WhatsApp ({filteredGroups.length})
                  </span>
                  <div className="relative w-48 sm:w-64">
                    <input
                      type="text"
                      value={groupSearch}
                      onChange={(e) => setGroupSearch(e.target.value)}
                      placeholder="Filtrar grupos..."
                      className="nb-input bg-white text-xs py-1 pl-7"
                    />
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2 top-2" />
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {filteredGroups.map((g) => (
                    <div
                      key={g.id}
                      className="nb-card bg-white p-2.5 flex items-center justify-between gap-3 text-xs border border-neutral-300"
                    >
                      <div className="min-w-0">
                        <div className="font-bold truncate">{g.subject}</div>
                        <div className="text-[10px] text-neutral-500 font-mono truncate">{g.id}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => assignGroup(1, g)}
                          className="nb-btn bg-emerald-200 hover:bg-emerald-300 text-emerald-950 px-2 py-1 text-[10px] font-bold"
                        >
                          Definir Grupo 1
                        </button>
                        <button
                          type="button"
                          onClick={() => assignGroup(2, g)}
                          className="nb-btn bg-sky-200 hover:bg-sky-300 text-sky-950 px-2 py-1 text-[10px] font-bold"
                        >
                          Definir Grupo 2
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEÇÃO PRINCIPAL: FOTOS UNIVERSAIS PRÉ-DEFINIDAS PARA O GRUPO 2 */}
      <div className="nb-card bg-white p-6 space-y-5 border-2 border-black">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b-2 border-black pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-violet-300 text-violet-950 border-2 border-black flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-xl text-neutral-900">
                🖼️ Fotos Universais Pré-Definidas (Grupo 2)
              </h3>
              <p className="text-xs text-neutral-600">
                Defina aqui na seção do WhatsApp as imagens padrão enviadas automaticamente com os enunciados para o Grupo 2.
              </p>
            </div>
          </div>
          <span className="nb-badge bg-violet-200 text-violet-950 font-bold text-xs">
            Configuração Centralizada
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Foto Universal para Tarefas */}
          <div className="nb-card bg-sky-50/60 p-4 space-y-3 border-2 border-black flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-heading font-black text-sm text-sky-950 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-sky-700" />
                  1. Foto Universal de Tarefas
                </span>
                <span className="nb-badge bg-sky-200 text-sky-900 text-[10px] font-bold">Tarefas</span>
              </div>
              <p className="text-xs text-neutral-600">
                Enviada automaticamente ao criar uma nova tarefa quando não houver outra foto específica anexada.
              </p>

              {taskPhotoUrl ? (
                <div className="relative rounded-xl border-2 border-black overflow-hidden bg-black/5 aspect-video flex items-center justify-center">
                  <img src={taskPhotoUrl} alt="Foto Universal Tarefas" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setTaskPhotoId(null);
                      setTaskPhotoUrl(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 border border-black hover:bg-red-600 shadow"
                    title="Remover foto universal de tarefas"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-sky-400 bg-sky-100/50 p-4 text-center text-xs text-neutral-500 aspect-video flex flex-col items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-sky-400 mb-1" />
                  <span>Nenhuma foto universal definida</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => taskPhotoInputRef.current?.click()}
                disabled={uploadingTaskPhoto}
                className="w-full nb-btn bg-white hover:bg-sky-100 text-xs font-bold py-2 flex items-center justify-center gap-1.5 border-2 border-black"
              >
                <Upload className="w-3.5 h-3.5 text-sky-700" />
                {uploadingTaskPhoto ? "Carregando..." : taskPhotoId ? "Trocar Foto de Tarefas" : "Definir Foto de Tarefas"}
              </button>
              <input
                ref={taskPhotoInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  uploadPhotoHelper(e.target.files?.[0], setTaskPhotoId, setTaskPhotoUrl, setUploadingTaskPhoto, "Foto universal de tarefas");
                  e.target.value = "";
                }}
                className="hidden"
              />
            </div>
          </div>

          {/* 2. Foto Universal para Avisos */}
          <div className="nb-card bg-violet-50/60 p-4 space-y-3 border-2 border-black flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-heading font-black text-sm text-violet-950 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-violet-700" />
                  2. Foto Universal de Avisos
                </span>
                <span className="nb-badge bg-violet-200 text-violet-900 text-[10px] font-bold">Avisos</span>
              </div>
              <p className="text-xs text-neutral-600">
                Enviada automaticamente com os comunicados e avisos publicados para o Grupo 2.
              </p>

              {announcementPhotoUrl ? (
                <div className="relative rounded-xl border-2 border-black overflow-hidden bg-black/5 aspect-video flex items-center justify-center">
                  <img src={announcementPhotoUrl} alt="Foto Universal Avisos" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setAnnouncementPhotoId(null);
                      setAnnouncementPhotoUrl(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 border border-black hover:bg-red-600 shadow"
                    title="Remover foto universal de avisos"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-violet-400 bg-violet-100/50 p-4 text-center text-xs text-neutral-500 aspect-video flex flex-col items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-violet-400 mb-1" />
                  <span>Nenhuma foto universal definida</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => announcementPhotoInputRef.current?.click()}
                disabled={uploadingAnnouncementPhoto}
                className="w-full nb-btn bg-white hover:bg-violet-100 text-xs font-bold py-2 flex items-center justify-center gap-1.5 border-2 border-black"
              >
                <Upload className="w-3.5 h-3.5 text-violet-700" />
                {uploadingAnnouncementPhoto ? "Carregando..." : announcementPhotoId ? "Trocar Foto de Avisos" : "Definir Foto de Avisos"}
              </button>
              <input
                ref={announcementPhotoInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  uploadPhotoHelper(e.target.files?.[0], setAnnouncementPhotoId, setAnnouncementPhotoUrl, setUploadingAnnouncementPhoto, "Foto universal de avisos");
                  e.target.value = "";
                }}
                className="hidden"
              />
            </div>
          </div>

          {/* 3. Foto Universal para Lembrete de Amanhã */}
          <div className="nb-card bg-amber-50/60 p-4 space-y-3 border-2 border-black flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-heading font-black text-sm text-amber-950 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-amber-700" />
                  3. Foto do Lembrete de Amanhã
                </span>
                <span className="nb-badge bg-amber-200 text-amber-900 text-[10px] font-bold">Lembrete</span>
              </div>
              <p className="text-xs text-neutral-600">
                Enviada no lembrete diário automático para alertar que há tarefas para o dia seguinte.
              </p>

              {tomorrowPhotoUrl ? (
                <div className="relative rounded-xl border-2 border-black overflow-hidden bg-black/5 aspect-video flex items-center justify-center">
                  <img src={tomorrowPhotoUrl} alt="Foto Universal Amanhã" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setTomorrowPhotoId(null);
                      setTomorrowPhotoUrl(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 border border-black hover:bg-red-600 shadow"
                    title="Remover foto do lembrete de amanhã"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border-2 border-dashed border-amber-400 bg-amber-100/50 p-4 text-center text-xs text-neutral-500 aspect-video flex flex-col items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-amber-500 mb-1" />
                  <span>Nenhuma foto universal definida</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => tomorrowPhotoInputRef.current?.click()}
                disabled={uploadingTomorrowPhoto}
                className="w-full nb-btn bg-white hover:bg-amber-100 text-xs font-bold py-2 flex items-center justify-center gap-1.5 border-2 border-black"
              >
                <Upload className="w-3.5 h-3.5 text-amber-700" />
                {uploadingTomorrowPhoto ? "Carregando..." : tomorrowPhotoId ? "Trocar Foto do Lembrete" : "Definir Foto do Lembrete"}
              </button>
              <input
                ref={tomorrowPhotoInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  uploadPhotoHelper(e.target.files?.[0], setTomorrowPhotoId, setTomorrowPhotoUrl, setUploadingTomorrowPhoto, "Foto do lembrete de amanhã");
                  e.target.value = "";
                }}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO: SISTEMA DE AUTO-ATIVAÇÃO PROGRAMADA COM JANELA MÍNIMA DE 20 MINUTOS */}
      <div className="nb-card bg-gradient-to-br from-emerald-50 via-teal-50 to-sky-100 p-6 space-y-5 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between flex-wrap gap-3 border-b-2 border-black/20 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-400 text-emerald-950 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-xl leading-tight text-neutral-900 flex items-center gap-2">
                ⏰ Auto-Ativação Automática do WhatsApp (Janela Mínima de 20 Minutos)
              </h3>
              <p className="text-xs text-neutral-600">
                Ativa o WhatsApp automaticamente em um horário diário programado e mantém a sessão ativa por pelo menos 20 minutos.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer font-bold text-xs bg-white px-3 py-1.5 rounded-xl border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <input
              type="checkbox"
              checked={autoActivationEnabled}
              onChange={(e) => setAutoActivationEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-black text-emerald-600 focus:ring-0 cursor-pointer"
            />
            <span>Ativar Agendamento de Inicialização</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Horário Programado */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-neutral-800 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-700" /> Horário de Ativação Automática
            </label>
            <input
              type="time"
              value={autoActivationTime}
              onChange={(e) => setAutoActivationTime(e.target.value)}
              className="nb-input bg-white text-sm font-bold"
            />
            <p className="text-[10px] text-neutral-600">
              O robô ligará o Baileys automaticamente todos os dias neste horário.
            </p>
          </div>

          {/* Duração Mínima Ativa */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-neutral-800 flex items-center justify-between">
              <span>Duração Ativa da Janela (Minutos)</span>
              <span className="nb-badge bg-emerald-200 text-emerald-950 text-[9px] font-black">Mín. 20 min</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="20"
                step="5"
                value={autoActivationDuration}
                onChange={(e) => setAutoActivationDuration(Math.max(20, parseInt(e.target.value) || 20))}
                className="nb-input bg-white text-sm font-bold w-24"
              />
              <div className="flex gap-1 flex-wrap">
                {[20, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setAutoActivationDuration(mins)}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold border border-black ${
                      autoActivationDuration === mins ? "bg-emerald-400 text-emerald-950" : "bg-white hover:bg-neutral-100"
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[10px] text-neutral-600">
              Permanece ativo por pelo menos {Math.max(20, autoActivationDuration || 20)} minutos após ser ligado.
            </p>
          </div>

          {/* Opções de Operação */}
          <div className="space-y-2 bg-white/70 p-3 rounded-xl border border-black/20">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-800">
              <input
                type="checkbox"
                checked={dispatchReminderOnActivation}
                onChange={(e) => setDispatchReminderOnActivation(e.target.checked)}
                className="w-4 h-4 rounded border-2 border-black text-emerald-600 focus:ring-0 cursor-pointer"
              />
              <span>Disparar tarefas de amanhã ao ativar</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-800">
              <input
                type="checkbox"
                checked={stayConnected247}
                onChange={(e) => setStayConnected247(e.target.checked)}
                className="w-4 h-4 rounded border-2 border-black text-emerald-600 focus:ring-0 cursor-pointer"
              />
              <span>Permanecer Conectado 24/7 (Sem repouso)</span>
            </label>
          </div>
        </div>

        {/* Live Controls & Test Action */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-emerald-300">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleActivateTimer(autoActivationDuration || 20)}
              disabled={activatingTimer}
              className="nb-btn bg-emerald-400 hover:bg-emerald-500 text-emerald-950 px-4 py-2 text-xs font-heading font-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <Zap className={`w-3.5 h-3.5 ${activatingTimer ? "animate-spin" : ""}`} />
              {activatingTimer ? "Ativando..." : `Ativar Agora por ${Math.max(20, autoActivationDuration || 20)} Minutos 🚀`}
            </button>

            {statusData?.isWindowActive && (
              <button
                type="button"
                onClick={() => handleExtendTimer(20)}
                disabled={extendingTimer}
                className="nb-btn bg-white hover:bg-neutral-100 text-neutral-900 px-3 py-2 text-xs font-bold flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                {extendingTimer ? "Estendendo..." : "+20 Minutos"}
              </button>
            )}
          </div>

          <div className="text-[11px] font-medium text-emerald-950 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>
              {autoActivationEnabled
                ? `Próxima auto-ativação programada para as ${autoActivationTime} (duração de ${Math.max(20, autoActivationDuration || 20)} min)`
                : "Agendamento automático pausado"}
            </span>
          </div>
        </div>
      </div>

      {/* SEÇÃO: LEMBRETE DIÁRIO AUTOMÁTICO DE TAREFAS PARA AMANHÃ */}
      <div className="nb-card bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 p-6 space-y-4 border-2 border-black">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 border-2 border-black flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-xl leading-tight text-neutral-900">
                ⏰ Lembrete Diário: Tarefas para o Dia Seguinte (Amanhã)
              </h3>
              <p className="text-xs text-neutral-600">
                Dispara automaticamente todos os dias no horário configurado avisando a turma das tarefas de amanhã.
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer font-bold text-xs bg-white/90 px-3 py-1.5 rounded-xl border border-black">
            <input
              type="checkbox"
              checked={dailyReminderEnabled}
              onChange={(e) => setDailyReminderEnabled(e.target.checked)}
              className="w-4 h-4 rounded border-2 border-black text-amber-600 focus:ring-0 cursor-pointer"
            />
            <span>Ativar Lembrete Diário Automático</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-xs font-bold mb-1 text-neutral-800 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Horário do Disparo Diário
            </label>
            <input
              type="time"
              value={dailyReminderTime}
              onChange={(e) => setDailyReminderTime(e.target.value)}
              className="nb-input bg-white text-sm font-bold"
              data-testid="input-daily-reminder-time"
            />
            <p className="text-[10px] text-neutral-600 mt-1">
              Verifica diariamente se há tarefas para o dia seguinte e envia aos 2 grupos.
            </p>
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-bold text-neutral-800">
              Enunciado / Legenda Pré-Pronta do Lembrete de Amanhã (Grupo 2)
            </label>
            <textarea
              rows={3}
              value={tomorrowCaption}
              onChange={(e) => setTomorrowCaption(e.target.value)}
              className="nb-input bg-white text-xs font-sans resize-y"
              placeholder="Digite o modelo de texto..."
            />
            <p className="text-[10px] text-neutral-600">
              Tags dinâmicas: <code className="font-mono bg-white px-1 py-0.5 rounded border border-black/20">{"{data_amanha}"}</code>, <code className="font-mono bg-white px-1 py-0.5 rounded border border-black/20">{"{total_tarefas}"}</code>, <code className="font-mono bg-white px-1 py-0.5 rounded border border-black/20">{"{lista_tarefas}"}</code>
            </p>
          </div>
        </div>

        {/* Botão de Teste Imediato */}
        <div className="flex items-center justify-between pt-3 border-t border-amber-300">
          <button
            type="button"
            onClick={handleTestTomorrowReminder}
            disabled={testingTomorrow || !isConnected}
            className="nb-btn bg-amber-300 hover:bg-amber-400 text-amber-950 px-4 py-2 text-xs font-heading font-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            data-testid="test-tomorrow-reminder-btn"
          >
            <Sparkles className={`w-3.5 h-3.5 ${testingTomorrow ? "animate-spin" : ""}`} />
            {testingTomorrow ? "Disparando Lembrete..." : "Testar Disparo de Lembrete de Amanhã Agora 🚀"}
          </button>
          <span className="text-[11px] text-amber-900 font-medium">
            Envia para o Grupo 1 (Aviso Completo) e Grupo 2 (Foto Universal + Enunciado)
          </span>
        </div>
      </div>

      {/* SEÇÃO: MODELOS PRÉ-PRONTOS DE ENUNCIADOS (GRUPO 2) */}
      <div className="nb-card bg-white p-6 space-y-4 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b-2 border-black/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-violet-400 text-violet-950 border-2 border-black flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-lg text-neutral-900">
                📝 Modelos Pré-Prontos de Enunciados (Grupo 2)
              </h3>
              <p className="text-xs text-neutral-600">
                Estes modelos são usados como legenda e estrutura padrão enviada no Grupo 2 ao disparar tarefas e avisos.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => saveAllConfig()}
            disabled={savingConfig}
            className="nb-btn bg-violet-400 hover:bg-violet-500 text-violet-950 px-4 py-2 text-xs font-heading font-black flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            data-testid="save-statement-templates-btn"
          >
            <Save className={`w-3.5 h-3.5 ${savingConfig ? "animate-spin" : ""}`} />
            {savingConfig ? "Salvando..." : "Salvar Modelos de Enunciado"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Tarefas */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-800 flex items-center justify-between">
              <span>📝 Modelo de Enunciado para Tarefas</span>
              <button
                type="button"
                onClick={() =>
                  setTaskCaption(
                    "📚 *{materia} — {titulo}*\n📅 *Entrega:* {data_entrega}\n\n📝 *Enunciado:*\n{descricao}"
                  )
                }
                className="text-[10px] text-neutral-500 hover:text-black underline"
              >
                Padrão
              </button>
            </label>
            <textarea
              rows={5}
              value={taskCaption}
              onChange={(e) => setTaskCaption(e.target.value)}
              className="nb-input bg-neutral-50 text-xs font-sans resize-y"
              placeholder="Digite o modelo com tags..."
              data-testid="input-task-caption-template"
            />
            <p className="text-[10px] text-neutral-500">
              Tags disponíveis: <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">{"{materia}"}</code>, <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">{"{titulo}"}</code>, <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">{"{data_entrega}"}</code>, <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">{"{pontos}"}</code>, <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">{"{descricao}"}</code>
            </p>

            {/* Prévia Tarefas */}
            <div className="bg-neutral-900 text-neutral-100 p-3 rounded-xl text-xs space-y-1 font-mono">
              <div className="text-[9px] uppercase font-bold text-emerald-400">Prévia no WhatsApp (Grupo 2):</div>
              <div className="whitespace-pre-wrap font-sans text-xs pt-1">
                {(taskCaption || "")
                  .replace(/\{materia\}/gi, "Matemática")
                  .replace(/\{titulo\}/gi, "Exercícios de Frações")
                  .replace(/\{data_entrega\}/gi, "15/10/2026")
                  .replace(/\{pontos\}/gi, "10")
                  .replace(/\{descricao\}/gi, "Resolver páginas 42 a 45 do livro didático.")}
              </div>
            </div>
          </div>

          {/* Avisos */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-800 flex items-center justify-between">
              <span>📣 Modelo de Enunciado para Avisos</span>
              <button
                type="button"
                onClick={() => setAnnouncementCaption("📣 *{titulo}*\n\n{mensagem}")}
                className="text-[10px] text-neutral-500 hover:text-black underline"
              >
                Padrão
              </button>
            </label>
            <textarea
              rows={5}
              value={announcementCaption}
              onChange={(e) => setAnnouncementCaption(e.target.value)}
              className="nb-input bg-neutral-50 text-xs font-sans resize-y"
              placeholder="Digite o modelo de avisos..."
              data-testid="input-announcement-caption-template"
            />
            <p className="text-[10px] text-neutral-500">
              Tags disponíveis: <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">{"{titulo}"}</code>, <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">{"{mensagem}"}</code>, <code className="font-mono bg-neutral-100 px-1 py-0.5 rounded">{"{data}"}</code>
            </p>

            {/* Prévia Avisos */}
            <div className="bg-neutral-900 text-neutral-100 p-3 rounded-xl text-xs space-y-1 font-mono">
              <div className="text-[9px] uppercase font-bold text-emerald-400">Prévia no WhatsApp (Grupo 2):</div>
              <div className="whitespace-pre-wrap font-sans text-xs pt-1">
                {(announcementCaption || "")
                  .replace(/\{titulo\}/gi, "Reunião de Pais e Mestres")
                  .replace(/\{mensagem\}/gi, "Lembramos a todos da nossa reunião nesta sexta-feira às 19h.")
                  .replace(/\{data\}/gi, "10/10/2026")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
