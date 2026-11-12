/**
 * Neo-Brutalist Subject Colors Palette & Utilities
 * Provides customizable colors per subject, persisting across Admin and Student views.
 */

export const SUBJECT_COLOR_OPTIONS = [
  {
    id: "sky",
    name: "Azul Céu",
    bgClass: "bg-sky-200",
    textClass: "text-sky-950",
    borderClass: "border-sky-400",
    accentColor: "#38bdf8",
    badgeClasses: "bg-sky-200 text-sky-950 border-2 border-black",
    cardClasses: "bg-sky-100 text-sky-950 border-2 border-black",
  },
  {
    id: "amber",
    name: "Âmbar / Amarelo",
    bgClass: "bg-amber-200",
    textClass: "text-amber-950",
    borderClass: "border-amber-400",
    accentColor: "#fbbf24",
    badgeClasses: "bg-amber-200 text-amber-950 border-2 border-black",
    cardClasses: "bg-amber-100 text-amber-950 border-2 border-black",
  },
  {
    id: "emerald",
    name: "Verde Esmeralda",
    bgClass: "bg-emerald-200",
    textClass: "text-emerald-950",
    borderClass: "border-emerald-400",
    accentColor: "#34d399",
    badgeClasses: "bg-emerald-200 text-emerald-950 border-2 border-black",
    cardClasses: "bg-emerald-100 text-emerald-950 border-2 border-black",
  },
  {
    id: "rose",
    name: "Rosa / Coral",
    bgClass: "bg-rose-200",
    textClass: "text-rose-950",
    borderClass: "border-rose-400",
    accentColor: "#fb7185",
    badgeClasses: "bg-rose-200 text-rose-950 border-2 border-black",
    cardClasses: "bg-rose-100 text-rose-950 border-2 border-black",
  },
  {
    id: "violet",
    name: "Violeta / Roxo",
    bgClass: "bg-violet-200",
    textClass: "text-violet-950",
    borderClass: "border-violet-400",
    accentColor: "#a78bfa",
    badgeClasses: "bg-violet-200 text-violet-950 border-2 border-black",
    cardClasses: "bg-violet-100 text-violet-950 border-2 border-black",
  },
  {
    id: "orange",
    name: "Laranja",
    bgClass: "bg-orange-200",
    textClass: "text-orange-950",
    borderClass: "border-orange-400",
    accentColor: "#fb923c",
    badgeClasses: "bg-orange-200 text-orange-950 border-2 border-black",
    cardClasses: "bg-orange-100 text-orange-950 border-2 border-black",
  },
  {
    id: "cyan",
    name: "Turquesa / Ciano",
    bgClass: "bg-cyan-200",
    textClass: "text-cyan-950",
    borderClass: "border-cyan-400",
    accentColor: "#22d3ee",
    badgeClasses: "bg-cyan-200 text-cyan-950 border-2 border-black",
    cardClasses: "bg-cyan-100 text-cyan-950 border-2 border-black",
  },
  {
    id: "lime",
    name: "Verde Limão",
    bgClass: "bg-lime-200",
    textClass: "text-lime-950",
    borderClass: "border-lime-400",
    accentColor: "#a3e635",
    badgeClasses: "bg-lime-200 text-lime-950 border-2 border-black",
    cardClasses: "bg-lime-100 text-lime-950 border-2 border-black",
  },
  {
    id: "pink",
    name: "Rosa Pink",
    bgClass: "bg-pink-200",
    textClass: "text-pink-950",
    borderClass: "border-pink-400",
    accentColor: "#f472b6",
    badgeClasses: "bg-pink-200 text-pink-950 border-2 border-black",
    cardClasses: "bg-pink-100 text-pink-950 border-2 border-black",
  },
  {
    id: "indigo",
    name: "Azul Índigo",
    bgClass: "bg-indigo-200",
    textClass: "text-indigo-950",
    borderClass: "border-indigo-400",
    accentColor: "#818cf8",
    badgeClasses: "bg-indigo-200 text-indigo-950 border-2 border-black",
    cardClasses: "bg-indigo-100 text-indigo-950 border-2 border-black",
  },
];

let _cachedSubjects = [];

export function setCachedSubjects(list) {
  if (Array.isArray(list)) {
    _cachedSubjects = list;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("edutask_cached_subjects", JSON.stringify(list));
      } catch {}
    }
  }
}

export function getCachedSubjects() {
  if (_cachedSubjects.length === 0 && typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("edutask_cached_subjects");
      if (stored) {
        _cachedSubjects = JSON.parse(stored);
      }
    } catch {}
  }
  return _cachedSubjects;
}

/**
 * Returns color option by ID or fallback
 */
export function getSubjectColorById(colorId = "sky") {
  return (
    SUBJECT_COLOR_OPTIONS.find((c) => c.id === colorId) ||
    SUBJECT_COLOR_OPTIONS[0]
  );
}

/**
 * Finds matching subject configuration from a list of subjects, or computes deterministic fallback
 */
export function getSubjectColorConfig(subjectNameOrObj, subjectsList = []) {
  if (!subjectNameOrObj) return SUBJECT_COLOR_OPTIONS[0];

  const list =
    Array.isArray(subjectsList) && subjectsList.length > 0
      ? subjectsList
      : getCachedSubjects();

  // If object already passed with color
  if (typeof subjectNameOrObj === "object") {
    if (subjectNameOrObj.color) {
      const match = SUBJECT_COLOR_OPTIONS.find((c) => c.id === subjectNameOrObj.color);
      if (match) return match;
    }
    const name = subjectNameOrObj.name || "";
    return getSubjectColorConfig(name, list);
  }

  const nameStr = String(subjectNameOrObj).trim();
  const lowerName = nameStr.toLowerCase();

  // Check subjects list
  if (Array.isArray(list) && list.length > 0) {
    const found = list.find(
      (s) => (s?.name || "").trim().toLowerCase() === lowerName
    );
    if (found?.color) {
      const match = SUBJECT_COLOR_OPTIONS.find((c) => c.id === found.color);
      if (match) return match;
    }
  }

  // Deterministic fallback by string hash
  let hash = 0;
  for (let i = 0; i < lowerName.length; i++) {
    hash = (hash << 5) - hash + lowerName.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % SUBJECT_COLOR_OPTIONS.length;
  return SUBJECT_COLOR_OPTIONS[index];
}

/**
 * Returns CSS classes for subject badge (e.g., in task card or summary card)
 */
export function getSubjectBadgeClass(subjectNameOrObj, subjectsList = []) {
  const cfg = getSubjectColorConfig(subjectNameOrObj, subjectsList);
  return `${cfg.bgClass} ${cfg.textClass} font-heading font-black border-2 border-black`;
}

/**
 * Returns CSS classes for subject card background
 */
export function getSubjectCardClass(subjectNameOrObj, subjectsList = []) {
  const cfg = getSubjectColorConfig(subjectNameOrObj, subjectsList);
  return `${cfg.cardClasses} font-heading font-bold shadow-[2px_2px_0_0_#000]`;
}

/**
 * Direct replacement for old colorFor helper
 */
export function colorFor(subjectNameOrObj, subjectsList = []) {
  const cfg = getSubjectColorConfig(subjectNameOrObj, subjectsList);
  return `${cfg.bgClass} ${cfg.textClass} font-bold`;
}
