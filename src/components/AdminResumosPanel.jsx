import { useState, useEffect, useMemo } from "react";
import { api, API, formatApiError } from "@/lib/api";
import { firebaseService } from "@/lib/firebaseService";
import { toast } from "sonner";
import ModalPortal from "@/components/ModalPortal";
import MarkdownSummaryViewer from "@/components/MarkdownSummaryViewer";
import WhatsAppDispatchDialog from "@/components/WhatsAppDispatchDialog";
import { getSubjectColorConfig } from "@/lib/subjectColors";
import {
  BookOpen,
  Upload,
  Edit2,
  Trash2,
  Plus,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  X,
  FileText,
  Eye,
  EyeOff,
  Send,
  BellRing,
  Search,
  Paperclip,
  Download,
  MessageSquare,
} from "lucide-react";

function normalizeAttachmentItem(a) {
  if (!a) return null;
  if (typeof a === "string") {
    return { id: a, original_filename: a, content_type: "" };
  }
  if (typeof a === "object" && a.id) {
    return {
      id: String(a.id),
      original_filename: String(a.original_filename || a.filename || a.id),
      content_type: a.content_type || "",
      size: a.size,
    };
  }
  return null;
}

function isImageAttachment(att) {
  if (!att) return false;
  const ct = String(att.content_type || "").toLowerCase();
  const name = String(att.original_filename || "").toLowerCase();
  return ct.startsWith("image/") || /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i.test(name);
}

function getFileDownloadUrl(fileId) {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : "";
  return `${API}/files/${fileId}/download?auth=${encodeURIComponent(token || "")}`;
}

function getSummaryAttachments(item) {
  const raw =
    Array.isArray(item?.attachments) && item.attachments.length > 0
      ? item.attachments
      : Array.isArray(item?.attachment_ids)
      ? item.attachment_ids
      : [];
  return raw.map(normalizeAttachmentItem).filter(Boolean);
}

function hasSummaryContent(s) {
  if (!s) return false;
  const hasText = Boolean(s.summary_text && String(s.summary_text).trim().length > 0);
  const hasFiles = getSummaryAttachments(s).length > 0;
  return hasText || hasFiles;
}

