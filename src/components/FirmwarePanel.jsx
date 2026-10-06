import { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Cpu,
  Download,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  HardDrive,
  Activity,
  Layers,
  Award,
  BookOpen,
  MessageSquare,
  Lock,
  Zap,
  Send,
  X,
  Loader2,
  Check,
  Share2,
} from "lucide-react";
import api, { formatApiError } from "@/lib/api";

const SYSTEM_FEATURES = [
  {
    id: "netflix-profiles",
    title: "Perfis Estilo Netflix",
    category: "Acessos & UI",
    emoji: "🎬",
    description: "Alternância ágil entre alunos e admin com avatares customizados, fotos e autenticação segura.",
    status: "Ativo",
  },
  {
    id: "task-delivery",
    title: "Entrega e Gestão de Tarefas",
    category: "Acadêmico",
    emoji: "📋",
    description: "Criação de tarefas com anexos, fotos de quadro/livro, prazos rigorosos e status de pontualidade.",
    status: "Ativo",
  },
  {
    id: "ai-answers",
    title: "Gabarito Inteligente com IA",
    category: "Inteligência Artificial",
    emoji: "🤖",
    description: "Geração de gabaritos em tamanhos Curto, Médio e Detalhado orientados pela fonte colocada pelo professor.",
    status: "Ativo",
  },
  {
    id: "ai-tutor",
    title: "Tutor Pedagógico Sutil",
    category: "Inteligência Artificial",
    emoji: "💡",
    description: "Tira-dúvidas socrático que orienta o raciocínio do aluno sem alucinar respostas falsas.",
    status: "Ativo",
  },
  {
    id: "effects-store",
    title: "Loja de Molduras de Avatar",
    category: "Gamificação",
    emoji: "🛍️",
    description: "Pontos obtidos em tarefas servem exclusivamente para desbloquear auras, molduras e cosméticos.",
    status: "Ativo",
  },
  {
    id: "ai-monthly-eval",
    title: "Avaliação Mensal do Vencedor por IA",
    category: "Inteligência Artificial",
    emoji: "👑",
    description: "Eleição do aluno vencedor do mês avaliado por pontualidade e penalizado por tarefas não feitas.",
    status: "Ativo",
  },
  {
    id: "whatsapp-integration",
    title: "Notificações WhatsApp (2 Grupos)",
    category: "Comunicação",
    emoji: "📱",
    description: "Disparo automático e lembretes diários para o grupo de tarefas e grupo de fotos com enunciado.",
    status: "Ativo",
  },
  {
    id: "high-precision-access",
    title: "Auditoria de Acessos de Máxima Precisão",
    category: "Segurança & Logs",
    emoji: "🔒",
    description: "Registro milimétrico de login, IP, papéis de usuário, visualização segura de senhas e sincronização Firestore.",
    status: "Ativo",
  },
];

