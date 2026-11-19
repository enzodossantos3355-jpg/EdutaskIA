import { useState, useEffect, useMemo } from "react";
import { api, API, formatApiError } from "@/lib/api";
import { firebaseService } from "@/lib/firebaseService";
import { useAuth } from "@/context/AuthContext";
import { useAIStatus } from "@/context/AIStatusContext";
import { getTheme, isDarkTheme } from "@/lib/effects";
import MarkdownSummaryViewer from "./MarkdownSummaryViewer";
import ModalPortal from "@/components/ModalPortal";
import { getSubjectColorConfig } from "@/lib/subjectColors";
import {
  BookOpen,
  Search,
  X,
  Image as ImageIcon,
  FileText,
  FileSpreadsheet,
  Presentation,
  Download,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  FolderOpen,
} from "lucide-react";

const BOILERPLATE_PATTERNS = [
  /^\s*o professor (anexou|disponibilizou|adicionou|enviou|postou)\b/i,
  /^\s*material (anexado|disponibilizado) pelo professor\b/i,
  /^\s*resumo pronto (anexado|disponibilizado)\b/i,
];

const WIN1252_REVERSE = new Map([
  [0x20ac, 0x80], [0x201a, 0x82], [0x0192, 0x83], [0x201e, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02c6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8a], [0x2039, 0x8b], [0x0152, 0x8c],
  [0x017d, 0x8e], [0x2018, 0x91], [0x2019, 0x92], [0x201c, 0x93],
  [0x201d, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02dc, 0x98], [0x2122, 0x99], [0x0161, 0x9a], [0x203a, 0x9b],
  [0x0153, 0x9c], [0x017e, 0x9e], [0x0178, 0x9f],
]);

function fixBrokenFilename(name) {
  if (!name || typeof name !== "string") return "";
  let cleaned = name;
  // Repair UTF-8 sequences mistakenly decoded as Latin-1/Windows-1252 (single or double pass)
  for (let pass = 0; pass < 3; pass++) {
    if (!/[ÃÂ][\u0080-\u00BF\u0192\u201A\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018-\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178€]|â[\u0080-\u00BF]/.test(cleaned)) {
      break;
    }
    try {
      const bytes = new Uint8Array(cleaned.length);
      let canConvert = true;
      for (let i = 0; i < cleaned.length; i++) {
        const code = cleaned.charCodeAt(i);
        if (code <= 255) {
          bytes[i] = code;
        } else if (WIN1252_REVERSE.has(code)) {
          bytes[i] = WIN1252_REVERSE.get(code);
        } else {
          canConvert = false;
          break;
        }
      }
      if (!canConvert) break;
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (!decoded || decoded === cleaned) break;
      cleaned = decoded;
    } catch {
      break;
    }
  }
  try {
    return cleaned.normalize("NFC");
  } catch {
    return cleaned;
  }
}

function isRecentlyPublished(item) {
  const ref = item.published_at || item.updated_at || item.created_at;
  if (!ref) return false;
  const diff = Date.now() - new Date(ref).getTime();
  return diff >= 0 && diff <= 48 * 60 * 60 * 1000;
}

