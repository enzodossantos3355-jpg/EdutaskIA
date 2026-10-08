import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  MessageSquare,
  X,
  Upload,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Users,
  Send,
  Sparkles,
  Info,
  CheckCircle2,
  RefreshCw,
  FileText,
} from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { formatDateBR } from "@/lib/priority";

const API = import.meta.env.VITE_API_BASE_URL || "/api";

// Helper para formatar a data ISO em DD/MM/AAAA
const formatIsoDate = (isoStr) => {
  try {
    const [y, m, d] = (isoStr || "").split("-");
    if (y && m && d) return `${d}/${m}/${y}`;
    return isoStr || "";
  } catch {
    return isoStr || "";
  }
};

// Gera o enunciado padrão oficial a partir do modelo programado na aba WhatsApp
const formatProgrammedCaption = (template, item, type) => {
  if (!item) return "";
  const formattedDate = formatIsoDate(type === "task" ? item.due_date : (item.date || item.created_at));

  if (type === "task") {
    const tmpl = (
      template ||
      "📚 *{materia} — {titulo}*\n📅 *Entrega:* {data_entrega}\n\n📝 *Enunciado:*\n{descricao}"
    ).trim();

    return tmpl
      .replace(/\{materia\}/gi, item.subject || "")
      .replace(/\{subject\}/gi, item.subject || "")
      .replace(/\{titulo\}/gi, item.title || "")
      .replace(/\{title\}/gi, item.title || "")
      .replace(/\{data_entrega\}/gi, formattedDate)
      .replace(/\{due_date\}/gi, formattedDate)
      .replace(/\{pontos\}/gi, String(item.points || 0))
      .replace(/\{points\}/gi, String(item.points || 0))
      .replace(/\{destinatarios\}/gi, item.recipients_label || "Todos os alunos")
      .replace(/\{recipients\}/gi, item.recipients_label || "Todos os alunos")
      .replace(/\{descricao\}/gi, item.description || "")
      .replace(/\{enunciado\}/gi, item.description || "")
      .replace(/\{description\}/gi, item.description || "");
  } else {
    const tmpl = (
      template ||
      "📣 *{titulo}*\n\n{mensagem}"
    ).trim();

    return tmpl
      .replace(/\{titulo\}/gi, item.title || "")
      .replace(/\{title\}/gi, item.title || "")
      .replace(/\{data\}/gi, formattedDate || new Date().toLocaleDateString("pt-BR"))
      .replace(/\{created_at\}/gi, formattedDate || new Date().toLocaleDateString("pt-BR"))
      .replace(/\{destinatarios\}/gi, item.recipients_label || "Todos os alunos")
      .replace(/\{recipients\}/gi, item.recipients_label || "Todos os alunos")
      .replace(/\{mensagem\}/gi, item.message || "")
      .replace(/\{comunicado\}/gi, item.message || "")
      .replace(/\{message\}/gi, item.message || "");
  }
};

