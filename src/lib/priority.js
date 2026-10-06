export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // If simple YYYY-MM-DD
  if (typeof dateStr === "string" && dateStr.includes("-")) {
    const cleanDate = dateStr.split("T")[0];
    const parts = cleanDate.split("-");
    if (parts.length >= 3) {
      const target = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const diffTime = target.getTime() - now.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  try {
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

export function getPriority(dueDate, isCompleted = false) {
  if (isCompleted) {
    return { level: "completed", label: "Concluída", bg: "bg-emerald-200 text-emerald-950", icon: "✅" };
  }
  const days = daysUntil(dueDate);
  if (days == null) return { level: "medium", label: "Normal", bg: "bg-sky-200 text-sky-950", icon: "📌" };
  if (days < 0) return { level: "overdue", label: "Atrasada", bg: "bg-red-300 text-red-950 animate-pulse", icon: "🚨" };
  if (days === 0) return { level: "today", label: "Hoje", bg: "bg-amber-300 text-amber-950 font-bold", icon: "⚡" };
  if (days <= 2) return { level: "high", label: "Urgente", bg: "bg-amber-200 text-amber-950", icon: "⏳" };
  return { level: "normal", label: "Normal", bg: "bg-sky-200 text-sky-950", icon: "📌" };
}

export function formatDateBR(dateInput, includeTime = false) {
  if (!dateInput) return "—";
  
  try {
    // If it's a string
    if (typeof dateInput === "string") {
      const trimmed = dateInput.trim();
      
      // Case 1: Pure Date string "YYYY-MM-DD"
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split("-");
        return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
      }

      // Case 2: ISO timestamp string "YYYY-MM-DDTHH:mm:ss..."
      if (trimmed.includes("T")) {
        const [datePart, timePart] = trimmed.split("T");
        const [y, m, d] = datePart.split("-");
        const formattedDate = `${(d || "01").padStart(2, "0")}/${(m || "01").padStart(2, "0")}/${y}`;
        
        if (includeTime && timePart) {
          const timeClean = timePart.split(".")[0].split("Z")[0];
          const [hh, mm] = timeClean.split(":");
          if (hh && mm) return `${formattedDate} às ${hh}:${mm}`;
        }
        return formattedDate;
      }

      // Case 3: Formatted string containing '-'
      if (trimmed.includes("-")) {
        const [y, m, d] = trimmed.split("-");
        if (y && m && d) {
          return `${d.slice(0, 2).padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
        }
      }
    }

    // Standard Date or timestamp object parsing
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const formattedDate = `${day}/${month}/${year}`;
      
      if (includeTime) {
        const hours = String(d.getHours()).padStart(2, "0");
        const mins = String(d.getMinutes()).padStart(2, "0");
        return `${formattedDate} às ${hours}:${mins}`;
      }
      return formattedDate;
    }
    
    return String(dateInput);
  } catch {
    return String(dateInput || "—");
  }
}

export function formatDateTimeBR(dateInput) {
  return formatDateBR(dateInput, true);
}
