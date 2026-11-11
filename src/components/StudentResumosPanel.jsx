import { useState, useEffect } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import PersonalizedSummaryModal from "./PersonalizedSummaryModal";
import MarkdownSummaryViewer from "./MarkdownSummaryViewer";
import { MathRenderer, cleanLatexFormula } from "@/lib/mathUtils";
import {
  BookOpen,
  Search,
  Sparkles,
  FileText,
  Eye,
  X,
  History,
  Calendar,
  Image as ImageIcon,
  Calculator,
  Brain,
  GraduationCap,
  Layers,
  ChevronRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";

// Subject color map for high-contrast Neo-Brutalist subject badges
const SUBJECT_COLORS = {
  matemática: "bg-sky-300 text-sky-950 border-black",
  português: "bg-emerald-300 text-emerald-950 border-black",
  ciências: "bg-amber-300 text-amber-950 border-black",
  história: "bg-purple-300 text-purple-950 border-black",
  geografia: "bg-rose-300 text-rose-950 border-black",
  inglês: "bg-indigo-300 text-indigo-950 border-black",
  artes: "bg-pink-300 text-pink-950 border-black",
  "educação física": "bg-orange-300 text-orange-950 border-black",
};

export default function StudentResumosPanel() {
  const [subTab, setSubTab] = useState("apostilas"); // 'apostilas' | 'recentes'

  const [summaries, setSummaries] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("TODAS");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Recent history state
  const [recentGenerations, setRecentGenerations] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal State
  const [readingTopic, setReadingTopic] = useState(null);
  const [readingHistoryItem, setReadingHistoryItem] = useState(null);
  const [showPersonalizedModal, setShowPersonalizedModal] = useState(false);
  const [initialModalSubject, setInitialModalSubject] = useState("");

  // Lightbox preview
  const [previewImageId, setPreviewImageId] = useState(null);

  useEffect(() => {
    loadData();
    loadHistory();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, subjRes] = await Promise.all([
        api.get("/summaries"),
        api.get("/subjects"),
      ]);
      setSummaries(sumRes.data || []);
      setSubjects(subjRes.data || []);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const { data } = await api.get("/summaries/history");
      setRecentGenerations(data || []);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenPersonalizedModal = (subj = "") => {
    setInitialModalSubject(subj);
    setShowPersonalizedModal(true);
  };

  // Filter logic for apostilas
  const filteredSummaries = summaries.filter((item) => {
    const matchSubject =
      selectedSubject === "TODAS" ||
      item.subject.toLowerCase() === selectedSubject.toLowerCase();

    const query = searchQuery.trim().toLowerCase();
    const matchQuery =
      !query ||
      item.subject.toLowerCase().includes(query) ||
      item.topic.toLowerCase().includes(query) ||
      item.summary_text.toLowerCase().includes(query) ||
      (item.key_concepts || []).some((c) => c.toLowerCase().includes(query)) ||
      (item.formulas || []).some((f) => f.toLowerCase().includes(query));

    return matchSubject && matchQuery;
  });

  const getSubjectBadgeStyle = (subjectName = "") => {
    const key = subjectName.trim().toLowerCase();
    return SUBJECT_COLORS[key] || "bg-amber-300 text-black border-black";
  };

  return (
    <div className="space-y-6 font-body">
      {/* Neo-Brutalist Top Banner */}
      <div className="nb-card bg-amber-300 p-6 rounded-2xl border-3 border-black shadow-[6px_6px_0_0_#000] relative overflow-hidden">
        {/* Subtle Decorative Pattern Accent */}
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-6 opacity-10 pointer-events-none">
          <Brain className="w-64 h-64 text-black" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="nb-badge bg-amber-300 text-black font-heading font-black text-xs uppercase px-3 py-1 border-2 border-black shadow-[2px_2px_0_0_#000]">
                ⚡ Central de Estudos Edutask
              </span>
              <span className="nb-badge bg-white text-black font-heading font-black text-xs uppercase px-3 py-1 border-2 border-black">
                {summaries.length} Resumos Cadastrados
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-heading font-black text-black uppercase tracking-tight flex items-center gap-3">
              <GraduationCap className="w-8 h-8 text-black shrink-0" />
              <span>Resumos de Estudo por Matéria</span>
            </h1>

            <p className="text-xs sm:text-sm font-bold text-neutral-900 leading-relaxed font-body">
              Estude os conceitos das matérias, visualizações de contas matemáticas e resumos inteligentes organizados pelos professores.
            </p>
          </div>

          <button
            onClick={() => handleOpenPersonalizedModal()}
            className="nb-btn px-5 py-3.5 bg-amber-400 hover:bg-amber-300 text-black font-heading font-black rounded-xl border-2 border-black shadow-[4px_4px_0_0_#000] flex items-center gap-2.5 uppercase tracking-wide text-xs sm:text-sm shrink-0 transition-all active:translate-x-1 active:translate-y-1"
          >
            <Sparkles className="w-5 h-5 text-black animate-pulse" />
            <span>Gerar Resumo Personalizado</span>
          </button>
        </div>
      </div>

      {/* Navigation SubTabs */}
      <div className="flex items-center gap-3 border-b-3 border-black pb-3 overflow-x-auto">
        <button
          onClick={() => setSubTab("apostilas")}
          className={`nb-btn px-5 py-2.5 rounded-xl border-2 border-black font-heading font-black text-xs sm:text-sm uppercase transition-all flex items-center gap-2 ${
            subTab === "apostilas"
              ? "bg-amber-300 text-black shadow-[3px_3px_0_0_#000] translate-x-[1px] translate-y-[1px]"
              : "bg-white text-black hover:bg-amber-100 shadow-[2px_2px_0_0_#000]"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Resumos por Matéria ({summaries.length})</span>
        </button>


        <button
          onClick={() => setSubTab("recentes")}
          className={`nb-btn px-5 py-2.5 rounded-xl border-2 border-black font-heading font-black text-xs sm:text-sm uppercase transition-all flex items-center gap-2 ${
            subTab === "recentes"
              ? "bg-amber-300 text-black shadow-[3px_3px_0_0_#000] translate-x-[1px] translate-y-[1px]"
              : "bg-white text-black hover:bg-emerald-100 shadow-[2px_2px_0_0_#000]"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Resumos Gerados Recentes ({recentGenerations.length})</span>
        </button>
      </div>

      {/* SubTab 1: Apostilas & Tópicos */}
      {subTab === "apostilas" && (
        <div className="space-y-6">
          {/* Controls: Search & Subject Chips */}
          <div className="nb-card bg-white p-5 rounded-2xl border-3 border-black shadow-[5px_5px_0_0_#000] space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-700 font-bold" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Pesquisar por matéria, assunto, conceito ou fórmula..."
                className="nb-input pl-11 pr-20 py-3 bg-neutral-50 border-2 border-black font-bold text-xs sm:text-sm rounded-xl focus:bg-white"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="nb-btn absolute right-3 top-1/2 -translate-y-1/2 text-xs font-heading font-black bg-neutral-200 hover:bg-neutral-300 text-black px-2.5 py-1 rounded-lg border-2 border-black"
                >
                  Limpar
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-heading font-black uppercase text-black mb-2 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-600" />
                <span>Filtrar por Matéria:</span>
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedSubject("TODAS")}
                  className={`nb-btn px-4 py-2 rounded-xl border-2 border-black font-heading font-black text-xs transition-all ${
                    selectedSubject === "TODAS"
                      ? "bg-amber-300 text-black shadow-[2px_2px_0_0_#000]"
                      : "bg-neutral-100 text-black hover:bg-amber-100 shadow-[2px_2px_0_0_#000]"
                  }`}
                >
                  Todas ({summaries.length})
                </button>

                {subjects.map((s) => {
                  const count = summaries.filter(
                    (item) => item.subject.toLowerCase() === s.name.toLowerCase()
                  ).length;
                  const isSelected = selectedSubject.toLowerCase() === s.name.toLowerCase();
                  const badgeColor = getSubjectBadgeStyle(s.name);

                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSubject(s.name)}
                      className={`nb-btn px-4 py-2 rounded-xl border-2 border-black font-heading font-black text-xs transition-all flex items-center gap-1.5 ${
                        isSelected
                          ? "bg-amber-300 text-black shadow-[2px_2px_0_0_#000]"
                          : `${badgeColor} hover:brightness-95 shadow-[2px_2px_0_0_#000]`
                      }`}
                    >
                      <span>{s.name}</span>
                      <span className="nb-badge bg-black/10 text-current text-[10px] px-1.5 py-0.2 border border-black/30">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="p-12 text-center text-neutral-700 font-bold flex items-center justify-center gap-3 nb-card bg-white rounded-2xl border-3 border-black shadow-[4px_4px_0_0_#000]">
              <Loader2 className="w-6 h-6 animate-spin text-black" />
              <span className="font-heading font-black uppercase text-sm">Carregando resumos de estudo...</span>
            </div>
          ) : filteredSummaries.length === 0 ? (
            <div className="p-12 text-center bg-amber-50 rounded-2xl border-3 border-dashed border-black">
              <BookOpen className="w-12 h-12 text-amber-600 mx-auto mb-3" />
              <h3 className="text-lg font-heading font-black text-black uppercase">Nenhum resumo encontrado</h3>
              <p className="text-xs font-bold text-neutral-600 mt-1 font-body">
                Tente alterar os termos da busca ou selecione outra matéria acima.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredSummaries.map((topicItem) => {
                const badgeColor = getSubjectBadgeStyle(topicItem.subject);

                return (
                  <div
                    key={topicItem.id}
                    className="nb-card bg-white p-6 rounded-2xl border-3 border-black shadow-[5px_5px_0_0_#000] flex flex-col justify-between space-y-4 hover:shadow-[7px_7px_0_0_#000] transition-all group"
                  >
                    <div className="space-y-3">
                      {/* Card Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className={`nb-badge ${badgeColor} font-heading font-black text-xs uppercase border-2 border-black px-3 py-1 shadow-[1.5px_1.5px_0_0_#000]`}>
                          {topicItem.subject}
                        </span>
                        <span className="text-[11px] font-bold text-neutral-500 font-body flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(topicItem.updated_at || topicItem.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-heading font-black text-black group-hover:text-amber-900 transition-colors leading-tight">
                        {topicItem.topic}
                      </h3>

                      {/* Content Preview Box */}
                      <p className="text-xs sm:text-sm font-body font-medium text-neutral-800 line-clamp-4 leading-relaxed bg-neutral-50 p-3.5 rounded-xl border-2 border-black/40">
                        {topicItem.summary_text}
                      </p>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-3 border-t-2 border-black flex items-center justify-between gap-2">
                      <button
                        onClick={() => setReadingTopic(topicItem)}
                        className="nb-btn px-4 py-2.5 bg-sky-400 hover:bg-sky-500 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-1.5 transition-all"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Ler Resumo Completo</span>
                      </button>

                      <button
                        onClick={() => handleOpenPersonalizedModal(topicItem.subject)}
                        title="Gerar resumo personalizado desta matéria"
                        className="nb-btn p-2.5 bg-amber-300 hover:bg-amber-400 text-black font-heading font-black text-xs rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] transition-all flex items-center gap-1"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SubTab 2: Resumos Recentes */}
      {subTab === "recentes" && (
        <div className="nb-card bg-white p-6 rounded-2xl border-3 border-black shadow-[5px_5px_0_0_#000] space-y-5">
          <div className="flex items-center justify-between border-b-3 border-black pb-4">
            <div className="flex items-center gap-3">
              <span className="w-12 h-12 rounded-xl bg-emerald-300 text-black border-2 border-black flex items-center justify-center shrink-0 shadow-[2px_2px_0_0_#000]">
                <History className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-xl font-heading font-black text-black uppercase">
                  Resumos Gerados Recentes
                </h3>
                <p className="text-xs font-bold text-neutral-600 font-body mt-0.5">
                  Histórico dos resumos e fichas personalizadas geradas por você.
                </p>
              </div>
            </div>

            <span className="nb-badge bg-emerald-300 text-emerald-950 font-heading font-black text-xs border-2 border-black px-3 py-1 shadow-[2px_2px_0_0_#000]">
              {recentGenerations.length} {recentGenerations.length === 1 ? "Resumo" : "Resumos"}
            </span>
          </div>

          {loadingHistory ? (
            <div className="p-12 text-center text-neutral-700 font-bold flex items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-black" />
              <span className="font-heading font-black uppercase text-sm">Carregando histórico recente...</span>
            </div>
          ) : recentGenerations.length === 0 ? (
            <div className="p-12 text-center bg-neutral-50 rounded-2xl border-3 border-dashed border-black">
              <History className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h4 className="font-heading font-black text-black text-lg uppercase">Nenhum resumo gerado recentemente</h4>
              <p className="text-xs font-bold text-neutral-600 mt-1 font-body">
                Clique no botão "Gerar Resumo Personalizado" para criar seu primeiro resumo!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recentGenerations.map((gen) => (
                <div
                  key={gen.id}
                  className="nb-card bg-neutral-50/80 p-5 rounded-2xl border-3 border-black shadow-[4px_4px_0_0_#000] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className="nb-badge bg-amber-300 text-black font-heading font-black text-xs uppercase border-2 border-black px-3 py-1 shadow-[2px_2px_0_0_#000] flex items-center gap-1.5">
                        {gen.format === "pdf" ? <FileText className="w-3.5 h-3.5 text-black" /> : <ImageIcon className="w-3.5 h-3.5 text-black" />}
                        <span>{gen.format === "pdf" ? "Resumo Completo" : "Ficha Visual"}</span>
                      </span>


                      <span className="text-xs font-bold text-neutral-600 font-body flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                        {new Date(gen.generated_at).toLocaleString("pt-BR")}
                      </span>
                    </div>

                    <div>
                      <div className="text-[10px] font-heading font-black uppercase text-neutral-600">Matérias Incluídas:</div>
                      <div className="text-xs sm:text-sm font-bold text-black font-body mt-0.5">
                        {Array.isArray(gen.subject_names) ? gen.subject_names.join(" • ") : "Geral"}
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border-2 border-black text-xs font-medium font-body text-neutral-800 line-clamp-3 leading-relaxed">
                      {gen.result_markdown}
                    </div>
                  </div>

                  <button
                    onClick={() => setReadingHistoryItem(gen)}
                    className="nb-btn w-full py-3 bg-sky-400 hover:bg-sky-500 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] flex items-center justify-center gap-2 transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Visualizar, Copiar & Imprimir</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Full Summary Reader Modal */}
      {readingTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="nb-card relative w-full max-w-4xl my-8 bg-white rounded-2xl border-3 border-black shadow-[8px_8px_0_0_#000] p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b-3 border-black pb-4">
              <div>
                <span className={`nb-badge ${getSubjectBadgeStyle(readingTopic.subject)} font-heading font-black text-xs uppercase border-2 border-black inline-block mb-2 shadow-[2px_2px_0_0_#000]`}>
                  {readingTopic.subject}
                </span>
                <h2 className="text-xl sm:text-2xl font-heading font-black text-black leading-tight">
                  {readingTopic.topic}
                </h2>
              </div>

              <button
                onClick={() => setReadingTopic(null)}
                className="w-9 h-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0_0_#000]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <MarkdownSummaryViewer
              markdown={readingTopic.summary_text}
              title={readingTopic.topic}
              subtitle={`Matéria: ${readingTopic.subject} | Data: ${new Date(readingTopic.updated_at || readingTopic.created_at).toLocaleDateString("pt-BR")}`}
              subjects={[readingTopic.subject]}
              showToolbar={true}
            />

            {/* Source Images */}
            {readingTopic.source_image_ids && readingTopic.source_image_ids.length > 0 && (
              <div className="nb-card bg-neutral-50 p-5 rounded-2xl border-2 border-black space-y-3">
                <h4 className="font-heading font-black text-xs sm:text-sm uppercase text-black flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-neutral-700" /> Fotos Fontes do Caderno do Professor:
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {readingTopic.source_image_ids.map((imgId) => (
                    <div
                      key={imgId}
                      onClick={() => setPreviewImageId(imgId)}
                      className="group relative h-24 rounded-xl border-2 border-black overflow-hidden cursor-pointer shadow-[2px_2px_0_0_#000] bg-black"
                    >
                      <img
                        src={`/api/files/${imgId}`}
                        alt="Fonte"
                        className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 text-white">
                        <Eye className="w-5 h-5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t-3 border-black">
              <button
                onClick={() => {
                  const subj = readingTopic.subject;
                  setReadingTopic(null);
                  handleOpenPersonalizedModal(subj);
                }}
                className="nb-btn px-5 py-3 bg-amber-300 hover:bg-amber-400 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Gerar Resumo Desta Matéria</span>
              </button>

              <button
                onClick={() => setReadingTopic(null)}
                className="nb-btn px-5 py-3 bg-white hover:bg-neutral-100 text-black font-heading font-bold text-xs uppercase rounded-xl border-2 border-black"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reader Modal for Recent History Item */}
      {readingHistoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="nb-card relative w-full max-w-4xl my-8 bg-white rounded-2xl border-3 border-black shadow-[8px_8px_0_0_#000] p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b-3 border-black pb-4">
              <div>
                <span className="nb-badge bg-amber-300 text-black font-heading font-black text-xs uppercase border-2 border-black inline-block mb-2 shadow-[2px_2px_0_0_#000]">
                  {readingHistoryItem.format === "pdf" ? "Resumo Completo" : "Ficha Visual"}
                </span>

                <h2 className="text-xl font-heading font-black text-black">
                  Gerado em {new Date(readingHistoryItem.generated_at).toLocaleString("pt-BR")}
                </h2>
              </div>

              <button
                onClick={() => setReadingHistoryItem(null)}
                className="w-9 h-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0_0_#000]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <MarkdownSummaryViewer
              markdown={readingHistoryItem.result_markdown}
              title="Resumo de Estudo Edutask"
              subtitle={`Matérias: ${Array.isArray(readingHistoryItem.subject_names) ? readingHistoryItem.subject_names.join(" • ") : "Geral"} | Data: ${new Date(readingHistoryItem.generated_at).toLocaleDateString("pt-BR")}`}
              subjects={Array.isArray(readingHistoryItem.subject_names) ? readingHistoryItem.subject_names : []}
              showToolbar={true}
            />

            <div className="flex items-center justify-end pt-4 border-t-3 border-black">
              <button
                onClick={() => setReadingHistoryItem(null)}
                className="nb-btn px-5 py-2.5 bg-white hover:bg-neutral-100 text-black font-heading font-bold text-xs uppercase rounded-xl border-2 border-black"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Preview */}
      {previewImageId && (
        <div
          onClick={() => setPreviewImageId(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm cursor-pointer"
        >
          <div className="nb-card relative max-w-4xl max-h-[90vh] bg-white p-4 rounded-2xl border-3 border-black shadow-[8px_8px_0_0_#000]">
            <button
              onClick={() => setPreviewImageId(null)}
              className="nb-btn absolute -top-4 -right-4 w-9 h-9 bg-amber-300 text-black font-black border-2 border-black rounded-full flex items-center justify-center shadow-[3px_3px_0_0_#000]"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={`/api/files/${previewImageId}`}
              alt="Visualização Fonte"
              className="max-h-[80vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}

      {/* Generator Modal */}
      <PersonalizedSummaryModal
        isOpen={showPersonalizedModal}
        onClose={() => {
          setShowPersonalizedModal(false);
          loadHistory();
        }}
        initialSubject={initialModalSubject}
      />
    </div>
  );
}
