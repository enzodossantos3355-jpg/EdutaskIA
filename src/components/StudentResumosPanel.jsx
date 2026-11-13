import { useState, useEffect, useMemo } from "react";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import MarkdownSummaryViewer from "./MarkdownSummaryViewer";
import ModalPortal from "@/components/ModalPortal";
import { getSubjectColorConfig } from "@/lib/subjectColors";
import {
  BookOpen,
  Search,
  Eye,
  X,
  Calendar,
  Image as ImageIcon,
  Calculator,
  GraduationCap,
  Layers,
  Loader2,
  Zap,
  CheckCircle2,
} from "lucide-react";

function isRecentlyPublished(item) {
  const ref = item.published_at || item.updated_at || item.created_at;
  if (!ref) return false;
  const diff = Date.now() - new Date(ref).getTime();
  return diff >= 0 && diff <= 48 * 60 * 60 * 1000;
}

export default function StudentResumosPanel() {
  const [summaries, setSummaries] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("TODAS");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const [readingTopic, setReadingTopic] = useState(null);
  const [previewImageId, setPreviewImageId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sumRes, subjRes] = await Promise.all([
        api.get("/summaries"),
        api.get("/subjects"),
      ]);
      const publishedOnly = (sumRes.data || []).filter(
        (item) => item.is_published === true && item.summary_text && item.summary_text.trim().length > 0
      );
      setSummaries(publishedOnly);
      setSubjects(subjRes.data || []);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const filteredSummaries = useMemo(() => {
    return summaries.filter((item) => {
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
        (item.formulas || []).some((f) => f.toLowerCase().includes(query)) ||
        (item.source_topic_titles || []).some((t) => t.toLowerCase().includes(query));

      return matchSubject && matchQuery;
    });
  }, [summaries, selectedSubject, searchQuery]);

  const groupedBySubject = useMemo(() => {
    const groups = new Map();
    for (const item of filteredSummaries) {
      const key = item.subject || "Geral";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    return Array.from(groups.entries());
  }, [filteredSummaries]);

  const subjectsWithMaterialsCount = useMemo(() => {
    return new Set(summaries.map((s) => s.subject.toLowerCase())).size;
  }, [summaries]);

  const getSubjectBadgeStyle = (subjectName = "") => {
    const cfg = getSubjectColorConfig(subjectName, subjects);
    return `${cfg.bgClass} ${cfg.textClass} border-black`;
  };

  return (
    <div className="space-y-6 font-body" data-testid="student-resumos-panel">
      {/* Study Hub Header (Somente leitura — sem geração pelo aluno) */}
      <div className="nb-card bg-amber-300 p-5 sm:p-6 rounded-2xl border-3 border-black shadow-[6px_6px_0_0_#000] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="nb-badge bg-white text-black font-heading font-black text-xs uppercase px-3 py-1 border-2 border-black shadow-[2px_2px_0_0_#000] inline-flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>Biblioteca de Resumos</span>
            </span>
            <span className="nb-badge bg-emerald-300 text-emerald-950 font-heading font-black text-xs uppercase px-3 py-1 border-2 border-black tabular-nums">
              {summaries.length} Disponível(is) em {subjectsWithMaterialsCount} Matéria(s)
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-heading font-black text-black uppercase tracking-tight flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-black shrink-0" />
            <span>Resumos de Estudo</span>
          </h1>

          <p className="text-xs sm:text-sm font-bold text-neutral-900 leading-relaxed">
            Consulte os resumos preparados e disponibilizados pelo professor em cada matéria, com fórmulas organizadas e exportação para PDF ou imagem.
          </p>
        </div>
      </div>

      {/* Search & Subject Chips */}
      <div className="nb-card bg-white p-5 rounded-2xl border-3 border-black shadow-[5px_5px_0_0_#000] space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-700" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar assunto, tópico, conceito ou fórmula..."
            className="nb-input pl-11 pr-20 py-3 bg-neutral-50 border-2 border-black font-bold text-xs sm:text-sm rounded-xl focus:bg-white"
            data-testid="student-resumos-search"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="nb-btn absolute right-3 top-1/2 -translate-y-1/2 text-xs font-heading font-black bg-neutral-200 hover:bg-neutral-300 text-black px-2.5 py-1 rounded-lg border-2 border-black"
            >
              Limpar
            </button>
          )}
        </div>

        <div>
          <div className="text-xs font-heading font-black uppercase text-black mb-2 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-sky-600" />
            <span>Filtrar por Matéria:</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedSubject("TODAS")}
              className={`nb-btn px-4 py-2 rounded-xl border-2 border-black font-heading font-black text-xs transition-all tabular-nums ${
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
                  type="button"
                  onClick={() => setSelectedSubject(s.name)}
                  className={`nb-btn px-4 py-2 rounded-xl border-2 border-black font-heading font-black text-xs transition-all flex items-center gap-1.5 tabular-nums ${
                    isSelected
                      ? "bg-amber-300 text-black shadow-[2px_2px_0_0_#000]"
                      : `${badgeColor} hover:brightness-95 shadow-[2px_2px_0_0_#000]`
                  }`}
                >
                  <span>{s.name}</span>
                  <span className="bg-black/15 text-current text-[10px] px-1.5 py-0.5 rounded border border-black/30">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="p-12 text-center text-neutral-700 font-bold flex items-center justify-center gap-3 nb-card bg-white rounded-2xl border-3 border-black shadow-[4px_4px_0_0_#000]">
          <Loader2 className="w-6 h-6 animate-spin text-black" />
          <span className="font-heading font-black uppercase text-sm">Carregando resumos disponíveis...</span>
        </div>
      ) : filteredSummaries.length === 0 ? (
        <div className="p-12 text-center bg-amber-50 rounded-2xl border-3 border-dashed border-black">
          <BookOpen className="w-12 h-12 text-amber-600 mx-auto mb-3" />
          <h3 className="text-lg font-heading font-black text-black uppercase">
            {summaries.length === 0
              ? "Nenhum resumo disponibilizado ainda"
              : "Nenhum resumo encontrado para este filtro"}
          </h3>
          <p className="text-xs font-bold text-neutral-600 mt-1 max-w-md mx-auto">
            {summaries.length === 0
              ? "Assim que o professor finalizar e liberar um resumo de alguma matéria, você receberá uma notificação e ele aparecerá aqui."
              : "Tente limpar a pesquisa ou selecionar outra matéria acima."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedBySubject.map(([subjectName, items]) => {
            const badgeColor = getSubjectBadgeStyle(subjectName);
            return (
              <div key={subjectName} className="space-y-4">
                <div className="flex items-center justify-between border-b-2 border-black/20 pb-2">
                  <div className="flex items-center gap-2.5">
                    <span className={`nb-badge ${badgeColor} font-heading font-black text-xs sm:text-sm uppercase border-2 border-black px-3 py-1 shadow-[2px_2px_0_0_#000]`}>
                      {subjectName}
                    </span>
                    <span className="text-xs font-bold text-neutral-600 tabular-nums">
                      {items.length} {items.length === 1 ? "resumo disponível" : "resumos disponíveis"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {items.map((topicItem) => {
                    const isNew = isRecentlyPublished(topicItem);
                    const dateStr = topicItem.published_at || topicItem.updated_at || topicItem.created_at;
                    const concepts = (topicItem.key_concepts || []).slice(0, 4);
                    const formulasCount = (topicItem.formulas || []).length;
                    const includedTopics = Array.isArray(topicItem.source_topic_titles)
                      ? topicItem.source_topic_titles
                      : [];

                    return (
                      <div
                        key={topicItem.id}
                        className="nb-card bg-white p-5 sm:p-6 rounded-2xl border-3 border-black shadow-[5px_5px_0_0_#000] flex flex-col justify-between space-y-4 hover:shadow-[7px_7px_0_0_#000] transition-all"
                        data-testid={`student-summary-card-${topicItem.id}`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="nb-badge bg-emerald-200 text-emerald-950 border border-black text-[10px] font-black uppercase inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Disponível</span>
                              </span>
                              {isNew && (
                                <span className="nb-badge bg-amber-300 text-black border border-black text-[10px] font-black uppercase">
                                  Novo
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] font-bold text-neutral-600 flex items-center gap-1 tabular-nums">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>{new Date(dateStr).toLocaleDateString("pt-BR")}</span>
                            </span>
                          </div>

                          <h3 className="text-lg sm:text-xl font-heading font-black text-black leading-tight">
                            {topicItem.topic}
                          </h3>

                          {includedTopics.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {includedTopics.slice(0, 4).map((tTitle, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-amber-100 border border-black/60 rounded text-[10px] font-black text-amber-950"
                                >
                                  {tTitle}
                                </span>
                              ))}
                              {includedTopics.length > 4 && (
                                <span className="px-2 py-0.5 bg-amber-100 border border-black/60 rounded text-[10px] font-black text-amber-950">
                                  +{includedTopics.length - 4} tópicos
                                </span>
                              )}
                            </div>
                          )}

                          {(concepts.length > 0 || formulasCount > 0) && (
                            <div className="flex flex-wrap gap-1.5">
                              {concepts.map((c, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 bg-neutral-100 border border-black/40 rounded text-[11px] font-bold text-neutral-800"
                                >
                                  {c}
                                </span>
                              ))}
                              {formulasCount > 0 && (
                                <span className="px-2 py-0.5 bg-sky-100 border border-black rounded text-[11px] font-bold text-sky-950 inline-flex items-center gap-1 tabular-nums">
                                  <Calculator className="w-3 h-3" />
                                  <span>{formulasCount} fórmula(s)</span>
                                </span>
                              )}
                            </div>
                          )}

                          <p className="text-xs sm:text-sm font-body font-medium text-neutral-800 line-clamp-3 leading-relaxed bg-neutral-50 p-3.5 rounded-xl border-2 border-black/30">
                            {topicItem.summary_text}
                          </p>
                        </div>

                        <div className="pt-3 border-t-2 border-black/15 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setReadingTopic(topicItem)}
                            className="nb-btn w-full px-4 py-2.5 bg-sky-400 hover:bg-sky-500 text-black font-heading font-black text-xs uppercase rounded-xl border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center justify-center gap-1.5"
                            data-testid={`read-summary-${topicItem.id}`}
                          >
                            <Eye className="w-4 h-4" />
                            <span>Estudar Resumo Completo</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Summary Reader Modal */}
      {readingTopic && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-5 backdrop-blur-sm">
            <div className="nb-card relative w-full max-w-4xl bg-white rounded-2xl border-3 border-black shadow-[8px_8px_0_0_#000] p-5 sm:p-6 space-y-6 max-h-[92vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b-3 border-black pb-4 gap-3">
                <div>
                  <span className={`nb-badge ${getSubjectBadgeStyle(readingTopic.subject)} font-heading font-black text-xs uppercase border-2 border-black inline-block mb-2 shadow-[2px_2px_0_0_#000]`}>
                    {readingTopic.subject}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-heading font-black text-black leading-tight">
                    {readingTopic.topic}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setReadingTopic(null)}
                  className="w-9 h-9 rounded-xl bg-neutral-100 hover:bg-neutral-200 border-2 border-black flex items-center justify-center font-black shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <MarkdownSummaryViewer
                markdown={readingTopic.summary_text}
                title={readingTopic.topic}
                subtitle={`Matéria: ${readingTopic.subject} | Liberado em: ${new Date(readingTopic.published_at || readingTopic.updated_at || readingTopic.created_at).toLocaleDateString("pt-BR")}`}
                subjects={[readingTopic.subject]}
                showToolbar={true}
              />

              {readingTopic.source_image_ids && readingTopic.source_image_ids.length > 0 && (
                <div className="nb-card bg-neutral-50 p-4 rounded-2xl border-2 border-black space-y-3">
                  <h4 className="font-heading font-black text-xs sm:text-sm uppercase text-black flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-neutral-700" />
                    <span>Fotos de Apoio do Professor:</span>
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

              <div className="flex items-center justify-end pt-4 border-t-3 border-black gap-2">
                <button
                  type="button"
                  onClick={() => setReadingTopic(null)}
                  className="nb-btn px-5 py-3 bg-white hover:bg-neutral-100 text-black font-heading font-bold text-xs uppercase rounded-xl border-2 border-black"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Lightbox Preview */}
      {previewImageId && (
        <ModalPortal>
          <div
            onClick={() => setPreviewImageId(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm cursor-pointer"
          >
            <div className="nb-card relative max-w-4xl max-h-[90vh] bg-white p-4 rounded-2xl border-3 border-black shadow-[8px_8px_0_0_#000]">
              <button
                type="button"
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
        </ModalPortal>
      )}
    </div>
  );
}
