import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import api from "@/lib/api";
import { useAIStatus } from "@/context/AIStatusContext";

/**
 * Small AI banner shown on the student dashboard. Shows a 1-3 sentence daily
 * summary of tasks and priorities for the student.
 */
import { useAuth } from "@/context/AuthContext";

/**
 * Small AI banner shown on the student dashboard. Shows a 1-3 sentence daily
 * summary of tasks and priorities for the student.
 */
export default function AIDailySummary() {
  const [summary, setSummary] = useState(null);
  const { enabled, hidden, aiHidden } = useAIStatus();
  const { user } = useAuth();
  const isMinecraft = user?.equipped_effect === "minecraft";

  useEffect(() => {
    if (!enabled || hidden || aiHidden) return;
    api.get("/ai/daily-summary").then(({ data }) => setSummary(data)).catch(() => {});
  }, [enabled, hidden, aiHidden]);

  if (!enabled || hidden || aiHidden || !summary) return null;

  if (isMinecraft) {
    return (
      <div
        className="p-4 sm:p-5 mb-6 bg-[#d8b376] border-4 border-[#1a0f0a] rounded-xl shadow-[inset_2px_2px_0_rgba(255,255,255,0.4),inset_-2px_-2px_0_rgba(0,0,0,0.5),4px_4px_0_#000] font-minecraft text-[#181109] relative overflow-hidden"
        data-testid="ai-daily-summary"
      >
        <div className="absolute top-3 right-3 text-amber-400 font-bold text-xs flex items-center gap-1 bg-[#2a1a0a] px-2.5 py-1 rounded border border-black text-[#fef08a]">
          <span>⏰</span> <span>IA</span>
        </div>
        <div className="relative z-10 flex items-start gap-3">
          <div className="w-9 h-9 rounded bg-[#54381d] border-2 border-black flex items-center justify-center flex-shrink-0 text-white shadow-inner">
            <Sparkles className="w-5 h-5 text-[#facc15]" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1 pr-16">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#54381d]">RESUMO DO DIA • IA</div>
            <p className="text-xs sm:text-sm mt-1 text-[#1c1208] font-bold leading-relaxed" data-testid="ai-summary-text">{summary.summary}</p>
          </div>
        </div>
      </div>
    );
  }

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
