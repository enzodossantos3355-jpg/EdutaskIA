import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import ModalPortal from "@/components/ModalPortal";
import {
  BookOpen,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  Upload,
  Image as ImageIcon,
  X,
  Copy,
  Check,
  PlusCircle,
  HelpCircle,
  Calendar,
  Layers,
  GraduationCap,
  RefreshCw,
  FileText,
  Clock,
  ShieldCheck,
  Award,
  Zap,
  ArrowRight,
  Send,
  BookMarked,
  User,
} from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import confetti from "canvas-confetti";

const DEFAULT_SUBJECTS = [
  "Matemática",
  "Ciências",
  "Português",
  "História",
  "Geografia",
  "Inglês",
  "Arte",
  "Física",
  "Química",
  "Biologia"
];

export default function PlurallAdminPanel() {
  // Config state
  const [config, setConfig] = useState({
    enabled: true,
    username: "",
    password: "",
    account_owner: "",
    institution: "Colégio / Parceiro Somos Educação",
    grade: "8º Ano - Ensino Fundamental II",
    status: "unconfigured",
    password_configured: false,
    last_tested_at: null,
    last_status_message: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);

  // Search & Solve form state
  const [subject, setSubject] = useState("Matemática");
  const [customSubject, setCustomSubject] = useState("");
  const [materialType, setMaterialType] = useState("Livro Unificado (Várias Matérias)");
  const [bookQuery, setBookQuery] = useState("");
  const [pageOrExercise, setPageOrExercise] = useState("");
  const [specificInstructions, setSpecificInstructions] = useState("");
  const [images, setImages] = useState([]); // Array of { file, preview, base64 }
  const [searching, setSearching] = useState(false);
  const [searchStep, setSearchStep] = useState("");

  // Result state
  const [currentResult, setCurrentResult] = useState(null);
  const [copied, setCopied] = useState(false);

  // Create Task dialog state
  const [createTaskModalOpen, setCreateTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskSubject, setTaskSubject] = useState("");
  const [taskPoints, setTaskPoints] = useState(10);
  const [taskDueDate, setTaskDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split("T")[0];
  });
  const [taskDescription, setTaskDescription] = useState("");
  const [taskTargetGroup, setTaskTargetGroup] = useState("all");
  const [creatingTask, setCreatingTask] = useState(false);

  // History state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fileInputRef = useRef(null);

  // Load config on mount
  const fetchConfig = useCallback(async () => {
    try {
      setLoadingConfig(true);
      const res = await api.get("/admin/plurall/config");
      const c = res.data?.config || res.data;
      if (c) {
        setConfig((prev) => ({
          ...prev,
          enabled: c.enabled !== undefined ? c.enabled : prev.enabled,
          username: c.username || "",
          account_owner: c.account_owner || c.owner_name || "",
          institution: c.institution || prev.institution,
          grade: c.grade || prev.grade,
          status: c.status || prev.status,
          password_configured: Boolean(c.password_configured),
          last_tested_at: c.last_tested_at || null,
          last_status_message: c.last_status_message || "",
          password: "" // Keep local password empty unless edited
        }));
      }
    } catch (err) {
      console.warn("Erro ao carregar config Plurall:", err);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  // Load history
  const fetchHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get("/admin/plurall/history");
      const list = Array.isArray(res.data) ? res.data : (res.data?.history || []);
      setHistory(list);
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchHistory();
  }, [fetchConfig, fetchHistory]);

  // Handle Ctrl+V paste of images
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            addImageFile(file);
            toast.info("Captura de tela colada com sucesso!");
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [images]);

  const addImageFile = (file) => {
    if (images.length >= 3) {
      toast.error("Máximo de 3 imagens por consulta da apostila.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImages((prev) => [
        ...prev,
        {
          file,
          preview: reader.result,
          base64: reader.result
        }
      ]);
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => addImageFile(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Save Plurall Config
  const handleSaveConfig = async (e) => {
    e?.preventDefault();
    try {
      setSavingConfig(true);
      const payload = {
        enabled: config.enabled,
        username: config.username,
        account_owner: config.account_owner,
        institution: config.institution,
        grade: config.grade
      };
      if (config.password) {
        payload.password = config.password;
      }
      const res = await api.post("/admin/plurall/config", payload);
      toast.success(res.data?.message || "Configurações do Plurall salvas com sucesso!");
      fetchConfig();
    } catch (err) {
      toast.error(formatApiError(err, "Falha ao salvar credenciais do Plurall"));
    } finally {
      setSavingConfig(false);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      const res = await api.post("/admin/plurall/test-connection", {
        username: config.username,
        password: config.password,
        account_owner: config.account_owner
      });
      toast.success(res.data?.message || "Conectado ao Plurall com sucesso!");
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
      fetchConfig();
    } catch (err) {
      toast.error(formatApiError(err, "Falha ao testar conexão com Plurall"));
    } finally {
      setTestingConnection(false);
    }
  };

  // Execute Search in Apostila & Solve
  const handleSearchApostila = async (e) => {
    e?.preventDefault();
    const effectiveSubject = subject === "Outra" ? customSubject.trim() : subject;
    if (!effectiveSubject) {
      toast.error("Por favor, selecione ou informe a matéria.");
      return;
    }

    if (!pageOrExercise && !bookQuery && images.length === 0) {
      toast.error("Informe a página/exercício, apostila ou envie ao menos uma captura de tela do Plurall.");
      return;
    }

    try {
      setSearching(true);
      setSearchStep("Conectando ao catálogo de apostilas do Plurall...");

      const formData = new FormData();
      formData.append("subject", effectiveSubject);
      formData.append("material_type", materialType);
      formData.append("book_query", bookQuery);
      formData.append("page_or_exercise", pageOrExercise);
      formData.append("specific_instructions", specificInstructions);

      images.forEach((img) => {
        if (img.file) {
          formData.append("images", img.file);
        } else if (img.base64) {
          formData.append("images", img.base64);
        }
      });

      // Progress indicators
      setTimeout(() => {
        setSearchStep(`Aplicando filtro didático para o 8º Ano (${materialType === "Livro Unificado (Várias Matérias)" ? "Ignorando outras disciplinas" : "Apostila individual"})...`);
      }, 1400);

      setTimeout(() => {
        setSearchStep("Estruturando explicação didática e gabarito final...");
      }, 3200);

      const res = await api.post("/admin/plurall/search-apostila", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data?.ok && res.data?.result) {
        setCurrentResult(res.data.result);
        toast.success("Exercício do Plurall resolvido com metodologia do 8º ano!");
        confetti({ particleCount: 50, spread: 65, origin: { y: 0.6 } });
        fetchHistory();

        // Scroll to result
        setTimeout(() => {
          document.getElementById("plurall-resolution-anchor")?.scrollIntoView({ behavior: "smooth" });
        }, 150);
      } else {
        toast.error("Não foi possível gerar a resolução do Plurall.");
      }
    } catch (err) {
      toast.error(formatApiError(err, "Erro ao consultar apostila no Plurall"));
    } finally {
      setSearching(false);
      setSearchStep("");
    }
  };

  // Copy full resolution to clipboard
  const handleCopyResolution = () => {
    if (!currentResult) return;
    const text = `📚 RESOLUÇÃO PLURALL (8º ANO) — ${currentResult.subject}
📘 Material: ${currentResult.material_type}
${currentResult.book_query ? `📖 Apostila: ${currentResult.book_query}\n` : ""}${currentResult.page_or_exercise ? `📍 Localização: ${currentResult.page_or_exercise}\n` : ""}
--------------------------------------------
📌 ENTENDENDO A QUESTÃO:
${currentResult.sections?.understanding || ""}

💡 PASSO A PASSO / EXPLICAÇÃO DIDÁTICA:
${currentResult.sections?.step_by_step || ""}

✅ RESPOSTA FINAL:
${currentResult.sections?.final_answer || ""}
--------------------------------------------
Gerado pelo Sistema Plurall Integrado EduTask`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Resolução completa copiada para a área de transferência!");
    setTimeout(() => setCopied(false), 2500);
  };

  // Open Create Task modal
  const handleOpenCreateTask = () => {
    if (!currentResult) return;
    const s = currentResult.suggested_task || {};
    setTaskTitle(s.title || `[Plurall] ${currentResult.subject}: ${currentResult.page_or_exercise || "Atividade da Apostila"}`);
    setTaskSubject(currentResult.subject || "Matemática");
    setTaskPoints(s.points || 10);
    setTaskDescription(
      s.description ||
      `Atividade extraída da apostila do Plurall (${currentResult.book_query || "Apostila do 8º Ano"}).\n\n📌 Localização: ${currentResult.page_or_exercise || "Exercício Indicado"}\n\n💡 Atenção: Leia com cuidado a questão, desenvolva a resposta com suas próprias palavras e entregue dentro do prazo!`
    );
    setTaskTargetGroup("all");
    setCreateTaskModalOpen(true);
  };

  // Submit Task Creation
  const handleConfirmCreateTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error("Informe o título da tarefa.");
      return;
    }

    try {
      setCreatingTask(true);
      const payload = {
        title: taskTitle.trim(),
        subject: taskSubject,
        points: Number(taskPoints) || 10,
        due_date: taskDueDate,
        description: taskDescription,
        target_group: taskTargetGroup,
        plurall_analysis_id: currentResult?.id
      };

      const res = await api.post("/admin/plurall/create-task", payload);
      toast.success(res.data?.message || "Tarefa criada com sucesso no EduTask a partir do Plurall!");
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
      setCreateTaskModalOpen(false);
    } catch (err) {
      toast.error(formatApiError(err, "Falha ao criar tarefa no EduTask"));
    } finally {
      setCreatingTask(false);
    }
  };

  const getStatusBadge = () => {
    if (config.status === "connected") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 border border-emerald-400 text-emerald-950 font-bold text-xs rounded-full shadow-[1px_1px_0_0_#000]">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
          Conectado ao Plurall
        </span>
      );
    }
    if (config.username && config.password_configured) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 border border-amber-400 text-amber-950 font-bold text-xs rounded-full shadow-[1px_1px_0_0_#000]">
          <span className="w-2 h-2 rounded-full bg-amber-600"></span>
          Credenciais Salvas (Aguardando Teste)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-neutral-200 border border-neutral-400 text-neutral-800 font-bold text-xs rounded-full">
        <span className="w-2 h-2 rounded-full bg-neutral-500"></span>
        Não Configurado
      </span>
    );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Banner Exclusivo Admin */}
      <div className="bg-gradient-to-r from-amber-400 via-orange-300 to-amber-200 border-4 border-black p-6 sm:p-7 shadow-[6px_6px_0px_0px_#000] relative overflow-hidden">
        <div className="absolute right-3 top-3 opacity-15 pointer-events-none">
          <BookOpen className="w-36 h-36" />
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="bg-black text-white px-2.5 py-0.5 font-heading font-black text-xs uppercase tracking-wider">
                Exclusivo Professor / Admin
              </span>
              {getStatusBadge()}
            </div>
            <h2 className="text-2xl sm:text-3xl font-heading font-black text-black flex items-center gap-2">
              <BookMarked className="w-8 h-8 text-black" />
              Central Plurall & Apostilas (8º Ano)
            </h2>
            <p className="text-sm font-medium text-neutral-900 max-w-2xl leading-relaxed">
              Configure suas credenciais de professor da plataforma Plurall (Somos Educação). Pesquise apostilas, resolva exercícios com filtro de matéria para livros unificados e converta resoluções em tarefas oficiais do EduTask em 1 clique.
            </p>
          </div>
        </div>
      </div>

      {/* SEÇÃO 1: CONFIGURAÇÃO DE ACESSO AO PLURALL */}
      <div className="bg-white border-4 border-black p-5 sm:p-7 shadow-[5px_5px_0px_0px_#000]">
        <div className="flex items-center justify-between border-b-2 border-black pb-4 mb-5 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-300 border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <Lock className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-black text-black">
                1. Credenciais de Acesso ao Plurall
              </h3>
              <p className="text-xs text-neutral-600">
                O acesso direto aos livros e apostilas do Plurall é gerenciado apenas pelo Professor / Administrador.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchConfig}
              disabled={loadingConfig}
              className="nb-btn px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-xs font-bold border-2 border-black flex items-center gap-1.5"
              title="Recarregar status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingConfig ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveConfig} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-heading font-black text-black mb-1">
                E-MAIL OU LOGIN DO PLURALL *
              </label>
              <input
                type="text"
                value={config.username}
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
                placeholder="professor@escola.com.br ou usuário Plurall"
                className="w-full bg-neutral-50 border-2 border-black p-2.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-black text-black mb-1">
                NOME DO TITULAR / DONO DO LOGIN NO PLURALL *
              </label>
              <input
                type="text"
                value={config.account_owner}
                onChange={(e) => setConfig({ ...config, account_owner: e.target.value })}
                placeholder="Ex: Prof. Enzo dos Santos (Plurall SOMOS)"
                className="w-full bg-neutral-50 border-2 border-black p-2.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-heading font-black text-black">
                  SENHA DE ACESSO AO PLURALL *
                </label>
                {config.password_configured && (
                  <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Senha já cadastrada
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={config.password}
                  onChange={(e) => setConfig({ ...config, password: e.target.value })}
                  placeholder={config.password_configured ? "•••••••••••• (deixe em branco para manter)" : "Digite a senha do Plurall"}
                  className="w-full bg-neutral-50 border-2 border-black p-2.5 text-sm font-medium pr-10 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-black p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-heading font-black text-black mb-1">
                COLÉGIO / INSTITUIÇÃO DE ENSINO
              </label>
              <input
                type="text"
                value={config.institution}
                onChange={(e) => setConfig({ ...config, institution: e.target.value })}
                placeholder="Ex: Colégio Anglo / Pitágoras / Sistema pH"
                className="w-full bg-neutral-50 border-2 border-black p-2.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-heading font-black text-black mb-1">
              TURMA / SEGMENTO DIDÁTICO
            </label>
            <input
              type="text"
              value={config.grade}
              onChange={(e) => setConfig({ ...config, grade: e.target.value })}
              placeholder="8º Ano - Ensino Fundamental II"
              className="w-full bg-neutral-50 border-2 border-black p-2.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Cartão de Confirmação do Dono do Login Conectado */}
          {config.status === "connected" && (
            <div className="bg-emerald-50 border-2 border-emerald-500 p-4 shadow-[4px_4px_0px_0px_#000] space-y-2">
              <div className="flex items-center justify-between gap-3 flex-wrap border-b border-emerald-300 pb-2.5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-400 border border-black shadow-[1px_1px_0px_0px_#000]">
                    <ShieldCheck className="w-5 h-5 text-black" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                      Conexão Plurall Autenticada e Verificada
                    </span>
                    <span className="text-sm font-heading font-black text-black flex items-center gap-1.5 mt-0.5">
                      <User className="w-4 h-4 text-emerald-800" /> Usuário Logado: {config.account_owner || config.username || "Prof. Titular Plurall"}
                    </span>
                  </div>
                </div>
                <span className="text-xs bg-emerald-200 border border-black px-2.5 py-1 font-bold text-emerald-950">
                  Acesso Confirmado
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-medium text-emerald-950 pt-1">
                <div className="flex items-center gap-1.5 bg-white/80 p-2 border border-emerald-300 rounded">
                  <Lock className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                  <span><strong>Login:</strong> https://login.plurall.net/</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/80 p-2 border border-emerald-300 rounded">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
                  <span><strong>Biblioteca:</strong> https://bibliotecadeconteudos.plurall.net/</span>
                </div>
              </div>
            </div>
          )}

          {/* Feedback & Last Test */}
          {config.last_status_message && (
            <div className="bg-amber-50 border-2 border-amber-300 p-3 text-xs flex items-start gap-2 text-amber-950 font-medium">
              <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <span>{config.last_status_message}</span>
                {config.last_tested_at && (
                  <span className="block text-[10px] text-amber-700 mt-0.5">
                    Último teste: {new Date(config.last_tested_at).toLocaleString("pt-BR")}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2 flex-wrap">
            <button
              type="submit"
              disabled={savingConfig}
              className="nb-btn px-5 py-2.5 bg-amber-400 hover:bg-amber-500 font-heading font-black text-xs sm:text-sm border-2 border-black shadow-[3px_3px_0_0_#000] flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {savingConfig ? "Salvando..." : "Salvar Credenciais do Plurall"}
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection || (!config.username && !config.password_configured)}
              className="nb-btn px-4 py-2.5 bg-emerald-300 hover:bg-emerald-400 font-heading font-black text-xs sm:text-sm border-2 border-black shadow-[3px_3px_0_0_#000] flex items-center gap-2"
            >
              <Zap className={`w-4 h-4 ${testingConnection ? "animate-bounce" : ""}`} />
              {testingConnection ? "Testando Acesso..." : "Testar Conexão com Plurall"}
            </button>
          </div>
        </form>
      </div>

      {/* SEÇÃO 2: PROCURAR NA APOSTILA DO PLURALL & RESOLVER (COM REGRAS DE 8º ANO) */}
      <div className="bg-white border-4 border-black p-5 sm:p-7 shadow-[5px_5px_0px_0px_#000] space-y-6">
        <div className="border-b-2 border-black pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-300 border-2 border-black shadow-[2px_2px_0px_0px_#000]">
              <Search className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-lg font-heading font-black text-black">
                2. Procurar na Apostila do Plurall & Resolver Exercício
              </h3>
              <p className="text-xs text-neutral-600">
                A IA analisa a apostila indicada ou as imagens capturadas do Plurall e gera a resolução didática estruturada para o 8º ano.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSearchApostila} className="space-y-6">
          {/* Regra 1: Identificação da Matéria */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-heading font-black text-black uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-sky-800" />
                Matéria Alvo da Questão *
              </label>
              <span className="text-[11px] text-neutral-500 font-medium">
                Selecione a disciplina do exercício
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {DEFAULT_SUBJECTS.map((subj) => (
                <button
                  type="button"
                  key={subj}
                  onClick={() => {
                    setSubject(subj);
                    setCustomSubject("");
                  }}
                  className={`px-3 py-1.5 text-xs font-heading font-bold border-2 border-black transition-all ${
                    subject === subj
                      ? "bg-sky-400 text-black shadow-[2px_2px_0px_0px_#000] -translate-y-0.5"
                      : "bg-white text-neutral-800 hover:bg-neutral-100"
                  }`}
                >
                  {subj}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSubject("Outra")}
                className={`px-3 py-1.5 text-xs font-heading font-bold border-2 border-black transition-all ${
                  subject === "Outra"
                    ? "bg-sky-400 text-black shadow-[2px_2px_0px_0px_#000] -translate-y-0.5"
                    : "bg-white text-neutral-800 hover:bg-neutral-100"
                }`}
              >
                Outra...
              </button>
            </div>

            {subject === "Outra" && (
              <input
                type="text"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
                placeholder="Nome da disciplina (ex: Sociologia, Redação, Espanhol...)"
                className="mt-2 w-full max-w-md bg-neutral-50 border-2 border-black p-2 text-xs font-medium focus:bg-white focus:outline-none"
                required
              />
            )}
          </div>

          {/* Regra 2: Tipo de Material & Filtro para Livros Unificados */}
          <div>
            <label className="block text-xs font-heading font-black text-black mb-2 uppercase tracking-wider">
              Formato do Material no Plurall *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label
                onClick={() => setMaterialType("Livro Individual")}
                className={`cursor-pointer p-3.5 border-2 border-black transition-all flex items-start gap-3 ${
                  materialType === "Livro Individual"
                    ? "bg-amber-100 shadow-[3px_3px_0px_0px_#000]"
                    : "bg-white hover:bg-neutral-50"
                }`}
              >
                <input
                  type="radio"
                  name="materialType"
                  checked={materialType === "Livro Individual"}
                  onChange={() => setMaterialType("Livro Individual")}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-heading font-black text-xs text-black flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-800" /> Livro Individual (Única Matéria)
                  </span>
                  <p className="text-[11px] text-neutral-600 mt-0.5 leading-snug">
                    Apostila específica dedicada exclusivamente a {subject || "uma disciplina"}.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setMaterialType("Livro Unificado (Várias Matérias)")}
                className={`cursor-pointer p-3.5 border-2 border-black transition-all flex items-start gap-3 ${
                  materialType === "Livro Unificado (Várias Matérias)"
                    ? "bg-violet-100 border-violet-950 shadow-[3px_3px_0px_0px_#000]"
                    : "bg-white hover:bg-neutral-50"
                }`}
              >
                <input
                  type="radio"
                  name="materialType"
                  checked={materialType === "Livro Unificado (Várias Matérias)"}
                  onChange={() => setMaterialType("Livro Unificado (Várias Matérias)")}
                  className="mt-0.5"
                />
                <div>
                  <span className="font-heading font-black text-xs text-violet-950 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-violet-800" /> Livro Unificado (Várias Matérias)
                  </span>
                  <p className="text-[11px] text-neutral-600 mt-0.5 leading-snug">
                    Contém várias matérias juntas no mesmo caderno.
                  </p>
                </div>
              </label>
            </div>

            {materialType === "Livro Unificado (Várias Matérias)" && (
              <div className="mt-2.5 bg-violet-50 border-2 border-violet-300 p-3 text-xs text-violet-950 font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-violet-700 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Filtro Rigoroso Ativo:</strong> Se a página capturada do Plurall contiver trechos de outras disciplinas, a IA vai <u>ignorar completamente</u> qualquer outro conteúdo e focar estritamente em <strong>{subject}</strong>.
                </span>
              </div>
            )}
          </div>

          {/* Dados de busca na apostila */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-heading font-black text-black mb-1">
                APOSTILA / CADERNO / MÓDULO NO PLURALL
              </label>
              <input
                type="text"
                value={bookQuery}
                onChange={(e) => setBookQuery(e.target.value)}
                placeholder="Ex: Caderno 1 - Módulo 4: Equações do 1º Grau"
                className="w-full bg-neutral-50 border-2 border-black p-2.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-black text-black mb-1">
                PÁGINA OU NÚMERO DO EXERCÍCIO
              </label>
              <input
                type="text"
                value={pageOrExercise}
                onChange={(e) => setPageOrExercise(e.target.value)}
                placeholder="Ex: Página 38, Exercício 3 (ou 'Atividade Proposta 2')"
                className="w-full bg-neutral-50 border-2 border-black p-2.5 text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            </div>
          </div>

          {/* Upload / Print Paste da Apostila Plurall */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-heading font-black text-black uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-black" />
                Capturas do Plurall ou Foto da Apostila (Até 3)
              </label>
              <span className="text-[11px] text-neutral-500 font-medium">
                Dica: Dê <strong>Ctrl + V</strong> em qualquer lugar da tela para colar o print!
              </span>
            </div>

            <div className="border-2 border-dashed border-black bg-neutral-50 p-4 text-center hover:bg-neutral-100 transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept="image/*"
                multiple
                className="hidden"
                id="plurall-image-upload"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <Upload className="w-7 h-7 text-neutral-600" />
                <div className="text-xs text-neutral-700">
                  <label
                    htmlFor="plurall-image-upload"
                    className="cursor-pointer font-heading font-black text-sky-800 hover:underline"
                  >
                    Clique aqui para selecionar prints
                  </label>{" "}
                  ou cole da área de transferência (Ctrl+V)
                </div>
                <span className="text-[10px] text-neutral-500">
                  Suporta PNG, JPG, WebP da tela do Plurall ou fotos da apostila física
                </span>
              </div>
            </div>

            {/* Previews */}
            {images.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative border-2 border-black bg-white p-1 shadow-[2px_2px_0_0_#000]">
                    <img
                      src={img.preview}
                      alt={`Print Plurall ${idx + 1}`}
                      className="w-24 h-24 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full border border-black hover:bg-red-600 shadow-[1px_1px_0_0_#000]"
                      title="Remover imagem"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Observações / Dúvida específica do professor */}
          <div>
            <label className="block text-xs font-heading font-black text-black mb-1">
              INSTRUÇÕES ADICIONAIS OU FOCO PEDAGÓGICO (OPCIONAL)
            </label>
            <input
              type="text"
              value={specificInstructions}
              onChange={(e) => setSpecificInstructions(e.target.value)}
              placeholder="Ex: Dar ênfase na regra de três simples, ou focar no método de Bhaskara..."
              className="w-full bg-neutral-50 border-2 border-black p-2 text-xs font-medium focus:bg-white focus:outline-none"
            />
          </div>

          {/* Botão de Envio */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={searching}
              className="w-full sm:w-auto nb-btn px-6 py-3.5 bg-sky-400 hover:bg-sky-500 text-black font-heading font-black text-sm border-3 border-black shadow-[4px_4px_0_0_#000] flex items-center justify-center gap-2.5 transition-transform active:translate-x-0.5 active:translate-y-0.5"
            >
              <ImageIcon className={`w-5 h-5 ${searching ? "animate-spin" : ""}`} />
              {searching ? (
                <span>{searchStep || "Capturando print da apostila no Plurall..."}</span>
              ) : (
                <span>Mandar IA Obter Print da Apostila no Plurall</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* SEÇÃO 3: EXIBIÇÃO EXCLUSIVA DO PRINT DA PÁGINA CAPTURADA DO PLURALL */}
      {currentResult && (
        <div
          id="plurall-resolution-anchor"
          className="bg-white border-4 border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_#000] space-y-6 animate-in fade-in duration-300"
        >
          {/* Header do Print */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-black pb-4 gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="bg-sky-300 text-sky-950 px-2.5 py-0.5 text-xs font-heading font-black border border-black">
                  {currentResult.subject}
                </span>
                <span className="bg-neutral-200 text-neutral-900 px-2 py-0.5 text-xs font-bold border border-black">
                  {currentResult.material_type}
                </span>
                <span className="bg-amber-300 text-amber-950 px-2 py-0.5 text-xs font-black border border-black">
                  8º Ano do Ensino Fundamental
                </span>
                <span className="bg-emerald-200 text-emerald-950 px-2 py-0.5 text-xs font-bold border border-black inline-flex items-center gap-1">
                  <User className="w-3.5 h-3.5" /> Dono do Login: {currentResult.account_owner || currentResult.owner_name || config.account_owner || config.username || "Prof. Titular Plurall"}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-heading font-black text-black">
                Print da Página da Apostila Capturada (Plurall)
              </h3>
              {(currentResult.book_query || currentResult.page_or_exercise) && (
                <p className="text-xs text-neutral-600 mt-0.5 font-medium">
                  {currentResult.book_query} {currentResult.page_or_exercise ? `• ${currentResult.page_or_exercise}` : ""}
                </p>
              )}
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center gap-2 flex-wrap">
              {currentResult.image_preview && (
                <a
                  href={currentResult.image_preview}
                  download={`print_plurall_${currentResult.page_or_exercise || "pagina"}.png`}
                  className="nb-btn px-4 py-2 bg-emerald-300 hover:bg-emerald-400 text-black text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-1.5"
                >
                  <Upload className="w-4 h-4 rotate-180" />
                  Baixar Print da Imagem
                </a>
              )}

              <button
                type="button"
                onClick={handleOpenCreateTask}
                className="nb-btn px-4 py-2 bg-amber-400 hover:bg-amber-500 text-black text-xs font-heading font-black border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                Criar Tarefa no EduTask com estes Prints
              </button>
            </div>
          </div>

          {/* Exibição em Destaque do Print da Página do Plurall */}
          {currentResult.image_preview ? (
            <div className="border-3 border-black bg-neutral-900 p-4 shadow-[4px_4px_0px_0px_#000]">
              <div className="flex items-center justify-between mb-3 text-white font-heading font-black text-xs sm:text-sm flex-wrap gap-2">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  Imagem Fonte Capturada — Plurall ({currentResult.account_owner || config.account_owner || "Conexão Ativa"})
                </span>
                <span className="text-xs bg-amber-400 text-black font-bold px-2 py-0.5 border border-black">
                  Pronto para uso nas tarefas
                </span>
              </div>
              <div className="bg-black p-3 flex justify-center border border-neutral-700 overflow-hidden">
                <img
                  src={currentResult.image_preview}
                  alt="Print Plurall"
                  className="max-h-[500px] w-auto object-contain rounded border border-neutral-600 shadow-lg"
                />
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border-2 border-amber-300 p-6 text-center text-xs font-bold text-amber-950">
              Nenhuma imagem obtida no momento. Verifique as credenciais ou selecione o print.
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO 4: HISTÓRICO DE CONSULTAS NO PLURALL */}
      <div className="bg-white border-4 border-black p-5 sm:p-7 shadow-[5px_5px_0px_0px_#000]">
        <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-neutral-800" />
            <h3 className="text-base font-heading font-black text-black">
              Histórico Recente de Consultas da Apostila
            </h3>
          </div>
          <span className="text-xs text-neutral-500 font-bold">
            {history.length} consulta(s)
          </span>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-neutral-500 py-3 text-center">
            Nenhuma consulta realizada ainda. Pesquise uma página da apostila ou cole um print do Plurall para começar.
          </p>
        ) : (
          <div className="divide-y divide-neutral-200">
            {history.slice(0, 8).map((item) => (
              <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-neutral-200 text-neutral-900 font-heading font-black text-[11px] border border-black">
                      {item.subject}
                    </span>
                    <span className="text-xs font-bold text-black">
                      {item.page_or_exercise || item.book_query || "Exercício do Plurall"}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {item.material_type} • {item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "Hoje"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentResult(item);
                      document.getElementById("plurall-resolution-anchor")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="nb-btn px-2.5 py-1 bg-sky-200 hover:bg-sky-300 text-[11px] font-bold border border-black"
                  >
                    Ver Resolução
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: CRIAR TAREFA NO EDUTASK A PARTIR DA RESOLUÇÃO */}
      {createTaskModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="nb-card bg-white border-4 border-black max-w-lg w-full p-6 shadow-[8px_8px_0_0_#000] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
              <div className="flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-amber-800" />
                <h3 className="font-heading font-black text-lg text-black">
                  Publicar Tarefa no EduTask
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateTaskModalOpen(false)}
                className="p-1 hover:bg-neutral-100 border border-black"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-heading font-black text-black mb-1">
                  TÍTULO DA TAREFA *
                </label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-neutral-50 border-2 border-black p-2 text-xs font-medium focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-heading font-black text-black mb-1">
                    MATÉRIA
                  </label>
                  <input
                    type="text"
                    value={taskSubject}
                    onChange={(e) => setTaskSubject(e.target.value)}
                    className="w-full bg-neutral-50 border-2 border-black p-2 text-xs font-medium focus:bg-white focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-black text-black mb-1">
                    VALOR EM PONTOS (XP)
                  </label>
                  <input
                    type="number"
                    value={taskPoints}
                    onChange={(e) => setTaskPoints(Number(e.target.value))}
                    min="1"
                    max="100"
                    className="w-full bg-neutral-50 border-2 border-black p-2 text-xs font-medium focus:bg-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-heading font-black text-black mb-1">
                  DATA DE ENTREGA
                </label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full bg-neutral-50 border-2 border-black p-2 text-xs font-medium focus:bg-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-heading font-black text-black mb-1">
                  ENUNCIADO / DESCRIÇÃO DA TAREFA PARA OS ALUNOS
                </label>
                <textarea
                  rows={4}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="w-full bg-neutral-50 border-2 border-black p-2 text-xs font-medium focus:bg-white focus:outline-none"
                  placeholder="Orientações aos alunos..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-black">
                <button
                  type="button"
                  onClick={() => setCreateTaskModalOpen(false)}
                  className="nb-btn px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-xs font-bold border-2 border-black"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="nb-btn px-4 py-1.5 bg-amber-400 hover:bg-amber-500 font-heading font-black text-xs border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {creatingTask ? "Publicando..." : "Publicar Tarefa para os Alunos"}
                </button>
              </div>
            </form>
          </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
