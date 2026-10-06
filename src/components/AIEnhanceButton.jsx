import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Lock } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import { useAIStatus } from "@/context/AIStatusContext";

/**
 * "Melhorar com IA" button.
 * When AI is disabled, appears visually locked/disabled and unclickable.
 */
export default function AIEnhanceButton({
  endpoint,
  payload,
  onResult,
  label = "Melhorar com IA",
  className = "",
  disabled = false,
  testId,
}) {
  const [loading, setLoading] = useState(false);
  const { enabled } = useAIStatus();

  if (!enabled) {
    return (
      <button
        type="button"
        disabled={true}
        className={`nb-btn bg-neutral-200 text-neutral-500 border-neutral-400 cursor-not-allowed opacity-60 px-3 py-1.5 text-xs flex items-center gap-1.5 ${className}`}
        data-testid={testId || "ai-enhance-button-disabled"}
        title="IA desativada temporariamente pelo administrador"
      >
        <Lock className="w-3.5 h-3.5 text-neutral-500" strokeWidth={2.5} />
        <span>{label} (Bloqueado)</span>
      </button>
    );
  }

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(endpoint, payload);
      onResult(data);
      toast.success("Sugestão pronta! ✨");
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao chamar a IA");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={run}
      disabled={disabled || loading}
      className={`nb-btn bg-gradient-to-r from-violet-300 to-pink-300 hover:from-violet-400 hover:to-pink-400 px-3 py-1.5 text-xs flex items-center gap-1.5 ${className}`}
      data-testid={testId || "ai-enhance-button"}
      title="Deixar a IA sugerir"
    >
      <Sparkles className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} strokeWidth={2.5} />
      {loading ? "Pensando..." : label}
    </button>
  );
}
