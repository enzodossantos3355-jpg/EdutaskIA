import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  BookOpen,
  Lightbulb,
  CheckCircle2,
  Image as ImageIcon,
  UploadCloud,
  Camera,
  X,
  Trash2,
  Copy,
  Check,
  Volume2,
  VolumeX,
  MessageCircle,
  Send,
  History,
  Loader2,
  Layers,
  ArrowRight,
  RotateCcw,
  ZoomIn,
  Bot,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import api, { formatApiError } from "@/lib/api";

export const COMMON_SUBJECTS = [
  { id: "Matemática", label: "Matemática", icon: "📐", color: "bg-sky-100 text-sky-950 border-sky-400" },
  { id: "Ciências", label: "Ciências", icon: "🔬", color: "bg-emerald-100 text-emerald-950 border-emerald-400" },
  { id: "Língua Portuguesa", label: "Português", icon: "📖", color: "bg-amber-100 text-amber-950 border-amber-400" },
  { id: "História", label: "História", icon: "🏛️", color: "bg-red-100 text-red-950 border-red-400" },
  { id: "Geografia", label: "Geografia", icon: "🌎", color: "bg-indigo-100 text-indigo-950 border-indigo-400" },
  { id: "Inglês", label: "Inglês", icon: "🇬🇧", color: "bg-violet-100 text-violet-950 border-violet-400" },
  { id: "Arte", label: "Arte", icon: "🎨", color: "bg-pink-100 text-pink-950 border-pink-400" },
  { id: "Filosofia / Redação", label: "Filosofia / Redação", icon: "✍️", color: "bg-teal-100 text-teal-950 border-teal-400" },
];

