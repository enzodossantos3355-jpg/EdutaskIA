import { useState, useEffect, useRef } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  X,
  Sparkles,
  FileText,
  Image as ImageIcon,
  BookOpen,
  CheckSquare,
  Square,
  Loader2,
  Check,
  Plus,
  Zap,
} from "lucide-react";
import MarkdownSummaryViewer from "@/components/MarkdownSummaryViewer";
import ModalPortal from "@/components/ModalPortal";

export default function PersonalizedSummaryModal({ isOpen, onClose, initialSubject = "" }) {
  const [subjects, setSubjects] = useState([]);
  const [allSummaries, setAllSummaries] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);
  const [format, setFormat] = useState("pdf"); // 'pdf' | 'image'
  const [focusStyle, setFocusStyle] = useState("completo");
  const [studentNotes, setStudentNotes] = useState("");
  
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);

  const [loadingSubjects, setLoadingSubjects] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoadingSubjects(true);
    try {
      const [subjRes, sumRes] = await Promise.all([
        api.get("/subjects"),
        api.get("/summaries"),
      ]);
      setSubjects(subjRes.data || []);
      setAllSummaries(sumRes.data || []);

      if (initialSubject) {
        setSelectedSubjects([initialSubject]);
      } else if (subjRes.data?.length > 0) {
        setSelectedSubjects([subjRes.data[0].name]);
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoadingSubjects(false);
    }
  };

  if (!isOpen) return null;

  const availableTopics = allSummaries.filter((s) =>
    selectedSubjects.some((subj) => subj.toLowerCase() === s.subject.toLowerCase())
  );

  const toggleSubject = (subjectName) => {
    if (selectedSubjects.includes(subjectName)) {
      const next = selectedSubjects.filter((s) => s !== subjectName);
      setSelectedSubjects(next);
      const validTopics = allSummaries
        .filter((s) => next.some((sub) => sub.toLowerCase() === s.subject.toLowerCase()))
        .map((s) => s.id);
      setSelectedTopicIds((prev) => prev.filter((id) => validTopics.includes(id)));
    } else {
      setSelectedSubjects([...selectedSubjects, subjectName]);
    }
  };

  const toggleTopic = (topicId) => {
    if (selectedTopicIds.includes(topicId)) {
      setSelectedTopicIds(selectedTopicIds.filter((id) => id !== topicId));
    } else {
      setSelectedTopicIds([...selectedTopicIds, topicId]);
    }
  };

  const selectAllTopics = () => {
    setSelectedTopicIds(availableTopics.map((t) => t.id));
  };

  const clearTopics = () => {
    setSelectedTopicIds([]);
  };

  const handleGenerate = async () => {
    if (selectedSubjects.length === 0) {
      toast.error("Selecione pelo menos uma matéria.");
      return;
    }

    setGenerating(true);
    setGeneratedResult(null);

    try {
      const { data } = await api.post("/summaries/generate-personalized", {
        selected_subjects: selectedSubjects,
        selected_topic_ids: selectedTopicIds.length > 0 ? selectedTopicIds : undefined,
        format,
        focus_style: focusStyle,
        student_notes: studentNotes,
      });

      if (data && data.result_markdown) {
        setGeneratedResult(data.result_markdown);
        toast.success("Resumo personalizado gerado com sucesso!");
      }
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto backdrop-blur-sm print:p-0 print:bg-white print:static print:inset-auto font-body">
      <div className="nb-card relative w-full max-w-4xl my-8 bg-white rounded-2xl border-3 border-black shadow-[8px_8px_0_0_#000] overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:border-none print:bg-white print:w-full">
        {/* Modal Header */}
        <div className="bg-amber-300 p-5 border-b-3 border-black flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-black border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#000]">
              <Sparkles className="w-5 h-5 text-black animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-black text-black uppercase tracking-tight">
                Criar Resumo Personalizado
              </h2>
              <p className="text-xs font-bold text-neutral-900 font-body">
                Monte resumos e fichas de estudo exclusivas geradas por Inteligência Artificial
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white hover:bg-neutral-100 border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0_0_#000]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 print:p-0">
          {!generatedResult ? (
            /* Form view */
            <div className="space-y-6 no-print">
              {/* Step 1: Subjects selection */}
              <div className="nb-card bg-neutral-50 p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000]">
                <h3 className="font-heading font-black text-base text-black mb-3 flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-amber-300 text-black text-xs flex items-center justify-center font-heading font-black border-2 border-black shadow-[1px_1px_0_0_#000]">
                    1
                  </span>
                  <span>Selecione as Matérias para o Resumo:</span>
                </h3>

                {loadingSubjects ? (
                  <p className="text-xs sm:text-sm font-bold text-neutral-600 font-body flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                    <span>Carregando matérias disponíveis...</span>
                  </p>
                ) : subjects.length === 0 ? (
                  <p className="text-xs sm:text-sm font-bold text-neutral-500 font-body">Nenhuma matéria cadastrada.</p>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {subjects.map((s) => {
                      const isSelected = selectedSubjects.includes(s.name);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSubject(s.name)}
                          className={`nb-btn px-4 py-2 rounded-xl border-2 border-black font-heading font-black text-xs uppercase transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-amber-300 text-black shadow-[2px_2px_0_0_#000]"
                              : "bg-white text-black hover:bg-amber-100 shadow-[2px_2px_0_0_#000]"
                          }`}
                        >
                          {isSelected ? <Check className="w-4 h-4 text-black" /> : <Plus className="w-4 h-4 text-neutral-600" />}
                          <span>{s.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Step 2: Topics Selection (Optional refinement) */}
              {availableTopics.length > 0 && (
                <div className="nb-card bg-neutral-50 p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000]">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 className="font-heading font-black text-base text-black flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-sky-300 text-black text-xs flex items-center justify-center font-heading font-black border-2 border-black shadow-[1px_1px_0_0_#000]">
                        2
                      </span>
                      <span>Escolha os Assuntos Específicos (Opcional):</span>
                    </h3>

                    <div className="flex items-center gap-2 text-xs font-heading font-bold">
                      <button
                        type="button"
                        onClick={selectAllTopics}
                        className="text-sky-800 underline hover:text-black"
                      >
                        Selecionar Todos ({availableTopics.length})
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={clearTopics}
                        className="text-rose-800 underline hover:text-black"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-neutral-600 mb-3 font-body">
                    Se nenhum assunto específico for marcado, a IA sintetizará TODOS os assuntos das matérias selecionadas.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1">
                    {availableTopics.map((t) => {
                      const isChecked = selectedTopicIds.includes(t.id);
                      return (
                        <div
                          key={t.id}
                          onClick={() => toggleTopic(t.id)}
                          className={`p-3 rounded-xl border-2 border-black cursor-pointer transition-all flex items-start gap-2.5 ${
                            isChecked
                              ? "bg-amber-100 border-black font-heading font-bold shadow-[2px_2px_0_0_#000]"
                              : "bg-white hover:bg-neutral-100 border-black/40"
                          }`}
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-black shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <span className="nb-badge bg-sky-200 text-sky-950 font-bold text-[10px] border border-black uppercase mr-1.5">
                              {t.subject}
                            </span>
                            <span className="text-xs font-heading font-bold text-black">{t.topic}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Focus Style & Custom Notes */}
              <div className="nb-card bg-neutral-50 p-5 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000] space-y-4">
                <h3 className="font-heading font-black text-base text-black flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-emerald-300 text-black text-xs flex items-center justify-center font-heading font-black border-2 border-black shadow-[1px_1px_0_0_#000]">
                    3
                  </span>
                  <span>Estilo de Foco & Observações:</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "completo", name: "Completo & Equilibrado", desc: "Teoria, fórmulas e pontos chave" },
                    { id: "rapido", name: "Resumo Rápido Véspera", desc: "Apenas pontos cruciais e macetes" },
                    { id: "formulas", name: "Fórmulas & Exercícios", desc: "Destaque total em equações e exemplos" },
                  ].map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setFocusStyle(style.id)}
                      className={`nb-btn p-3 rounded-xl border-2 border-black text-left transition-all font-heading font-bold ${
                        focusStyle === style.id
                          ? "bg-amber-300 text-black shadow-[2px_2px_0_0_#000]"
                          : "bg-white text-neutral-800 hover:bg-amber-50"
                      }`}
                    >
                      <div className="text-xs font-heading font-black uppercase mb-1">{style.name}</div>
                      <div className="text-[11px] text-neutral-600 font-body font-medium">{style.desc}</div>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-heading font-black text-black mb-1 uppercase">
                    Notas ou Pedidos Especiais para a IA (Opcional):
                  </label>
                  <textarea
                    rows={2}
                    value={studentNotes}
                    onChange={(e) => setStudentNotes(e.target.value)}
                    placeholder="Ex: Dar destaque especial às propriedades da eletrostática e adicionar 3 dicas de memorização..."
                    className="nb-input resize-y text-xs sm:text-sm font-body"
                  />
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || selectedSubjects.length === 0}
                className="nb-btn w-full py-4 bg-sky-400 hover:bg-sky-500 text-black font-heading font-black text-sm sm:text-base uppercase tracking-wide rounded-xl border-2 border-black shadow-[4px_4px_0_0_#000] flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Gerando seu Resumo Exclusivo com IA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Gerar Resumo Personalizado Agora</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Result View */
            <MarkdownSummaryViewer
              markdown={generatedResult}
              title="Resumo de Estudo Personalizado"
              subtitle={`Matérias: ${selectedSubjects.join(" • ")} | Data: ${new Date().toLocaleDateString("pt-BR")}`}
              subjects={selectedSubjects}
              showToolbar={true}
              onReset={() => setGeneratedResult(null)}
            />
          )}
        </div>
      </div>
      </div>
    </ModalPortal>
  );
}
