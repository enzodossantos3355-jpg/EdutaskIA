import { useState, useEffect, useMemo } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import ModalPortal from "@/components/ModalPortal";
import MarkdownSummaryViewer from "@/components/MarkdownSummaryViewer";
import { MathRenderer, hasLatexMath } from "@/lib/mathUtils";
import { getSubjectColorConfig } from "@/lib/subjectColors";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import {
  listDriveFiles,
  uploadFileToDrive,
  getOrCreateSubjectFolder,
  syncAllSubjectFoldersToDrive,
} from "@/lib/googleDrive";
import {
  BookOpen,
  Upload,
  Sparkles,
  Edit2,
  Trash2,
  Plus,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileText,
  Eye,
  EyeOff,
  Cpu,
  Cloud,
  FolderCheck,
  Layers,
  Check,
  Folder,
  Send,
  BellRing,
  ChevronDown,
  ChevronUp,
  Calculator,
  Wand2,
  SlidersHorizontal,
  ListChecks,
  Search,
  Square,
  CheckSquare,
} from "lucide-react";

const SUMMARY_MODEL_OPTIONS = [
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash (Recomendado)", desc: "Velocidade máxima e precisão multimodal avançada." },
  { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", desc: "Desempenho estável para análise de documentos e imagens." },
  { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite", desc: "Modelo ultra rápido para síntese instantânea." },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "Excelente para leitura de tabelas e fórmulas." },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", desc: "Análise profunda e raciocínio pedagógico avançado." },
];

const TONE_OPTIONS = [
  { id: "completo", label: "Completo & Didático" },
  { id: "objetivo", label: "Direto para Revisão" },
  { id: "formulas", label: "Foco em Fórmulas & Exemplos" },
];

export default function AdminResumosPanel() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [activeSection, setActiveSection] = useState("topics"); // 'topics' | 'resumos'

  // Dados separados: Tópicos vs Resumos
  const [topics, setTopics] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros e buscas
  const [topicSearch, setTopicSearch] = useState("");
  const [summarySearch, setSummarySearch] = useState("");
  const [summaryStageFilter, setSummaryStageFilter] = useState("all"); // 'all' | 'draft' | 'published'

  // Seleção de tópicos para gerar resumo
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);
  const [genTitle, setGenTitle] = useState("");
  const [genTone, setGenTone] = useState("completo");
  const [genInstructions, setGenInstructions] = useState("");
  const [generatingFromTopics, setGeneratingFromTopics] = useState(false);

  // AI Model & Google Drive drawer
  const [showInfraConfig, setShowInfraConfig] = useState(false);
  const [summaryModel, setSummaryModel] = useState("gemini-3.8-flash");
  const [savingModel, setSavingModel] = useState(false);

  // Extração de Tópicos por Matéria
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [sourceNotes, setSourceNotes] = useState("");
  const [processingSource, setProcessingSource] = useState(false);
  const [deduplicating, setDeduplicating] = useState(false);

  // Ações assíncronas nos resumos
  const [publishingSummaryId, setPublishingSummaryId] = useState(null);
  const [regeneratingSummaryId, setRegeneratingSummaryId] = useState(null);

  // Google Drive integration
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);
  const [googleDriveAccessToken, setGoogleDriveAccessToken] = useState("");
  const [googleDriveFiles, setGoogleDriveFiles] = useState([]);
  const [loadingGoogleDrive, setLoadingGoogleDrive] = useState(false);
  const [uploadingToDrive, setUploadingToDrive] = useState(false);
  const [syncingFolders, setSyncingFolders] = useState(false);
  const [oauthErrorNotice, setOauthErrorNotice] = useState(null);
  const [showDrivePicker, setShowDrivePicker] = useState(false);

  // Modal de Tópico (Criar / Editar Tópico separado)
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingTopicItem, setEditingTopicItem] = useState(null);
  const [savingTopic, setSavingTopic] = useState(false);
  const [topicForm, setTopicForm] = useState({
    subject: "",
    topic: "",
    extracted_notes: "",
    key_concepts: "",
    formulas: "",
  });

  // Modal de Resumo (Criar Manual / Editar / Preview KaTeX)
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [editingSummaryItem, setEditingSummaryItem] = useState(null);
  const [editorViewTab, setEditorViewTab] = useState("edit"); // 'edit' | 'preview'
  const [editorAiTone, setEditorAiTone] = useState("completo");
  const [editorAiInstructions, setEditorAiInstructions] = useState("");
  const [regeneratingInEditor, setRegeneratingInEditor] = useState(false);
  const [savingSummaryEditor, setSavingSummaryEditor] = useState(false);
  const [summaryForm, setSummaryForm] = useState({
    subject: "",
    topic: "",
    extracted_notes: "",
    summary_text: "",
    key_concepts: "",
    formulas: "",
    is_published: false,
  });

  // Leitura / Preview e Lightbox
  const [previewSummary, setPreviewSummary] = useState(null);
  const [previewImageId, setPreviewImageId] = useState(null);

  useEffect(() => {
    loadAllData();
    loadAppStatus();
  }, []);

  const loadAppStatus = async () => {
    try {
      const { data } = await api.get("/app-status");
      if (data?.summary_ai_model) {
        setSummaryModel(data.summary_ai_model);
      }
    } catch {}
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [subjRes, topicsRes, sumsRes] = await Promise.all([
        api.get("/subjects"),
        api.get("/admin/summary-topics"),
        api.get("/summaries"),
      ]);
      const subjList = subjRes.data || [];
      setSubjects(subjList);
      if (subjList.length > 0 && !selectedSubject) {
        setSelectedSubject(subjList[0].name);
      }
      setTopics(topicsRes.data || []);
      setSummaries(sumsRes.data || []);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const reloadTopicsAndSummaries = async () => {
    try {
      const [topicsRes, sumsRes] = await Promise.all([
        api.get("/admin/summary-topics"),
        api.get("/summaries"),
      ]);
      setTopics(topicsRes.data || []);
      setSummaries(sumsRes.data || []);
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  // Quando muda a matéria, limpa seleção de tópicos para garantir coerência por matéria
  const handleSelectSubject = (subjName) => {
    setSelectedSubject(subjName);
    setSelectedTopicIds([]);
    setGenTitle("");
  };

  const handleConnectGoogleDrive = async () => {
    setOauthErrorNotice(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/drive");
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        setGoogleDriveAccessToken(token);
        setGoogleDriveConnected(true);
        toast.success("Google Drive do Administrador conectado com sucesso!");
        syncSubjectFolders(token);
        fetchAdminGoogleDriveFiles(token);
      } else {
        toast.error("Não foi possível obter o token de acesso do Google Drive.");
      }
    } catch (err) {
      console.warn("Google Drive login error:", err);
      const code = err?.code || "";
      const msg = err?.message || "";
      setShowInfraConfig(true);

      if (code === "auth/popup-closed-by-user") {
        toast.info("A janela de login do Google foi fechada antes de concluir.");
      } else if (code === "auth/unauthorized-domain" || msg.includes("unauthorized-domain")) {
        const domain = typeof window !== "undefined" ? window.location.hostname : "seu-app.onrender.com";
        setOauthErrorNotice({
          type: "unauthorized_domain",
          title: "Domínio Não Autorizado no Firebase",
          message: `Adicione o domínio ${domain} em Firebase Console > Authentication > Configurações > Domínios autorizados.`,
        });
        toast.error(`Domínio "${domain}" não autorizado no Firebase Auth.`);
      } else if (
        code === "auth/access-blocked" ||
        msg.toLowerCase().includes("test") ||
        msg.toLowerCase().includes("verif") ||
        msg.toLowerCase().includes("não verificado")
      ) {
        setOauthErrorNotice({
          type: "testing_mode",
          title: "App em Modo de Testes (Google Cloud)",
          message:
            "Na janela do Google, clique em 'Avançado' e depois em 'Acessar (não seguro)' ou adicione seu Gmail em Usuários de Teste no Google Cloud.",
        });
        toast.error("App Google em modo de testes. Siga as instruções na tela.");
      } else {
        setOauthErrorNotice({
          type: "general",
          title: "Falha na Conexão do Google Drive",
          message: msg || "Verifique se o login do Google está habilitado no Firebase Console.",
        });
        toast.error(msg || "Falha ao conectar com o Google Drive");
      }
    }
  };

  const syncSubjectFolders = async (token = googleDriveAccessToken) => {
    if (!token) return;
    setSyncingFolders(true);
    try {
      const mapping = await syncAllSubjectFoldersToDrive(token, subjects);
      toast.success(`Pastas sincronizadas no Drive para ${Object.keys(mapping).length} matéria(s)!`);
    } catch (err) {
      toast.error(err.message || "Erro ao sincronizar pastas de matérias no Drive");
    } finally {
      setSyncingFolders(false);
    }
  };

  const fetchAdminGoogleDriveFiles = async (token) => {
    setLoadingGoogleDrive(true);
    try {
      const files = await listDriveFiles(token);
      setGoogleDriveFiles(files);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingGoogleDrive(false);
    }
  };

  const handleUploadToGoogleDrive = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !googleDriveAccessToken) return;

    setUploadingToDrive(true);
    try {
      const targetSub = selectedSubject || "Geral";
      const { subjectFolderId } = await getOrCreateSubjectFolder(googleDriveAccessToken, targetSub);
      await uploadFileToDrive(googleDriveAccessToken, file, file.name, file.type, subjectFolderId);
      toast.success(`Foto enviada para a pasta "${targetSub}" no Drive!`);
      fetchAdminGoogleDriveFiles(googleDriveAccessToken);
    } catch (err) {
      toast.error(err.message || "Erro ao enviar para o Google Drive");
    } finally {
      setUploadingToDrive(false);
    }
  };

  const handleSaveModel = async (newModel) => {
    setSummaryModel(newModel);
    setSavingModel(true);
    try {
      await api.put("/admin/summaries/model", { summary_ai_model: newModel });
      toast.success("Modelo de IA para resumos atualizado!");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSavingModel(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...fileList]);
    }
    e.target.value = "";
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeduplicate = async () => {
    setDeduplicating(true);
    try {
      const { data } = await api.post("/admin/summary-topics/deduplicate");
      if (data?.ok) {
        if (data.merged_count > 0) {
          toast.success(`${data.merged_count} item(ns) duplicado(s) unificado(s)!`);
        } else {
          toast.info("Nenhum tópico ou resumo duplicado encontrado.");
        }
        await reloadTopicsAndSummaries();
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setDeduplicating(false);
    }
  };

  // ETAPA 1: Extrair tópicos para a fila de Tópicos (separada dos Resumos)
  const handleExtractTopics = async () => {
    if (processingSource) return;
    if (!selectedSubject) {
      toast.error("Selecione uma matéria antes de extrair os tópicos.");
      return;
    }
    if (selectedFiles.length === 0 && !sourceNotes.trim()) {
      toast.error("Anexe fotos do conteúdo ou escreva anotações para extrair os tópicos.");
      return;
    }

    setProcessingSource(true);
    try {
      if (googleDriveConnected && googleDriveAccessToken && selectedFiles.length > 0) {
        try {
          const targetSub = selectedSubject || "Geral";
          const { subjectFolderId } = await getOrCreateSubjectFolder(googleDriveAccessToken, targetSub);
          for (const f of selectedFiles) {
            if (f instanceof File) {
              await uploadFileToDrive(googleDriveAccessToken, f, f.name, f.type, subjectFolderId).catch(() => {});
            }
          }
          fetchAdminGoogleDriveFiles(googleDriveAccessToken);
        } catch {}
      }

      const bodyFormData = new FormData();
      bodyFormData.append("subject", selectedSubject);
      if (sourceNotes.trim()) {
        bodyFormData.append("notes", sourceNotes.trim());
      }
      selectedFiles.forEach((file) => {
        if (file instanceof File) {
          bodyFormData.append("images", file);
        }
      });

      const { data } = await api.post("/admin/summaries/process-source", bodyFormData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data?.ok) {
        const count = (data.topics || []).length || 1;
        toast.success(
          `${count} tópico(s) extraído(s) em "${selectedSubject}"! Selecione os tópicos abaixo para gerar um resumo.`
        );
        setSelectedFiles([]);
        setSourceNotes("");
        setActiveSection("topics");
        await reloadTopicsAndSummaries();
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setProcessingSource(false);
    }
  };

  // Toggle seleção de tópico para geração de resumo
  const toggleTopicSelection = (topicId) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const handleSelectAllFilteredTopics = () => {
    const filteredIds = filteredTopics.map((t) => t.id);
    const allSelected =
      filteredIds.length > 0 && filteredIds.every((id) => selectedTopicIds.includes(id));
    if (allSelected) {
      setSelectedTopicIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedTopicIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  // ETAPA 2: Gerar Resumo a partir dos tópicos selecionados (por matéria & tópicos)
  const handleGenerateSummaryFromTopics = async ({
    topicIdsOverride = null,
    publishNow = false,
  } = {}) => {
    const targetIds = topicIdsOverride || selectedTopicIds;
    if (!targetIds || targetIds.length === 0) {
      toast.error("Marque pelo menos um tópico para gerar o resumo.");
      return;
    }

    setGeneratingFromTopics(true);
    try {
      const { data } = await api.post("/admin/summaries/generate-from-topics", {
        subject: selectedSubject,
        topic_ids: targetIds,
        custom_title: topicIdsOverride ? "" : genTitle.trim(),
        tone: genTone,
        instructions: genInstructions.trim(),
        publish_now: publishNow,
      });

      if (data?.ok && data.summary) {
        if (publishNow) {
          const sent = data?.push?.sent || 0;
          toast.success(
            sent > 0
              ? `Resumo gerado e disponibilizado em ${selectedSubject}! Notificação enviada para ${sent} dispositivo(s).`
              : `Resumo gerado e disponibilizado aos alunos em ${selectedSubject}!`
          );
        } else {
          toast.success(
            `Resumo "${data.summary.topic}" gerado como rascunho! Revise na aba Resumos e disponibilize quando desejar.`
          );
        }
        if (!topicIdsOverride) {
          setSelectedTopicIds([]);
          setGenTitle("");
          setGenInstructions("");
        }
        setActiveSection("resumos");
        setSummaryStageFilter(publishNow ? "published" : "all");
        await reloadTopicsAndSummaries();
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setGeneratingFromTopics(false);
    }
  };

  // CRUD de Tópicos (Aba 1)
  const openCreateTopicModal = () => {
    setEditingTopicItem(null);
    setTopicForm({
      subject: selectedSubject || subjects[0]?.name || "",
      topic: "",
      extracted_notes: "",
      key_concepts: "",
      formulas: "",
    });
    setShowTopicModal(true);
  };

  const openEditTopicModal = (topicItem) => {
    setEditingTopicItem(topicItem);
    setTopicForm({
      subject: topicItem.subject || selectedSubject || "",
      topic: topicItem.topic || "",
      extracted_notes: topicItem.extracted_notes || "",
      key_concepts: (topicItem.key_concepts || []).join(", "),
      formulas: (topicItem.formulas || []).join(", "),
    });
    setShowTopicModal(true);
  };

  const handleSaveTopicModal = async (e) => {
    e.preventDefault();
    if (!topicForm.subject.trim() || !topicForm.topic.trim()) {
      toast.error("Matéria e Nome do Tópico são obrigatórios.");
      return;
    }
    setSavingTopic(true);
    const payload = {
      subject: topicForm.subject.trim(),
      topic: topicForm.topic.trim(),
      extracted_notes: topicForm.extracted_notes.trim(),
      key_concepts: topicForm.key_concepts
        ? topicForm.key_concepts.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      formulas: topicForm.formulas
        ? topicForm.formulas.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    };
    try {
      if (editingTopicItem) {
        await api.put(`/admin/summary-topics/${editingTopicItem.id}`, payload);
        toast.success("Tópico atualizado!");
      } else {
        await api.post("/admin/summary-topics", payload);
        toast.success("Novo tópico cadastrado!");
      }
      setShowTopicModal(false);
      await reloadTopicsAndSummaries();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSavingTopic(false);
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!confirm("Tem certeza que deseja excluir este tópico?")) return;
    try {
      await api.delete(`/admin/summary-topics/${topicId}`);
      setSelectedTopicIds((prev) => prev.filter((id) => id !== topicId));
      toast.success("Tópico removido!");
      await reloadTopicsAndSummaries();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  // CRUD, Regeração & Disponibilização de Resumos (Aba 2)
  const openCreateSummaryModal = () => {
    setEditingSummaryItem(null);
    setEditorViewTab("edit");
    setEditorAiInstructions("");
    setSummaryForm({
      subject: selectedSubject || subjects[0]?.name || "",
      topic: "",
      extracted_notes: "",
      summary_text: "",
      key_concepts: "",
      formulas: "",
      is_published: false,
    });
    setShowSummaryModal(true);
  };

  const openEditSummaryModal = (summaryItem) => {
    setEditingSummaryItem(summaryItem);
    setEditorViewTab("edit");
    setEditorAiInstructions("");
    setSummaryForm({
      subject: summaryItem.subject || selectedSubject || "",
      topic: summaryItem.topic || "",
      extracted_notes: summaryItem.extracted_notes || "",
      summary_text: summaryItem.summary_text || "",
      key_concepts: (summaryItem.key_concepts || []).join(", "),
      formulas: (summaryItem.formulas || []).join(", "),
      is_published: Boolean(summaryItem.is_published),
    });
    setShowSummaryModal(true);
  };

  const handleRegenerateSummary = async (summaryItem, { tone = "completo", instructions = "" } = {}) => {
    setRegeneratingSummaryId(summaryItem.id);
    try {
      const { data } = await api.post(`/admin/summaries/${summaryItem.id}/regenerate`, {
        tone,
        instructions,
      });
      if (data?.ok && data.summary) {
        toast.success(`Resumo "${summaryItem.topic}" regerado com IA!`);
        await reloadTopicsAndSummaries();
        return data.summary;
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setRegeneratingSummaryId(null);
    }
    return null;
  };

  const handleRegenerateInsideEditor = async () => {
    if (!editingSummaryItem) return;
    setRegeneratingInEditor(true);
    try {
      await api.put(`/admin/summaries/${editingSummaryItem.id}`, {
        subject: summaryForm.subject.trim(),
        topic: summaryForm.topic.trim(),
        extracted_notes: summaryForm.extracted_notes,
        key_concepts: summaryForm.key_concepts
          ? summaryForm.key_concepts.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        formulas: summaryForm.formulas
          ? summaryForm.formulas.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      });

      const { data } = await api.post(`/admin/summaries/${editingSummaryItem.id}/regenerate`, {
        tone: editorAiTone,
        instructions: editorAiInstructions,
      });

      if (data?.ok && data.summary) {
        const updated = data.summary;
        setEditingSummaryItem(updated);
        setSummaryForm((prev) => ({
          ...prev,
          summary_text: updated.summary_text || "",
          key_concepts: (updated.key_concepts || []).join(", "),
          formulas: (updated.formulas || []).join(", "),
        }));
        toast.success("Resumo regerado com IA! Confira na aba Preview do Aluno.");
        await reloadTopicsAndSummaries();
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setRegeneratingInEditor(false);
    }
  };

  const handleSaveSummaryModal = async (e, { publishAfterSave = false } = {}) => {
    if (e) e.preventDefault();
    if (!summaryForm.subject.trim() || !summaryForm.topic.trim() || !summaryForm.summary_text.trim()) {
      toast.error("Matéria, Título e Conteúdo do Resumo são obrigatórios.");
      return;
    }

    setSavingSummaryEditor(true);
    const payload = {
      subject: summaryForm.subject.trim(),
      topic: summaryForm.topic.trim(),
      extracted_notes: summaryForm.extracted_notes.trim(),
      summary_text: summaryForm.summary_text,
      key_concepts: summaryForm.key_concepts
        ? summaryForm.key_concepts.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      formulas: summaryForm.formulas
        ? summaryForm.formulas.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      is_published: publishAfterSave ? true : summaryForm.is_published,
    };

    try {
      if (editingSummaryItem) {
        await api.put(`/admin/summaries/${editingSummaryItem.id}`, payload);
        if (publishAfterSave && !editingSummaryItem.is_published) {
          const pubRes = await api.post(`/admin/summaries/${editingSummaryItem.id}/publish`, { notify: true });
          const sent = pubRes.data?.push?.sent || 0;
          toast.success(
            sent > 0
              ? `Resumo salvo e disponibilizado! Notificação enviada para ${sent} dispositivo(s).`
              : "Resumo salvo e disponibilizado para os alunos!"
          );
        } else {
          toast.success("Resumo atualizado!");
        }
      } else {
        const res = await api.post("/admin/summaries", payload);
        const sent = res.data?.push?.sent || 0;
        toast.success(
          publishAfterSave
            ? sent > 0
              ? `Resumo criado e disponibilizado! Notificação enviada para ${sent} dispositivo(s).`
              : "Resumo criado e disponibilizado para os alunos!"
            : "Resumo salvo como rascunho privado!"
        );
      }
      setShowSummaryModal(false);
      setActiveSection("resumos");
      await reloadTopicsAndSummaries();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSavingSummaryEditor(false);
    }
  };

  const handlePublishSummary = async (summaryItem, { isRebroadcast = false } = {}) => {
    if (!summaryItem.summary_text || !summaryItem.summary_text.trim()) {
      toast.error("Escreva o conteúdo do resumo antes de disponibilizar para os alunos.");
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
          toast.success(`Resumo "${summaryItem.topic}" disponibilizado em ${summaryItem.subject}! (Push desativado nas configurações)`);
        } else if (sent > 0) {
          toast.success(`Resumo disponibilizado em ${summaryItem.subject}! Notificação enviada para ${sent} dispositivo(s).`);
        } else {
          toast.success(`Resumo "${summaryItem.topic}" disponibilizado para os alunos em ${summaryItem.subject}!`);
        }
        await reloadTopicsAndSummaries();
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
      toast.info(`"${summaryItem.topic}" foi ocultado dos alunos e voltou para rascunho.`);
      await reloadTopicsAndSummaries();
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
      await reloadTopicsAndSummaries();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  // Listas filtradas por Matéria selecionada
  const subjectTopics = useMemo(
    () =>
      topics.filter(
        (t) => t.subject.toLowerCase() === (selectedSubject || "").toLowerCase()
      ),
    [topics, selectedSubject]
  );

  const filteredTopics = useMemo(() => {
    const q = topicSearch.trim().toLowerCase();
    if (!q) return subjectTopics;
    return subjectTopics.filter(
      (t) =>
        t.topic.toLowerCase().includes(q) ||
        (t.extracted_notes || "").toLowerCase().includes(q) ||
        (t.key_concepts || []).some((c) => c.toLowerCase().includes(q))
    );
  }, [subjectTopics, topicSearch]);

  const selectedTopicsList = useMemo(
    () => subjectTopics.filter((t) => selectedTopicIds.includes(t.id)),
    [subjectTopics, selectedTopicIds]
  );

  const subjectSummaries = useMemo(
    () =>
      summaries.filter(
        (s) => s.subject.toLowerCase() === (selectedSubject || "").toLowerCase()
      ),
    [summaries, selectedSubject]
  );

  const summaryCounts = useMemo(() => {
    let draft = 0;
    let published = 0;
    for (const s of subjectSummaries) {
      if (s.is_published) published++;
      else draft++;
    }
    return { draft, published, total: subjectSummaries.length };
  }, [subjectSummaries]);

  const filteredSummaries = useMemo(() => {
    const q = summarySearch.trim().toLowerCase();
    return subjectSummaries.filter((s) => {
      if (summaryStageFilter === "published" && !s.is_published) return false;
      if (summaryStageFilter === "draft" && s.is_published) return false;
      if (!q) return true;
      return (
        s.topic.toLowerCase().includes(q) ||
        (s.summary_text || "").toLowerCase().includes(q) ||
        (s.source_topic_titles || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [subjectSummaries, summaryStageFilter, summarySearch]);

  return (
    <div className="space-y-6" data-testid="admin-resumos-panel">
      {/* Header Banner */}
      <div className="nb-card bg-amber-300 p-5 sm:p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-xl bg-amber-400 text-black border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#000]">
            <BookOpen className="w-6 h-6 text-black" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-black text-black uppercase tracking-tight">
              Tópicos & Resumos por Matéria
            </h1>
            <p className="text-xs sm:text-sm font-bold text-neutral-800 mt-0.5 font-body">
              Tópicos separados dos Resumos: extraia e escolha os tópicos desejados para gerar o resumo e depois disponibilize aos alunos.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowInfraConfig((v) => !v)}
            className={`nb-btn px-3.5 py-2 text-xs font-heading font-black uppercase rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-1.5 ${
              showInfraConfig ? "bg-sky-300 text-black" : "bg-white hover:bg-neutral-100 text-black"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Drive & Modelo IA</span>
            {showInfraConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleDeduplicate}
            disabled={deduplicating}
            className="nb-btn px-3.5 py-2 bg-white hover:bg-neutral-100 text-black font-heading font-black rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-1.5 text-xs uppercase"
          >
            {deduplicating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4 text-sky-600" />}
            <span>{deduplicating ? "Mesclando..." : "Mesclar Duplicados"}</span>
          </button>

          <button
            type="button"
            onClick={openCreateTopicModal}
            className="nb-btn px-3.5 py-2 bg-amber-400 hover:bg-amber-200 text-black font-heading font-black rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-1.5 text-xs uppercase"
            data-testid="create-manual-topic-btn"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Novo Tópico</span>
          </button>

          <button
            type="button"
            onClick={openCreateSummaryModal}
            className="nb-btn px-3.5 py-2 bg-emerald-300 hover:bg-emerald-400 text-black font-heading font-black rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-1.5 text-xs uppercase"
            data-testid="create-manual-summary-btn"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Novo Resumo</span>
          </button>
        </div>
      </div>

      {/* Collapsible Drive & AI Model Settings */}
      {showInfraConfig && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 animate-in fade-in duration-150">
          <div className="nb-card bg-sky-50 p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#000]">
                  <Cloud className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <h3 className="text-sm font-heading font-black text-sky-950 uppercase">
                    Google Drive do Administrador
                  </h3>
                  <p className="text-[11px] font-bold text-neutral-700">
                    {googleDriveConnected
                      ? "Conectado! Fotos salvas automaticamente em pastas por matéria."
                      : "Conecte para organizar fotos fontes em pastas por matéria."}
                  </p>
                </div>
              </div>

              {!googleDriveConnected ? (
                <button
                  type="button"
                  onClick={handleConnectGoogleDrive}
                  className="nb-btn px-3.5 py-2 bg-white hover:bg-neutral-100 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-2 shrink-0"
                >
                  <Cloud className="w-4 h-4 text-sky-600" />
                  <span>Conectar Drive</span>
                </button>
              ) : (
                <span className="nb-badge bg-emerald-200 text-emerald-950 font-heading font-black text-xs border-2 border-black inline-flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Conectado
                </span>
              )}
            </div>

            {googleDriveConnected && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-black/15">
                <button
                  type="button"
                  onClick={() => syncSubjectFolders()}
                  disabled={syncingFolders}
                  className="nb-btn px-3 py-1.5 bg-white hover:bg-neutral-100 text-black font-heading font-black text-[11px] uppercase rounded-lg border-2 border-black flex items-center gap-1.5"
                >
                  {syncingFolders ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderCheck className="w-3.5 h-3.5 text-sky-600" />}
                  <span>Sincronizar Pastas</span>
                </button>
                <input
                  type="file"
                  id="admin-drive-upload"
                  accept="image/*"
                  onChange={handleUploadToGoogleDrive}
                  className="hidden"
                />
                <label
                  htmlFor="admin-drive-upload"
                  className="nb-btn px-3 py-1.5 bg-amber-300 hover:bg-amber-400 text-black font-heading font-black text-[11px] uppercase rounded-lg border-2 border-black cursor-pointer flex items-center gap-1.5"
                >
                  {uploadingToDrive ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>Subir p/ "{selectedSubject || "Geral"}"</span>
                </label>
              </div>
            )}

            {oauthErrorNotice && (
              <div className="bg-rose-100 border-2 border-rose-600 p-3 rounded-xl text-xs text-rose-950">
                <div className="font-black flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>{oauthErrorNotice.title}</span>
                </div>
                <p className="text-[11px] mt-1">{oauthErrorNotice.message}</p>
              </div>
            )}
          </div>

          <div className="nb-card bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-heading font-black text-black uppercase flex items-center gap-2">
                <Cpu className="w-5 h-5 text-sky-600" />
                <span>Modelo de IA para Resumos</span>
              </h3>
              {savingModel && <span className="text-xs font-bold text-sky-600 animate-pulse">Salvando...</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUMMARY_MODEL_OPTIONS.map((opt) => {
                const isSelected = summaryModel === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSaveModel(opt.id)}
                    className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? "bg-amber-300 border-black text-black shadow-[2px_2px_0_0_#000]"
                        : "bg-neutral-50 hover:bg-neutral-100 border-black/30 text-neutral-900"
                    }`}
                  >
                    <div className="text-[11px] font-heading font-black uppercase flex items-center justify-between gap-1">
                      <span className="truncate">{opt.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3] shrink-0" />}
                    </div>
                    <div className="text-[10px] text-neutral-700 mt-0.5 line-clamp-1">{opt.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Subject Selection Strip */}
      <div className="nb-card bg-white p-4 sm:p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <label className="text-xs font-heading font-black uppercase text-black flex items-center gap-1.5">
            <Folder className="w-4 h-4 text-amber-600" />
            <span>Escolha a Matéria:</span>
          </label>
          <span className="text-[11px] font-bold text-neutral-600 tabular-nums">
            Total geral: {topics.length} tópico(s) • {summaries.length} resumo(s)
          </span>
        </div>

        {subjects.length === 0 ? (
          <p className="text-sm font-bold text-neutral-500">Cadastre matérias primeiro na aba "Matérias".</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => {
              const tCount = topics.filter((t) => t.subject.toLowerCase() === s.name.toLowerCase()).length;
              const sCount = summaries.filter((sum) => sum.subject.toLowerCase() === s.name.toLowerCase()).length;
              const isSelected = selectedSubject.toLowerCase() === s.name.toLowerCase();
              const cfg = getSubjectColorConfig(s.name, subjects);

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectSubject(s.name)}
                  className={`nb-btn px-3.5 py-2 rounded-xl text-xs sm:text-sm font-heading font-black uppercase border-2 border-black transition-all flex items-center gap-2 ${
                    isSelected
                      ? "bg-amber-300 text-black shadow-[3px_3px_0_0_#000] -translate-y-0.5"
                      : `${cfg.bgClass} ${cfg.textClass} hover:brightness-95 shadow-[2px_2px_0_0_#000]`
                  }`}
                  data-testid={`resumos-subject-tab-${s.name}`}
                >
                  <span>{s.name}</span>
                  {tCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-white text-black border border-black rounded text-[10px] font-black tabular-nums" title="Tópicos salvos">
                      {tCount} tóp.
                    </span>
                  )}
                  {sCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-emerald-300 text-emerald-950 border border-black rounded text-[10px] font-black tabular-nums" title="Resumos criados">
                      {sCount} res.
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Separated Section Tabs: Tópicos vs Resumos */}
      {selectedSubject && (
        <div className="flex flex-wrap items-center gap-3 border-b-3 border-black pb-3">
          <button
            type="button"
            onClick={() => setActiveSection("topics")}
            className={`nb-btn px-5 py-2.5 rounded-xl border-2 border-black font-heading font-black text-xs sm:text-sm uppercase flex items-center gap-2 transition-all tabular-nums ${
              activeSection === "topics"
                ? "bg-sky-300 text-black shadow-[3px_3px_0_0_#000]"
                : "bg-white text-black hover:bg-sky-50 shadow-[2px_2px_0_0_#000]"
            }`}
            data-testid="admin-tab-topics"
          >
            <ListChecks className="w-4 h-4" />
            <span>1. Tópicos de {selectedSubject} ({subjectTopics.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("resumos")}
            className={`nb-btn px-5 py-2.5 rounded-xl border-2 border-black font-heading font-black text-xs sm:text-sm uppercase flex items-center gap-2 transition-all tabular-nums ${
              activeSection === "resumos"
                ? "bg-emerald-300 text-black shadow-[3px_3px_0_0_#000]"
                : "bg-white text-black hover:bg-emerald-50 shadow-[2px_2px_0_0_#000]"
            }`}
            data-testid="admin-tab-resumos"
          >
            <FileText className="w-4 h-4" />
            <span>2. Resumos de {selectedSubject} ({summaryCounts.total})</span>
            {summaryCounts.published > 0 && (
              <span className="px-2 py-0.5 bg-white border border-black rounded text-[10px] font-black">
                {summaryCounts.published} pub.
              </span>
            )}
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* SEÇÃO 1: TÓPICOS POR MATÉRIA (SEPARADOS DOS RESUMOS)                */}
      {/* =================================================================== */}
      {selectedSubject && activeSection === "topics" && (
        <div className="space-y-6">
          {/* Card para extrair novos tópicos */}
          <div className="nb-card bg-white p-5 sm:p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] space-y-4">
            <div className="flex items-start justify-between gap-3 flex-wrap border-b-2 border-black/15 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-300 text-black border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#000]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-heading font-black text-black uppercase">
                    Extrair Tópicos de "{selectedSubject}"
                  </h2>
                  <p className="text-xs font-bold text-neutral-600">
                    Envie fotos do quadro/caderno ou anotações. A IA identifica os tópicos e salva nesta aba (separado dos resumos e invisível aos alunos).
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <input
                  type="file"
                  id="resumo-source-files"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <label
                    htmlFor="resumo-source-files"
                    className="flex-1 border-2 border-dashed border-neutral-400 hover:border-black p-4 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-neutral-50 hover:bg-amber-50 transition-all text-center"
                  >
                    <Upload className="w-5 h-5 text-sky-600 mb-1" />
                    <span className="font-heading font-black text-xs text-black uppercase">
                      Anexar Fotos do Conteúdo
                    </span>
                    <span className="text-[11px] font-bold text-neutral-500">PNG, JPG, WEBP</span>
                  </label>

                  {googleDriveConnected && (
                    <button
                      type="button"
                      onClick={() => setShowDrivePicker(true)}
                      className="nb-btn flex-1 p-4 rounded-xl border-2 border-black bg-sky-100 hover:bg-sky-200 flex flex-col items-center justify-center text-center shadow-[2px_2px_0_0_#000]"
                    >
                      <Cloud className="w-5 h-5 text-sky-700 mb-1" />
                      <span className="font-heading font-black text-xs text-black uppercase">
                        Usar do Drive ({googleDriveFiles.length})
                      </span>
                      <span className="text-[11px] font-bold text-sky-900">Nuvem do professor</span>
                    </button>
                  )}
                </div>

                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-2.5 py-1 bg-amber-200 text-black border-2 border-black rounded-lg text-xs font-bold shadow-[1.5px_1.5px_0_0_#000]"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span className="max-w-[140px] truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(idx)}
                          className="text-rose-700 hover:text-black font-black"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-heading font-black uppercase text-black">
                  Anotações / Assuntos da Aula (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={sourceNotes}
                  onChange={(e) => setSourceNotes(e.target.value)}
                  placeholder="Ex: Equação do 2º Grau, Fórmula de Bhaskara, Discriminante Delta..."
                  className="nb-input bg-neutral-50 focus:bg-white resize-y text-xs sm:text-sm"
                  data-testid="extract-topics-notes-input"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleExtractTopics}
              disabled={processingSource || (selectedFiles.length === 0 && !sourceNotes.trim())}
              className="nb-btn w-full py-3 bg-sky-400 hover:bg-sky-500 text-black font-heading font-black text-xs sm:text-sm uppercase tracking-wide rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="extract-topics-btn"
            >
              {processingSource ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analisando material e extraindo tópicos...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Extrair Tópicos com IA</span>
                </>
              )}
            </button>
          </div>

          {/* Barra de Seleção de Tópicos para Gerar Resumo */}
          {selectedTopicsList.length > 0 && (
            <div
              className="nb-card bg-amber-100 p-5 rounded-2xl border-3 border-black shadow-[5px_5px_0_0_#000] space-y-4"
              data-testid="generate-from-topics-bar"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-black/20 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="nb-badge bg-amber-300 text-black font-heading font-black text-xs uppercase border-2 border-black">
                    {selectedTopicsList.length} tópico(s) selecionado(s) em {selectedSubject}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedTopicIds([])}
                    className="text-xs font-black text-rose-800 hover:underline"
                  >
                    Limpar seleção
                  </button>
                </div>
                <span className="text-[11px] font-bold text-neutral-700">
                  O resumo será criado na aba "Resumos"
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {selectedTopicsList.map((t) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border-2 border-black rounded-lg text-xs font-black text-black"
                  >
                    <span>{t.topic}</span>
                    <button
                      type="button"
                      onClick={() => toggleTopicSelection(t.id)}
                      className="text-rose-700 hover:text-black"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-heading font-black uppercase text-black mb-1">
                    Título do Resumo (Opcional)
                  </label>
                  <input
                    type="text"
                    value={genTitle}
                    onChange={(e) => setGenTitle(e.target.value)}
                    placeholder="Ex: Revisão Prova Bimestral..."
                    className="nb-input bg-white text-xs py-2"
                    data-testid="gen-summary-title-input"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-heading font-black uppercase text-black mb-1">
                    Estilo do Resumo
                  </label>
                  <select
                    value={genTone}
                    onChange={(e) => setGenTone(e.target.value)}
                    className="nb-input bg-white text-xs py-2"
                  >
                    {TONE_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-heading font-black uppercase text-black mb-1">
                    Instruções Extras (Opcional)
                  </label>
                  <input
                    type="text"
                    value={genInstructions}
                    onChange={(e) => setGenInstructions(e.target.value)}
                    placeholder="Ex: Incluir 2 exemplos resolvidos..."
                    className="nb-input bg-white text-xs py-2"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={generatingFromTopics}
                  onClick={() => handleGenerateSummaryFromTopics({ publishNow: false })}
                  className="nb-btn flex-1 py-3 px-4 bg-sky-400 hover:bg-sky-500 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] flex items-center justify-center gap-2"
                  data-testid="generate-draft-from-topics-btn"
                >
                  {generatingFromTopics ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wand2 className="w-4 h-4" />
                  )}
                  <span>{generatingFromTopics ? "Gerando Resumo..." : "Gerar Resumo (Rascunho p/ Revisar)"}</span>
                </button>

                <button
                  type="button"
                  disabled={generatingFromTopics}
                  onClick={() => handleGenerateSummaryFromTopics({ publishNow: true })}
                  className="nb-btn py-3 px-4 bg-emerald-400 hover:bg-emerald-300 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] flex items-center justify-center gap-2"
                  data-testid="generate-and-publish-from-topics-btn"
                >
                  <Send className="w-4 h-4" />
                  <span>Gerar e Disponibilizar Agora</span>
                </button>
              </div>
            </div>
          )}

          {/* Lista de Tópicos da Matéria */}
          <div className="nb-card bg-white p-5 sm:p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
              <div>
                <h2 className="text-lg font-heading font-black text-black uppercase flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-sky-600" />
                  <span>Tópicos Disponíveis em {selectedSubject}</span>
                </h2>
                <p className="text-xs font-bold text-neutral-600">
                  Marque os tópicos que deseja combinar e clique em "Gerar Resumo".
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                  <input
                    type="text"
                    value={topicSearch}
                    onChange={(e) => setTopicSearch(e.target.value)}
                    placeholder="Buscar tópico..."
                    className="nb-input pl-8 pr-3 py-1.5 text-xs w-44 sm:w-56"
                  />
                </div>
                {filteredTopics.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllFilteredTopics}
                    className="nb-btn px-3 py-1.5 bg-neutral-100 hover:bg-amber-200 text-black font-heading font-black text-xs uppercase rounded-lg border-2 border-black"
                  >
                    {filteredTopics.every((t) => selectedTopicIds.includes(t.id))
                      ? "Desmarcar Todos"
                      : "Selecionar Todos"}
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="p-10 text-center text-neutral-600 font-bold flex items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-black" />
                <span>Carregando tópicos...</span>
              </div>
            ) : filteredTopics.length === 0 ? (
              <div className="p-10 text-center bg-amber-50 rounded-xl border-2 border-dashed border-black">
                <ListChecks className="w-10 h-10 text-amber-600 mx-auto mb-2" />
                <p className="font-heading font-black text-black text-base uppercase">
                  {subjectTopics.length === 0
                    ? `Nenhum tópico em ${selectedSubject}`
                    : "Nenhum tópico encontrado para a busca"}
                </p>
                <p className="text-xs font-bold text-neutral-600 mt-1">
                  Envie fotos/anotações acima ou clique em "Novo Tópico" para cadastrar.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredTopics.map((topicItem) => {
                  const isChecked = selectedTopicIds.includes(topicItem.id);
                  return (
                    <div
                      key={topicItem.id}
                      className={`nb-card p-4 sm:p-5 rounded-2xl border-2 border-black transition-all space-y-3 ${
                        isChecked
                          ? "bg-amber-100/80 shadow-[4px_4px_0_0_#000]"
                          : "bg-neutral-50/70 shadow-[3px_3px_0_0_#000]"
                      }`}
                      data-testid={`admin-topic-card-${topicItem.id}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleTopicSelection(topicItem.id)}
                            className={`mt-0.5 w-8 h-8 rounded-xl border-2 border-black flex items-center justify-center shrink-0 transition-colors ${
                              isChecked ? "bg-amber-400 text-black" : "bg-white text-neutral-700 hover:bg-amber-100"
                            }`}
                            title={isChecked ? "Desmarcar tópico" : "Selecionar tópico para gerar resumo"}
                            data-testid={`select-topic-checkbox-${topicItem.id}`}
                          >
                            {isChecked ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                          </button>

                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="nb-badge bg-sky-200 text-sky-950 border border-black text-[10px] font-black uppercase">
                                {topicItem.subject}
                              </span>
                              <span className="text-[11px] font-bold text-neutral-600 tabular-nums">
                                {new Date(topicItem.updated_at || topicItem.created_at).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                            <h3
                              onClick={() => toggleTopicSelection(topicItem.id)}
                              className="text-base sm:text-lg font-heading font-black text-black leading-tight cursor-pointer hover:underline"
                            >
                              {topicItem.topic}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap shrink-0">
                          <button
                            type="button"
                            disabled={generatingFromTopics}
                            onClick={() => handleGenerateSummaryFromTopics({ topicIdsOverride: [topicItem.id] })}
                            className="nb-btn px-3 py-1.5 bg-amber-300 hover:bg-amber-400 text-black font-heading font-black text-xs rounded-lg border-2 border-black flex items-center gap-1"
                            data-testid={`quick-gen-summary-${topicItem.id}`}
                          >
                            <Wand2 className="w-3.5 h-3.5" />
                            <span>Gerar Resumo</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditTopicModal(topicItem)}
                            className="nb-btn px-3 py-1.5 bg-white hover:bg-neutral-100 text-black font-heading font-black text-xs rounded-lg border-2 border-black flex items-center gap-1"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTopic(topicItem.id)}
                            className="nb-btn px-3 py-1.5 bg-rose-200 hover:bg-rose-300 text-rose-950 font-heading font-black text-xs rounded-lg border-2 border-black flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {topicItem.extracted_notes && (
                        <p className="text-xs sm:text-sm font-medium text-neutral-800 bg-white p-3 rounded-xl border border-black/30 whitespace-pre-line leading-relaxed">
                          {topicItem.extracted_notes}
                        </p>
                      )}

                      {((topicItem.key_concepts && topicItem.key_concepts.length > 0) ||
                        (topicItem.formulas && topicItem.formulas.length > 0)) && (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {(topicItem.key_concepts || []).slice(0, 8).map((c, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 bg-white border border-black rounded-lg text-[11px] font-bold text-neutral-900"
                            >
                              {c}
                            </span>
                          ))}
                          {(topicItem.formulas || []).slice(0, 4).map((f, idx) => (
                            <span
                              key={`f-${idx}`}
                              className="px-2 py-0.5 bg-sky-100 border border-black rounded-lg text-[11px] font-mono font-bold text-sky-950 inline-flex items-center gap-1"
                            >
                              <Calculator className="w-3 h-3 shrink-0" />
                              {hasLatexMath(f) ? <MathRenderer math={f} inline={true} /> : f}
                            </span>
                          ))}
                        </div>
                      )}

                      {topicItem.source_image_ids && topicItem.source_image_ids.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-heading font-black uppercase text-neutral-600 flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5" /> Fontes ({topicItem.source_image_ids.length}):
                          </span>
                          {topicItem.source_image_ids.map((imgId) => (
                            <button
                              key={imgId}
                              type="button"
                              onClick={() => setPreviewImageId(imgId)}
                              className="group relative w-11 h-11 rounded-lg border-2 border-black overflow-hidden cursor-pointer bg-black"
                            >
                              <img
                                src={`/api/files/${imgId}`}
                                alt="Fonte"
                                className="w-full h-full object-cover group-hover:opacity-75"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SEÇÃO 2: RESUMOS (RASCUNHOS & DISPONIBILIZADOS AOS ALUNOS)          */}
      {/* =================================================================== */}
      {selectedSubject && activeSection === "resumos" && (
        <div className="nb-card bg-white p-5 sm:p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b-2 border-black pb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-heading font-black text-black uppercase flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                <span>Resumos Gerados — {selectedSubject}</span>
              </h2>
              <p className="text-xs font-bold text-neutral-600 mt-0.5">
                Revise o texto, regere se precisar e clique em "Disponibilizar para Alunos" para liberar na matéria e enviar notificação.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" />
                <input
                  type="text"
                  value={summarySearch}
                  onChange={(e) => setSummarySearch(e.target.value)}
                  placeholder="Buscar resumo..."
                  className="nb-input pl-8 pr-3 py-1.5 text-xs w-40 sm:w-48"
                />
              </div>

              {[
                { id: "all", label: `Todos (${summaryCounts.total})` },
                { id: "draft", label: `Rascunhos (${summaryCounts.draft})` },
                { id: "published", label: `Disponíveis (${summaryCounts.published})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSummaryStageFilter(f.id)}
                  className={`nb-btn px-3 py-1.5 text-xs font-heading font-black uppercase rounded-lg border-2 border-black tabular-nums ${
                    summaryStageFilter === f.id
                      ? "bg-amber-300 text-black shadow-[2px_2px_0_0_#000]"
                      : "bg-neutral-50 hover:bg-neutral-100 text-black"
                  }`}
                  data-testid={`resumos-stage-filter-${f.id}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-neutral-600 font-bold flex items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-black" />
              <span>Carregando resumos...</span>
            </div>
          ) : filteredSummaries.length === 0 ? (
            <div className="p-10 text-center bg-emerald-50/60 rounded-xl border-2 border-dashed border-black space-y-2">
              <FileText className="w-10 h-10 text-emerald-700 mx-auto" />
              <p className="font-heading font-black text-black text-base uppercase">
                {subjectSummaries.length === 0
                  ? `Nenhum resumo gerado ainda em ${selectedSubject}`
                  : "Nenhum resumo neste filtro"}
              </p>
              <p className="text-xs font-bold text-neutral-600 max-w-md mx-auto">
                Vá até a aba "1. Tópicos de {selectedSubject}", marque os tópicos desejados e clique em "Gerar Resumo", ou crie um manualmente.
              </p>
              <button
                type="button"
                onClick={() => setActiveSection("topics")}
                className="nb-btn px-4 py-2 bg-sky-300 hover:bg-sky-400 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black inline-flex items-center gap-1.5 mt-2"
              >
                <ListChecks className="w-4 h-4" />
                <span>Ir para Tópicos de {selectedSubject}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5">
              {filteredSummaries.map((sumItem) => {
                const isPublished = Boolean(sumItem.is_published);
                const isPublishing = publishingSummaryId === sumItem.id;
                const isRegenerating = regeneratingSummaryId === sumItem.id;
                const includedTopics = Array.isArray(sumItem.source_topic_titles)
                  ? sumItem.source_topic_titles
                  : [];

                return (
                  <div
                    key={sumItem.id}
                    className={`nb-card p-5 rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000] space-y-4 ${
                      isPublished ? "bg-emerald-50/40" : "bg-sky-50/40"
                    }`}
                    data-testid={`admin-summary-card-${sumItem.id}`}
                  >
                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3 border-b-2 border-black/15 pb-3">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`nb-badge text-[11px] font-heading font-black uppercase border-2 border-black inline-flex items-center gap-1 ${
                              isPublished
                                ? "bg-emerald-300 text-emerald-950"
                                : "bg-sky-300 text-sky-950"
                            }`}
                          >
                            {isPublished ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Disponível aos Alunos</span>
                              </>
                            ) : (
                              <>
                                <FileText className="w-3.5 h-3.5" />
                                <span>Rascunho Privado</span>
                              </>
                            )}
                          </span>

                          {isPublished && sumItem.published_at && (
                            <span className="text-[11px] font-bold text-emerald-900 tabular-nums">
                              Liberado em {new Date(sumItem.published_at).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg sm:text-xl font-heading font-black text-black leading-tight">
                          {sumItem.topic}
                        </h3>

                        {includedTopics.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-heading font-black uppercase text-neutral-600">
                              Tópicos incluídos:
                            </span>
                            {includedTopics.map((title, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-amber-200 border border-black rounded text-[10px] font-black text-black"
                              >
                                {title}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditSummaryModal(sumItem)}
                          className="nb-btn px-3 py-1.5 bg-white hover:bg-neutral-100 text-black font-heading font-black text-xs rounded-lg border-2 border-black flex items-center gap-1"
                          data-testid={`edit-summary-${sumItem.id}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPreviewSummary(sumItem)}
                          className="nb-btn px-3 py-1.5 bg-sky-200 hover:bg-sky-300 text-black font-heading font-black text-xs rounded-lg border-2 border-black flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSummary(sumItem.id)}
                          className="nb-btn px-3 py-1.5 bg-rose-200 hover:bg-rose-300 text-rose-950 font-heading font-black text-xs rounded-lg border-2 border-black flex items-center gap-1"
                          data-testid={`delete-summary-${sumItem.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    </div>

                    {/* Preview text */}
                    <div className="bg-white p-4 rounded-xl border-2 border-black space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-heading font-black uppercase text-neutral-600">
                        <span>Conteúdo do Resumo</span>
                        <button
                          type="button"
                          onClick={() => setPreviewSummary(sumItem)}
                          className="text-sky-700 hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Abrir leitura completa
                        </button>
                      </div>
                      <div className="text-xs sm:text-sm font-body text-neutral-800 whitespace-pre-line line-clamp-4 leading-relaxed">
                        {sumItem.summary_text}
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="pt-3 border-t-2 border-black/15 flex flex-wrap items-center justify-between gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleRegenerateSummary(sumItem)}
                        disabled={isRegenerating}
                        className="nb-btn px-4 py-2 bg-violet-200 hover:bg-violet-300 text-violet-950 font-heading font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-1.5"
                      >
                        {isRegenerating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Regerando...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4" />
                            <span>Regerar com IA</span>
                          </>
                        )}
                      </button>

                      <div className="flex flex-wrap items-center gap-2">
                        {!isPublished ? (
                          <button
                            type="button"
                            onClick={() => handlePublishSummary(sumItem)}
                            disabled={isPublishing}
                            className="nb-btn px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] flex items-center gap-1.5"
                            data-testid={`publish-summary-${sumItem.id}`}
                          >
                            {isPublishing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Disponibilizando...</span>
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                <span>Disponibilizar para Alunos</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handlePublishSummary(sumItem, { isRebroadcast: true })}
                              disabled={isPublishing}
                              className="nb-btn px-3.5 py-2 bg-sky-300 hover:bg-sky-400 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-1.5"
                            >
                              <BellRing className="w-4 h-4" />
                              <span>Reenviar Notificação</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnpublishSummary(sumItem)}
                              disabled={isPublishing}
                              className="nb-btn px-3.5 py-2 bg-white hover:bg-neutral-100 text-neutral-900 font-heading font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-1.5"
                              data-testid={`unpublish-summary-${sumItem.id}`}
                            >
                              <EyeOff className="w-4 h-4" />
                              <span>Ocultar dos Alunos</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal: Criar / Editar TÓPICO (Separado) */}
      {showTopicModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-5 backdrop-blur-sm">
            <div className="nb-card w-full max-w-2xl bg-white rounded-2xl border-3 border-black shadow-[8px_8px_0_0_#000] flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-4 sm:p-5 bg-sky-300 border-b-2 border-black flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-heading font-black text-black uppercase">
                    {editingTopicItem ? "Editar Tópico" : "Novo Tópico da Matéria"}
                  </h3>
                  <p className="text-xs font-bold text-neutral-800">
                    Tópicos ficam organizados para gerar resumos depois.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTopicModal(false)}
                  className="w-9 h-9 rounded-xl bg-white hover:bg-neutral-100 border-2 border-black flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTopicModal} className="p-5 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-heading font-black uppercase text-black mb-1">Matéria</label>
                    <select
                      value={topicForm.subject}
                      onChange={(e) => setTopicForm({ ...topicForm, subject: e.target.value })}
                      className="nb-input"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-black uppercase text-black mb-1">Nome do Tópico</label>
                    <input
                      type="text"
                      required
                      value={topicForm.topic}
                      onChange={(e) => setTopicForm({ ...topicForm, topic: e.target.value })}
                      placeholder="Ex: Revolução Francesa"
                      className="nb-input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-heading font-black uppercase text-black mb-1">
                    Pontos / Anotações deste Tópico
                  </label>
                  <textarea
                    rows={4}
                    value={topicForm.extracted_notes}
                    onChange={(e) => setTopicForm({ ...topicForm, extracted_notes: e.target.value })}
                    placeholder="Principais pontos que deverão entrar no resumo..."
                    className="nb-input resize-y text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-heading font-black uppercase text-black mb-1">Conceitos-Chave (vírgula)</label>
                    <input
                      type="text"
                      value={topicForm.key_concepts}
                      onChange={(e) => setTopicForm({ ...topicForm, key_concepts: e.target.value })}
                      placeholder="Iluminismo, Bastilha..."
                      className="nb-input text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-heading font-black uppercase text-black mb-1">Fórmulas (vírgula)</label>
                    <input
                      type="text"
                      value={topicForm.formulas}
                      onChange={(e) => setTopicForm({ ...topicForm, formulas: e.target.value })}
                      placeholder="$E = mc^2$"
                      className="nb-input font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t-2 border-black">
                  <button
                    type="button"
                    onClick={() => setShowTopicModal(false)}
                    className="nb-btn px-4 py-2 bg-white text-black text-xs font-heading font-bold uppercase rounded-xl border-2 border-black"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingTopic}
                    className="nb-btn px-5 py-2 bg-amber-300 hover:bg-amber-400 text-black text-xs font-heading font-black uppercase rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000]"
                  >
                    {savingTopic ? "Salvando..." : "Salvar Tópico"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal: Editor & Live KaTeX Preview do RESUMO */}
      {showSummaryModal && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-5 backdrop-blur-sm">
            <div className="nb-card w-full max-w-4xl bg-white rounded-2xl border-3 border-black shadow-[8px_8px_0_0_#000] flex flex-col max-h-[92vh] overflow-hidden">
              <div className="p-4 sm:p-5 bg-amber-300 border-b-2 border-black flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base sm:text-xl font-heading font-black text-black uppercase">
                    {editingSummaryItem ? "Editar & Revisar Resumo" : "Novo Resumo Manual"}
                  </h3>
                  <p className="text-xs font-bold text-neutral-800">
                    Revise o texto, regere com IA se necessário e disponibilize quando estiver pronto para os alunos.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(false)}
                  className="w-9 h-9 rounded-xl bg-white hover:bg-neutral-100 border-2 border-black flex items-center justify-center font-black shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-5 py-2.5 bg-neutral-100 border-b-2 border-black flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditorViewTab("edit")}
                    className={`nb-btn px-3.5 py-1.5 text-xs font-heading font-black uppercase rounded-lg border-2 border-black ${
                      editorViewTab === "edit" ? "bg-sky-300 text-black" : "bg-white text-black"
                    }`}
                  >
                    Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorViewTab("preview")}
                    className={`nb-btn px-3.5 py-1.5 text-xs font-heading font-black uppercase rounded-lg border-2 border-black flex items-center gap-1 ${
                      editorViewTab === "preview" ? "bg-emerald-300 text-black" : "bg-white text-black"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview do Aluno</span>
                  </button>
                </div>

                {editingSummaryItem && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={editorAiTone}
                      onChange={(e) => setEditorAiTone(e.target.value)}
                      className="nb-input py-1 px-2 text-xs font-bold w-auto bg-white"
                    >
                      {TONE_OPTIONS.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleRegenerateInsideEditor}
                      disabled={regeneratingInEditor}
                      className="nb-btn px-3 py-1.5 bg-violet-300 hover:bg-violet-400 text-black text-xs font-heading font-black uppercase rounded-lg border-2 border-black flex items-center gap-1.5"
                    >
                      {regeneratingInEditor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                      <span>{regeneratingInEditor ? "Regerando..." : "Regerar com IA"}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {editorViewTab === "preview" ? (
                  summaryForm.summary_text.trim() ? (
                    <MarkdownSummaryViewer
                      markdown={summaryForm.summary_text}
                      title={summaryForm.topic || "Preview do Resumo"}
                      subtitle={`Matéria: ${summaryForm.subject}`}
                      subjects={[summaryForm.subject]}
                      showToolbar={false}
                    />
                  ) : (
                    <div className="p-10 text-center bg-neutral-50 rounded-xl border-2 border-dashed border-black">
                      <p className="font-heading font-black text-sm text-black">Nenhum texto de resumo ainda.</p>
                    </div>
                  )
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-heading font-black uppercase text-black mb-1">Matéria</label>
                        <select
                          value={summaryForm.subject}
                          onChange={(e) => setSummaryForm({ ...summaryForm, subject: e.target.value })}
                          className="nb-input"
                        >
                          {subjects.map((s) => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-heading font-black uppercase text-black mb-1">Título do Resumo</label>
                        <input
                          type="text"
                          required
                          value={summaryForm.topic}
                          onChange={(e) => setSummaryForm({ ...summaryForm, topic: e.target.value })}
                          placeholder="Ex: Revisão Completa — Cinemática"
                          className="nb-input"
                        />
                      </div>
                    </div>

                    {editingSummaryItem && (
                      <div className="bg-violet-50 p-3 rounded-xl border-2 border-black/30 space-y-1.5">
                        <label className="block text-[11px] font-heading font-black uppercase text-violet-950">
                          Instruções opcionais para regerar com a IA:
                        </label>
                        <input
                          type="text"
                          value={editorAiInstructions}
                          onChange={(e) => setEditorAiInstructions(e.target.value)}
                          placeholder="Ex: Deixar mais direto e adicionar tabela comparativa..."
                          className="nb-input bg-white text-xs py-2"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-heading font-black uppercase text-black mb-1">
                        Conteúdo do Resumo para os Alunos (Markdown + LaTeX $...$):
                      </label>
                      <textarea
                        rows={11}
                        value={summaryForm.summary_text}
                        onChange={(e) => setSummaryForm({ ...summaryForm, summary_text: e.target.value })}
                        placeholder="Escreva o conteúdo do resumo..."
                        className="nb-input resize-y font-body text-sm leading-relaxed"
                        data-testid="summary-editor-textarea"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-heading font-black uppercase text-black mb-1">Conceitos-Chave (vírgula)</label>
                        <input
                          type="text"
                          value={summaryForm.key_concepts}
                          onChange={(e) => setSummaryForm({ ...summaryForm, key_concepts: e.target.value })}
                          className="nb-input text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-heading font-black uppercase text-black mb-1">Fórmulas (vírgula)</label>
                        <input
                          type="text"
                          value={summaryForm.formulas}
                          onChange={(e) => setSummaryForm({ ...summaryForm, formulas: e.target.value })}
                          className="nb-input font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-neutral-100 border-t-2 border-black flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(false)}
                  className="nb-btn px-4 py-2 bg-white hover:bg-neutral-200 text-black font-heading font-bold text-xs uppercase rounded-xl border-2 border-black"
                >
                  Cancelar
                </button>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    disabled={savingSummaryEditor}
                    onClick={() => handleSaveSummaryModal(null, { publishAfterSave: false })}
                    className="nb-btn px-4 py-2.5 bg-amber-300 hover:bg-amber-400 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000]"
                    data-testid="save-summary-draft-btn"
                  >
                    {savingSummaryEditor ? "Salvando..." : "Salvar Rascunho"}
                  </button>

                  <button
                    type="button"
                    disabled={savingSummaryEditor || !summaryForm.summary_text.trim()}
                    onClick={() => handleSaveSummaryModal(null, { publishAfterSave: true })}
                    className="nb-btn px-4 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-1.5 disabled:opacity-45"
                    data-testid="save-and-publish-summary-btn"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{editingSummaryItem?.is_published ? "Salvar e Manter Disponível" : "Salvar e Disponibilizar"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Full Formatted Preview Modal */}
      {previewSummary && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-5 backdrop-blur-sm">
            <div className="nb-card relative w-full max-w-4xl bg-white rounded-2xl border-3 border-black shadow-[8px_8px_0_0_#000] p-5 sm:p-6 space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b-2 border-black pb-3">
                <div>
                  <span className="nb-badge bg-amber-300 text-black font-heading font-black text-xs uppercase border border-black mb-1 inline-block">
                    {previewSummary.subject}
                  </span>
                  <h2 className="text-xl font-heading font-black text-black">{previewSummary.topic}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewSummary(null)}
                  className="w-9 h-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 border-2 border-black flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <MarkdownSummaryViewer
                markdown={previewSummary.summary_text}
                title={previewSummary.topic}
                subtitle={`Matéria: ${previewSummary.subject}`}
                subjects={[previewSummary.subject]}
                showToolbar={true}
              />
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Image Lightbox Preview */}
      {previewImageId && (
        <ModalPortal>
          <div
            onClick={() => setPreviewImageId(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm cursor-pointer"
          >
            <div className="nb-card relative max-w-4xl max-h-[90vh] bg-white p-3 rounded-2xl border-2 border-black shadow-[6px_6px_0_0_#000]">
              <button
                type="button"
                onClick={() => setPreviewImageId(null)}
                className="nb-btn absolute -top-3 -right-3 w-8 h-8 bg-amber-300 text-black font-black border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0_0_#000]"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={`/api/files/${previewImageId}`}
                alt="Visualização Fonte"
                className="max-h-[80vh] w-auto rounded-xl object-contain"
              />
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Google Drive Files Picker Modal */}
      {showDrivePicker && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="nb-card w-full max-w-2xl bg-white rounded-2xl border-2 border-black shadow-[6px_6px_0_0_#000] p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b-2 border-black pb-3">
                <h3 className="text-base sm:text-lg font-heading font-black text-black uppercase flex items-center gap-2">
                  <Cloud className="w-5 h-5 text-sky-600" />
                  <span>Selecionar Imagens do Google Drive</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowDrivePicker(false)}
                  className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 border-2 border-black flex items-center justify-center font-black"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingGoogleDrive ? (
                <div className="py-8 text-center text-neutral-500 font-bold flex items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-black" /> Carregando arquivos do Google Drive...
                </div>
              ) : googleDriveFiles.length === 0 ? (
                <div className="py-8 text-center bg-neutral-50 rounded-xl border-2 border-dashed border-black/40">
                  <p className="font-heading font-black text-black text-sm">Nenhum arquivo encontrado no seu Google Drive.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto p-1">
                  {googleDriveFiles.map((file) => (
                    <div
                      key={file.id}
                      onClick={() => {
                        setSelectedFiles((prev) => [
                          ...prev,
                          {
                            name: file.name,
                            isDriveFile: true,
                            driveId: file.id,
                            webViewLink: file.webViewLink,
                            thumbnailLink: file.thumbnailLink,
                          },
                        ]);
                        toast.success(`"${file.name}" selecionado do Google Drive!`);
                        setShowDrivePicker(false);
                      }}
                      className="nb-card bg-neutral-50 hover:bg-sky-50 p-3 rounded-xl border-2 border-black cursor-pointer shadow-[2px_2px_0_0_#000] transition-all flex flex-col items-center text-center"
                    >
                      {file.thumbnailLink ? (
                        <img src={file.thumbnailLink} alt={file.name} className="w-16 h-16 object-cover rounded-lg border border-black mb-2" />
                      ) : (
                        <FileText className="w-12 h-12 text-sky-600 mb-2" />
                      )}
                      <span className="text-xs font-heading font-black text-black truncate w-full">{file.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-3 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setShowDrivePicker(false)}
                  className="nb-btn px-5 py-2 bg-amber-400 hover:bg-amber-300 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