export default function PlurallStudyAssistantDialog({ open, onClose, defaultSubject = "Matemática", defaultImage = null }) {
  const [tab, setTab] = useState("analyze"); // "analyze" | "history"
  const [subject, setSubject] = useState(defaultSubject);
  const [customSubject, setCustomSubject] = useState("");
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [materialType, setMaterialType] = useState("Livro Individual");
  const [specificDoubt, setSpecificDoubt] = useState("");
  
  // Images
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [zoomImage, setZoomImage] = useState(null);

  // States for analysis & chat
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  // Audio / TTS
  const [speaking, setSpeaking] = useState(false);

  // History
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const chatScrollRef = useRef(null);

  // Reset or preset
  useEffect(() => {
    if (open) {
      if (defaultImage && imagePreviews.length === 0) {
        setImagePreviews([defaultImage]);
      }
      if (defaultSubject) {
        const found = COMMON_SUBJECTS.find((s) => s.id.toLowerCase() === defaultSubject.toLowerCase());
        if (found) {
          setSubject(found.id);
          setIsCustomSubject(false);
        } else {
          setSubject("Outra");
          setCustomSubject(defaultSubject);
          setIsCustomSubject(true);
        }
      }
    }
  }, [open, defaultImage, defaultSubject]);

  // Handle Clipboard Paste (Ctrl+V) anywhere while modal is open
  useEffect(() => {
    if (!open) return;

    const handlePaste = (e) => {
      if (!e.clipboardData || !e.clipboardData.items) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            addImageFile(file);
            toast.success("Print colado da área de transferência com sucesso! 📋");
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [open]);

  // Load history
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get("/ai/study-assistant/history");
      setHistoryList(data || []);
    } catch {
      // silent
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (open && tab === "history") {
      loadHistory();
    }
  }, [open, tab, loadHistory]);

  const addImageFile = (file) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("A imagem selecionada é muito grande (máximo 20MB).");
      return;
    }
    setImageFiles((prev) => [...prev, file].slice(-3));

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreviews((prev) => [...prev, e.target.result].slice(-3));
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      addImageFile(files[i]);
    }
    e.target.value = "";
  };

  const removeImage = (index) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const effectiveSubject = isCustomSubject ? customSubject.trim() || "Matemática" : subject;

  const handleAnalyze = async () => {
    if (imagePreviews.length === 0) {
      toast.error("Adicione a foto ou print da questão (do Plurall ou apostila).");
      return;
    }

    setLoading(true);
    setResult(null);
    setChatOpen(false);
    setChatMessages([]);

    try {
      const formData = new FormData();
      formData.append("subject", effectiveSubject);
      formData.append("material_type", materialType);
      if (specificDoubt.trim()) {
        formData.append("specific_doubt", specificDoubt.trim());
      }

      // Append files or base64
      if (imageFiles.length > 0) {
        imageFiles.forEach((file) => {
          formData.append("images", file);
        });
      } else {
        imagePreviews.forEach((b64) => {
          formData.append("image_base64", b64);
        });
      }

      const { data } = await api.post("/ai/study-assistant/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResult(data);
      toast.success("Explicação didática concluída com sucesso! ✨");
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail) || "Falha ao analisar a questão.");
    } finally {
      setLoading(false);
    }
  };

  // Text-To-Speech
  const handleToggleSpeak = () => {
    if (!result) return;
    if (!("speechSynthesis" in window)) {
      toast.error("Leitura de voz não suportada pelo seu navegador.");
      return;
    }

    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const textToRead = `Entendendo a questão: ${result.understanding || ""}. Passo a passo e explicação: ${result.step_by_step || ""}. Resposta final: ${result.final_answer || ""}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = "pt-BR";
    utterance.rate = 1.0;

    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopySection = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  const handleCopyAll = () => {
    if (!result) return;
    const full = `📌 Entendendo a Questão:\n${result.understanding}\n\n💡 Passo a Passo / Explicação:\n${result.step_by_step}\n\n✅ Resposta Final:\n${result.final_answer}`;
    navigator.clipboard.writeText(full);
    toast.success("Resolução completa copiada!");
  };

  // Follow-up Chat
  const handleSendChat = async (e) => {
    if (e) e.preventDefault();
    const text = chatInput.trim();
    if (!text || sendingChat) return;

    setSendingChat(true);
    const newMsg = { role: "user", content: text };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");

    try {
      const { data } = await api.post("/ai/study-assistant/chat", {
        analysis_id: result?.id,
        message: text,
        history: chatMessages,
      });

      setChatMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      toast.error("Não foi possível enviar a dúvida.");
    } finally {
      setSendingChat(false);
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
        }
      }, 100);
    }
  };

  const handleDeleteHistory = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/ai/study-assistant/history/${id}`);
      setHistoryList((prev) => prev.filter((item) => item.id !== id));
      toast.success("Registro removido do histórico.");
    } catch {
      toast.error("Erro ao remover registro.");
    }
  };

  const handleLoadFromHistory = (item) => {
    setResult(item);
    setSubject(item.subject);
    setMaterialType(item.material_type || "Livro Individual");
    if (item.image_preview) {
      setImagePreviews([item.image_preview]);
    }
    setTab("analyze");
    toast.success("Questão carregada do histórico!");
  };

  const handleReset = () => {
    setResult(null);
    setImageFiles([]);
    setImagePreviews([]);
    setSpecificDoubt("");
    setChatOpen(false);
    setChatMessages([]);
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4 nb-fade-in backdrop-blur-xs overflow-y-auto"
      data-testid="plurall-study-assistant-dialog"
    >
      <div className="nb-card bg-white w-full max-w-4xl max-h-[94vh] flex flex-col rounded-2xl shadow-2xl border-2 border-black overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-600 text-white p-4 sm:p-5 flex items-center justify-between border-b-2 border-black flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-300 text-amber-950 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex-shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-heading font-black text-base sm:text-xl text-white tracking-tight leading-tight">
                  Assistente Inteligente de Estudos EduTask
                </h2>
                <span className="nb-badge bg-amber-300 text-amber-950 text-[10px] sm:text-xs font-black uppercase">
                  Plurall & Apostilas • 8º Ano
                </span>
              </div>
              <p className="text-xs text-violet-100 truncate mt-0.5">
                Envie prints do Plurall ou fotos da apostila e receba a explicação didática passo a passo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => {
                if (speaking) {
                  window.speechSynthesis.cancel();
                  setSpeaking(false);
                }
                onClose();
              }}
              className="nb-btn bg-white hover:bg-neutral-100 text-black p-1.5 rounded-lg"
              data-testid="close-study-assistant-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-100 border-b-2 border-black text-xs font-bold flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab("analyze")}
              className={`px-3 py-1.5 rounded-lg border-2 border-black transition-all flex items-center gap-1.5 ${
                tab === "analyze"
                  ? "bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-transparent border-transparent text-neutral-600 hover:text-black"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              <span>Analisar Questão</span>
            </button>
            <button
              onClick={() => setTab("history")}
              className={`px-3 py-1.5 rounded-lg border-2 border-black transition-all flex items-center gap-1.5 ${
                tab === "history"
                  ? "bg-white text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-transparent border-transparent text-neutral-600 hover:text-black"
              }`}
            >
              <History className="w-3.5 h-3.5 text-indigo-600" />
              <span>Histórico Salvo</span>
              {historyList.length > 0 && (
                <span className="nb-badge bg-black text-white text-[10px] py-0 px-1.5">
                  {historyList.length}
                </span>
              )}
            </button>
          </div>

          {result && tab === "analyze" && (
            <button
              onClick={handleReset}
              className="nb-btn bg-white hover:bg-neutral-100 px-2.5 py-1 text-xs flex items-center gap-1"
              title="Nova análise"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nova Questão</span>
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {tab === "history" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-black text-base sm:text-lg">
                  Suas Resoluções & Estudos Anteriores
                </h3>
                <span className="text-xs text-neutral-500 font-bold">
                  {historyList.length} registro(s)
                </span>
              </div>

              {loadingHistory ? (
                <div className="py-12 text-center text-neutral-500 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
                  <span className="text-xs font-bold">Carregando histórico...</span>
                </div>
              ) : historyList.length === 0 ? (
                <div className="nb-card p-8 text-center bg-neutral-50 border-2 border-dashed border-neutral-300 rounded-xl space-y-2">
                  <History className="w-8 h-8 text-neutral-400 mx-auto" />
                  <p className="text-sm font-bold text-neutral-700">Nenhum estudo salvo ainda.</p>
                  <p className="text-xs text-neutral-500">
                    Envie fotos do Plurall ou apostilas para criar seu histórico de explicações didáticas!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {historyList.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleLoadFromHistory(item)}
                      className="nb-card p-3.5 bg-white hover:bg-violet-50/50 cursor-pointer border-2 border-black transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between gap-2.5 group"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="nb-badge bg-sky-200 text-sky-950 text-[10px] font-black">
                            {item.subject}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            {new Date(item.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-neutral-900 line-clamp-2">
                          📌 {item.understanding || "Questão resolvida"}
                        </div>
                        <div className="text-[11px] text-neutral-600 line-clamp-1 italic">
                          Material: {item.material_type || "Livro Individual"}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-black/10">
                        <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Ver Resolução
                        </span>
                        <button
                          onClick={(e) => handleDeleteHistory(item.id, e)}
                          className="nb-btn bg-white hover:bg-red-100 text-red-700 p-1 text-xs"
                          title="Excluir do histórico"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : !result ? (
            /* Upload / Analysis Form */
            <div className="space-y-6">
              {/* Step 1: Upload / Screenshot */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-heading font-black text-sm sm:text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs">
                      1
                    </span>
                    <span>Envie a Imagem (Plurall, Apostila ou Caderno)</span>
                    <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded border border-violet-300">
                    💡 Dica: Pode colar com Ctrl+V!
                  </span>
                </div>

                {imagePreviews.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="nb-card p-6 sm:p-8 border-2 border-dashed border-violet-400 bg-violet-50/50 hover:bg-violet-100/50 cursor-pointer rounded-2xl text-center space-y-3 transition-colors group"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white border-2 border-black flex items-center justify-center mx-auto shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] group-hover:scale-105 transition-transform">
                      <UploadCloud className="w-7 h-7 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-heading font-black text-sm sm:text-base text-neutral-900">
                        Clique aqui para selecionar uma foto ou print
                      </p>
                      <p className="text-xs text-neutral-600 mt-1">
                        Suporta prints da tela do Plurall, fotos de apostilas do 8º ano e cadernos (JPG, PNG, WebP)
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <span className="nb-btn bg-white text-xs px-3 py-1.5 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-violet-700" /> Escolher Arquivo
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          cameraInputRef.current?.click();
                        }}
                        className="nb-btn bg-white hover:bg-neutral-100 text-xs px-3 py-1.5 flex items-center gap-1.5 sm:hidden"
                      >
                        <Camera className="w-3.5 h-3.5 text-emerald-700" /> Tirar Foto
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {imagePreviews.map((src, idx) => (
                        <div
                          key={idx}
                          className="relative nb-card p-1.5 bg-white border-2 border-black rounded-xl overflow-hidden group shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                        >
                          <img
                            src={src}
                            alt={`Questão ${idx + 1}`}
                            className="w-full h-40 object-contain rounded-lg bg-neutral-100"
                          />
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setZoomImage(src)}
                              className="nb-btn bg-white/90 hover:bg-white p-1 rounded-lg text-black"
                              title="Ampliar imagem"
                            >
                              <ZoomIn className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="nb-btn bg-red-500 hover:bg-red-600 p-1 rounded-lg text-white"
                              title="Remover imagem"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-[10px] font-bold text-center text-neutral-600 mt-1">
                            Página / Imagem {idx + 1}
                          </div>
                        </div>
                      ))}

                      {imagePreviews.length < 3 && (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="nb-card p-4 border-2 border-dashed border-neutral-400 bg-neutral-50 hover:bg-neutral-100 rounded-xl flex flex-col items-center justify-center gap-2 h-40 text-neutral-600"
                        >
                          <UploadCloud className="w-6 h-6 text-neutral-500" />
                          <span className="text-xs font-bold">+ Adicionar outra página</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {/* Step 2: Identificação da Matéria Alvo */}
              <div className="space-y-2">
                <label className="font-heading font-black text-sm sm:text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs">
                    2
                  </span>
                  <span>Matéria Alvo do Exercício</span>
                  <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-neutral-600">
                  Selecione a matéria específica que você quer resolver:
                </p>

                <div className="flex flex-wrap gap-2">
                  {COMMON_SUBJECTS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSubject(s.id);
                        setIsCustomSubject(false);
                      }}
                      className={`nb-btn px-3 py-1.5 text-xs font-heading font-black rounded-xl border-2 flex items-center gap-1.5 transition-all ${
                        !isCustomSubject && subject === s.id
                          ? "bg-violet-300 text-violet-950 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] scale-105"
                          : "bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-800"
                      }`}
                    >
                      <span>{s.icon}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCustomSubject(true)}
                    className={`nb-btn px-3 py-1.5 text-xs font-heading font-black rounded-xl border-2 flex items-center gap-1.5 transition-all ${
                      isCustomSubject
                        ? "bg-violet-300 text-violet-950 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] scale-105"
                        : "bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-800"
                    }`}
                  >
                    <span>✏️</span>
                    <span>Outra Matéria</span>
                  </button>
                </div>

                {isCustomSubject && (
                  <div className="pt-2">
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="Digite o nome da disciplina (ex: Sociologia, Espanhol...)"
                      className="nb-input bg-white text-xs font-bold"
                    />
                  </div>
                )}
              </div>

              {/* Step 3: Identificação do Material (Livro Individual vs Unificado) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-heading font-black text-sm sm:text-base flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs">
                      3
                    </span>
                    <span>Tipo de Material</span>
                    <span className="text-red-500">*</span>
                  </label>
                </div>
                <p className="text-xs text-neutral-600">
                  Informe a estrutura do livro para que o assistente filtre corretamente o conteúdo:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setMaterialType("Livro Individual")}
                    className={`nb-card p-3.5 sm:p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      materialType === "Livro Individual"
                        ? "bg-sky-50 border-sky-800 shadow-[3px_3px_0px_0px_rgba(7,89,133,1)]"
                        : "bg-white hover:bg-neutral-50 border-neutral-300 opacity-75"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-sky-200 border-2 border-black flex items-center justify-center text-lg flex-shrink-0">
                      📘
                    </div>
                    <div>
                      <div className="font-heading font-black text-sm text-neutral-900 flex items-center gap-1.5">
                        <span>Livro Individual</span>
                        {materialType === "Livro Individual" && (
                          <Check className="w-4 h-4 text-sky-700" strokeWidth={3} />
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed">
                        Apostila ou livro dedicado <b>exclusivamente</b> a esta matéria (todo o conteúdo na página pertence à mesma disciplina).
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={() => setMaterialType("Livro Unificado (Várias Matérias)")}
                    className={`nb-card p-3.5 sm:p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                      materialType === "Livro Unificado (Várias Matérias)"
                        ? "bg-violet-50 border-violet-800 shadow-[3px_3px_0px_0px_rgba(91,33,182,1)]"
                        : "bg-white hover:bg-neutral-50 border-neutral-300 opacity-75"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-violet-200 border-2 border-black flex items-center justify-center text-lg flex-shrink-0">
                      📚
                    </div>
                    <div>
                      <div className="font-heading font-black text-sm text-neutral-900 flex items-center gap-1.5">
                        <span>Livro Unificado (Várias Matérias)</span>
                        {materialType === "Livro Unificado (Várias Matérias)" && (
                          <Check className="w-4 h-4 text-violet-700" strokeWidth={3} />
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-600 mt-0.5 leading-relaxed">
                        Apostila geral com várias matérias. <b>Filtro Inteligente:</b> o assistente irá <b>ignorar completamente</b> conteúdos de outras matérias presentes na foto e focar somente em <b>{effectiveSubject}</b>!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 4: Dúvida Específica ou Exercício Alvo (Opcional) */}
              <div className="space-y-2">
                <label className="font-heading font-black text-xs sm:text-sm text-neutral-800 flex items-center justify-between">
                  <span>Dúvida ou Exercício Específico (Opcional)</span>
                  <span className="text-[10px] text-neutral-500">Ex: "Questão 4", "Letra b", "Como monta a fórmula?"</span>
                </label>
                <input
                  type="text"
                  value={specificDoubt}
                  onChange={(e) => setSpecificDoubt(e.target.value)}
                  placeholder="Se houver vários exercícios na imagem, indique qual deseja focar..."
                  className="nb-input bg-white text-xs"
                />
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={loading || imagePreviews.length === 0}
                  className={`nb-btn w-full py-3.5 px-4 text-sm sm:text-base font-heading font-black rounded-xl border-2 border-black flex items-center justify-center gap-2 transition-all ${
                    loading || imagePreviews.length === 0
                      ? "bg-neutral-200 text-neutral-500 border-neutral-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 hover:from-emerald-300 hover:to-sky-300 text-neutral-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5"
                  }`}
                  data-testid="submit-analyze-study-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Analisando imagem com Didática para 8º Ano...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Explicar & Resolver Questão do {effectiveSubject} 🚀</span>
                    </>
                  )}
                </button>
                <p className="text-[11px] text-center text-neutral-500 mt-2">
                  Metodologia Pedagógica: Conceito claro, raciocínio detalhado e resposta final destacada.
                </p>
              </div>
            </div>
          ) : (
            /* Results View */
            <div className="space-y-6 nb-fade-in" data-testid="study-assistant-result">
              {/* Context Summary Banner */}
              <div className="nb-card p-4 bg-gradient-to-r from-violet-100 via-sky-50 to-amber-50 border-2 border-black rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="nb-badge bg-black text-white text-xs font-black">
                      {result.subject}
                    </span>
                    <span className="nb-badge bg-white text-neutral-800 text-xs font-bold border border-black/20">
                      📖 {result.material_type || "Livro Individual"}
                    </span>
                    {result.specific_doubt && (
                      <span className="nb-badge bg-amber-200 text-amber-950 text-xs font-bold">
                        Foco: {result.specific_doubt}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-700">
                    Resolução elaborada no método didático para estudantes do 8º ano.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                  <button
                    onClick={handleToggleSpeak}
                    className={`nb-btn px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 ${
                      speaking ? "bg-amber-300 text-amber-950" : "bg-white hover:bg-neutral-100"
                    }`}
                    title={speaking ? "Parar leitura" : "Ouvir explicação em voz alta"}
                  >
                    {speaking ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-red-600" /> Parar Voz
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-violet-700" /> Ouvir Resolução
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleCopyAll}
                    className="nb-btn bg-white hover:bg-neutral-100 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                    title="Copiar texto completo"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar Tudo
                  </button>

                  <button
                    onClick={handleReset}
                    className="nb-btn bg-white hover:bg-neutral-100 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Outra Questão
                  </button>
                </div>
              </div>

              {/* Three Structured Cards */}
              <div className="space-y-4">
                {/* 1. 📌 Entendendo a Questão */}
                <div className="nb-card bg-amber-50/80 border-2 border-black rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center justify-between border-b border-black/15 pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-300 text-amber-950 border-2 border-black flex items-center justify-center font-bold">
                        📌
                      </div>
                      <h3 className="font-heading font-black text-base sm:text-lg text-amber-950">
                        Entendendo a Questão
                      </h3>
                    </div>
                    <button
                      onClick={() => handleCopySection(result.understanding, "Entendendo a questão")}
                      className="nb-btn bg-white hover:bg-amber-100 px-2 py-1 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copiar
                    </button>
                  </div>
                  <div className="text-xs sm:text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">
                    {result.understanding || "O exercício solicita a resolução e aplicação dos conceitos fundamentais da matéria."}
                  </div>
                </div>

                {/* 2. 💡 Passo a Passo / Explicação */}
                <div className="nb-card bg-violet-50/80 border-2 border-black rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <div className="flex items-center justify-between border-b border-black/15 pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-violet-300 text-violet-950 border-2 border-black flex items-center justify-center font-bold">
                        💡
                      </div>
                      <h3 className="font-heading font-black text-base sm:text-lg text-violet-950">
                        Passo a Passo / Explicação
                      </h3>
                    </div>
                    <button
                      onClick={() => handleCopySection(result.step_by_step, "Passo a passo")}
                      className="nb-btn bg-white hover:bg-violet-100 px-2 py-1 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copiar
                    </button>
                  </div>
                  <div className="text-xs sm:text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">
                    {result.step_by_step || result.full_response}
                  </div>
                </div>

                {/* 3. ✅ Resposta Final */}
                <div className="nb-card bg-emerald-50 border-2 border-black rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ring-2 ring-emerald-500/30">
                  <div className="flex items-center justify-between border-b border-black/15 pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-300 text-emerald-950 border-2 border-black flex items-center justify-center font-bold">
                        ✅
                      </div>
                      <h3 className="font-heading font-black text-base sm:text-lg text-emerald-950">
                        Resposta Final
                      </h3>
                    </div>
                    <button
                      onClick={() => handleCopySection(result.final_answer, "Resposta final")}
                      className="nb-btn bg-white hover:bg-emerald-100 px-2 py-1 text-[11px] font-bold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copiar
                    </button>
                  </div>
                  <div className="text-sm sm:text-base font-bold text-emerald-950 leading-relaxed whitespace-pre-wrap bg-white/70 p-3 rounded-xl border border-emerald-300">
                    {result.final_answer || "Resultado obtido com sucesso conforme resolução."}
                  </div>
                </div>
              </div>

              {/* Follow-up Question Drawer / Chat */}
              <div className="pt-2">
                {!chatOpen ? (
                  <button
                    onClick={() => setChatOpen(true)}
                    className="nb-btn w-full py-3 px-4 bg-gradient-to-r from-violet-200 via-pink-200 to-amber-200 hover:from-violet-300 hover:to-amber-300 text-xs sm:text-sm font-heading font-black rounded-xl border-2 border-black flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <MessageCircle className="w-4 h-4 text-violet-900" />
                    <span>Ainda tem dúvidas sobre esta questão? Abrir chat com o assistente</span>
                  </button>
                ) : (
                  <div className="nb-card bg-neutral-50 border-2 border-black rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-black/10 pb-2">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-violet-700" />
                        <span className="font-heading font-black text-xs sm:text-sm">
                          Tirar Dúvida da Questão de {result.subject}
                        </span>
                      </div>
                      <button
                        onClick={() => setChatOpen(false)}
                        className="text-neutral-500 hover:text-black text-xs font-bold"
                      >
                        Fechar Chat
                      </button>
                    </div>

                    <div
                      ref={chatScrollRef}
                      className="max-h-60 overflow-y-auto space-y-2 pr-1"
                    >
                      {chatMessages.length === 0 ? (
                        <p className="text-xs text-neutral-500 italic text-center py-2">
                          Me pergunte qualquer detalhe da resolução! (Ex: "De onde veio esse número?", "Pode explicar o 2º passo?")
                        </p>
                      ) : (
                        chatMessages.map((m, i) => (
                          <div
                            key={i}
                            className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`p-2.5 rounded-xl border border-black/20 text-xs max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                                m.role === "user" ? "bg-sky-100 text-sky-950 font-bold" : "bg-white text-neutral-900"
                              }`}
                            >
                              {m.content}
                            </div>
                          </div>
                        ))
                      )}
                      {sendingChat && (
                        <div className="text-xs text-neutral-500 italic flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>O assistente está digitando...</span>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleSendChat} className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Escreva sua dúvida sobre esta questão..."
                        disabled={sendingChat}
                        className="nb-input bg-white text-xs flex-1"
                      />
                      <button
                        type="submit"
                        disabled={sendingChat || !chatInput.trim()}
                        className="nb-btn bg-violet-400 hover:bg-violet-500 text-violet-950 px-3 py-2 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-neutral-100 border-t-2 border-black flex items-center justify-between text-xs text-neutral-600 flex-shrink-0">
          <div className="flex items-center gap-1 text-[11px]">
            <span className="font-bold">EduTask IA:</span>
            <span>Didática do 8º Ano • Filtro anti-distrações para Livros Unificados</span>
          </div>

          <button
            onClick={() => {
              if (speaking) {
                window.speechSynthesis.cancel();
                setSpeaking(false);
              }
              onClose();
            }}
            className="nb-btn bg-white hover:bg-neutral-200 px-3.5 py-1.5 font-bold"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Lightbox / Zoom Dialog */}
      {zoomImage && (
        <div
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={zoomImage}
              alt="Ampliação"
              className="max-w-full max-h-[85vh] object-contain rounded-xl border-2 border-white shadow-2xl"
            />
            <button
              onClick={() => setZoomImage(null)}
              className="absolute -top-3 -right-3 nb-btn bg-white text-black p-1.5 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