function renderFirmwareToCanvas(canvas, appInfo) {
  const ctx = canvas.getContext("2d");
  const width = 1200;
  const height = 800;
  canvas.width = width;
  canvas.height = height;

  // Background - Neo-Brutalist clean cream & sky
  ctx.fillStyle = "#FAF8F5";
  ctx.fillRect(0, 0, width, height);

  // Top banner
  ctx.fillStyle = "#38BDF8";
  ctx.fillRect(40, 40, width - 80, 160);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#0A0A0A";
  ctx.strokeRect(40, 40, width - 80, 160);

  // Decorative shadow
  ctx.fillStyle = "#0A0A0A";
  ctx.fillRect(44, 44 + 160, width - 80, 8);

  // Title & Version
  ctx.fillStyle = "#0A0A0A";
  ctx.font = "900 42px Outfit, sans-serif";
  ctx.fillText("⚡ EDUTASK — FIRMWARE DO SISTEMA", 70, 105);

  ctx.font = "700 24px DM Sans, sans-serif";
  ctx.fillText(`Versão Oficial Instalada: v${appInfo.version || "1.2.0"} • ${appInfo.codename || "Core Edition"}`, 70, 145);

  ctx.font = "600 16px DM Sans, sans-serif";
  ctx.fillText(`Data de Compilação: ${new Date().toLocaleDateString("pt-BR")} | Precisão do Sistema de Acessos: 100% Ativa`, 70, 175);

  // System Access & Precision Box
  ctx.fillStyle = "#FEF3C7";
  ctx.fillRect(40, 230, width - 80, 75);
  ctx.strokeRect(40, 230, width - 80, 75);

  ctx.fillStyle = "#78350F";
  ctx.font = "800 18px Outfit, sans-serif";
  ctx.fillText("🛡️ SISTEMA DE ACESSOS E SEGURANÇA: PRECISÃO MÁXIMA GARANTIDA", 60, 260);

  ctx.fillStyle = "#451A03";
  ctx.font = "500 14px DM Sans, sans-serif";
  ctx.fillText("Autenticação RBAC estrita • Auditoria de log em tempo real • Senhas visíveis exclusivamente para o Administrador • Firebase Ativo", 60, 285);

  // Features Header
  ctx.fillStyle = "#0A0A0A";
  ctx.font = "900 22px Outfit, sans-serif";
  ctx.fillText("📋 FUNÇÕES E MÓDULOS ATIVOS NESTA VERSÃO (8 DISPONÍVEIS):", 45, 340);

  // Draw Grid of 8 Features
  const cols = 2;
  const cardWidth = 535;
  const cardHeight = 85;
  const startX = 40;
  const startY = 360;

  SYSTEM_FEATURES.forEach((feat, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = startX + col * (cardWidth + 30);
    const y = startY + row * (cardHeight + 15);

    // Card bg
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x, y, cardWidth, cardHeight);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#0A0A0A";
    ctx.strokeRect(x, y, cardWidth, cardHeight);

    // Emoji box
    ctx.fillStyle = "#F3E8FF";
    ctx.fillRect(x + 10, y + 10, 60, 65);
    ctx.strokeRect(x + 10, y + 10, 60, 65);
    ctx.font = "30px sans-serif";
    ctx.fillText(feat.emoji, x + 24, y + 54);

    // Text
    ctx.fillStyle = "#0A0A0A";
    ctx.font = "800 16px Outfit, sans-serif";
    ctx.fillText(feat.title, x + 85, y + 32);

    // Badge
    ctx.fillStyle = "#D1FAE5";
    ctx.fillRect(x + cardWidth - 85, y + 15, 70, 20);
    ctx.strokeRect(x + cardWidth - 85, y + 15, 70, 20);
    ctx.fillStyle = "#065F46";
    ctx.font = "800 10px DM Sans, sans-serif";
    ctx.fillText("✓ ATIVO", x + cardWidth - 73, y + 29);

    // Description
    ctx.fillStyle = "#4B5563";
    ctx.font = "500 11px DM Sans, sans-serif";
    const descWords = feat.description;
    if (descWords.length > 70) {
      ctx.fillText(descWords.slice(0, 70) + "...", x + 85, y + 55);
    } else {
      ctx.fillText(descWords, x + 85, y + 55);
    }
  });

  // Footer
  ctx.fillStyle = "#0A0A0A";
  ctx.font = "700 13px DM Sans, sans-serif";
  ctx.fillText("Edutask Plataforma de Gestão Escolar • Imagem Oficial de Firmware para Consulta e Registro", 40, height - 20);
}

