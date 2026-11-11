import { useState, useEffect } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { cleanLatexFormula, MathRenderer } from "@/lib/mathUtils";

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
  Search,
  Eye,
  Cpu,
  Cloud,
  HardDrive,
  FolderPlus,
  FolderCheck,
  Layers,
} from "lucide-react";

const SUMMARY_MODEL_OPTIONS = [
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash (Recomendado)", desc: "Velocidade máxima e precisão multimodal avançada." },
  { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", desc: "Desempenho estável para análise de documentos e imagens." },
  { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite", desc: "Modelo ultra rápido para síntese instantânea." },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", desc: "Excelente para leitura de tabelas e fórmulas." },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", desc: "Análise profunda e raciocínio pedagógico avançado." },
];

export default function AdminResumosPanel() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(false);

  // AI Model for Summaries
  const [summaryModel, setSummaryModel] = useState("gemini-3.8-flash");
  const [savingModel, setSavingModel] = useState(false);

  // File Upload / Source Processing state
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [processingSource, setProcessingSource] = useState(false);
  const [deduplicating, setDeduplicating] = useState(false);

  // Google Drive integration for Admin
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);
  const [googleDriveAccessToken, setGoogleDriveAccessToken] = useState("");
  const [googleDriveFiles, setGoogleDriveFiles] = useState([]);
  const [loadingGoogleDrive, setLoadingGoogleDrive] = useState(false);
  const [uploadingToDrive, setUploadingToDrive] = useState(false);
  const [syncingFolders, setSyncingFolders] = useState(false);
  const [folderMap, setFolderMap] = useState({});
  const [oauthErrorNotice, setOauthErrorNotice] = useState(null);

  // Topic Editing / Manual Add Modal state
  const [editingTopic, setEditingTopic] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    topic: "",
    summary_text: "",
    key_concepts: "",
    formulas: "",
  });

  // Image Lightbox state
  const [previewImageId, setPreviewImageId] = useState(null);
  const [showDrivePicker, setShowDrivePicker] = useState(false);

  useEffect(() => {
    loadSubjects();
    loadSummaries();
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

  const loadSubjects = async () => {
    try {
      const { data } = await api.get("/subjects");
      setSubjects(data || []);
      if (data && data.length > 0 && !selectedSubject) {
        setSelectedSubject(data[0].name);
      }
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const loadSummaries = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/summaries");
      setSummaries(data || []);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
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
        // Cria automaticamente uma pasta para cada matéria no Google Drive
        syncSubjectFolders(token);
        fetchAdminGoogleDriveFiles(token);
      } else {
        toast.error("Não foi possível obter o token de acesso do Google Drive.");
      }
    } catch (err) {
      console.warn("Google Drive login error:", err);
      const code = err?.code || "";
      const msg = err?.message || "";

      if (code === "auth/popup-closed-by-user") {
        toast.info("A janela de login do Google foi fechada antes de concluir.");
      } else if (code === "auth/unauthorized-domain" || msg.includes("unauthorized-domain")) {
        const domain = typeof window !== "undefined" ? window.location.hostname : "seu-app.onrender.com";
        setOauthErrorNotice({
          type: "unauthorized_domain",
          title: "Domínio do Render Não Autorizado no Firebase",
          message: `O domínio atual (${domain}) não está cadastrado na lista de domínios permitidos do Firebase Auth. Para liberar o login: 
1. Acesse o Firebase Console (console.firebase.google.com).
2. Vá em Authentication > Configurações > Domínios autorizados.
3. Clique em "Adicionar domínio" e digite: ${domain}
4. Salve e recarregue a página!`,
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
            "O Google exibiu que o aplicativo ainda consta em desenvolvimento/testes. Para autorizar: na janela do Google, clique no link 'Avançado' no canto inferior esquerdo e depois em 'Acessar Edutask (não seguro)' para prosseguir. Alternativamente, adicione seu e-mail como Usuário de Teste no Google Cloud Console > Tela de permissão OAuth.",
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
      setFolderMap(mapping);
      toast.success(
        `Pastas sincronizadas no Google Drive para ${Object.keys(mapping).length} matéria(s)!`
      );
    } catch (err) {
      console.warn("Erro ao sincronizar pastas:", err);
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
      await uploadFileToDrive(
        googleDriveAccessToken,
        file,
        file.name,
        file.type,
        subjectFolderId
      );
      toast.success(`Foto enviada para a pasta "${targetSub}" no seu Google Drive com sucesso!`);
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
      toast.success("Modelo de IA para resumos atualizado com sucesso!");
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
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeduplicateSummaries = async () => {
    setDeduplicating(true);
    try {
      const { data } = await api.post("/admin/summaries/deduplicate");
      if (data && data.ok) {
        if (data.merged_count > 0) {
          toast.success(`${data.merged_count} tópico(s) duplicado(s) foram unificados com sucesso!`);
        } else {
          toast.info("Nenhum tópico duplicado foi encontrado. Seus resumos já estão organizados!");
        }
        await loadSummaries();
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setDeduplicating(false);
    }
  };

  const handleProcessSourceImages = async () => {
    if (processingSource) return;

    if (!selectedSubject) {
      toast.error("Selecione uma matéria antes de processar as fotos fontes.");
      return;
    }
    if (selectedFiles.length === 0) {
      toast.error("Anexe pelo menos uma imagem fonte do resumo.");
      return;
    }

    setProcessingSource(true);
    try {
      // 1. Enviar arquivos para a pasta específica da matéria no Google Drive (se conectado)
      if (googleDriveConnected && googleDriveAccessToken && selectedFiles.length > 0) {
        try {
          const targetSub = selectedSubject || "Geral";
          const { subjectFolderId } = await getOrCreateSubjectFolder(googleDriveAccessToken, targetSub);
          for (const f of selectedFiles) {
            if (f instanceof File) {
              await uploadFileToDrive(
                googleDriveAccessToken,
                f,
                f.name,
                f.type,
                subjectFolderId
              ).catch((e) => console.warn("Erro ao enviar foto para pasta do Drive:", e));
            }
          }
          toast.success(`Fotos salvas na pasta "${targetSub}" do seu Google Drive!`);
          fetchAdminGoogleDriveFiles(googleDriveAccessToken);
        } catch (e) {
          console.warn("Drive upload error:", e);
        }
      }

      // 2. Enviar imagens para processamento e deduplicação no backend
      const bodyFormData = new FormData();
      bodyFormData.append("subject", selectedSubject);
      selectedFiles.forEach((file) => {
        bodyFormData.append("images", file);
      });

      const { data } = await api.post("/admin/summaries/process-source", bodyFormData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (data && data.ok) {
        toast.success(
          data.is_new_topic
            ? `Novo assunto "${data.summary.topic}" criado com sucesso!`
            : `Conteúdo integrado ao assunto existente "${data.summary.topic}" com sucesso!`
        );
        setSelectedFiles([]);
        await loadSummaries();
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setProcessingSource(false);
    }
  };

  const openCreateModal = () => {
    setEditingTopic(null);
    setFormData({
      subject: selectedSubject || (subjects[0]?.name || ""),
      topic: "",
      summary_text: "",
      key_concepts: "",
      formulas: "",
    });
    setShowEditModal(true);
  };

  const openEditModal = (topicItem) => {
    setEditingTopic(topicItem);
    setFormData({
      subject: topicItem.subject,
      topic: topicItem.topic,
      summary_text: topicItem.summary_text,
      key_concepts: (topicItem.key_concepts || []).join(", "),
      formulas: (topicItem.formulas || []).join(", "),
    });
    setShowEditModal(true);
  };

  const handleSaveTopic = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.topic.trim()) {
      toast.error("Matéria e Assunto são obrigatórios.");
      return;
    }

    const payload = {
      subject: formData.subject.trim(),
      topic: formData.topic.trim(),
      summary_text: formData.summary_text,
      key_concepts: formData.key_concepts
        ? formData.key_concepts.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      formulas: formData.formulas
        ? formData.formulas.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
    };

    try {
      if (editingTopic) {
        await api.put(`/admin/summaries/topics/${editingTopic.id}`, payload);
        toast.success("Assunto atualizado com sucesso!");
      } else {
        await api.post("/admin/summaries/topics", payload);
        toast.success("Novo assunto criado com sucesso!");
      }
      setShowEditModal(false);
      loadSummaries();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (!confirm("Tem certeza que deseja excluir este assunto do resumo?")) return;
    try {
      await api.delete(`/admin/summaries/topics/${topicId}`);
      toast.success("Assunto removido com sucesso!");
      loadSummaries();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const subjectTopics = summaries.filter(
    (s) => s.subject.toLowerCase() === (selectedSubject || "").toLowerCase()
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="nb-card bg-amber-300 p-5 sm:p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-amber-400 text-black border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#000]">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
            </span>
            <h2 className="text-xl sm:text-2xl font-heading font-black text-black uppercase tracking-tight">
              Resumos & Google Drive Admin
            </h2>
          </div>
          <p className="text-xs sm:text-sm font-bold text-neutral-800 mt-1.5 font-body">
            Gerencie o Google Drive de armazenamento, modelo de IA e tópicos de resumo das matérias.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDeduplicateSummaries}
            disabled={deduplicating}
            className="nb-btn px-3.5 sm:px-4 py-2 sm:py-2.5 bg-white hover:bg-neutral-100 text-black font-heading font-black rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-2 text-xs uppercase"
            title="Verifica e unifica tópicos duplicados ou similares dos resumos"
          >
            {deduplicating ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <Layers className="w-4 h-4 text-sky-600" />
            )}
            {deduplicating ? "Mesclando..." : "Mesclar Duplicados"}
          </button>

          <button
            onClick={openCreateModal}
            className="nb-btn px-3.5 sm:px-4 py-2 sm:py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-heading font-black rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-2 text-xs uppercase"
          >
            <Plus className="w-4 h-4" />
            Adicionar Assunto Manual
          </button>
        </div>
      </div>

      {/* Google Drive Admin Connect Widget */}
      <div className="nb-card bg-sky-50 p-5 sm:p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#000]">
              <Cloud className="w-6 h-6 text-sky-600" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-heading font-black text-sky-950 uppercase">
                Google Drive do Administrador
              </h3>
              <p className="text-xs font-bold text-neutral-700 mt-0.5 font-body">
                {googleDriveConnected
                  ? "Conectado ao seu Google Drive! As fotos de resumos são salvas automaticamente em pastas organizadas por matéria."
                  : "Conecte sua conta do Google Drive para armazenar e organizar fotos de resumos em pastas por matéria."}
              </p>

            </div>
          </div>

          {!googleDriveConnected ? (
            <button
              onClick={handleConnectGoogleDrive}
              className="nb-btn px-4 sm:px-5 py-2.5 sm:py-3 bg-white hover:bg-neutral-100 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-2 transition-all shrink-0"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Conectar Google Drive Admin
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => syncSubjectFolders()}
                disabled={syncingFolders}
                className="nb-btn px-3.5 py-2 bg-white hover:bg-neutral-100 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-1.5"
                title="Criar ou sincronizar pastas para todas as matérias no Google Drive"
              >
                {syncingFolders ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FolderCheck className="w-3.5 h-3.5 text-sky-600" />
                )}
                Sincronizar Pastas
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
                className="nb-btn px-4 py-2 bg-amber-300 hover:bg-amber-400 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black cursor-pointer shadow-[2px_2px_0_0_#000] flex items-center gap-1.5"
              >
                {uploadingToDrive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                Enviar para "{selectedSubject || 'Geral'}" no Drive
              </label>

              <span className="nb-badge bg-emerald-200 text-emerald-950 font-heading font-black text-xs border-2 border-black">
                ✓ Drive Conectado
              </span>
            </div>
          )}
        </div>

        {/* Guia explicativo para Login com Google ("App em Teste" / "Não Verificado") */}
        {!googleDriveConnected && (
          <div className="bg-amber-100/90 border-2 border-amber-600 p-3.5 rounded-xl text-xs font-bold text-amber-950 space-y-1.5">
            <div className="flex items-center gap-2 font-black text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-800 shrink-0" />
              <span>Apareceu a mensagem "O Google não verificou este app" ou erro de "App em teste"?</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900">
              Isso ocorre porque o projeto Google Cloud está em fase de desenvolvimento. Para liberar o login:
            </p>
            <ul className="text-[11px] list-disc list-inside space-y-0.5 text-amber-900 font-medium">
              <li>
                <strong>No popup do Google:</strong> clique no link <u>"Avançado"</u> no rodapé esquerdo e depois em <u>"Acessar (não seguro)"</u> para prosseguir.
              </li>
              <li>
                <strong>No Google Cloud Console:</strong> acesse <em>APIs e Serviços &gt; Tela de permissão OAuth &gt; Usuários de teste</em> e adicione seu e-mail do Gmail (<code className="bg-amber-200 px-1 py-0.5 rounded text-black font-mono">+ Add Users</code>).
              </li>
            </ul>
          </div>
        )}

        {/* Notificação de Erro OAuth se houver */}
        {oauthErrorNotice && (
          <div className="bg-rose-100 border-2 border-rose-600 p-3 rounded-xl flex items-start justify-between gap-3 text-xs text-rose-950">
            <div className="space-y-1">
              <div className="font-black text-rose-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                {oauthErrorNotice.title}
              </div>
              <p className="text-[11px] font-medium leading-relaxed">
                {oauthErrorNotice.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOauthErrorNotice(null)}
              className="text-rose-700 hover:text-black font-black text-sm px-1.5"
            >
              ×
            </button>
          </div>
        )}

        {/* Pastas no Drive por Matéria (visível quando conectado) */}
        {googleDriveConnected && (
          <div className="bg-white/80 p-3 rounded-xl border-2 border-black/80 space-y-2">
            <div className="flex items-center justify-between text-xs font-black uppercase text-black">
              <span className="flex items-center gap-1.5">
                <FolderCheck className="w-4 h-4 text-blue-600" />
                Estrutura no seu Drive: <span className="font-mono text-blue-900">EduTask Resumos / [Matéria]</span>
              </span>
              <span className="text-[10px] text-gray-600 font-bold">
                {subjects.length} Matérias disponíveis
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {subjects.map((sub) => {
                const isSelected = selectedSubject.toLowerCase() === sub.name.toLowerCase();
                const hasFolder = Boolean(folderMap[sub.name.trim()]);
                return (
                  <span
                    key={sub.id}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-all ${
                      isSelected
                        ? "bg-amber-200 border-black text-black font-black shadow-[1px_1px_0px_0px_#000]"
                        : "bg-gray-100 border-gray-300 text-gray-700"
                    }`}
                  >
                    📁 {sub.name}
                    {hasFolder && <span className="text-emerald-700 text-[10px]">✓</span>}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* AI Model Selector for Summaries */}
      <div className="nb-card bg-white p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-heading font-black text-black uppercase flex items-center gap-2">
            <Cpu className="w-5 h-5 text-sky-600" />
            Modelo de IA para Resumos
          </h3>
          {savingModel && <span className="text-xs font-bold text-sky-600 animate-pulse font-heading">Salvando modelo...</span>}
        </div>
        <p className="text-xs font-bold text-neutral-600 font-body">
          Esta IA dedicada processa as fotos fontes de estudo e sintetiza os tópicos de forma estruturada para os alunos.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SUMMARY_MODEL_OPTIONS.map((opt) => {
            const isSelected = summaryModel === opt.id;
            return (
              <div
                key={opt.id}
                onClick={() => handleSaveModel(opt.id)}
                className={`nb-btn p-3.5 rounded-xl border-2 border-black cursor-pointer transition-all text-left ${
                  isSelected
                    ? "bg-amber-300 text-black shadow-[2px_2px_0_0_#000]"
                    : "bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border-black/40 shadow-none"
                }`}
              >
                <div className="text-xs font-heading font-black uppercase flex items-center justify-between">
                  <span>{opt.name}</span>
                  {isSelected && <span className="nb-badge bg-emerald-300 text-black text-[10px] border border-black font-black">Ativo</span>}
                </div>
                <div className={`text-[11px] mt-1 font-body font-medium ${isSelected ? "text-neutral-800" : "text-neutral-600"}`}>
                  {opt.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subject Tabs */}
      <div className="nb-card bg-white p-4 sm:p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000]">
        <label className="block text-xs font-heading font-black uppercase text-black mb-2">
          Selecione a Matéria para Gerenciar:
        </label>
        {subjects.length === 0 ? (
          <p className="text-sm font-bold text-neutral-500 font-body">Cadastre matérias primeiro na aba Matérias.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSubject(s.name)}
                className={`nb-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-heading font-black uppercase border-2 border-black transition-all ${
                  selectedSubject.toLowerCase() === s.name.toLowerCase()
                    ? "bg-amber-300 text-black shadow-[2px_2px_0_0_#000]"
                    : "bg-white text-black hover:bg-amber-100 shadow-[2px_2px_0_0_#000]"
                }`}

              >
                {s.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* AI Source Image Uploader Block */}
      {selectedSubject && (
        <div className="nb-card bg-amber-50/70 p-5 sm:p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-black border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#000]">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-heading font-black text-black uppercase">
                Processar Imagens Fontes com IA ({selectedSubject})
              </h3>
              <p className="text-xs font-bold text-neutral-700 font-body">
                A IA analisará as imagens e detectará se o assunto já existe para fundir o conteúdo ou se criará um novo tópico de resumo.
              </p>
            </div>
          </div>

          <div className="nb-card bg-white p-4 rounded-xl border-2 border-black space-y-3">
            <input
              type="file"
              id="resumo-source-files"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <label
                htmlFor="resumo-source-files"
                className="flex-1 border-2 border-dashed border-neutral-400 hover:border-black p-4 sm:p-5 rounded-xl flex flex-col items-center justify-center cursor-pointer bg-neutral-50 hover:bg-amber-50/80 transition-all text-center"
              >
                <Upload className="w-6 h-6 text-sky-600 mb-1" />
                <span className="font-heading font-black text-xs text-black uppercase">
                  Enviar fotos do dispositivo
                </span>
                <span className="text-[11px] font-bold text-neutral-500 font-body">
                  PNG, JPG, JPEG, WEBP
                </span>
              </label>

              {googleDriveConnected && (
                <button
                  type="button"
                  onClick={() => setShowDrivePicker(true)}
                  className="nb-btn flex-1 p-4 sm:p-5 rounded-xl border-2 border-black bg-sky-100 hover:bg-sky-200 flex flex-col items-center justify-center cursor-pointer transition-all text-center shadow-[2px_2px_0_0_#000]"
                >
                  <Cloud className="w-6 h-6 text-sky-600 mb-1" />
                  <span className="font-heading font-black text-xs text-black uppercase">
                    Selecionar do Google Drive ({googleDriveFiles.length})
                  </span>
                  <span className="text-[11px] font-bold text-sky-900 font-body">
                    Fotos da sua nuvem para resumos
                  </span>
                </button>
              )}
            </div>

            {/* Selected files preview list */}
            {selectedFiles.length > 0 && (
              <div className="mt-3 pt-3 border-t-2 border-neutral-200 space-y-2">
                <div className="text-xs font-heading font-black uppercase text-black">
                  Imagens Fontes Selecionadas ({selectedFiles.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-1.5 bg-amber-200 text-black border-2 border-black rounded-lg text-xs font-bold shadow-[2px_2px_0_0_#000]"
                    >
                      <ImageIcon className="w-4 h-4 text-black" />
                      <span className="max-w-[150px] truncate">{file.name || file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeSelectedFile(idx)}
                        className="text-rose-700 hover:text-black font-black ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleProcessSourceImages}
            disabled={processingSource || selectedFiles.length === 0}
            className="nb-btn w-full py-3.5 bg-sky-400 hover:bg-sky-500 text-black font-heading font-black text-sm uppercase tracking-wide rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {processingSource ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Salvando no Drive & Processando com IA...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Processar Fotos Fontes (Salvar no Drive & Gerar Resumo)
              </>
            )}
          </button>
        </div>
      )}

      {/* Subject Topics / Resumo Content List */}
      <div className="nb-card bg-white p-5 sm:p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] space-y-4">
        <div className="flex items-center justify-between border-b-2 border-black pb-3">
          <h3 className="text-lg sm:text-xl font-heading font-black text-black uppercase flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600" />
            Assuntos de Resumo: {selectedSubject || "Todas as Matérias"}
          </h3>
          <span className="nb-badge bg-amber-300 text-black font-heading font-black text-xs border-2 border-black">
            {subjectTopics.length} {subjectTopics.length === 1 ? "Assunto" : "Assuntos"}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500 font-bold flex items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-black" /> Carregando resumos...
          </div>
        ) : subjectTopics.length === 0 ? (
          <div className="p-8 text-center bg-amber-50 rounded-xl border-2 border-dashed border-black">
            <BookOpen className="w-10 h-10 text-amber-600 mx-auto mb-2" />
            <p className="font-black text-black">Nenhum assunto cadastrado para {selectedSubject}.</p>
            <p className="text-xs font-bold text-gray-600 mt-1">
              Envie fotos fontes acima para a IA criar o primeiro resumo ou adicione um assunto manualmente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {subjectTopics.map((topicItem) => (
              <div
                key={topicItem.id}
                className="nb-card bg-neutral-50/60 p-5 rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000] space-y-4 hover:shadow-[5px_5px_0_0_#000] transition-all"
              >
                {/* Topic Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-black/20 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="nb-badge bg-amber-300 text-black font-heading font-black text-xs uppercase border-2 border-black shadow-[1px_1px_0_0_#000]">
                      {topicItem.subject}
                    </span>
                    <h4 className="text-base sm:text-lg font-heading font-black text-black">
                      {topicItem.topic}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditModal(topicItem)}
                      className="nb-btn px-3 py-1.5 bg-sky-200 hover:bg-sky-300 text-black font-heading font-black text-xs rounded-lg border-2 border-black shadow-[2px_2px_0_0_#000] transition-all flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => handleDeleteTopic(topicItem.id)}
                      className="nb-btn px-3 py-1.5 bg-rose-200 hover:bg-rose-300 text-rose-950 font-heading font-black text-xs rounded-lg border-2 border-black shadow-[2px_2px_0_0_#000] transition-all flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </div>
                </div>

                {/* Summary Text */}
                <div className="prose prose-sm text-neutral-900 font-body font-medium leading-relaxed whitespace-pre-line bg-white p-4 rounded-xl border-2 border-black">
                  {topicItem.summary_text}
                </div>

                {/* Source Images Thumbnails */}
                {topicItem.source_image_ids && topicItem.source_image_ids.length > 0 && (
                  <div className="pt-2 border-t-2 border-black/10">
                    <span className="block text-xs font-heading font-black uppercase text-neutral-700 mb-2 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-neutral-700" /> Fotos Fontes Utilizadas ({topicItem.source_image_ids.length}):
                    </span>
                    <div className="flex flex-wrap gap-3">
                      {topicItem.source_image_ids.map((imgId) => (
                        <div
                          key={imgId}
                          onClick={() => setPreviewImageId(imgId)}
                          className="group relative w-16 h-16 rounded-xl border-2 border-black overflow-hidden cursor-pointer shadow-[2px_2px_0_0_#000] hover:scale-105 transition-all bg-black"
                        >
                          <img
                            src={`/api/files/${imgId}`}
                            alt="Fonte"
                            className="w-full h-full object-cover group-hover:opacity-75"
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 text-white">
                            <Eye className="w-5 h-5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Topic Add / Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="nb-card w-full max-w-2xl bg-white rounded-2xl border-2 border-black shadow-[6px_6px_0_0_#000] p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h3 className="text-lg sm:text-xl font-heading font-black text-black uppercase">
                {editingTopic ? "Editar Assunto de Resumo" : "Novo Assunto Manual"}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 border-2 border-black flex items-center justify-center font-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTopic} className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-black uppercase text-black mb-1">
                  Matéria:
                </label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="nb-input"
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
                  Título do Assunto / Tópico:
                </label>
                <input
                  type="text"
                  required
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="Ex: Leis de Newton, Reações de Oxirredução, Matrizes..."
                  className="nb-input"
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-black uppercase text-black mb-1">
                  Texto do Resumo Explicativo:
                </label>
                <textarea
                  rows={6}
                  required
                  value={formData.summary_text}
                  onChange={(e) => setFormData({ ...formData, summary_text: e.target.value })}
                  placeholder="Escreva a explicação estruturada do assunto..."
                  className="nb-input resize-y"
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-black uppercase text-black mb-1">
                  Conceitos-Chave (Separados por vírgula):
                </label>
                <input
                  type="text"
                  value={formData.key_concepts}
                  onChange={(e) => setFormData({ ...formData, key_concepts: e.target.value })}
                  placeholder="Inércia, Ação e Reação, Força Resultante..."
                  className="nb-input"
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-black uppercase text-black mb-1">
                  Fórmulas / Equações (Separadas por vírgula):
                </label>
                <input
                  type="text"
                  value={formData.formulas}
                  onChange={(e) => setFormData({ ...formData, formulas: e.target.value })}
                  placeholder="F = m . a, P = m . g..."
                  className="nb-input font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="nb-btn px-4 py-2 bg-white hover:bg-neutral-100 text-black font-heading font-bold text-xs uppercase rounded-xl border-2 border-black"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="nb-btn px-5 py-2.5 bg-amber-300 hover:bg-amber-400 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000]"
                >
                  Salvar Assunto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Lightbox Preview */}
      {previewImageId && (
        <div
          onClick={() => setPreviewImageId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm cursor-pointer"
        >
          <div className="nb-card relative max-w-4xl max-h-[90vh] bg-white p-3 rounded-2xl border-2 border-black shadow-[6px_6px_0_0_#000]">
            <button
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
      )}

      {/* Google Drive Files Picker Modal */}
      {showDrivePicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="nb-card w-full max-w-2xl bg-white rounded-2xl border-2 border-black shadow-[6px_6px_0_0_#000] p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h3 className="text-base sm:text-lg font-heading font-black text-black uppercase flex items-center gap-2">
                <Cloud className="w-5 h-5 text-sky-600" />
                Selecionar Imagens do seu Google Drive
              </h3>
              <button
                onClick={() => setShowDrivePicker(false)}
                className="w-8 h-8 rounded-lg bg-neutral-100 hover:bg-neutral-200 border-2 border-black flex items-center justify-center font-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs font-bold text-neutral-700 font-body">
              Escolha as fotos armazenadas no seu Google Drive para usar como fontes no sistema de resumos:
            </p>

            {loadingGoogleDrive ? (
              <div className="py-8 text-center text-neutral-500 font-bold flex items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-black" /> Carregando arquivos do Google Drive...
              </div>
            ) : googleDriveFiles.length === 0 ? (
              <div className="py-8 text-center bg-neutral-50 rounded-xl border-2 border-dashed border-black/40">
                <p className="font-heading font-black text-black text-sm">Nenhum arquivo encontrado no seu Google Drive.</p>
                <p className="text-xs text-neutral-500 mt-1 font-body">Envie arquivos para o seu Google Drive primeiro.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto p-1">
                {googleDriveFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={async () => {
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
                    <span className="text-[10px] font-bold text-sky-700 mt-1">Clique para usar</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-3 border-t-2 border-black">
              <button
                type="button"
                onClick={() => setShowDrivePicker(false)}
                className="nb-btn px-5 py-2 bg-amber-400 hover:bg-amber-300 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000]"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