function normalizeAttachmentItem(a) {
  if (!a) return null;
  if (typeof a === "string") {
    return {
      id: a,
      original_filename: fixBrokenFilename(a),
      content_type: "",
    };
  }
  if (typeof a === "object" && a.id) {
    return {
      id: String(a.id),
      original_filename: fixBrokenFilename(
        String(a.original_filename || a.filename || a.id)
      ),
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
  return (
    ct.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i.test(name)
  );
}

function getFileTypeLabel(att) {
  if (!att) return "Arquivo";
  const ct = String(att.content_type || "").toLowerCase();
  const name = String(att.original_filename || "").toLowerCase();
  if (isImageAttachment(att)) return "Imagem";
  if (ct.includes("pdf") || name.endsWith(".pdf")) return "PDF";
  if (
    ct.includes("wordprocessingml") ||
    ct.includes("msword") ||
    /\.(docx?|odt|rtf)$/i.test(name)
  ) {
    return "Documento";
  }
  if (
    ct.includes("presentation") ||
    ct.includes("powerpoint") ||
    /\.(pptx?|odp)$/i.test(name)
  ) {
    return "Apresentação";
  }
  if (
    ct.includes("spreadsheet") ||
    ct.includes("excel") ||
    /\.(xlsx?|csv|ods)$/i.test(name)
  ) {
    return "Planilha";
  }
  if (ct.includes("markdown") || name.endsWith(".md")) return "Markdown";
  if (ct.startsWith("text/") || name.endsWith(".txt")) return "Texto";
  return "Arquivo";
}

function formatFileSize(bytes) {
  const num = Number(bytes);
  if (!Number.isFinite(num) || num <= 0) return "";
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(0)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileDownloadUrl(fileId, forceDownload = false) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("auth_token") : "";
  const base = `${API}/files/${fileId}/download?auth=${encodeURIComponent(
    token || ""
  )}`;
  return forceDownload ? `${base}&download=1` : base;
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

function getSupportFiles(item) {
  if (!Array.isArray(item?.source_image_ids) || item.source_image_ids.length === 0) {
    return [];
  }
  return item.source_image_ids.map((srcId) => {
    const meta = (item.source_files || []).find((f) => f.id === srcId) || {
      id: srcId,
      original_filename: srcId,
      content_type: "",
    };
    return {
      id: String(srcId),
      original_filename: fixBrokenFilename(
        String(meta.original_filename || srcId)
      ),
      content_type: meta.content_type || "",
      size: meta.size,
    };
  });
}

function getAllItemFiles(item) {
  const seen = new Set();
  const list = [];
  for (const file of [
    ...getSummaryAttachments(item),
    ...getSupportFiles(item),
  ]) {
    if (!file?.id || seen.has(file.id)) continue;
    seen.add(file.id);
    list.push(file);
  }
  return list;
}

function getCleanExcerpt(summaryText) {
  if (!summaryText || typeof summaryText !== "string") return "";
  const trimmed = summaryText.trim();
  if (!trimmed) return "";
  if (BOILERPLATE_PATTERNS.some((re) => re.test(trimmed))) return "";
  return trimmed
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g, "$1$2")
    .replace(/^[-*•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasSummaryContent(item) {
  if (!item) return false;
  const hasText = Boolean(
    item.summary_text && String(item.summary_text).trim().length > 0
  );
  const hasFiles = getAllItemFiles(item).length > 0;
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

function getMaterialIcon(files, hasText) {
  if (files.length === 0) return BookOpen;
  if (files.every((f) => isImageAttachment(f))) return ImageIcon;
  const firstType = getFileTypeLabel(files[0]);
  if (firstType === "Apresentação") return Presentation;
  if (firstType === "Planilha") return FileSpreadsheet;
  if (hasText && files.length > 1) return BookOpen;
  return FileText;
}

export default function StudentResumosPanel() {
  const { user } = useAuth();
  const { framesDisabled, studentAreas, loading: aiStatusLoading } = useAIStatus();
  const resumosEnabled = studentAreas?.resumos !== false;

  const [summaries, setSummaries] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("TODAS");
  const [showEmptySubjects, setShowEmptySubjects] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [readingTopic, setReadingTopic] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const effectId = !framesDisabled ? user?.equipped_effect || "none" : "none";
  const isMentalist = effectId === "mentalist";
  const activeTheme = getTheme(effectId);
  const darkAccent = isDarkTheme(effectId);

  const themeAccent = useMemo(() => {
    if (isMentalist) {
      return {
        primaryBg: "#6e141a",
        primaryText: "#fdf6e7",
        softTintBg: "#f5c451",
        softTintColor: "#1f0505",
        badgeBg: "#f5c451",
        badgeText: "#1f0505",
        cardSurface: "nb-card nb-card-hover",
        staticSurface: "nb-card",
      };
    }
    if (effectId !== "none" && activeTheme?.avatarBgHex) {
      return {
        primaryBg: darkAccent ? activeTheme.avatarBgHex : "#38bdf8",
        primaryText: darkAccent ? "#ffffff" : "#0a0a0a",
        softTintBg: activeTheme.avatarBgHex + "24",
        softTintColor: darkAccent ? activeTheme.avatarBgHex : "#0a0a0a",
        badgeBg: "#fde047",
        badgeText: "#0a0a0a",
        cardSurface: "nb-card nb-card-hover",
        staticSurface: "nb-card",
      };
    }
    return {
      primaryBg: "#38bdf8",
      primaryText: "#0a0a0a",
      softTintBg: "#fef08a",
      softTintColor: "#0a0a0a",
      badgeBg: "#fde047",
      badgeText: "#0a0a0a",
      cardSurface: "nb-card nb-card-hover",
      staticSurface: "nb-card",
    };
  }, [effectId, isMentalist, activeTheme, darkAccent]);

  useEffect(() => {
    if (aiStatusLoading) return;
    if (!resumosEnabled) {
      setSummaries([]);
      setReadingTopic(null);
      setPreviewImage(null);
      setLoadError(null);
      setLoading(false);
      return;
    }
    loadData();
  }, [resumosEnabled, aiStatusLoading]);

  const loadData = async () => {
    if (!resumosEnabled) {
      setSummaries([]);
      setReadingTopic(null);
      setPreviewImage(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const [sumRes, subjRes] = await Promise.all([
        api.get("/summaries"),
        api.get("/subjects"),
      ]);
      if (!Array.isArray(sumRes?.data)) {
        throw new Error("Formato inválido de resumos.");
      }
      const publishedOnly = sumRes.data.filter(
        (item) => item.is_published === true && hasSummaryContent(item)
      );
      setSummaries(publishedOnly);
      setSubjects(Array.isArray(subjRes?.data) ? subjRes.data : []);
    } catch (err) {
      if (err?.response?.status === 403) {
        setSummaries([]);
        setReadingTopic(null);
        setPreviewImage(null);
        setLoadError(null);
        setLoading(false);
        return;
      }
      try {
        const [allSummaries, allSubjects] = await Promise.all([
          firebaseService.getAllSummaries(),
          firebaseService.getAllSubjects().catch(() => []),
        ]);
        const publishedOnly = (allSummaries || []).filter(
          (item) => item.is_published === true && hasSummaryContent(item)
        );
        setSummaries(publishedOnly);
        setSubjects(Array.isArray(allSubjects) ? allSubjects : []);
      } catch (err2) {
        setLoadError(
          formatApiError(err) ||
            formatApiError(err2) ||
            "Não foi possível carregar os resumos."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Build subject list prioritizing subjects that have available materials
  const subjectStats = useMemo(() => {
    const countsByLower = new Map();
    const displayNameByLower = new Map();

    for (const s of subjects) {
      if (!s?.name) continue;
      const key = s.name.trim().toLowerCase();
      countsByLower.set(key, 0);
      displayNameByLower.set(key, s.name.trim());
    }

    for (const item of summaries) {
      const raw = (item.subject || "Geral").trim();
      const key = raw.toLowerCase();
      countsByLower.set(key, (countsByLower.get(key) || 0) + 1);
      if (!displayNameByLower.has(key)) {
        displayNameByLower.set(key, raw);
      }
    }

    const withMaterials = [];
    const withoutMaterials = [];

    for (const [key, count] of countsByLower.entries()) {
      const name = displayNameByLower.get(key) || key;
      const entry = {
        key,
        name,
        count,
        colorCfg: getSubjectColorConfig(name, subjects),
      };
      if (count > 0) withMaterials.push(entry);
      else withoutMaterials.push(entry);
    }

    withMaterials.sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR")
    );
    withoutMaterials.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

    return { withMaterials, withoutMaterials };
  }, [summaries, subjects]);

  const filteredSummaries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return summaries.filter((item) => {
      const matchSubject =
        selectedSubject === "TODAS" ||
        (item.subject || "").trim().toLowerCase() ===
          selectedSubject.trim().toLowerCase();

      if (!matchSubject) return false;
      if (!query) return true;

      const files = getAllItemFiles(item);
      return (
        (item.subject || "").toLowerCase().includes(query) ||
        (item.topic || "").toLowerCase().includes(query) ||
        (item.summary_text || "").toLowerCase().includes(query) ||
        (item.key_concepts || []).some((c) => c.toLowerCase().includes(query)) ||
        (item.formulas || []).some((f) => f.toLowerCase().includes(query)) ||
        files.some((f) => (f.original_filename || "").toLowerCase().includes(query))
      );
    });
  }, [summaries, selectedSubject, searchQuery]);

  const visibleDesktopSubjects = showEmptySubjects
    ? [...subjectStats.withMaterials, ...subjectStats.withoutMaterials]
    : subjectStats.withMaterials;

  const hasActiveFilters =
    selectedSubject !== "TODAS" || searchQuery.trim().length > 0;

  const clearFilters = () => {
    setSelectedSubject("TODAS");
    setSearchQuery("");
  };

  return (
    <div
      className="max-w-6xl mx-auto space-y-5 pb-6 font-body"
      data-testid="student-resumos-panel"
    >
      {/* Cabeçalho compacto */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-0.5">
        <div className="space-y-1 min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-heading font-extrabold tracking-tight text-neutral-900">
              Resumos
            </h1>
            {!loading && !loadError && (
              <span className="text-xs font-semibold text-neutral-600 tabular-nums">
                {summaries.length}{" "}
                {summaries.length === 1
                  ? "material disponível"
                  : "materiais disponíveis"}
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-700 leading-relaxed">
            Biblioteca de materiais e resumos organizados por matéria.
          </p>
        </div>
      </header>

      {/* Busca e Filtros */}
      <section className={`${themeAccent.staticSurface} p-3.5 sm:p-4 space-y-3`}>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Busca com espaço garantido entre lupa e texto */}
          <div
            className={`flex-1 flex items-center gap-3 px-3.5 min-h-[44px] rounded-[0.625rem] border-2 transition-shadow ${
              isMentalist
                ? "bg-[#fffdf8] border-[#2b0909] shadow-[2px_2px_0_0_#2b0909] focus-within:shadow-[3px_3px_0_0_#2b0909]"
                : "bg-white border-black shadow-[2px_2px_0_0_#0a0a0a] focus-within:shadow-[3px_3px_0_0_#0a0a0a]"
            }`}
          >
            <Search
              className="w-4 h-4 text-neutral-500 shrink-0 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar resumo…"
              aria-label="Buscar resumo"
              className="w-full min-w-0 bg-transparent border-0 outline-none text-sm font-medium text-neutral-900 placeholder:text-neutral-500"
              data-testid="student-resumos-search"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Limpar pesquisa"
                className="min-w-[36px] min-h-[36px] -mr-1.5 flex items-center justify-center rounded-lg text-neutral-600 hover:text-black hover:bg-neutral-100 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Seletor de matérias no celular (< 768px) */}
          <div className="md:hidden">
            <label htmlFor="student-resumos-subject-select" className="sr-only">
              Filtrar por matéria
            </label>
            <select
              id="student-resumos-subject-select"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className={`w-full min-h-[44px] px-3.5 rounded-[0.625rem] border-2 text-sm font-bold outline-none cursor-pointer ${
                isMentalist
                  ? "bg-[#fffdf8] border-[#2b0909] text-[#240707] shadow-[2px_2px_0_0_#2b0909]"
                  : "bg-white border-black text-neutral-900 shadow-[2px_2px_0_0_#0a0a0a]"
              }`}
              data-testid="student-resumos-subject-select"
            >
              <option value="TODAS">
                Todas as matérias ({summaries.length})
              </option>
              {subjectStats.withMaterials.map((s) => (
                <option key={s.key} value={s.name}>
                  {s.name} ({s.count})
                </option>
              ))}
              {subjectStats.withoutMaterials.length > 0 && (
                <optgroup label="Outras matérias (sem materiais)">
                  {subjectStats.withoutMaterials.map((s) => (
                    <option key={s.key} value={s.name}>
                      {s.name} (0)
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* Filtros compactos no computador (>= 768px) */}
        <div
          className="hidden md:flex items-center flex-wrap gap-2"
          role="group"
          aria-label="Filtrar por matéria"
        >
          <button
            type="button"
            onClick={() => setSelectedSubject("TODAS")}
            style={
              selectedSubject === "TODAS" && !isMentalist
                ? {
                    backgroundColor: themeAccent.primaryBg,
                    color: themeAccent.primaryText,
                  }
                : undefined
            }
            className={`nb-btn min-h-[36px] px-3 text-xs whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
              selectedSubject === "TODAS"
                ? isMentalist
                  ? "mentalist-btn-crimson"
                  : "font-bold"
                : isMentalist
                ? "bg-[#fffdf8] text-[#240707]"
                : "bg-white text-neutral-800 hover:bg-neutral-50"
            }`}
          >
            Todas ({summaries.length})
          </button>

          {visibleDesktopSubjects.map((s) => {
            const isSelected =
              selectedSubject.trim().toLowerCase() === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSelectedSubject(s.name)}
                style={
                  isSelected && !isMentalist
                    ? {
                        backgroundColor: themeAccent.primaryBg,
                        color: themeAccent.primaryText,
                      }
                    : undefined
                }
                className={`nb-btn min-h-[36px] px-3 text-xs inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 tabular-nums cursor-pointer ${
                  isSelected
                    ? isMentalist
                      ? "mentalist-btn-crimson"
                      : "font-bold"
                    : s.count === 0
                    ? "bg-neutral-100 text-neutral-500 hover:text-neutral-900"
                    : isMentalist
                    ? "bg-[#fffdf8] text-[#240707]"
                    : "bg-white text-neutral-800 hover:bg-neutral-50"
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full border border-black shrink-0 ${s.colorCfg.bgClass}`}
                  aria-hidden="true"
                />
                <span>
                  {s.name} ({s.count})
                </span>
              </button>
            );
          })}

          {subjectStats.withoutMaterials.length > 0 && (
            <button
              type="button"
              onClick={() => setShowEmptySubjects((prev) => !prev)}
              className="min-h-[36px] px-2.5 rounded-lg text-xs font-bold text-neutral-600 hover:text-black hover:bg-black/5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {showEmptySubjects
                ? "Ocultar vazias"
                : `Ver todas (+${subjectStats.withoutMaterials.length})`}
            </button>
          )}
        </div>
      </section>

      {/* Estados e Grade de Materiais */}
      {loading ? (
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          data-testid="student-resumos-loading"
          aria-busy="true"
          aria-label="Carregando resumos"
        >
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className={`${themeAccent.staticSurface} p-5 space-y-4 animate-pulse`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl border-2 border-black/20 bg-neutral-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-28 bg-neutral-200 rounded" />
                  <div className="h-4 w-3/4 bg-neutral-200 rounded" />
                </div>
              </div>
              <div className="h-3 w-2/3 bg-neutral-100 rounded" />
              <div className="h-10 w-full bg-neutral-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div
          className={`${themeAccent.staticSurface} p-8 text-center space-y-3`}
          data-testid="student-resumos-error"
        >
          <div className="w-12 h-12 rounded-xl border-2 border-black bg-rose-100 text-rose-700 shadow-[2px_2px_0_0_#0a0a0a] flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="text-base font-heading font-bold text-neutral-900">
              Não foi possível carregar os resumos
            </h2>
            <p className="text-sm text-neutral-700">{loadError}</p>
          </div>
          <button
            type="button"
            onClick={loadData}
            style={
              !isMentalist
                ? {
                    backgroundColor: themeAccent.primaryBg,
                    color: themeAccent.primaryText,
                  }
                : undefined
            }
            className={`nb-btn min-h-[44px] px-5 text-sm inline-flex items-center gap-2 cursor-pointer ${
              isMentalist ? "mentalist-btn-crimson" : ""
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tentar novamente</span>
          </button>
        </div>
      ) : summaries.length === 0 ? (
        <div
          className={`${themeAccent.staticSurface} p-8 sm:p-10 text-center space-y-2.5`}
          data-testid="student-resumos-empty"
        >
          <div
            className="w-12 h-12 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#0a0a0a] flex items-center justify-center mx-auto"
            style={{
              backgroundColor: themeAccent.softTintBg,
              color: themeAccent.softTintColor,
            }}
          >
            <BookOpen className="w-5 h-5" />
          </div>
          <h2 className="text-base sm:text-lg font-heading font-bold text-neutral-900">
            Nenhum resumo disponível ainda
          </h2>
          <p className="text-sm text-neutral-700 max-w-md mx-auto leading-relaxed">
            Quando o professor publicar um material ou resumo de estudo, ele ficará organizado aqui.
          </p>
        </div>
      ) : filteredSummaries.length === 0 ? (
        <div
          className={`${themeAccent.staticSurface} p-8 sm:p-10 text-center space-y-3`}
          data-testid="student-resumos-no-results"
        >
          <div className="w-12 h-12 rounded-xl border-2 border-black bg-neutral-100 text-neutral-700 shadow-[2px_2px_0_0_#0a0a0a] flex items-center justify-center mx-auto">
            <Search className="w-5 h-5" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="text-base sm:text-lg font-heading font-bold text-neutral-900">
              Nenhum resultado para esta busca
            </h2>
            <p className="text-sm text-neutral-700">
              Tente buscar outro termo ou selecione outra matéria.
            </p>
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              style={
                !isMentalist
                  ? {
                      backgroundColor: themeAccent.primaryBg,
                      color: themeAccent.primaryText,
                    }
                  : undefined
              }
              className={`nb-btn min-h-[44px] px-5 text-sm inline-flex items-center gap-2 cursor-pointer ${
                isMentalist ? "mentalist-btn-crimson" : ""
              }`}
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {filteredSummaries.map((topicItem) => {
            const isNew = isRecentlyPublished(topicItem);
            const dateStr =
              topicItem.published_at ||
              topicItem.updated_at ||
              topicItem.created_at;
            const formattedDate = formatDateShortBR(dateStr);
            const allFiles = getAllItemFiles(topicItem);
            const cleanExcerpt = getCleanExcerpt(topicItem.summary_text);
            const hasInAppText = Boolean(cleanExcerpt);
            const singleFile =
              !hasInAppText && allFiles.length === 1 ? allFiles[0] : null;
            const singleDownloadableFile =
              allFiles.length === 1 ? allFiles[0] : null;

            const MaterialIcon = getMaterialIcon(allFiles, hasInAppText);
            const colorCfg = getSubjectColorConfig(
              topicItem.subject,
              subjects
            );

            const metaParts = [
              topicItem.subject || "Geral",
              formattedDate || null,
              allFiles.length > 0
                ? `${allFiles.length} ${
                    allFiles.length === 1 ? "arquivo" : "arquivos"
                  }`
                : null,
            ].filter(Boolean);

            const primaryButtonClass = `nb-btn flex-1 min-h-[44px] px-4 text-sm inline-flex items-center justify-center gap-2 cursor-pointer ${
              isMentalist ? "mentalist-btn-crimson" : ""
            }`;

            return (
              <article
                key={topicItem.id}
                className={`${themeAccent.cardSurface} p-4 sm:p-5 flex flex-col justify-between gap-4 min-w-0`}
                data-testid={`student-summary-card-${topicItem.id}`}
              >
                <div className="space-y-3 min-w-0">
                  {/* Topo: ícone do material em bloco + metadados sem selos redundantes */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl border-2 border-black shadow-[2px_2px_0_0_#0a0a0a] flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          backgroundColor: themeAccent.softTintBg,
                          color: themeAccent.softTintColor,
                        }}
                        aria-hidden="true"
                      >
                        <MaterialIcon className="w-4 h-4" />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 flex-wrap tabular-nums">
                          <span
                            className={`w-2.5 h-2.5 rounded-full border border-black shrink-0 ${colorCfg.bgClass}`}
                            aria-hidden="true"
                          />
                          <span className="truncate">
                            {metaParts.join(" · ")}
                          </span>
                        </div>
                        <h2 className="text-base sm:text-lg font-heading font-bold text-neutral-900 leading-snug break-words">
                          {fixBrokenFilename(topicItem.topic)}
                        </h2>
                      </div>
                    </div>

                    {isNew && (
                      <span
                        className="nb-badge shrink-0"
                        style={{
                          backgroundColor: themeAccent.badgeBg,
                          color: themeAccent.badgeText,
                        }}
                      >
                        Novo
                      </span>
                    )}
                  </div>

                  {/* Trecho do conteúdo ou nomes limpos dos arquivos (sem texto repetitivo) */}
                  {cleanExcerpt ? (
                    <p className="text-sm text-neutral-700 line-clamp-2 leading-relaxed break-words">
                      {cleanExcerpt}
                    </p>
                  ) : allFiles.length > 0 ? (
                    <div className="text-xs text-neutral-600 space-y-1">
                      {allFiles.slice(0, 2).map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-1.5 min-w-0"
                        >
                          <span className="truncate font-semibold text-neutral-800">
                            {file.original_filename}
                          </span>
                          <span className="shrink-0 text-neutral-500">
                            ({getFileTypeLabel(file)})
                          </span>
                        </div>
                      ))}
                      {allFiles.length > 2 && (
                        <div className="text-neutral-600 font-medium">
                          +{allFiles.length - 2}{" "}
                          {allFiles.length - 2 === 1 ? "arquivo" : "arquivos"}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Ações: Abrir resumo (principal) + Baixar (secundária quando aplicável) */}
                <div className="pt-3 border-t-2 border-black/10 flex items-center gap-2.5 flex-wrap">
                  {singleFile ? (
                    isImageAttachment(singleFile) ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewImage({
                            id: singleFile.id,
                            name: singleFile.original_filename,
                          })
                        }
                        style={
                          !isMentalist
                            ? {
                                backgroundColor: themeAccent.primaryBg,
                                color: themeAccent.primaryText,
                              }
                            : undefined
                        }
                        className={primaryButtonClass}
                        data-testid={`read-summary-${topicItem.id}`}
                      >
                        <span>Abrir resumo</span>
                      </button>
                    ) : (
                      <a
                        href={getFileDownloadUrl(singleFile.id)}
                        target="_blank"
                        rel="noreferrer"
                        style={
                          !isMentalist
                            ? {
                                backgroundColor: themeAccent.primaryBg,
                                color: themeAccent.primaryText,
                              }
                            : undefined
                        }
                        className={primaryButtonClass}
                        data-testid={`read-summary-${topicItem.id}`}
                      >
                        <span>Abrir resumo</span>
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    )
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReadingTopic(topicItem)}
                      style={
                        !isMentalist
                          ? {
                              backgroundColor: themeAccent.primaryBg,
                              color: themeAccent.primaryText,
                            }
                          : undefined
                      }
                      className={primaryButtonClass}
                      data-testid={`read-summary-${topicItem.id}`}
                    >
                      <span>Abrir resumo</span>
                    </button>
                  )}

                  {singleDownloadableFile && (
                    <a
                      href={getFileDownloadUrl(singleDownloadableFile.id, true)}
                      download={singleDownloadableFile.original_filename}
                      className={`nb-btn min-h-[44px] px-3.5 text-sm inline-flex items-center justify-center gap-1.5 shrink-0 ${
                        isMentalist
                          ? "bg-[#fffdf8] text-[#240707]"
                          : "bg-white hover:bg-neutral-50 text-neutral-900"
                      }`}
                      data-testid={`download-summary-${topicItem.id}`}
                    >
                      <Download className="w-4 h-4 shrink-0" />
                      <span>Baixar</span>
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Modal de Leitura e Lista Organizada de Arquivos */}
      {readingTopic && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-5 backdrop-blur-[2px]">
            <div
              className={`relative w-full max-w-4xl rounded-t-2xl sm:rounded-2xl border-2 flex flex-col max-h-[92vh] overflow-hidden ${
                isMentalist
                  ? "bg-[#fbf5e8] border-[#2b0909] shadow-[6px_6px_0_0_#2b0909] text-[#240707]"
                  : "bg-white border-black shadow-[6px_6px_0_0_#0a0a0a] text-neutral-900"
              }`}
              data-testid="student-summary-reader-modal"
            >
              <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b-2 border-black/15 flex items-start justify-between gap-3 shrink-0">
                <div className="min-w-0 space-y-0.5">
                  <div className="text-xs font-semibold text-neutral-600 tabular-nums">
                    {readingTopic.subject}
                    {formatDateShortBR(
                      readingTopic.published_at ||
                        readingTopic.updated_at ||
                        readingTopic.created_at
                    )
                      ? ` · ${formatDateShortBR(
                          readingTopic.published_at ||
                            readingTopic.updated_at ||
                            readingTopic.created_at
                        )}`
                      : ""}
                  </div>
                  <h2 className="text-lg sm:text-xl font-heading font-extrabold text-neutral-900 leading-snug break-words">
                    {fixBrokenFilename(readingTopic.topic)}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setReadingTopic(null)}
                  aria-label="Fechar resumo"
                  className="nb-btn min-w-[44px] min-h-[44px] bg-white hover:bg-neutral-100 text-black flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
                {Boolean(getCleanExcerpt(readingTopic.summary_text)) && (
                  <MarkdownSummaryViewer
                    markdown={readingTopic.summary_text}
                    title={fixBrokenFilename(readingTopic.topic)}
                    subtitle={`${readingTopic.subject} · ${formatDateShortBR(
                      readingTopic.published_at ||
                        readingTopic.updated_at ||
                        readingTopic.created_at
                    )}`}
                    subjects={[readingTopic.subject]}
                    showToolbar={true}
                  />
                )}

                {getAllItemFiles(readingTopic).length > 0 && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-heading font-bold text-neutral-900 flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-neutral-700" />
                        <span>Materiais anexados</span>
                      </h3>
                      <span className="text-xs font-semibold text-neutral-600 tabular-nums">
                        {getAllItemFiles(readingTopic).length}{" "}
                        {getAllItemFiles(readingTopic).length === 1
                          ? "arquivo"
                          : "arquivos"}
                      </span>
                    </div>

                    <div
                      className={`divide-y-2 rounded-xl border-2 overflow-hidden ${
                        isMentalist
                          ? "divide-[#2b0909]/15 border-[#2b0909] bg-[#fffdf8] shadow-[3px_3px_0_0_#2b0909]"
                          : "divide-black/15 border-black bg-white shadow-[3px_3px_0_0_#0a0a0a]"
                      }`}
                    >
                      {getAllItemFiles(readingTopic).map((att) => {
                        const isImg = isImageAttachment(att);
                        const typeLabel = getFileTypeLabel(att);
                        const sizeLabel = formatFileSize(att.size);

                        return (
                          <div
                            key={att.id}
                            className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            data-testid={`student-summary-attachment-${att.id}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-9 h-9 rounded-lg border-2 border-black shadow-[2px_2px_0_0_#0a0a0a] flex items-center justify-center shrink-0"
                                style={{
                                  backgroundColor: themeAccent.softTintBg,
                                  color: themeAccent.softTintColor,
                                }}
                              >
                                {isImg ? (
                                  <ImageIcon className="w-4 h-4" />
                                ) : (
                                  <FileText className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-neutral-900 break-words">
                                  {att.original_filename}
                                </div>
                                <div className="text-xs font-medium text-neutral-600 tabular-nums">
                                  {typeLabel}
                                  {sizeLabel ? ` · ${sizeLabel}` : ""}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isImg ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewImage({
                                      id: att.id,
                                      name: att.original_filename,
                                    })
                                  }
                                  style={
                                    !isMentalist
                                      ? {
                                          backgroundColor: themeAccent.primaryBg,
                                          color: themeAccent.primaryText,
                                        }
                                      : undefined
                                  }
                                  className={`nb-btn flex-1 sm:flex-initial min-h-[44px] px-4 text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                                    isMentalist ? "mentalist-btn-crimson" : ""
                                  }`}
                                >
                                  <span>Abrir</span>
                                </button>
                              ) : (
                                <a
                                  href={getFileDownloadUrl(att.id)}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={
                                    !isMentalist
                                      ? {
                                          backgroundColor: themeAccent.primaryBg,
                                          color: themeAccent.primaryText,
                                        }
                                      : undefined
                                  }
                                  className={`nb-btn flex-1 sm:flex-initial min-h-[44px] px-4 text-xs inline-flex items-center justify-center gap-1.5 ${
                                    isMentalist ? "mentalist-btn-crimson" : ""
                                  }`}
                                >
                                  <span>Abrir</span>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}

                              <a
                                href={getFileDownloadUrl(att.id, true)}
                                download={att.original_filename}
                                className="nb-btn min-h-[44px] px-3.5 bg-white hover:bg-neutral-50 text-neutral-900 text-xs inline-flex items-center justify-center gap-1.5"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Baixar</span>
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-4 py-3 sm:px-6 border-t-2 border-black/15 bg-black/[0.02] flex items-center justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setReadingTopic(null)}
                  className="nb-btn w-full sm:w-auto min-h-[44px] px-6 bg-white hover:bg-neutral-100 text-black text-sm cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Visualização Direta de Imagem (Lightbox) */}
      {previewImage && (
        <ModalPortal>
          <div
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3 sm:p-5 backdrop-blur-xs cursor-pointer"
            data-testid="student-summary-image-lightbox"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className={`relative max-w-4xl w-full sm:w-auto max-h-[90vh] p-3 sm:p-4 rounded-2xl border-2 flex flex-col gap-3 cursor-default ${
                isMentalist
                  ? "bg-[#fbf5e8] border-[#2b0909] shadow-[6px_6px_0_0_#2b0909]"
                  : "bg-white border-black shadow-[6px_6px_0_0_#0a0a0a]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-neutral-900 truncate">
                  {previewImage.name || "Visualização"}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={getFileDownloadUrl(previewImage.id, true)}
                    download={previewImage.name || "resumo"}
                    className="nb-btn min-h-[40px] px-3 bg-white hover:bg-neutral-50 text-black text-xs inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setPreviewImage(null)}
                    aria-label="Fechar imagem"
                    className="nb-btn min-w-[40px] min-h-[40px] bg-white hover:bg-neutral-100 text-black flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <img
                src={`/api/files/${previewImage.id}?auth=${encodeURIComponent((typeof window !== "undefined" ? localStorage.getItem("auth_token") : "") || "")}`}
                alt={previewImage.name || "Visualização do anexo"}
                className="max-h-[75vh] w-auto mx-auto rounded-xl border-2 border-black object-contain"
              />
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