export default function WhatsAppDispatchDialog({
  open,
  onClose,
  type = "task", // 'task' | 'announcement'
  item,
  onSuccess,
}) {
  const [status, setStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [sending, setSending] = useState(false);

  // Seleções do disparo
  const [sendG1, setSendG1] = useState(true);
  const [sendG2, setSendG2] = useState(true);

  // Foto do Grupo 2
  const [availablePhotos, setAvailablePhotos] = useState([]);
  const [selectedPhotoId, setSelectedPhotoId] = useState(null);
  const [uploadedPhotoData, setUploadedPhotoData] = useState(null);
  const [uploadedPhotoName, setUploadedPhotoName] = useState(null);

  // Modelo programado na aba WhatsApp e Enunciado do Grupo 2
  const [programmedTemplate, setProgrammedTemplate] = useState("");
  const [group2Caption, setGroup2Caption] = useState("");

  // Modelo pré-pronto de parte extra para o Grupo 1 (o texto completo base é protegido e fixo)
  const [group1Extra, setGroup1Extra] = useState("");
  const [group1DefaultExtra, setGroup1DefaultExtra] = useState("");
  const [showG1Preview, setShowG1Preview] = useState(false);

  const fileInputRef = useRef(null);

  // Carregar status do WhatsApp, fotos disponíveis e enunciado programado
  useEffect(() => {
    if (!open || !item) return;

    // Resetar campos
    setSendG1(true);
    setSendG2(true);
    setUploadedPhotoData(null);
    setUploadedPhotoName(null);

    const fallbackTmpl =
      type === "task"
        ? "📚 *{materia} — {titulo}*\n📅 *Entrega:* {data_entrega}\n\n📝 *Enunciado:*\n{descricao}"
        : "📣 *{titulo}*\n\n{mensagem}";
    setProgrammedTemplate(fallbackTmpl);
    setGroup2Caption(formatProgrammedCaption(fallbackTmpl, item, type));

    // Identificar anexos públicos da tarefa (fotos fonte da IA admin_photos NÃO são enviadas para alunos)
    const photos = [];
    const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : "";

    if (item.attachments && item.attachments.length > 0) {
      item.attachments.forEach((a) => {
        const isImg =
          a.content_type?.startsWith("image/") ||
          /\.(jpe?g|png|webp|gif)$/i.test(a.original_filename || a.filename || "");
        if (isImg && !photos.some((p) => p.id === a.id)) {
          photos.push({
            id: a.id,
            name: a.original_filename || a.filename || "Anexo Imagem",
            url: `${API}/files/${a.id}/download?auth=${encodeURIComponent(token || "")}`,
          });
        }
      });
    }

    setAvailablePhotos(photos);
    setSelectedPhotoId(photos.length > 0 ? photos[0].id : null);

    // Buscar status do Baileys e fotos universais
    setLoadingStatus(true);
    api
      .get("/whatsapp/status")
      .then(({ data }) => {
        setStatus(data);
        const cfg = data?.config || {};
        const universalPhotoId =
          type === "task"
            ? cfg.templates?.task_photo_id
            : cfg.templates?.announcement_photo_id;

        const tmpl =
          type === "task"
            ? (cfg.templates?.task_caption || fallbackTmpl)
            : (cfg.templates?.announcement_caption || fallbackTmpl);

        setProgrammedTemplate(tmpl);
        // O enunciado do Grupo 2 é inicializado exatamente como programado na aba WhatsApp!
        setGroup2Caption(formatProgrammedCaption(tmpl, item, type));

        // Modelo pré-pronto de parte extra para o Grupo 1 (o texto base completo nunca é alterado)
        const defaultExtra =
          type === "task"
            ? (cfg.templates?.group1_task_extra || "")
            : (cfg.templates?.group1_announcement_extra || "");
        setGroup1DefaultExtra(defaultExtra);
        setGroup1Extra(defaultExtra);

        if (universalPhotoId && !photos.some((p) => p.id === universalPhotoId)) {
          const universalPhoto = {
            id: universalPhotoId,
            name: "Foto Universal (WhatsApp)",
            url: `${API}/files/${universalPhotoId}/download?auth=${encodeURIComponent(token || "")}`,
            isUniversal: true,
          };
          const updatedPhotos = [universalPhoto, ...photos];
          setAvailablePhotos(updatedPhotos);
          setSelectedPhotoId(universalPhotoId);
        } else if (photos.length > 0) {
          setSelectedPhotoId(photos[0].id);
        }
      })
      .catch((err) => {
        console.error("Erro ao verificar status do WhatsApp:", err);
      })
      .finally(() => {
        setLoadingStatus(false);
      });
  }, [open, item, type]);

  if (!open || !item) return null;

  const isConnected = status?.status === "connected";
  const group1Name = status?.group1Name || (status?.group1Jid ? "Grupo 1" : "Não configurado");
  const group2Name = status?.group2Name || (status?.group2Jid ? "Grupo 2" : "Não configurado");

  const handleCustomPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido (PNG, JPG, JPEG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedPhotoData(reader.result);
      setUploadedPhotoName(file.name);
      setSelectedPhotoId("custom_upload");
      toast.success("Foto personalizada carregada para o Grupo 2!");
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSend = async () => {
    if (!sendG1 && !sendG2) {
      toast.error("Selecione pelo menos um grupo para realizar o disparo.");
      return;
    }

    if (!isConnected) {
      toast.error("O WhatsApp não está conectado no momento.");
      return;
    }

    setSending(true);
    try {
      const payload = {
        group1_enabled: sendG1,
        group2_enabled: sendG2,
        group1_extra: group1Extra.trim(),
        group2_caption: group2Caption.trim(),
        photo_id: selectedPhotoId === "none" ? null : selectedPhotoId === "custom_upload" ? null : selectedPhotoId,
        photo_data: selectedPhotoId === "custom_upload" ? uploadedPhotoData : null,
      };

      const endpoint =
        type === "task"
          ? `/tasks/${item.id}/send-whatsapp`
          : `/announcements/${item.id}/send-whatsapp`;

      const { data } = await api.post(endpoint, payload);
      toast.success(`📲 ${data.message || "Disparo no WhatsApp concluído!"}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (e) {
      toast.error(
        formatApiError(e?.response?.data?.detail) || "Falha ao enviar mensagens pelo WhatsApp."
      );
    } finally {
      setSending(false);
    }
  };

  const formattedDueDate = formatDateBR(item.due_date || item.created_at);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-3 sm:p-4 nb-fade-in backdrop-blur-xs"
      data-testid="whatsapp-dispatch-dialog"
    >
      <div className="nb-card bg-white w-full max-w-2xl max-h-[94vh] overflow-y-auto p-5 sm:p-7 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-300 text-emerald-950 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-black text-xl sm:text-2xl leading-tight">
                Disparo no WhatsApp
              </h3>
              <p className="text-xs text-neutral-600">
                {type === "task" ? "Disparar tarefa para os grupos" : "Disparar comunicado para os grupos"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="nb-btn bg-white hover:bg-neutral-100 p-2"
            data-testid="close-whatsapp-dispatch-dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status da Conexão */}
        <div
          className={`p-3.5 rounded-xl border-2 border-black flex flex-wrap items-center justify-between gap-3 text-xs ${
            isConnected ? "bg-emerald-50 text-emerald-950" : "bg-red-50 text-red-950"
          }`}
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full border border-black ${
                isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
              }`}
            />
            <span className="font-bold">
              {loadingStatus
                ? "Verificando conexão..."
                : isConnected
                ? `WhatsApp Conectado (${status?.user?.name || "Online"})`
                : "WhatsApp Desconectado (Acesse a aba 'WhatsApp' no menu para conectar)"}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-medium">
            <span className="bg-white/80 border border-black/30 px-2 py-0.5 rounded">
              <b>G1:</b> {group1Name}
            </span>
            <span className="bg-white/80 border border-black/30 px-2 py-0.5 rounded">
              <b>G2:</b> {group2Name}
            </span>
          </div>
        </div>

        {/* Informações Básicas do Item */}
        <div className="nb-card bg-amber-50 p-4 space-y-1 text-sm border-2 border-black">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {item.subject && (
              <span className="nb-badge bg-sky-200 text-sky-950 font-bold text-xs">
                {item.subject}
              </span>
            )}
            <span className="nb-badge bg-white text-neutral-800 text-xs">
              📅 {type === "task" ? `Entrega: ${formattedDueDate}` : `Data: ${formattedDueDate}`}
            </span>
          </div>
          <h4 className="font-heading font-black text-lg">{item.title}</h4>
        </div>

        {/* Configuração do GRUPO 1 */}
        <div
          className={`nb-card p-4 transition-all border-2 border-black ${
            sendG1 ? "bg-emerald-50/60" : "bg-neutral-100 opacity-60"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendG1}
                onChange={(e) => setSendG1(e.target.checked)}
                className="w-4 h-4 rounded border-2 border-black text-emerald-600 focus:ring-0 cursor-pointer"
                data-testid="checkbox-send-group-1"
              />
              <span className="font-heading font-black text-sm text-neutral-900">
                1. Grupo 1 — Aviso Oficial Completo + Parte Extra
              </span>
            </label>
            <span className="nb-badge bg-emerald-200 text-emerald-950 text-[10px] font-bold">
              {group1Name}
            </span>
          </div>

          <p className="text-xs text-neutral-600 mb-3 pl-6">
            🔒 <b>Texto Base Oficial Protegido:</b> O cabeçalho completo, matéria, título, prazo e enunciado são mantidos integralmente e nunca alterados.
          </p>

          {sendG1 && (
            <div className="space-y-2 pt-2 border-t border-emerald-200 pl-6">
              <div className="flex items-center justify-between flex-wrap gap-1.5">
                <label className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                  <span>📌 Modelo Pré-Pronto da Parte Extra (Grupo 1):</span>
                </label>
                <div className="flex items-center gap-2">
                  {group1DefaultExtra && (
                    <button
                      type="button"
                      onClick={() => setGroup1Extra(group1DefaultExtra)}
                      className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline"
                      title="Carregar modelo pré-pronto salvo na aba WhatsApp"
                    >
                      Restaurar Modelo Pré-Pronto
                    </button>
                  )}
                  {group1Extra && (
                    <button
                      type="button"
                      onClick={() => setGroup1Extra("")}
                      className="text-[11px] font-bold text-neutral-500 hover:text-red-700 underline"
                    >
                      Limpar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowG1Preview(!showG1Preview)}
                    className="text-[11px] font-bold text-blue-700 hover:text-blue-900 underline"
                  >
                    {showG1Preview ? "Ocultar Prévia" : "Ver Prévia Completa"}
                  </button>
                </div>
              </div>

              <textarea
                rows={2}
                value={group1Extra}
                onChange={(e) => setGroup1Extra(e.target.value)}
                placeholder="Insira apenas a parte extra para o Grupo 1 (ex: aviso extra de entrega, recado adicional...)"
                className="nb-input bg-white text-xs font-sans resize-y"
                data-testid="input-group1-extra"
              />
              <p className="text-[10px] text-neutral-500">
                Esta parte extra será inserida antes do link de acesso. Suporta tags: <code className="font-mono bg-white px-1 py-0.5 rounded border border-black/20">{"{materia}"}</code>, <code className="font-mono bg-white px-1 py-0.5 rounded border border-black/20">{"{titulo}"}</code>, <code className="font-mono bg-white px-1 py-0.5 rounded border border-black/20">{"{data_entrega}"}</code>
              </p>

              {showG1Preview && (
                <div className="bg-neutral-900 text-neutral-100 p-3 rounded-xl text-xs space-y-1 font-mono mt-2">
                  <div className="text-[9px] uppercase font-bold text-emerald-400">
                    Prévia da Mensagem Completa no WhatsApp (Grupo 1):
                  </div>
                  <div className="whitespace-pre-wrap font-sans text-xs pt-1">
                    {type === "task" ? (
                      `📚 *NOVA TAREFA NO EDUTASK*\n\n` +
                      `📖 *Matéria:* ${item.subject || "Matéria"}\n` +
                      `📝 *Título:* ${item.title}\n` +
                      `📅 *Data de Entrega:* ${formattedDueDate}\n` +
                      `🎁 *Pontos:* ${item.points || 10} pts\n\n` +
                      `📋 *Descrição / Orientações:*\n${item.description || "Orientações..."}\n` +
                      (group1Extra ? `\n${group1Extra}\n` : "") +
                      `\n👉 _Acesse o Edutask para responder e visualizar os detalhes!_`
                    ) : (
                      `📢 *NOVO AVISO NO EDUTASK*\n\n` +
                      `📌 *${item.title}*\n` +
                      `📅 *Data:* ${formattedDueDate}\n\n` +
                      `💬 *Mensagem:*\n${item.message || "Mensagem..."}\n` +
                      (group1Extra ? `\n${group1Extra}\n` : "") +
                      `\n👉 _Acesse o Edutask para interagir e responder aos comentários!_`
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Configuração do GRUPO 2 (FOTO E ENUNCIADO ESCOLHÍVEIS) */}
        <div
          className={`nb-card p-4 space-y-4 transition-all border-2 border-black ${
            sendG2 ? "bg-sky-50/60" : "bg-neutral-100 opacity-60"
          }`}
        >
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={sendG2}
                onChange={(e) => setSendG2(e.target.checked)}
                className="w-4 h-4 rounded border-2 border-black text-sky-600 focus:ring-0 cursor-pointer"
                data-testid="checkbox-send-group-2"
              />
              <span className="font-heading font-black text-sm text-neutral-900">
                2. Grupo 2 — Foto com Enunciado Personalizado
              </span>
            </label>
            <span className="nb-badge bg-sky-200 text-sky-950 text-[10px] font-bold">
              {group2Name}
            </span>
          </div>

          {sendG2 && (
            <div className="space-y-4 pt-1">
              {/* 1. Escolha da Foto para o Grupo 2 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-sky-600" />
                    Escolher Foto para o Grupo 2
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="nb-btn px-2 py-1 bg-white hover:bg-sky-100 text-[11px] font-bold flex items-center gap-1"
                    data-testid="upload-custom-whatsapp-photo"
                  >
                    <Upload className="w-3 h-3" />
                    Carregar foto do computador
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCustomPhotoUpload}
                    className="hidden"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {/* Opção Sem Foto */}
                  <button
                    type="button"
                    onClick={() => setSelectedPhotoId("none")}
                    className={`nb-card p-2 text-left flex flex-col items-center justify-center gap-1 text-xs border-2 transition-all ${
                      selectedPhotoId === "none"
                        ? "bg-amber-300 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] font-bold"
                        : "bg-white hover:bg-neutral-100 border-neutral-300 opacity-80"
                    }`}
                  >
                    <FileText className="w-5 h-5 text-neutral-600" />
                    <span className="text-[11px] text-center">Sem Foto (Texto)</span>
                  </button>

                  {/* Foto Carregada na hora */}
                  {uploadedPhotoData && (
                    <button
                      type="button"
                      onClick={() => setSelectedPhotoId("custom_upload")}
                      className={`nb-card p-1.5 relative text-left border-2 transition-all ${
                        selectedPhotoId === "custom_upload"
                          ? "ring-3 ring-emerald-500 border-black bg-emerald-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                          : "bg-white hover:bg-neutral-50 border-neutral-300"
                      }`}
                    >
                      <img
                        src={uploadedPhotoData}
                        alt="Upload"
                        className="w-full h-16 object-cover rounded border border-black/30"
                      />
                      <div className="text-[10px] font-bold truncate mt-1 text-emerald-800">
                        {uploadedPhotoName || "Nova Foto"}
                      </div>
                      {selectedPhotoId === "custom_upload" && (
                        <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 border border-black">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  )}

                  {/* Fotos da Tarefa */}
                  {availablePhotos.map((photo) => {
                    const isSelected = selectedPhotoId === photo.id;
                    return (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setSelectedPhotoId(photo.id)}
                        className={`nb-card p-1.5 relative text-left border-2 transition-all ${
                          isSelected
                            ? "ring-3 ring-emerald-500 border-black bg-emerald-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            : "bg-white hover:bg-neutral-50 border-neutral-300"
                        }`}
                        data-testid={`select-whatsapp-photo-${photo.id}`}
                      >
                        <img
                          src={photo.url}
                          alt={photo.name}
                          className="w-full h-16 object-cover rounded border border-black/30"
                        />
                        <div className="text-[10px] font-bold truncate mt-1 text-neutral-700">
                          {photo.name}
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 border border-black">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Escolha do Enunciado / Escrita para o Grupo 2 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-violet-600" />
                    Enunciado do Grupo 2 (Programado na Aba WhatsApp)
                  </label>
                  <button
                    type="button"
                    onClick={() => setGroup2Caption(formatProgrammedCaption(programmedTemplate, item, type))}
                    className="text-[11px] text-violet-700 hover:text-violet-950 underline font-bold"
                    title="Restaura o modelo padrão configurado na aba WhatsApp"
                  >
                    Restaurar Enunciado Programado ↺
                  </button>
                </div>
                <textarea
                  rows={5}
                  value={group2Caption}
                  onChange={(e) => setGroup2Caption(e.target.value)}
                  placeholder="Enunciado que acompanhará a foto no Grupo 2..."
                  className="nb-input bg-white text-xs sm:text-sm resize-y"
                  data-testid="input-group-2-caption"
                />
                <p className="text-[11px] text-neutral-500">
                  O enunciado acima é o modelo oficial programado na aba WhatsApp e será utilizado no disparo para o Grupo 2, a não ser que você altere o texto diretamente neste campo.
                </p>
              </div>

              {/* Pré-visualização Real do Grupo 2 */}
              <div className="nb-card bg-neutral-900 text-white p-3.5 rounded-xl text-xs space-y-2 font-mono">
                <div className="text-[10px] uppercase font-bold text-neutral-400 flex items-center justify-between border-b border-neutral-700 pb-1.5">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    📱 Pré-visualização Real no WhatsApp (Grupo 2):
                  </span>
                  {selectedPhotoId && selectedPhotoId !== "none" ? (
                    <span className="text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40">
                      📷 Foto com Enunciado (Grupo 2)
                    </span>
                  ) : (
                    <span className="text-neutral-400 bg-neutral-800 px-1.5 py-0.5 rounded">
                      💬 Apenas Texto (Grupo 2)
                    </span>
                  )}
                </div>
                <div className="pt-1 text-neutral-100 whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed bg-black/30 p-2.5 rounded-lg border border-neutral-800">
                  {group2Caption || "(Nenhum enunciado digitado)"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer com Ações */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t-2 border-black">
          <button
            type="button"
            onClick={onClose}
            className="nb-btn bg-white hover:bg-neutral-100 px-5 py-2.5 font-bold"
            disabled={sending}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !isConnected || (!sendG1 && !sendG2)}
            className="nb-btn bg-emerald-400 hover:bg-emerald-500 text-emerald-950 px-6 py-2.5 font-heading font-black flex items-center gap-2"
            data-testid="confirm-whatsapp-dispatch-btn"
          >
            <Send className={`w-4 h-4 ${sending ? "animate-spin" : ""}`} />
            {sending ? "Disparando..." : "Disparar no WhatsApp 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
}
