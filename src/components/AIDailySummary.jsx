import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import api from "@/lib/api";
import { useAIStatus } from "@/context/AIStatusContext";

/**
 * Small AI banner shown on the student dashboard. Shows a 1-3 sentence daily
 * summary of tasks and priorities for the student.
 */
export default function AIDailySummary() {
  const [summary, setSummary] = useState(null);
  const { enabled } = useAIStatus();

  useEffect(() => {
    if (!enabled) return;
    api.get("/ai/daily-summary").then(({ data }) => setSummary(data)).catch(() => {});
  }, [enabled]);

  if (!enabled || !summary) return null;

  return (
    <div
      className="nb-card p-4 sm:p-5 mb-6 bg-gradient-to-br from-violet-200 via-pink-100 to-amber-100 relative overflow-hidden"
      data-testid="ai-daily-summary"
    >
      <div className="absolute -top-4 -right-4 text-[100px] opacity-15 select-none">✨</div>
      <div className="relative z-10 flex items-start gap-3">
        <div className="w-10 h-10 nb-card flex items-center justify-center bg-white flex-shrink-0">
          <Sparkles className="w-5 h-5 text-violet-600" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-violet-900">Resumo do dia • IA</div>
          <p className="text-sm sm:text-base mt-1 text-neutral-900 font-medium" data-testid="ai-summary-text">{summary.summary}</p>
        </div>
      </div>
    </div>
  );
}