function formatDateShortBR(isoStr) {
  try {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
}

export default function AdminResumosPanel() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("TODAS");
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros e buscas
  const [summarySearch, setSummarySearch] = useState("");
  const [summaryStageFilter, setSummaryStageFilter] = useState("all"); // 'all' | 'draft' | 'published'

  // Ações assíncronas nos resumos
  const [publishingSummaryId, setPublishingSummaryId] = useState(null);

  // Disparo manual para grupos do WhatsApp
  const [dispatchSummaryItem, setDispatchSummaryItem] = useState(null);

  // Modal de Resumo Pronto (Adicionar / Editar / Preview)
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [editingSummaryItem, setEditingSummaryItem] = useState(null);
  const [editorViewTab, setEditorViewTab] = useState("edit"); // 'edit' | 'preview'
  const [savingSummaryEditor, setSavingSummaryEditor] = useState(false);
  const [uploadingSummaryFiles, setUploadingSummaryFiles] = useState(false);
  const [summaryForm, setSummaryForm] = useState({
    subject: "",
    topic: "",
    summary_text: "",
    key_concepts: "",
    formulas: "",
    is_published: true,
    is_ready_made: true,
    attachments: [],
  });

  // Leitura / Preview e Lightbox
  const [previewSummary, setPreviewSummary] = useState(null);
  const [previewImageId, setPreviewImageId] = useState(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [subjRes, sumsRes] = await Promise.all([
        api.get("/subjects"),
        api.get("/summaries"),
      ]);
      const subjList = Array.isArray(subjRes.data) ? subjRes.data : [];
      setSubjects(subjList);
      setSummaries(Array.isArray(sumsRes.data) ? sumsRes.data : []);
    } catch (err) {
      try {
        const [subjList, sumsList] = await Promise.all([
          firebaseService.getAllSubjects().catch(() => []),
          firebaseService.getAllSummaries().catch(() => []),
        ]);
        setSubjects(Array.isArray(subjList) ? subjList : []);
        setSummaries(Array.isArray(sumsList) ? sumsList : []);
      } catch {
        toast.error(formatApiError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const reloadSummaries = async () => {
    try {
      const sumsRes = await api.get("/summaries");
      setSummaries(Array.isArray(sumsRes.data) ? sumsRes.data : []);
    } catch (err) {
      try {
        const sumsList = await firebaseService.getAllSummaries().catch(() => []);
        setSummaries(Array.isArray(sumsList) ? sumsList : []);
      } catch {
        toast.error(formatApiError(err));
      }
    }
  };

  const openCreateSummaryModal = () => {
    const defaultSubject =
      selectedSubject !== "TODAS" ? selectedSubject : subjects[0]?.name || "";
    setEditingSummaryItem(null);
    setEditorViewTab("edit");
    setSummaryForm({
      subject: defaultSubject,
      topic: "",
      summary_text: "",
      key_concepts: "",
      formulas: "",
      is_published: true,
      is_ready_made: true,
      attachments: [],
    });
    setShowSummaryModal(true);
  };

  const openEditSummaryModal = (summaryItem) => {
    setEditingSummaryItem(summaryItem);
    setEditorViewTab("edit");
    const rawAttachments = getSummaryAttachments(summaryItem);
    setSummaryForm({
      subject: summaryItem.subject || subjects[0]?.name || "",
      topic: summaryItem.topic || "",
      summary_text: summaryItem.summary_text || "",
      key_concepts: (summaryItem.key_concepts || []).join(", "),
      formulas: (summaryItem.formulas || []).join(", "),
      is_published: Boolean(summaryItem.is_published),
      is_ready_made: true,
      attachments: rawAttachments,
    });
    setShowSummaryModal(true);
  };

  const handleUploadSummaryFiles = async (e) => {
    const fileList = Array.from(e.target.files || []);
    if (fileList.length === 0) return;
    setUploadingSummaryFiles(true);
    try {
      let autoLoadedText = "";
      const uploadedItems = [];
      for (const f of fileList) {
        const fd = new FormData();
        fd.append("file", f);
        const { data } = await api.post("/files/upload", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploadedItems.push({
          id: data.id,
          original_filename: data.filename || f.name,
          content_type: data.content_type || f.type || "",
          size: data.size || f.size,
        });
        if (!autoLoadedText && /\.(txt|md)$/i.test(f.name) && f.size <= 250000) {
          try {
            const raw = await f.text();
            if (raw && raw.trim()) autoLoadedText = raw.trim().slice(0, 40000);
          } catch {}
        }
      }
      setSummaryForm((prev) => ({
        ...prev,
        is_ready_made: true,
        attachments: [...(prev.attachments || []), ...uploadedItems],
        summary_text: prev.summary_text.trim()
          ? prev.summary_text
          : autoLoadedText || prev.summary_text,
        topic:
          prev.topic.trim() ||
          (uploadedItems[0]?.original_filename || "")
            .replace(/\.[^/.]+$/, "")
            .replace(/[_-]+/g, " "),
      }));
      toast.success(`${uploadedItems.length} arquivo(s) anexado(s) ao resumo pronto!`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setUploadingSummaryFiles(false);
      e.target.value = "";
    }
  };

  const removeSummaryAttachment = (fileId) => {
    setSummaryForm((prev) => ({
      ...prev,
      attachments: (prev.attachments || []).filter((a) => a.id !== fileId),
    }));
  };

  const handleSaveSummaryModal = async (e, { publishAfterSave = false } = {}) => {
    if (e) e.preventDefault();
    const hasText = Boolean(summaryForm.summary_text && summaryForm.summary_text.trim());
    const hasFiles =
      Array.isArray(summaryForm.attachments) && summaryForm.attachments.length > 0;

    if (!summaryForm.subject.trim() || !summaryForm.topic.trim() || (!hasText && !hasFiles)) {
      toast.error(
        "Matéria, Título e Conteúdo (texto ou arquivo do resumo pronto) são obrigatórios."
      );
      return;
    }

    setSavingSummaryEditor(true);
    const payload = {
      subject: summaryForm.subject.trim(),
      topic: summaryForm.topic.trim(),
      extracted_notes: "",
      summary_text: summaryForm.summary_text,
      key_concepts: summaryForm.key_concepts
        ? summaryForm.key_concepts
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      formulas: summaryForm.formulas
        ? summaryForm.formulas
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      is_ready_made: true,
      attachment_ids: (summaryForm.attachments || []).map((a) => a.id),
      attachments: summaryForm.attachments || [],
      is_published: publishAfterSave ? true : Boolean(summaryForm.is_published),
    };

    try {
      if (editingSummaryItem) {
        await api.put(`/admin/summaries/${editingSummaryItem.id}`, payload);
        if (publishAfterSave && !editingSummaryItem.is_published) {
          const pubRes = await api.post(
            `/admin/summaries/${editingSummaryItem.id}/publish`,
            { notify: true }
          );
          const sent = pubRes.data?.push?.sent || 0;
          toast.success(
            sent > 0
              ? `Resumo salvo e disponibilizado! Push enviado para ${sent} dispositivo(s).`
              : "Resumo salvo e disponibilizado para os alunos!"
          );
        } else {
          toast.success("Resumo atualizado com sucesso!");
        }
      } else {
        const res = await api.post("/admin/summaries", payload);
        const sent = res.data?.push?.sent || 0;
        toast.success(
          publishAfterSave
            ? sent > 0
              ? `Resumo disponibilizado! Push enviado para ${sent} dispositivo(s). Clique em WhatsApp se quiser disparar nos grupos.`
              : "Resumo pronto disponibilizado! Clique no botão WhatsApp do card para disparar nos grupos."
            : "Resumo salvo como rascunho privado!"
        );
      }
      setShowSummaryModal(false);
      await reloadSummaries();
    } catch (err) {
      if (!err?.response) {
        try {
          const nowIso = new Date().toISOString();
          const summaryId = editingSummaryItem?.id || `sum-${Date.now()}`;
          await firebaseService.saveSummary({
            id: summaryId,
            ...payload,
            status: payload.is_published ? "published" : "draft",
            published_at: payload.is_published
              ? editingSummaryItem?.published_at || nowIso
              : null,
            created_at: editingSummaryItem?.created_at || nowIso,
            updated_at: nowIso,
          });
          toast.success(
            publishAfterSave ? "Resumo disponibilizado!" : "Resumo salvo!"
          );
          setShowSummaryModal(false);
          await reloadSummaries();
          return;
        } catch {}
      }
      toast.error(formatApiError(err));
    } finally {
      setSavingSummaryEditor(false);
    }
  };

  const handlePublishSummary = async (summaryItem, { isRebroadcast = false } = {}) => {
    if (!hasSummaryContent(summaryItem)) {
      toast.error(
        "Escreva o conteúdo ou anexe um arquivo antes de disponibilizar para os alunos."
      );
      return;
    }
    setPublishingSummaryId(summaryItem.id);
    try {
      const { data } = await api.post(`/admin/summaries/${summaryItem.id}/publish`, {
        notify: true,
      });
      if (data?.ok) {
        const sent = data?.push?.sent || 0;
        const skipped = Boolean(data?.push?.skipped);
        if (isRebroadcast) {
          toast.success(
            sent > 0
              ? `Notificação reenviada para ${sent} dispositivo(s)!`
              : "Resumo disponível para os alunos."
          );
        } else if (skipped) {
          toast.success(
            `Resumo "${summaryItem.topic}" disponibilizado em ${summaryItem.subject}!`
          );
        } else if (sent > 0) {
          toast.success(
            `Resumo disponibilizado em ${summaryItem.subject}! Push enviado para ${sent} dispositivo(s).`
          );
        } else {
          toast.success(
            `Resumo "${summaryItem.topic}" disponibilizado para os alunos em ${summaryItem.subject}!`
          );
        }
        await reloadSummaries();
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setPublishingSummaryId(null);
    }
  };

  const handleUnpublishSummary = async (summaryItem) => {
    setPublishingSummaryId(summaryItem.id);
    try {
      await api.post(`/admin/summaries/${summaryItem.id}/unpublish`);
      toast.info(
        `"${summaryItem.topic}" foi ocultado dos alunos e voltou para rascunho.`
      );
      await reloadSummaries();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setPublishingSummaryId(null);
    }
  };

  const handleDeleteSummary = async (summaryId) => {
    if (!confirm("Tem certeza que deseja excluir este resumo?")) return;
    try {
      await api.delete(`/admin/summaries/${summaryId}`);
      toast.success("Resumo removido com sucesso!");
      await reloadSummaries();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const subjectScopedSummaries = useMemo(() => {
    if (selectedSubject === "TODAS") return summaries;
    return summaries.filter(
      (s) => s.subject.toLowerCase() === selectedSubject.toLowerCase()
    );
  }, [summaries, selectedSubject]);

  const summaryCounts = useMemo(() => {
    let draft = 0;
    let published = 0;
    for (const s of subjectScopedSummaries) {
      if (s.is_published) published++;
      else draft++;
    }
    return { draft, published, total: subjectScopedSummaries.length };
  }, [subjectScopedSummaries]);

  const filteredSummaries = useMemo(() => {
    const q = summarySearch.trim().toLowerCase();
    return subjectScopedSummaries.filter((s) => {
      if (summaryStageFilter === "published" && !s.is_published) return false;
      if (summaryStageFilter === "draft" && s.is_published) return false;
      if (!q) return true;
      const atts = getSummaryAttachments(s);
      return (
        s.topic.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q) ||
        (s.summary_text || "").toLowerCase().includes(q) ||
        (s.key_concepts || []).some((c) => c.toLowerCase().includes(q)) ||
        atts.some((a) => (a.original_filename || "").toLowerCase().includes(q))
      );
    });
  }, [subjectScopedSummaries, summaryStageFilter, summarySearch]);

  return (
    <div className="space-y-4 sm:space-y-5" data-testid="admin-resumos-panel">
      {/* Cabeçalho compacto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="min-w-0">
          <h1 className="font-heading font-black text-2xl sm:text-3xl tracking-tight text-neutral-900">
            Resumos Prontos
          </h1>
          <p className="text-xs sm:text-sm text-neutral-600 mt-0.5">
            Adicione arquivos ou textos prontos por matéria e dispare manualmente para os grupos do WhatsApp quando desejar.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateSummaryModal}
          className="nb-btn admin-btn-primary w-full sm:w-auto min-h-[44px] px-4 py-2.5 text-sm flex items-center justify-center gap-2 shrink-0"
          data-testid="open-ready-summary-btn"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Colocar Resumo Pronto</span>
        </button>
      </div>

      {/* Barra de filtros Mobile-First: busca, matérias em scroll horizontal no celular e status */}
      <div className="nb-card bg-white p-3.5 sm:p-5 rounded-2xl border-2 border-black space-y-3.5">
        {/* Busca */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={summarySearch}
            onChange={(e) => setSummarySearch(e.target.value)}
            placeholder="Buscar resumo, matéria, conceito ou anexo..."
            className="nb-input pl-10 pr-12 min-h-[44px] text-sm bg-neutral-50 focus:bg-white"
            data-testid="admin-resumos-search"
          />
          {summarySearch && (
            <button
              type="button"
              onClick={() => setSummarySearch("")}
              aria-label="Limpar busca"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Matérias: scroll horizontal no celular / wrap no computador */}
        <div className="flex items-center gap-2 overflow-x-auto md:flex-wrap no-scrollbar -mx-0.5 px-0.5 py-0.5">
          <button
            type="button"
            onClick={() => setSelectedSubject("TODAS")}
            data-testid="admin-subject-filter-todas"
            className={`shrink-0 whitespace-nowrap min-h-[44px] px-3.5 rounded-xl border-2 font-heading font-black text-xs transition-all tabular-nums flex items-center gap-1.5 ${
              selectedSubject === "TODAS"
                ? "bg-amber-300 text-black border-black shadow-[2px_2px_0_0_#000]"
                : "bg-slate-50 hover:bg-slate-100 text-neutral-800 border-slate-300"
            }`}
          >
            <span>Todas ({summaries.length})</span>
          </button>

          {subjects.map((subj) => {
            const count = summaries.filter(
              (s) => s.subject.toLowerCase() === subj.name.toLowerCase()
            ).length;
            const isSelected =
              selectedSubject.toLowerCase() === subj.name.toLowerCase();
            const colorCfg = getSubjectColorConfig(subj.name, subjects);
            return (
              <button
                key={subj.id}
                type="button"
                onClick={() => setSelectedSubject(subj.name)}
                data-testid={`admin-subject-filter-${subj.id}`}
                className={`shrink-0 whitespace-nowrap min-h-[44px] px-3.5 rounded-xl border-2 font-heading font-black text-xs transition-all tabular-nums flex items-center gap-2 ${
                  isSelected
                    ? "bg-amber-300 text-black border-black shadow-[2px_2px_0_0_#000]"
                    : "bg-white hover:bg-slate-50 text-neutral-800 border-slate-300"
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-sm border border-black shrink-0 ${colorCfg.bgClass}`}
                  aria-hidden="true"
                />
                <span>
                  {subj.name} ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Estágio: Todos / Rascunhos / Disponíveis */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "all", label: `Todos (${summaryCounts.total})` },
            { id: "draft", label: `Rascunhos (${summaryCounts.draft})` },
            { id: "published", label: `Disponíveis (${summaryCounts.published})` },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSummaryStageFilter(f.id)}
              className={`min-h-[44px] px-2 py-2 text-[11px] sm:text-xs font-heading font-black uppercase rounded-xl border-2 transition-all tabular-nums truncate ${
                summaryStageFilter === f.id
                  ? "bg-sky-400 text-black border-black shadow-[2px_2px_0_0_#000]"
                  : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-slate-300"
              }`}
              data-testid={`resumos-stage-filter-${f.id}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Resumos */}
      {loading ? (
        <div className="p-10 text-center text-neutral-600 font-bold flex items-center justify-center gap-2 nb-card bg-white rounded-2xl border-2 border-black">
          <Loader2 className="w-5 h-5 animate-spin text-black" />
          <span className="text-sm">Carregando resumos...</span>
        </div>
      ) : filteredSummaries.length === 0 ? (
        <div className="p-8 sm:p-10 text-center bg-white rounded-2xl border-2 border-dashed border-black/40 space-y-3">
          <BookOpen className="w-10 h-10 text-sky-700 mx-auto" />
          <p className="font-heading font-black text-black text-base uppercase">
            {subjectScopedSummaries.length === 0
              ? selectedSubject === "TODAS"
                ? "Nenhum resumo pronto cadastrado"
                : `Nenhum resumo em ${selectedSubject}`
              : "Nenhum resumo encontrado neste filtro"}
          </p>
          <p className="text-xs font-medium text-neutral-600 max-w-md mx-auto">
            Suba seu PDF, imagem ou texto pronto diretamente e libere para os alunos ou dispare no WhatsApp quando quiser.
          </p>
          <div className="pt-1">
            <button
              type="button"
              onClick={openCreateSummaryModal}
              className="nb-btn admin-btn-primary min-h-[44px] px-5 py-2.5 text-xs sm:text-sm inline-flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Colocar Resumo Pronto</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {filteredSummaries.map((sumItem) => {
            const isPublished = Boolean(sumItem.is_published);
            const isPublishing = publishingSummaryId === sumItem.id;
            const sumAttachments = getSummaryAttachments(sumItem);
            const dateLabel = formatDateShortBR(
              sumItem.published_at || sumItem.updated_at || sumItem.created_at
            );
            const colorCfg = getSubjectColorConfig(sumItem.subject, subjects);

            return (
              <article
                key={sumItem.id}
                className="nb-card bg-white p-4 sm:p-5 rounded-2xl border-2 border-black flex flex-col justify-between space-y-4"
                data-testid={`admin-summary-card-${sumItem.id}`}
              >
                <div className="space-y-2.5">
                  {/* Linha tipográfica limpa (sem sanduíche de pílulas) */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-neutral-700 min-w-0">
                      <span
                        className={`w-2.5 h-2.5 rounded-sm border border-black shrink-0 ${colorCfg.bgClass}`}
                        aria-hidden="true"
                      />
                      <span className="truncate text-black">{sumItem.subject}</span>
                      {dateLabel && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums font-bold text-neutral-500">
                            {dateLabel}
                          </span>
                        </>
                      )}
                      {sumAttachments.length > 0 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums font-bold text-neutral-600">
                            {sumAttachments.length} {sumAttachments.length === 1 ? "anexo" : "anexos"}
                          </span>
                        </>
                      )}
                    </div>

                    <span
                      className={`text-[11px] font-heading font-black uppercase px-2 py-0.5 rounded-md border border-black ${
                        isPublished
                          ? "bg-emerald-200 text-emerald-950"
                          : "bg-amber-200 text-amber-950"
                      }`}
                    >
                      {isPublished ? "Disponível" : "Rascunho"}
                    </span>
                  </div>

                  <h3 className="text-lg font-heading font-black text-black leading-snug">
                    {sumItem.topic}
                  </h3>

                  {sumItem.summary_text?.trim() ? (
                    <p className="text-xs sm:text-sm font-body text-neutral-700 whitespace-pre-line line-clamp-3 leading-relaxed">
                      {sumItem.summary_text}
                    </p>
                  ) : null}

                  {sumAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {sumAttachments.map((att) =>
                        isImageAttachment(att) ? (
                          <button
                            key={att.id}
                            type="button"
                            onClick={() => setPreviewImageId(att.id)}
                            className="relative w-14 h-14 rounded-xl border-2 border-black overflow-hidden bg-neutral-100 hover:opacity-85 transition-opacity"
                            title={att.original_filename}
                          >
                            <img
                              src={`/api/files/${att.id}?auth=${encodeURIComponent((typeof window !== "undefined" ? localStorage.getItem("auth_token") : "") || "")}`}
                              alt={att.original_filename}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ) : (
                          <a
                            key={att.id}
                            href={getFileDownloadUrl(att.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 min-h-[40px] bg-slate-100 hover:bg-amber-100 border border-black/40 rounded-xl text-xs font-bold text-black"
                          >
                            <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span className="max-w-[160px] truncate">
                              {att.original_filename}
                            </span>
                            <Download className="w-3 h-3 shrink-0 text-neutral-600" />
                          </a>
                        )
                      )}
                    </div>
                  )}
                </div>

                {/* Ações com alvos >= 44px para toque confortável no celular */}
                <div className="pt-3 border-t border-black/15 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDispatchSummaryItem(sumItem)}
                      className="nb-btn min-h-[44px] px-3 bg-emerald-300 hover:bg-emerald-400 text-emerald-950 font-heading font-black text-xs uppercase rounded-xl border-2 border-black flex items-center justify-center gap-1.5"
                      data-testid={`whatsapp-summary-${sumItem.id}`}
                    >
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span>WhatsApp</span>
                    </button>

                    {!isPublished ? (
                      <button
                        type="button"
                        onClick={() => handlePublishSummary(sumItem)}
                        disabled={isPublishing}
                        className="nb-btn min-h-[44px] px-3 bg-sky-400 hover:bg-sky-500 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black flex items-center justify-center gap-1.5"
                        data-testid={`publish-summary-${sumItem.id}`}
                      >
                        {isPublishing ? (
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        ) : (
                          <Send className="w-4 h-4 shrink-0" />
                        )}
                        <span>{isPublishing ? "Liberando..." : "Disponibilizar"}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUnpublishSummary(sumItem)}
                        disabled={isPublishing}
                        className="nb-btn min-h-[44px] px-3 bg-white hover:bg-neutral-100 text-neutral-900 font-heading font-black text-xs uppercase rounded-xl border-2 border-black flex items-center justify-center gap-1.5"
                        data-testid={`unpublish-summary-${sumItem.id}`}
                      >
                        <EyeOff className="w-4 h-4 shrink-0" />
                        <span>Ocultar</span>
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditSummaryModal(sumItem)}
                      className="nb-btn flex-1 min-h-[44px] px-3 bg-white hover:bg-neutral-100 text-black font-heading font-bold text-xs rounded-xl border-2 border-black flex items-center justify-center gap-1.5"
                      data-testid={`edit-summary-${sumItem.id}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewSummary(sumItem)}
                      className="nb-btn flex-1 min-h-[44px] px-3 bg-sky-100 hover:bg-sky-200 text-sky-950 font-heading font-bold text-xs rounded-xl border-2 border-black flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>

                    {isPublished && (
                      <button
                        type="button"
                        onClick={() =>
                          handlePublishSummary(sumItem, { isRebroadcast: true })
                        }
                        disabled={isPublishing}
                        title="Reenviar Notificação Push"
                        className="nb-btn min-h-[44px] px-3 bg-amber-100 hover:bg-amber-200 text-amber-950 font-heading font-bold text-xs rounded-xl border-2 border-black flex items-center justify-center gap-1"
                      >
                        <BellRing className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Push</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDeleteSummary(sumItem.id)}
                      aria-label={`Excluir ${sumItem.topic}`}
                      className="nb-btn min-w-[44px] min-h-[44px] px-3 bg-rose-100 hover:bg-rose-200 text-rose-950 font-heading font-bold text-xs rounded-xl border-2 border-black flex items-center justify-center"
                      data-testid={`delete-summary-${sumItem.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal Bottom-Sheet no celular: Colocar / Editar Resumo Pronto */}
      {showSummaryModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 p-0 sm:p-5 backdrop-blur-sm">
            <div className="nb-card w-full max-w-3xl bg-white rounded-t-3xl sm:rounded-2xl border-3 border-black shadow-[8px_8px_0_0_#000] flex flex-col max-h-[92vh] overflow-hidden">
              <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-emerald-300 border-b-2 border-black flex items-center justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <h3 className="text-base sm:text-xl font-heading font-black text-black uppercase truncate">
                    {editingSummaryItem
                      ? "Editar Resumo Pronto"
                      : "Colocar Resumo Pronto"}
                  </h3>
                  <p className="text-[11px] sm:text-xs font-bold text-neutral-800 truncate">
                    Anexe PDF, imagens ou cole o texto formatado pronto para os alunos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(false)}
                  aria-label="Fechar modal"
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-white hover:bg-neutral-100 border-2 border-black flex items-center justify-center font-black shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Abas do editor */}
              <div className="px-4 sm:px-6 py-2.5 bg-neutral-100 border-b-2 border-black flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditorViewTab("edit")}
                  className={`nb-btn min-h-[44px] flex-1 sm:flex-none px-4 text-xs font-heading font-black uppercase rounded-xl border-2 border-black ${
                    editorViewTab === "edit"
                      ? "bg-sky-300 text-black"
                      : "bg-white text-black"
                  }`}
                >
                  Dados & Arquivos
                </button>
                <button
                  type="button"
                  onClick={() => setEditorViewTab("preview")}
                  className={`nb-btn min-h-[44px] flex-1 sm:flex-none px-4 text-xs font-heading font-black uppercase rounded-xl border-2 border-black flex items-center justify-center gap-1.5 ${
                    editorViewTab === "preview"
                      ? "bg-emerald-300 text-black"
                      : "bg-white text-black"
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  <span>Preview do Aluno</span>
                </button>
              </div>

              {/* Corpo rolável */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
                {editorViewTab === "preview" ? (
                  <div className="space-y-4">
                    {summaryForm.summary_text.trim() ? (
                      <MarkdownSummaryViewer
                        markdown={summaryForm.summary_text}
                        title={summaryForm.topic || "Preview do Resumo"}
                        subtitle={`Matéria: ${summaryForm.subject}`}
                        subjects={[summaryForm.subject]}
                        showToolbar={false}
                      />
                    ) : null}

                    {summaryForm.attachments?.length > 0 && (
                      <div className="bg-emerald-50 p-4 rounded-xl border-2 border-black space-y-2.5">
                        <h4 className="text-xs font-heading font-black uppercase text-black flex items-center gap-1.5">
                          <Paperclip className="w-4 h-4" /> Arquivos Anexos ({summaryForm.attachments.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {summaryForm.attachments.map((att) =>
                            isImageAttachment(att) ? (
                              <img
                                key={att.id}
                                src={`/api/files/${att.id}?auth=${encodeURIComponent((typeof window !== "undefined" ? localStorage.getItem("auth_token") : "") || "")}`}
                                alt={att.original_filename}
                                className="w-24 h-24 object-cover rounded-xl border-2 border-black"
                              />
                            ) : (
                              <a
                                key={att.id}
                                href={getFileDownloadUrl(att.id)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-3 min-h-[44px] bg-white border-2 border-black rounded-xl text-xs font-black"
                              >
                                <FileText className="w-4 h-4 text-emerald-700" />
                                <span>{att.original_filename}</span>
                              </a>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {!summaryForm.summary_text.trim() &&
                      (!summaryForm.attachments || summaryForm.attachments.length === 0) && (
                        <div className="p-8 text-center bg-neutral-50 rounded-xl border-2 border-dashed border-black">
                          <p className="font-heading font-black text-sm text-black">
                            Nenhum texto ou arquivo anexado ainda.
                          </p>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-heading font-black uppercase text-black mb-1">
                          Matéria
                        </label>
                        <select
                          value={summaryForm.subject}
                          onChange={(e) =>
                            setSummaryForm({ ...summaryForm, subject: e.target.value })
                          }
                          className="nb-input min-h-[44px]"
                        >
                          {subjects.map((s) => (
                            <option key={s.id} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-heading font-black uppercase text-black mb-1">
                          Título do Resumo
                        </label>
                        <input
                          type="text"
                          required
                          value={summaryForm.topic}
                          onChange={(e) =>
                            setSummaryForm({ ...summaryForm, topic: e.target.value })
                          }
                          placeholder="Ex: Revisão — Funções do 1º Grau"
                          className="nb-input min-h-[44px]"
                          data-testid="summary-editor-title-input"
                        />
                      </div>
                    </div>

                    {/* Zona de upload para arquivo pronto */}
                    <div className="bg-emerald-50/70 p-3.5 sm:p-4 rounded-xl border-2 border-black space-y-3">
                      <div>
                        <label className="text-xs font-heading font-black uppercase text-black flex items-center gap-1.5">
                          <Paperclip className="w-4 h-4 text-emerald-700" />
                          <span>Arquivos do Resumo Pronto (PDF, Fotos, Docs, Slides)</span>
                        </label>
                        <p className="text-[11px] font-medium text-neutral-600 mt-0.5">
                          Envie só o arquivo pronto, só o texto abaixo ou os dois juntos.
                        </p>
                      </div>

                      <label
                        className="block w-full min-h-[84px] border-2 border-dashed border-black rounded-xl bg-white hover:bg-emerald-100/60 p-4 cursor-pointer transition-colors text-center flex flex-col items-center justify-center"
                        data-testid="summary-ready-upload-zone"
                      >
                        {uploadingSummaryFiles ? (
                          <div className="flex items-center justify-center gap-2 text-xs font-black">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Enviando arquivo(s)...</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 mb-1 text-emerald-700" />
                            <span className="text-xs font-heading font-black uppercase text-black block">
                              Tocar para selecionar arquivo(s)
                            </span>
                            <span className="text-[11px] font-bold text-neutral-500">
                              PDF, PNG, JPG, DOC/DOCX, PPT/PPTX, TXT, MD
                            </span>
                          </>
                        )}
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md"
                          onChange={handleUploadSummaryFiles}
                          disabled={uploadingSummaryFiles}
                          className="hidden"
                          data-testid="summary-ready-file-input"
                        />
                      </label>

                      {summaryForm.attachments?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {summaryForm.attachments.map((att) => (
                            <div
                              key={att.id}
                              className="flex items-center gap-2 pl-3 pr-1.5 py-1 min-h-[40px] bg-white border-2 border-black rounded-xl text-xs font-bold"
                            >
                              {isImageAttachment(att) ? (
                                <ImageIcon className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                              )}
                              <span className="max-w-[180px] truncate">
                                {att.original_filename}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeSummaryAttachment(att.id)}
                                aria-label="Remover arquivo"
                                className="min-w-[32px] min-h-[32px] flex items-center justify-center rounded-lg text-rose-700 hover:bg-rose-100"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-heading font-black uppercase text-black mb-1">
                        Texto do Resumo (opcional se houver anexo — aceita Markdown e $LaTeX$)
                      </label>
                      <textarea
                        rows={7}
                        value={summaryForm.summary_text}
                        onChange={(e) =>
                          setSummaryForm({ ...summaryForm, summary_text: e.target.value })
                        }
                        placeholder="Cole aqui seu resumo pronto..."
                        className="nb-input resize-y font-body text-sm leading-relaxed"
                        data-testid="summary-editor-textarea"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-xs font-heading font-black uppercase text-black mb-1">
                          Conceitos-Chave (vírgula, opcional)
                        </label>
                        <input
                          type="text"
                          value={summaryForm.key_concepts}
                          onChange={(e) =>
                            setSummaryForm({ ...summaryForm, key_concepts: e.target.value })
                          }
                          placeholder="Ex: Raiz, Coeficiente angular"
                          className="nb-input min-h-[44px] text-xs sm:text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-heading font-black uppercase text-black mb-1">
                          Fórmulas (vírgula, opcional)
                        </label>
                        <input
                          type="text"
                          value={summaryForm.formulas}
                          onChange={(e) =>
                            setSummaryForm({ ...summaryForm, formulas: e.target.value })
                          }
                          placeholder="Ex: $f(x) = ax + b$"
                          className="nb-input min-h-[44px] font-mono text-xs sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer com ações touch >= 44px */}
              <div className="p-3.5 sm:p-4 bg-neutral-100 border-t-2 border-black flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(false)}
                  className="nb-btn min-h-[44px] px-4 bg-white hover:bg-neutral-200 text-black font-heading font-bold text-xs uppercase rounded-xl border-2 border-black"
                >
                  Cancelar
                </button>

                <div className="grid grid-cols-1 sm:flex items-center gap-2">
                  <button
                    type="button"
                    disabled={
                      savingSummaryEditor ||
                      uploadingSummaryFiles ||
                      (!summaryForm.summary_text.trim() &&
                        !(summaryForm.attachments?.length > 0))
                    }
                    onClick={() =>
                      handleSaveSummaryModal(null, { publishAfterSave: false })
                    }
                    className="nb-btn min-h-[44px] px-4 bg-amber-300 hover:bg-amber-400 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black disabled:opacity-45"
                    data-testid="save-summary-draft-btn"
                  >
                    {savingSummaryEditor ? "Salvando..." : "Salvar Rascunho"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      savingSummaryEditor ||
                      uploadingSummaryFiles ||
                      (!summaryForm.summary_text.trim() &&
                        !(summaryForm.attachments?.length > 0))
                    }
                    onClick={() =>
                      handleSaveSummaryModal(null, { publishAfterSave: true })
                    }
                    className="nb-btn min-h-[44px] px-4 bg-emerald-400 hover:bg-emerald-300 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black flex items-center justify-center gap-1.5 disabled:opacity-45"
                    data-testid="save-and-publish-summary-btn"
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {editingSummaryItem?.is_published
                        ? "Salvar Alterações"
                        : "Salvar e Disponibilizar"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal Preview Completo */}
      {previewSummary && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 p-0 sm:p-5 backdrop-blur-sm">
            <div className="nb-card relative w-full max-w-4xl bg-white rounded-t-3xl sm:rounded-2xl border-3 border-black shadow-[8px_8px_0_0_#000] flex flex-col max-h-[92vh] overflow-hidden">
              <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b-2 border-black flex items-start justify-between gap-3 shrink-0 bg-white">
                <div className="min-w-0">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-neutral-600 mb-0.5">
                    {previewSummary.subject}
                  </div>
                  <h2 className="text-lg sm:text-xl font-heading font-black text-black leading-tight">
                    {previewSummary.topic}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewSummary(null)}
                  aria-label="Fechar visualização"
                  className="min-w-[44px] min-h-[44px] rounded-xl bg-neutral-100 hover:bg-neutral-200 border-2 border-black flex items-center justify-center shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
                {previewSummary.summary_text?.trim() && (
                  <MarkdownSummaryViewer
                    markdown={previewSummary.summary_text}
                    title={previewSummary.topic}
                    subtitle={`Matéria: ${previewSummary.subject}`}
                    subjects={[previewSummary.subject]}
                    showToolbar={true}
                  />
                )}

                {getSummaryAttachments(previewSummary).length > 0 && (
                  <div className="bg-emerald-50 p-4 rounded-2xl border-2 border-black space-y-3">
                    <h4 className="font-heading font-black text-xs sm:text-sm uppercase text-black flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-emerald-700" />
                      <span>Arquivos do Resumo Pronto:</span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {getSummaryAttachments(previewSummary).map((att) =>
                        isImageAttachment(att) ? (
                          <button
                            key={att.id}
                            type="button"
                            onClick={() => setPreviewImageId(att.id)}
                            className="group relative rounded-xl border-2 border-black overflow-hidden bg-white text-left"
                          >
                            <img
                              src={`/api/files/${att.id}?auth=${encodeURIComponent((typeof window !== "undefined" ? localStorage.getItem("auth_token") : "") || "")}`}
                              alt={att.original_filename}
                              className="w-full h-44 object-cover"
                            />
                            <div className="px-3 py-2 border-t-2 border-black flex items-center justify-between text-xs font-black">
                              <span className="truncate">{att.original_filename}</span>
                              <Eye className="w-4 h-4 shrink-0" />
                            </div>
                          </button>
                        ) : (
                          <a
                            key={att.id}
                            href={getFileDownloadUrl(att.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-2 px-4 min-h-[48px] bg-white hover:bg-amber-100 border-2 border-black rounded-xl text-xs font-heading font-black text-black"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                              <span className="truncate">{att.original_filename}</span>
                            </div>
                            <Download className="w-4 h-4 shrink-0" />
                          </a>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-4 py-3 sm:px-6 border-t-2 border-black bg-neutral-50 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const target = previewSummary;
                    setPreviewSummary(null);
                    setDispatchSummaryItem(target);
                  }}
                  className="nb-btn min-h-[44px] px-4 bg-emerald-300 hover:bg-emerald-400 text-emerald-950 font-heading font-black text-xs uppercase rounded-xl border-2 border-black flex items-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Disparar no WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewSummary(null)}
                  className="nb-btn min-h-[44px] px-5 bg-white hover:bg-neutral-100 text-black font-heading font-bold text-xs uppercase rounded-xl border-2 border-black"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Lightbox de Imagem */}
      {previewImageId && (
        <ModalPortal>
          <div
            onClick={() => setPreviewImageId(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm cursor-pointer"
          >
            <div className="nb-card relative max-w-4xl max-h-[90vh] bg-white p-3 rounded-2xl border-2 border-black">
              <button
                type="button"
                onClick={() => setPreviewImageId(null)}
                aria-label="Fechar imagem"
                className="nb-btn absolute -top-4 -right-4 min-w-[44px] min-h-[44px] bg-amber-300 text-black font-black border-2 border-black rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={`/api/files/${previewImageId}?auth=${encodeURIComponent((typeof window !== "undefined" ? localStorage.getItem("auth_token") : "") || "")}`}
                alt="Visualização do anexo"
                className="max-h-[80vh] w-auto rounded-xl object-contain"
              />
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Diálogo de Disparo Manual no WhatsApp */}
      <WhatsAppDispatchDialog
        open={Boolean(dispatchSummaryItem)}
        onClose={() => setDispatchSummaryItem(null)}
        type="summary"
        item={dispatchSummaryItem}
      />
    </div>
  );
}