export default function FirmwarePanel() {
  const [appInfo, setAppInfo] = useState({
    version: "1.2.0",
    codename: "Edutask AI Core Engine",
    release_notes: "Versão com auditoria de acessos de precisão máxima, gabarito por IA baseado em fontes do professor e loja de molduras.",
    updated_at: new Date().toISOString(),
  });
  const [generatingImage, setGeneratingImage] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [whatsappTarget, setWhatsappTarget] = useState("all");
  const [customCaption, setCustomCaption] = useState("");
  const canvasRef = useRef(null);

  useEffect(() => {
    api.get("/app-info")
      .then(({ data }) => {
        if (data) setAppInfo((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});
  }, []);

  const handleDownloadFirmwareImage = () => {
    setGeneratingImage(true);
    try {
      const canvas = canvasRef.current;
      if (!canvas) {
        toast.error("Erro ao inicializar renderizador de imagem.");
        return;
      }
      renderFirmwareToCanvas(canvas, appInfo);

      // Download
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `edutask-firmware-v${appInfo.version || "1.2.0"}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast.success("Imagem do Firmware baixada com sucesso! 🖼️");
    } catch (err) {
      toast.error("Não foi possível gerar a imagem.");
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSendToWhatsApp = async (e) => {
    if (e) e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) {
      toast.error("Erro ao inicializar renderizador de imagem.");
      return;
    }

    setSendingWhatsapp(true);
    try {
      renderFirmwareToCanvas(canvas, appInfo);
      const dataUrl = canvas.toDataURL("image/png");

      const payload = {
        image_base64: dataUrl,
        target_group: whatsappTarget,
        caption: customCaption.trim() || undefined,
      };

      const { data } = await api.post("/whatsapp/send-firmware", payload);
      toast.success(`📲 ${data.message || "Foto do Firmware enviada para o WhatsApp com sucesso!"}`);
      setWhatsappModalOpen(false);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao enviar foto do firmware pelo WhatsApp. Verifique se a sessão está conectada.");
    } finally {
      setSendingWhatsapp(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="firmware-panel">
      {/* Hidden canvas for image generation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-heading font-black text-3xl sm:text-5xl tracking-tight flex items-center gap-3">
            <Cpu className="w-8 h-8 sm:w-10 sm:h-10 text-sky-700" strokeWidth={2.4} />
            Firmware do Sistema
          </h1>
          <p className="text-neutral-600 mt-1 text-sm sm:text-base">
            Visão consolidada da versão instalada, auditoria de segurança e funções ativas do Edutask.
          </p>
        </div>

        {/* Action Buttons: Download Image + Send to WhatsApp */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => setWhatsappModalOpen(true)}
            className="nb-btn bg-emerald-400 hover:bg-emerald-300 px-4 py-3 text-sm sm:text-base font-bold flex items-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-emerald-950"
            data-testid="send-firmware-whatsapp-btn"
            title="Enviar a imagem oficial do firmware para os grupos do WhatsApp"
          >
            <MessageSquare className="w-5 h-5 text-emerald-950" />
            <span>Mandar no Zap a Foto</span>
          </button>

          <button
            onClick={handleDownloadFirmwareImage}
            disabled={generatingImage}
            className="nb-btn bg-sky-300 hover:bg-sky-400 px-4 py-3 text-sm sm:text-base font-bold flex items-center gap-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
            data-testid="download-firmware-image-btn"
            title="Baixar imagem em PNG de alta resolução"
          >
            <Download className="w-5 h-5 text-neutral-900" />
            <span>{generatingImage ? "Gerando..." : "Baixar Imagem"}</span>
          </button>
        </div>
      </div>

      {/* Version & System Card */}
      <div className="nb-card p-6 sm:p-8 bg-gradient-to-br from-sky-200 via-sky-100 to-amber-100 relative overflow-hidden border-3 border-black">
        <div className="absolute -top-6 -right-6 text-[160px] opacity-10 select-none pointer-events-none">
          ⚙️
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="nb-badge bg-sky-900 text-white text-xs font-black">
                Versão Instalada
              </span>
              <span className="nb-badge bg-emerald-300 text-emerald-950 text-xs font-black flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Estável
              </span>
            </div>

            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="font-heading font-black text-4xl sm:text-6xl text-neutral-900" data-testid="firmware-version-label">
                v{appInfo.version || "1.2.0"}
              </span>
              <span className="nb-badge bg-white text-neutral-900 text-sm font-black px-3 py-1">
                {appInfo.codename || "Edutask AI Core"}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-neutral-700 max-w-2xl pt-1">
              {appInfo.release_notes || "Versão oficial com auditoria de acessos de precisão máxima e suporte completo a IA pedagógica."}
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-xs p-4 rounded-xl border-2 border-black space-y-2 min-w-[240px]">
            <div className="text-[11px] font-black uppercase tracking-wider text-neutral-500">
              Integridade do Núcleo
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Criptografia: <strong>Bcrypt + JWT</strong></span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-800">
              <HardDrive className="w-4 h-4 text-sky-600" />
              <span>Banco de Dados: <strong>Firestore Ativo</strong></span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-neutral-800">
              <Activity className="w-4 h-4 text-violet-600" />
              <span>Latência da IA: <strong>Tempo Real</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Maximum Precision Access Banner */}
      <div className="nb-card p-5 bg-amber-100 border-2 border-amber-900/40 flex items-start gap-4">
        <div className="w-12 h-12 nb-card bg-amber-300 flex items-center justify-center flex-shrink-0 text-xl font-black">
          <Lock className="w-6 h-6 text-amber-950" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-heading font-black text-base sm:text-lg text-neutral-900">
              Sistema de Acessos com Precisão Máxima
            </h3>
            <span className="nb-badge bg-emerald-200 text-emerald-950 text-[10px] font-bold">
              Auditoria Ativa
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed">
            As senhas de todos os alunos são gerenciadas e auditáveis com precisão exata no painel administrativo através do botão de visualização com olho. O controle de sessões e histórico de conexões opera com registro detalhado de data, hora e papéis de usuário.
          </p>
        </div>
      </div>

      {/* Available Features Section (View-Only, Clean & Fixed) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-black text-xl sm:text-2xl flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-violet-700" />
              Funções Disponíveis no Firmware
              <span className="nb-badge bg-violet-200 text-violet-950 text-xs font-bold ml-1">
                {SYSTEM_FEATURES.length} Módulos
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600">
              Lista oficial de recursos e capacidades habilitadas nesta versão do sistema.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SYSTEM_FEATURES.map((feat) => (
            <div
              key={feat.id}
              className="nb-card p-4 bg-white flex items-start gap-3.5 border-2 border-black hover:translate-y-[-2px] transition-transform"
              data-testid={`firmware-feature-${feat.id}`}
            >
              <div className="w-12 h-12 nb-card bg-sky-100 flex items-center justify-center text-2xl flex-shrink-0 border-2 border-black">
                {feat.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <h3 className="font-heading font-bold text-base text-neutral-900">
                    {feat.title}
                  </h3>
                  <span className="nb-badge bg-emerald-100 text-emerald-900 border border-emerald-700/30 text-[10px] font-bold">
                    ✓ {feat.status}
                  </span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                  {feat.category}
                </div>
                <p className="text-xs text-neutral-700 leading-normal">
                  {feat.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Mandar no Zap a Foto do Firmware */}
      {whatsappModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5" data-testid="send-firmware-whatsapp-modal">
          <div className="nb-card bg-white w-full max-w-lg p-5 sm:p-7 border-3 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-black/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 nb-card bg-emerald-400 flex items-center justify-center text-xl flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-emerald-950" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-xl text-neutral-900">
                    Mandar Foto do Firmware no Zap
                  </h3>
                  <p className="text-xs text-neutral-600">
                    Dispara a foto oficial gerada do firmware com a legenda estruturada para os grupos.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setWhatsappModalOpen(false)}
                className="nb-btn bg-white hover:bg-neutral-100 px-2 py-1"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendToWhatsApp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Destino no WhatsApp
                </label>
                <select
                  value={whatsappTarget}
                  onChange={(e) => setWhatsappTarget(e.target.value)}
                  className="nb-input cursor-pointer text-sm"
                  data-testid="firmware-whatsapp-target-select"
                >
                  <option value="all">📢 Todos os Grupos Configurados (Grupo 1 e Grupo 2)</option>
                  <option value="group1">📚 Apenas Grupo 1 (Tarefas & Comunicados)</option>
                  <option value="group2">📷 Apenas Grupo 2 (Fotos & Enunciados)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Legenda / Mensagem da Foto (Opcional)
                </label>
                <textarea
                  rows={4}
                  value={customCaption}
                  onChange={(e) => setCustomCaption(e.target.value)}
                  placeholder={`⚙️ EDUTASK — FIRMWARE DO SISTEMA OFICIAL\n\nVersão: v${appInfo.version || "1.2.0"}\nSistema de Acessos: 100% Ativo com Precisão Máxima\nStatus: 8 Funções Habilitadas`}
                  className="nb-input text-xs resize-y"
                  data-testid="firmware-whatsapp-caption-input"
                />
                <span className="text-[10px] text-neutral-500 block mt-1">
                  Se deixar em branco, a legenda padrão oficial do firmware será utilizada.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setWhatsappModalOpen(false)}
                  className="nb-btn bg-white px-4 py-2.5 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sendingWhatsapp}
                  className="nb-btn bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black px-5 py-2.5 text-sm flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  data-testid="confirm-send-firmware-whatsapp"
                >
                  {sendingWhatsapp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enviando no Zap...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Disparar Agora no WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
