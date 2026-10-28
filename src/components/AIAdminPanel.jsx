import { useState, useEffect } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { useAIStatus } from "@/context/AIStatusContext";
import {
  Sparkles,
  Bot,
  BrainCircuit,
  Users,
  Eye,
  EyeOff,
  Palette,
  RotateCw,
} from "lucide-react";

const MODEL_OPTIONS = [
  { id: "gemini-3.8-flash", name: "Gemini 3.8 Flash", tag: "Recomendado • Padrão", desc: "Velocidade máxima e alta precisão para resoluções de tarefas e gabaritos.", badgeBg: "bg-emerald-300 text-emerald-950" },
  { id: "gemini-3.6-flash", name: "Gemini 3.6 Flash", tag: "Versão Estável", desc: "Desempenho consistente e equilibrado para avisos e análises.", badgeBg: "bg-sky-200 text-sky-950" },
  { id: "gemini-3.5-flash-lite", name: "Gemini 3.5 Flash-Lite", tag: "Ultra Rápido", desc: "Modelo super leve otimizado para respostas instantâneas.", badgeBg: "bg-amber-200 text-amber-950" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", tag: "Exatas & Matemática", desc: "Otimizado para leitura rápida de cálculos, fotos e tabelas.", badgeBg: "bg-violet-200 text-violet-950" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", tag: "Análise Profunda", desc: "Modelo poderoso para relatórios pedagógicos e pareceres.", badgeBg: "bg-rose-200 text-rose-950" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", tag: "Raciocínio Raciocinado", desc: "Ideal para textos extensos e resoluções conceituais.", badgeBg: "bg-indigo-200 text-indigo-950" },
];

export default function AIAdminPanel() {
  const {
    enabled,
    aiHidden,
    framesDisabled,
    frameRotationDisabled,
    model,
    changeModel,
    toggleAI,
    toggleHideAI,
    toggleFramesDisabled,
    toggleFrameRotationDisabled,
  } = useAIStatus();

  const [toggling, setToggling] = useState(false);
  const [togglingHide, setTogglingHide] = useState(false);
  const [togglingFrames, setTogglingFrames] = useState(false);
  const [togglingRotation, setTogglingRotation] = useState(false);
  const [modelChanging, setModelChanging] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    api.get("/users").then(({ data }) => {
      const list = data.filter((u) => u.role === "aluno");
      setStudents(list);
      if (list.length > 0 && !selectedStudentId) {
        setSelectedStudentId(list[0].id);
      }
    }).catch(() => {});
  }, []);

  const toggle = async () => {
    setToggling(true);
    try {
      await toggleAI(!enabled);
      toast.success(!enabled ? "IA ativada" : "IA bloqueada");
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao alterar");
    } finally {
      setToggling(false);
    }
  };

  const handleToggleHide = async () => {
    setTogglingHide(true);
    try {
      const nextHide = !aiHidden;
      await toggleHideAI(nextHide);
      toast.success(nextHide ? "Todos os botões de IA foram ocultados!" : "Recursos e botões de IA visíveis novamente!");
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao alterar visibilidade");
    } finally {
      setTogglingHide(false);
    }
  };

  const handleToggleFrameRotation = async () => {
    setTogglingRotation(true);
    try {
      const nextDisabled = !frameRotationDisabled;
      await toggleFrameRotationDisabled(nextDisabled);
      toast.success(
        nextDisabled
          ? "Giro das molduras desativado (efeito estático)."
          : "Giro das molduras ativado (com movimento)!"
      );
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao alterar giro das molduras");
    } finally {
      setTogglingRotation(false);
    }
  };

  const handleToggleFrames = async () => {
    setTogglingFrames(true);
    try {
      const nextDisabled = !framesDisabled;
      await toggleFramesDisabled(nextDisabled);
      toast.success(
        nextDisabled
          ? "Molduras e Loja desativadas! As molduras sumiram do aplicativo."
          : "Molduras e Loja reativadas! Molduras equipadas voltaram automaticamente sem re-equipar."
      );
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao alterar estado das molduras");
    } finally {
      setTogglingFrames(false);
    }
  };

  const handleModelSelect = async (selectedModelId) => {
    setModelChanging(true);
    try {
      await changeModel(selectedModelId);
      toast.success(`Modelo de IA do Gemini alterado para ${selectedModelId}!`);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao alterar modelo de IA");
    } finally {
      setModelChanging(false);
    }
  };

  const handleGenerateStudentReport = async () => {
    if (!selectedStudentId) {
      toast.error("Selecione um aluno para gerar o relatório.");
      return;
    }
    setReportLoading(true);
    setReportData(null);
    try {
      const { data } = await api.post("/ai/student-report", { student_id: selectedStudentId });
      setReportData(data);
      toast.success(`Avaliação da IA gerada para ${data.student_name}!`);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao gerar avaliação");
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="space-y-6 nb-fade-in" data-testid="ai-admin-panel">
      {/* Top Banner */}
      <div className="nb-card p-6 sm:p-8 bg-gradient-to-r from-violet-200 via-pink-100 to-sky-100 border-2 border-black flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[6px_6px_0_0_#000]">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white rounded-full font-heading font-black text-xs uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Painel de IA do Administrador
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-4xl text-neutral-950 tracking-tight">
            Controle de Inteligência Artificial & Molduras
          </h1>
          <p className="text-xs sm:text-sm text-neutral-800 leading-relaxed font-medium">
            Escolha o modelo do Gemini para gerar respostas, emita avaliações individuais por IA de cada aluno e controle o estado global e as molduras.
          </p>
        </div>
      </div>

      {/* Grid of Control Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Toggle AI */}
        <div className="nb-card p-5 sm:p-6 bg-white border-2 border-black shadow-[4px_4px_0_0_#000] text-neutral-950">
          <div className="flex flex-col justify-between h-full gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 nb-card bg-violet-300 border-2 border-black flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_0_#000]">
                <Bot className="w-5 h-5 text-neutral-950" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="font-heading font-black text-xl text-neutral-950 flex items-center gap-2">
                  Recursos de IA
                  <span className="nb-badge text-xs font-black border-black bg-emerald-300 text-black">
                    {enabled ? "Ativado" : "Bloqueado"}
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-neutral-700 font-medium mt-1 leading-relaxed">
                  {enabled ? "Ativados — respostas, resoluções e resumos da IA estão operacionais." : "Bloqueados — nenhuma função de IA responderá até que seja reativada."}
                </p>
              </div>
            </div>
            <button
              onClick={toggle}
              disabled={toggling}
              className="nb-btn px-4 py-2.5 flex items-center justify-center gap-2 font-black w-full border-2 border-black shadow-[2px_2px_0_0_#000] bg-red-300 hover:bg-red-400 text-red-950"
            >
              <Bot className="w-4 h-4" />
              <span>{toggling ? "Aplicando..." : enabled ? "Bloquear Todos os Recursos de IA" : "Ativar Recursos de IA"}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Hide/Show AI UI */}
        <div className="nb-card p-5 sm:p-6 bg-white border-2 border-black shadow-[4px_4px_0_0_#000] text-neutral-950">
          <div className="flex flex-col justify-between h-full gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 nb-card bg-sky-300 border-2 border-black flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_0_#000]">
                {aiHidden ? <EyeOff className="w-5 h-5 text-neutral-950" strokeWidth={2.5} /> : <Eye className="w-5 h-5 text-neutral-950" strokeWidth={2.5} />}
              </div>
              <div>
                <h2 className="font-heading font-black text-xl text-neutral-950 flex items-center gap-2">
                  Interface da IA
                  <span className="nb-badge text-xs font-black border-black bg-sky-300 text-black">
                    {aiHidden ? "Oculta" : "Visível"}
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-neutral-700 font-medium mt-1 leading-relaxed">
                  {aiHidden ? "Ocultos — botões da IA sumiram das telas dos alunos e painéis." : "Visíveis — botões 'Ajuda da IA', resumos e assistente aparecem nas telas."}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleHide}
              disabled={togglingHide}
              className="nb-btn px-4 py-2.5 flex items-center justify-center gap-2 font-black w-full border-2 border-black shadow-[2px_2px_0_0_#000] bg-amber-300 hover:bg-amber-400 text-amber-950"
            >
              {aiHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>{togglingHide ? "Aplicando..." : aiHidden ? "Exibir Botões de IA" : "Ocultar Botões de IA"}</span>
            </button>
          </div>
        </div>

        {/* Card 3: Molduras & Loja + Rotation Toggle */}
        <div className="nb-card p-5 sm:p-6 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 border-2 border-black shadow-[4px_4px_0_0_#000] text-neutral-950">
          <div className="flex flex-col justify-between h-full gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 nb-card bg-amber-300 border-2 border-black flex items-center justify-center flex-shrink-0 text-amber-950 shadow-[2px_2px_0_0_#000]">
                <Palette className="w-5 h-5 text-amber-950" strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h2 className="font-heading font-black text-xl text-neutral-950 flex items-center gap-2 flex-wrap">
                  <span>Molduras & Loja</span>
                  {framesDisabled && <span className="nb-badge bg-red-400 text-black border-black text-xs font-black">Desativadas</span>}
                  {frameRotationDisabled ? (
                    <span className="nb-badge bg-sky-200 text-sky-950 border-black text-xs font-black">Estáticas (Sem Giro)</span>
                  ) : (
                    <span className="nb-badge bg-amber-300 text-amber-950 border-black text-xs font-black">Giro Ativo 🔄</span>
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-neutral-800 font-medium mt-1 leading-relaxed">
                  Controle a visibilidade da loja e se as molduras dos perfis giram ou permanecem fixas/estáticas.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              <button
                onClick={handleToggleFrames}
                disabled={togglingFrames}
                className="nb-btn px-3 py-2.5 flex items-center justify-center gap-1.5 text-xs font-black border-2 border-black shadow-[2px_2px_0_0_#000] bg-red-300 hover:bg-red-400 text-red-950"
              >
                <Palette className="w-4 h-4 text-red-950" strokeWidth={2.5} />
                <span>{togglingFrames ? "Aplicando..." : framesDisabled ? "Reativar Loja" : "Desativar Loja"}</span>
              </button>

              <button
                onClick={handleToggleFrameRotation}
                disabled={togglingRotation}
                className="nb-btn px-3 py-2.5 flex items-center justify-center gap-1.5 text-xs font-black border-2 border-black shadow-[2px_2px_0_0_#000] bg-sky-300 hover:bg-sky-400 text-sky-950"
              >
                <RotateCw className="w-4 h-4 text-sky-950" strokeWidth={2.5} />
                <span>
                  {togglingRotation
                    ? "Aplicando..."
                    : frameRotationDisabled
                    ? "Ligar Giro de Molduras 🔄"
                    : "Desligar Giro de Molduras 🛑"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Seção 1: Escolher a IA que será usada para gerar respostas */}
      <div className="nb-card p-6 bg-white border-2 border-black shadow-[5px_5px_0_0_#000]">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap border-b border-black/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 nb-card bg-violet-300 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#000]">
              <BrainCircuit className="w-5 h-5 text-neutral-950" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-heading font-black text-xl text-neutral-950">
                Modelo da IA Gemini Usado para Gerar Respostas
              </h2>
              <p className="text-xs text-neutral-600 font-medium">
                Escolha qual versão do Gemini o sistema utilizará para gerar gabaritos, respostas e textos.
              </p>
            </div>
          </div>
          <span className="nb-badge bg-amber-300 text-amber-950 border-black font-black text-xs">
            Modelo Ativo: {model || "gemini-3.8-flash"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MODEL_OPTIONS.map((opt) => {
            const isSelected = (model || "gemini-3.8-flash") === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={modelChanging}
                onClick={() => handleModelSelect(opt.id)}
                className={`nb-card p-4 text-left transition-all duration-200 border-2 flex flex-col justify-between ${
                  isSelected
                    ? "bg-violet-100 border-violet-900 shadow-[4px_4px_0_0_#2e1065]"
                    : "bg-white border-black hover:bg-neutral-50 shadow-[2px_2px_0_0_#000]"
                }`}
                data-testid={`select-model-${opt.id}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-heading font-black text-base text-neutral-950">
                      {opt.name}
                    </span>
                    <span className={`nb-badge text-[10px] font-black ${opt.badgeBg}`}>
                      {opt.tag}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-700 font-medium leading-relaxed">
                    {opt.desc}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-black/10 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-800">
                    {isSelected ? "✓ Modelo em Uso" : "Clique para Ativar"}
                  </span>
                  {isSelected && (
                    <span className="w-3 h-3 rounded-full bg-emerald-500 border border-black animate-pulse" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Seção 2: Avaliação Separada de Cada Aluno por IA (Relatório Pedagógico Individual) */}
      <div className="nb-card p-6 bg-gradient-to-br from-amber-50 via-white to-sky-50 border-2 border-black shadow-[5px_5px_0_0_#000]">
        <div className="flex items-center justify-between gap-3 mb-4 border-b border-black/10 pb-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 nb-card bg-emerald-300 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#000]">
              <Users className="w-5 h-5 text-emerald-950" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="font-heading font-black text-xl text-neutral-950">
                Avaliação Separada e Relatório Individual de Cada Aluno (IA)
              </h2>
              <p className="text-xs text-neutral-600 font-medium">
                Gere um parecer pedagógico e diagnóstico individual detalhado da inteligência artificial para qualquer aluno.
              </p>
            </div>
          </div>
          <span className="nb-badge bg-emerald-200 text-emerald-950 font-black text-xs">
            {students.length} Aluno(s) Cadastrado(s)
          </span>
        </div>

        {students.length === 0 ? (
          <p className="text-sm text-neutral-600">Nenhum aluno cadastrado para avaliação.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider mb-1">
                  Selecione o Aluno para a Avaliação da IA
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    setReportData(null);
                  }}
                  className="nb-input cursor-pointer font-bold text-sm bg-white"
                  data-testid="student-report-select"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.points || 0} pts • {s.status === "bot" ? "Bot Teste" : "Aluno Oficial"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:self-end">
                <button
                  type="button"
                  onClick={handleGenerateStudentReport}
                  disabled={reportLoading || !selectedStudentId}
                  className="nb-btn px-5 py-3 bg-violet-300 hover:bg-violet-400 text-violet-950 font-black text-sm flex items-center justify-center gap-2 border-2 border-black shadow-[3px_3px_0_0_#000] w-full sm:w-auto"
                  data-testid="generate-student-report-button"
                >
                  <Sparkles className={`w-4 h-4 text-violet-950 ${reportLoading ? "animate-spin" : ""}`} />
                  <span>{reportLoading ? "Analisando dados do aluno com a IA..." : "Gerar Avaliação Individual IA"}</span>
                </button>
              </div>
            </div>

            {/* Resultado do Relatório Gerado */}
            {reportData && (
              <div className="nb-card p-5 bg-white border-2 border-black shadow-[4px_4px_0_0_#000] space-y-3 nb-fade-in" data-testid="student-report-result">
                <div className="flex items-center justify-between border-b border-black/10 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 border border-black" />
                    <h3 className="font-heading font-black text-lg text-neutral-950">
                      Parecer Pedagógico de {reportData.student_name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="nb-badge bg-emerald-100 text-emerald-950 font-bold">
                      ✓ {reportData.completed_count} Feitas ({reportData.on_time_count} no prazo)
                    </span>
                    <span className="nb-badge bg-amber-100 text-amber-950 font-bold">
                      ⏳ {reportData.pending_count} Pendências
                    </span>
                    <span className="nb-badge bg-violet-100 text-violet-950 font-bold">
                      🛍️ {reportData.points} pts loja
                    </span>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none text-neutral-800 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
                  {reportData.report}
                </div>

                <div className="border-t border-black/10 pt-2 flex items-center justify-between text-[11px] text-neutral-500">
                  <span>Gerado pelo Gemini AI em {new Date(reportData.generated_at).toLocaleString("pt-BR")}</span>
                  <button
                    type="button"
                    onClick={() => setReportData(null)}
                    className="text-neutral-700 hover:text-black font-bold underline"
                  >
                    Fechar Relatório
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
