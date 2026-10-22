import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Paperclip, Check, BookOpen, Filter, Megaphone, LayoutGrid, CalendarDays, Sparkles, ShoppingBag, BarChart3, HelpCircle, Star, ExternalLink, Image as ImageIcon, Loader2, Copy, CheckCheck, FileText, ChevronDown, ChevronUp, Lock, Bot, Coins, RotateCcw, Volume2 } from "lucide-react";
import api, { API, formatApiError } from "@/lib/api";
import { firebaseService } from "@/lib/firebaseService";
import { useAuth } from "@/context/AuthContext";
import { useAIStatus } from "@/context/AIStatusContext";
import AppHeader from "@/components/AppHeader";
import MyProfileBanner from "@/components/MyProfileBanner";
import AnnouncementComments from "@/components/AnnouncementComments";
import TaskCalendar from "@/components/TaskCalendar";
import PrizeBanner from "@/components/PrizeBanner";
import AIDailySummary from "@/components/AIDailySummary";
import StoreEffects from "@/components/StoreEffects";
import StudentAIStatsView from "@/components/StudentAIStatsView";
import AIChatDialog from "@/components/AIChatDialog";
import SpecialAnnouncementModal from "@/components/SpecialAnnouncementModal";
import { getButtonColorStyle } from "@/components/StudentButtonsPanel";
import { getPriority, formatDateBR, daysUntil } from "@/lib/priority";
import { fireConfetti } from "@/lib/celebrate";
import { getTheme } from "@/lib/themes";
import { pullScreenToStore } from "@/lib/effects";
import { playTaskCompleteSound, playTaskUncheckSound } from "@/lib/soundEffects";

const subjectColors = ["bg-sky-200", "bg-amber-200", "bg-red-200", "bg-emerald-200", "bg-violet-200", "bg-rose-200"];
const colorFor = (s) => subjectColors[(s || "").length % subjectColors.length];

function MinecraftLandscapeBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none" style={{ shapeRendering: "crispEdges" }}>
      {/* Blue Sky */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#5ca3ff] via-[#85bdff] to-[#b8dbff]" />

      {/* Floating Pixel Clouds */}
      <svg className="absolute top-2 left-0 w-full h-32 opacity-90" viewBox="0 0 1000 100" preserveAspectRatio="none">
        <path fill="#ffffff" opacity="0.95" d="M30,15 h100 v25 h-100 z M60,5 h60 v15 h-60 z M350,25 h140 v30 h-140 z M390,10 h80 v20 h-80 z M750,20 h120 v30 h-120 z M780,8 h70 v18 h-70 z" />
      </svg>

      {/* Mountains */}
      <svg className="absolute bottom-24 left-0 w-full h-48 opacity-85" viewBox="0 0 1200 160" preserveAspectRatio="none">
        <polygon points="0,160 120,60 240,160" fill="#606060" />
        <polygon points="95,80 120,60 145,80 120,88" fill="#ffffff" />
        <polygon points="200,160 380,40 560,160" fill="#4d4d4d" />
        <polygon points="340,70 380,40 420,70 380,80" fill="#ffffff" />
        <polygon points="650,160 820,50 990,160" fill="#585858" />
        <polygon points="780,75 820,50 860,75 820,85" fill="#ffffff" />
      </svg>

      {/* Grass Hills, Oak Trees, Dandelion Flowers, Pigs & Sheep */}
      <svg className="absolute bottom-0 left-0 w-full h-36" viewBox="0 0 1200 120" preserveAspectRatio="none">
        <rect x="0" y="70" width="1200" height="50" fill="#5c8e32" />
        <rect x="0" y="65" width="1200" height="8" fill="#7cbd3a" />
        <rect x="0" y="90" width="1200" height="30" fill="#866043" />

        <g transform="translate(30, 0)">
          <rect x="18" y="30" width="10" height="40" fill="#573d26" />
          <rect x="0" y="0" width="46" height="35" fill="#38591b" />
          <rect x="5" y="5" width="36" height="25" fill="#4a7c29" />
        </g>
        <g transform="translate(1120, 0)">
          <rect x="18" y="30" width="10" height="40" fill="#573d26" />
          <rect x="0" y="0" width="46" height="35" fill="#38591b" />
          <rect x="5" y="5" width="36" height="25" fill="#4a7c29" />
        </g>

        <g transform="translate(180, 52)">
          <rect x="1" y="0" width="3" height="3" fill="#facc15" />
          <rect x="2" y="3" width="1" height="6" fill="#22c55e" />
        </g>
        <g transform="translate(850, 52)">
          <rect x="1" y="0" width="3" height="3" fill="#facc15" />
          <rect x="2" y="3" width="1" height="6" fill="#22c55e" />
        </g>

        <g transform="translate(680, 38) scale(0.8)">
          <rect x="0" y="0" width="28" height="20" rx="2" fill="#f8fafc" stroke="#1e293b" strokeWidth="1" />
          <rect x="22" y="4" width="10" height="10" rx="1" fill="#f1f5f9" stroke="#1e293b" strokeWidth="1" />
          <rect x="28" y="6" width="2" height="2" fill="#0f172a" />
          <rect x="4" y="20" width="4" height="8" fill="#475569" />
          <rect x="20" y="20" width="4" height="8" fill="#475569" />
        </g>

        <g transform="translate(980, 44) scale(0.8)">
          <rect x="0" y="0" width="24" height="16" rx="2" fill="#f472b6" stroke="#831843" strokeWidth="1" />
          <rect x="-8" y="2" width="10" height="10" rx="1" fill="#f472b6" stroke="#831843" strokeWidth="1" />
          <rect x="-10" y="6" width="4" height="4" fill="#fb7185" />
          <rect x="-6" y="4" width="2" height="2" fill="#0f172a" />
          <rect x="3" y="16" width="3" height="6" fill="#db2777" />
          <rect x="18" y="16" width="3" height="6" fill="#db2777" />
        </g>
      </svg>
    </div>
  );
}

function BotSandboxBanner({ onPointsUpdated }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const isMinecraft = user?.equipped_effect === "minecraft";

  const addPoints = async (delta) => {
    setLoading(true);
    try {
      await api.post("/me/bot-test-points", { delta });
      toast.success(`+${delta} pontos de teste adicionados!`);
      if (onPointsUpdated) onPointsUpdated();
      window.dispatchEvent(new Event("profile-updated"));
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao adicionar pontos");
    } finally {
      setLoading(false);
    }
  };

  const resetPoints = async () => {
    setLoading(true);
    try {
      await api.post("/me/bot-test-points", { reset: true });
      toast.success("Pontos de teste zerados!");
      if (onPointsUpdated) onPointsUpdated();
      window.dispatchEvent(new Event("profile-updated"));
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao zerar pontos");
    } finally {
      setLoading(false);
    }
  };

  const testSound = () => {
    playTaskCompleteSound("minecraft");
    toast.success("Efeito sonoro de teste disparado!");
  };

  if (isMinecraft) {
    return (
      <div className="mb-6 p-4 bg-[#707070] border-4 border-[#1a0f0a] shadow-[inset_2px_2px_0_rgba(255,255,255,0.3),inset_-2px_-2px_0_rgba(0,0,0,0.5),4px_4px_0_#000] rounded-xl text-white font-minecraft relative overflow-hidden" data-testid="bot-sandbox-banner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white border-2 border-black flex items-center justify-center flex-shrink-0 rounded shadow-xs text-black">
              <Bot className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-base sm:text-lg text-white drop-shadow-[1px_1px_0_#000]">
                  Perfil de Teste (Bot / Sandbox)
                </h2>
                <span className="px-2.5 py-0.5 bg-[#76e3d9] text-black border border-black text-[10px] font-bold rounded shadow-xs">
                  AMBIENTE DE SIMULAÇÃO
                </span>
              </div>
              <p className="text-xs text-[#e5e5e5] mt-0.5 drop-shadow-[1px_1px_0_#000]">
                Este perfil possui atributos de teste e cortes aplicados para não interferir nas contas reais.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => addPoints(100)}
              disabled={loading}
              className="btn-minecraft-wood px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5 text-amber-300" /> +100 Pts Teste
            </button>
            <button
              onClick={resetPoints}
              disabled={loading}
              className="btn-minecraft-stone px-2.5 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-white" /> Zerar Pts
            </button>
            <button
              onClick={testSound}
              className="btn-minecraft-wood px-2.5 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-white" /> Testar Som
            </button>
          </div>
        </div>

        {/* Oak Fence + Signs row for cuts matching Screenshot 1 */}
        <div className="mt-3 pt-3 border-t border-[#3d2716] grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs relative z-10">
          <div className="flex items-center gap-1.5 text-[#fef08a] bg-[#54381d] p-2 border-2 border-[#28190c] rounded shadow-xs">
            <span className="font-bold text-[#f87171]">🪵 Corte 1:</span> Fora do ranking e prêmio mensal da IA
          </div>
          <div className="flex items-center gap-1.5 text-[#fef08a] bg-[#54381d] p-2 border-2 border-[#28190c] rounded shadow-xs">
            <span className="font-bold text-[#f87171]">🪵 Corte 2:</span> Bloqueado de disparos de WhatsApp
          </div>
          <div className="flex items-center gap-1.5 text-[#fef08a] bg-[#54381d] p-2 border-2 border-[#28190c] rounded shadow-xs">
            <span className="font-bold text-[#f87171]">🪵 Corte 3:</span> Não afeta médias gerais da turma
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 nb-card bg-cyan-100 border-2 border-black p-4 shadow-[4px_4px_0_0_#000]" data-testid="bot-sandbox-banner">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 nb-card bg-cyan-300 border-2 border-black flex items-center justify-center flex-shrink-0">
            <Bot className="w-6 h-6 text-cyan-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-heading font-black text-base sm:text-lg text-cyan-950">
                Perfil de Teste (Bot / Sandbox)
              </h2>
              <span className="nb-badge bg-cyan-300 text-cyan-950 border border-black text-xs font-black">
                Ambiente de Simulação
              </span>
            </div>
            <p className="text-xs text-neutral-800 mt-0.5">
              Este perfil possui atributos de teste e cortes aplicados para não interferir nas contas reais.
            </p>
          </div>
        </div>

        {/* Ferramentas de teste sandbox */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => addPoints(100)}
            disabled={loading}
            className="nb-btn bg-amber-300 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-[2px_2px_0_0_#000]"
            title="Adicionar 100 pontos para testar compras na loja"
          >
            <Coins className="w-3.5 h-3.5" /> +100 Pts Teste
          </button>
          <button
            onClick={resetPoints}
            disabled={loading}
            className="nb-btn bg-white hover:bg-neutral-100 px-2.5 py-1.5 text-xs font-bold flex items-center gap-1"
            title="Resetar saldo de pontos"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Zerar Pts
          </button>
          <button
            onClick={testSound}
            className="nb-btn bg-purple-200 hover:bg-purple-300 px-2.5 py-1.5 text-xs font-bold flex items-center gap-1"
            title="Ouvir efeitos sonoros temáticos"
          >
            <Volume2 className="w-3.5 h-3.5" /> Testar Som
          </button>
        </div>
      </div>

      {/* Cortes explicativos */}
      <div className="mt-3 pt-3 border-t border-cyan-800/20 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-neutral-800 bg-white/70 p-1.5 border border-black/30">
          <span className="font-black text-cyan-950">✂️ Corte 1:</span> Fora do ranking e prêmio mensal da IA
        </div>
        <div className="flex items-center gap-1.5 text-neutral-800 bg-white/70 p-1.5 border border-black/30">
          <span className="font-black text-cyan-950">✂️ Corte 2:</span> Bloqueado de disparos de WhatsApp
        </div>
        <div className="flex items-center gap-1.5 text-neutral-800 bg-white/70 p-1.5 border border-black/30">
          <span className="font-black text-cyan-950">✂️ Corte 3:</span> Não afeta médias gerais da turma
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const { enabled: aiEnabled, hidden: aiHidden, framesDisabled } = useAIStatus();
  const [tasks, setTasks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todas");
  const [subjectFilter, setSubjectFilter] = useState("todas");
  const [view, setView] = useState("cards"); // "cards" | "calendar"
  const [tab, setTab] = useState("tasks"); // "tasks" | "store" | "stats"
  const [chatTask, setChatTask] = useState(null);
  const [globalChatOpen, setGlobalChatOpen] = useState(false);
  const [specialModalAnnouncement, setSpecialModalAnnouncement] = useState(null);
  const [customButtons, setCustomButtons] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: t }, { data: a }, btnRes] = await Promise.all([
        api.get("/tasks"),
        api.get("/announcements"),
        api.get("/student-buttons").catch(() => ({ data: [] })),
      ]);
      setTasks(t);
      setAnnouncements(a);
      setCustomButtons(btnRes?.data || []);
    } catch (e) {
      try {
        const [allTasks, allAnnouncements, allCompletions, btnRes] = await Promise.all([
          firebaseService.getAllTasks(),
          firebaseService.getAllAnnouncements(),
          firebaseService.getAllCompletions(),
          api.get("/student-buttons").catch(() => ({ data: [] })),
        ]);
        const currentUserId = user?.id;
        const mapped = (allTasks || [])
          .filter((t) => !t.assigned_to || t.assigned_to.length === 0 || t.assigned_to.includes(currentUserId))
          .map((t) => {
            const comp = (allCompletions || []).find((c) => c.task_id === t.id && c.user_id === currentUserId);
            return {
              ...t,
              completed: Boolean(comp),
              completed_at: comp?.completed_at,
              points_awarded: comp?.points_awarded,
            };
          });
        setTasks(mapped);
        setAnnouncements(allAnnouncements || []);
        setCustomButtons(btnRes?.data || []);
      } catch (e2) {
        toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao carregar tarefas");
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const handleCustomButtonClick = (btn) => {
    try {
      api.post(`/student-buttons/${btn.id}/click`).catch(() => {});
    } catch {}
    window.open(btn.url, "_blank", "noopener,noreferrer");
  };

  useEffect(() => { load(); }, [load]);

  // Listener para evento customizado do botão superior da Loja no AppHeader
  useEffect(() => {
    const handleStoreTabEvent = () => {
      if (framesDisabled) return;
      setTab("store");
      pullScreenToStore();
    };
    window.addEventListener("open-store-tab", handleStoreTabEvent);
    return () => window.removeEventListener("open-store-tab", handleStoreTabEvent);
  }, [framesDisabled]);

  // Automatic one-time pop-up trigger on app launch for special announcements
  useEffect(() => {
    if (!user?.id || !announcements || announcements.length === 0) return;
    const unseenSpecial = announcements.find((a) => {
      if (!a.is_special) return false;
      const seenKey = `edutask_seen_special_ann_${user.id}_${a.id}`;
      return !localStorage.getItem(seenKey);
    });
    if (unseenSpecial) {
      setSpecialModalAnnouncement(unseenSpecial);
    }
  }, [announcements, user?.id]);

  const handleCloseSpecialModal = () => {
    if (specialModalAnnouncement && user?.id) {
      localStorage.setItem(`edutask_seen_special_ann_${user.id}_${specialModalAnnouncement.id}`, "true");
    }
    setSpecialModalAnnouncement(null);
  };

  const specialAnnouncements = useMemo(() => {
    return announcements.filter((a) => a.is_special);
  }, [announcements]);

  const regularAnnouncements = useMemo(() => {
    return announcements.filter((a) => !a.is_special);
  }, [announcements]);

  const subjects = useMemo(() => {
    const s = new Set(tasks.map((t) => t.subject));
    return ["todas", ...Array.from(s)];
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (subjectFilter !== "todas" && t.subject !== subjectFilter) return false;
      if (filter === "pendentes" && t.completed) return false;
      if (filter === "concluidas" && !t.completed) return false;
      return true;
    });
  }, [tasks, filter, subjectFilter]);

  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const pending = total - done;

  const toggle = async (task) => {
    try {
      if (task.completed) {
        await api.post(`/tasks/${task.id}/uncomplete`);
        playTaskUncheckSound();
        toast("Tarefa desmarcada");
      } else {
        const { data } = await api.post(`/tasks/${task.id}/complete`);
        const earned = data?.points_earned || 0;
        const onTime = data?.on_time;
        playTaskCompleteSound();
        toast.success(
          earned > 0
            ? `+${earned} pontos! ${onTime ? "🎯 No prazo!" : "Entregue com atraso"}`
            : "Tarefa concluída! 🎉"
        );
        fireConfetti();
      }
      load();
      window.dispatchEvent(new CustomEvent("task-completed"));
      window.dispatchEvent(new CustomEvent("tasks-updated"));
      window.dispatchEvent(new CustomEvent("prize-updated"));
    } catch (e) {
      try {
        if (task.completed) {
          await firebaseService.deleteCompletion(user.id, task.id);
          toast("Tarefa desmarcada");
        } else {
          await firebaseService.saveCompletion({
            user_id: user.id,
            task_id: task.id,
            completed_at: new Date().toISOString(),
            points_awarded: task.points || 10,
            on_time: true,
          });
          toast.success("Tarefa concluída! 🎉");
          fireConfetti();
        }
        load();
        window.dispatchEvent(new CustomEvent("task-completed"));
        window.dispatchEvent(new CustomEvent("tasks-updated"));
        window.dispatchEvent(new CustomEvent("prize-updated"));
      } catch (e2) {
        toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao atualizar status");
      }
    }
  };

  const handleOpenStore = () => {
    if (framesDisabled) return;
    setTab("store");
    pullScreenToStore();
  };

  const isMinecraft = user?.equipped_effect === "minecraft";

  return (
    <div className={`min-h-screen ${isMinecraft ? "bg-[#60a5fa] relative overflow-x-hidden font-minecraft text-neutral-900" : "bg-[#FAFAFA]"}`}>
      {/* Full Minecraft Landscape Background when Minecraft theme is active */}
      {isMinecraft && <MinecraftLandscapeBackground />}

      <AppHeader title="Minhas tarefas" />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-28 sm:pb-8 relative z-10">
        <MyProfileBanner onOpenStore={!framesDisabled ? handleOpenStore : null} />
        {user?.status === "bot" && (
          <BotSandboxBanner onPointsUpdated={load} />
        )}
        <PrizeBanner />
        <AIDailySummary />

        {/* Dynamic & responsive navigation bar matching Screenshot 2 */}
        <div className="flex items-center gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-none sm:flex-wrap -mx-3 px-3 sm:mx-0 sm:px-0 relative z-20">
          <button
            onClick={() => setTab("tasks")}
            className={
              isMinecraft
                ? `btn-minecraft-diamond px-3.5 sm:px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                    tab === "tasks" ? "brightness-110" : "opacity-90"
                  }`
                : `nb-btn px-3.5 sm:px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 ${
                    tab === "tasks" ? "bg-sky-400 font-bold" : "bg-white"
                  }`
            }
            data-testid="student-tab-tasks"
          >
            <span>💎</span> Minhas tarefas
          </button>
          {!framesDisabled && (
            <button
              onClick={handleOpenStore}
              className={
                isMinecraft
                  ? `btn-minecraft-wood px-3.5 sm:px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                      tab === "store" ? "brightness-110" : "opacity-90"
                    }`
                  : `nb-btn px-3.5 sm:px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 ${
                      tab === "store" ? "bg-amber-300 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-white"
                    }`
              }
              data-testid="student-tab-store"
            >
              <span>🗺️</span> Loja de Molduras 🖼️
            </button>
          )}
          {!aiHidden && (
            <button
              onClick={() => setTab("stats")}
              className={
                isMinecraft
                  ? `btn-minecraft-stone px-3.5 sm:px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 cursor-pointer ${
                      tab === "stats" ? "brightness-110" : "opacity-90"
                    }`
                  : `nb-btn px-3.5 sm:px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 ${
                      tab === "stats" ? "bg-violet-300 font-bold" : "bg-white"
                    }`
              }
              data-testid="student-tab-stats"
            >
              <span>📊</span> Estatísticas & Líder IA
            </button>
          )}
          {!aiHidden && (
            <button
              onClick={() => {
                if (!aiEnabled) {
                  toast.error("A Inteligência Artificial foi desativada temporariamente pelo administrador.");
                  return;
                }
                setGlobalChatOpen(true);
              }}
              disabled={!aiEnabled}
              className={
                isMinecraft
                  ? "px-3.5 sm:px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 sm:ml-auto bg-[#a471bd] hover:bg-[#b583ce] border-2 border-black text-black font-minecraft font-bold rounded shadow-[0_3px_0_#6c4082,0_4px_0_#000] cursor-pointer"
                  : `nb-btn px-3.5 sm:px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 sm:ml-auto ${
                      !aiEnabled
                        ? "bg-neutral-200 text-neutral-500 border-neutral-400 cursor-not-allowed opacity-60"
                        : "bg-gradient-to-r from-violet-200 to-pink-200 hover:from-violet-300 hover:to-pink-300"
                    }`
              }
              data-testid="student-tab-chat"
              title={!aiEnabled ? "IA desativada temporariamente" : "Tirar Dúvidas com IA"}
            >
              <span>✨</span> Tirar Dúvida
            </button>
          )}
        </div>

        {tab === "store" && !framesDisabled ? (
          <StoreEffects />
        ) : tab === "stats" ? (
          <StudentAIStatsView />
        ) : (<>
        <div className="mb-4 sm:mb-8">
          <h1 className={`${isMinecraft ? "font-minecraft text-black font-black drop-shadow-[2px_2px_0_#fff]" : "font-heading font-black"} text-2xl sm:text-5xl tracking-tight`}>
            Olá! Vamos estudar?
          </h1>
          <p className={`${isMinecraft ? "font-minecraft text-[#2d1d0f] font-bold" : "text-neutral-600"} mt-1 text-xs sm:text-sm`}>
            Marque suas tarefas conforme as conclui.
          </p>
        </div>

        {/* Botões & Links Criados pelo Professor para os Alunos */}
        {customButtons && customButtons.length > 0 && (
          <div className="mb-6 sm:mb-8 space-y-2.5" data-testid="student-custom-buttons-section">
            <div className="flex items-center gap-2">
              <span className="font-heading font-black text-sm sm:text-base text-neutral-800 flex items-center gap-1.5">
                <span>🔗</span> Acessos Rápidos & Links Úteis
              </span>
              <span className="nb-badge bg-black text-white text-[10px] font-bold">
                {customButtons.length}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
              {customButtons.map((btn) => {
                const colorStyle = getButtonColorStyle(btn.color);
                return (
                  <button
                    key={btn.id}
                    onClick={() => handleCustomButtonClick(btn)}
                    className={`nb-btn p-3 sm:p-3.5 text-left flex items-center justify-between gap-2.5 border-2 border-black transition-all transform hover:-translate-y-0.5 active:translate-y-0.5 ${colorStyle.bg} ${colorStyle.shadow}`}
                    title={btn.description || `Abrir link: ${btn.url}`}
                    data-testid={`student-action-button-${btn.id}`}
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      <span className="text-lg sm:text-xl flex-shrink-0">{btn.icon || "🔗"}</span>
                      <div className="min-w-0">
                        <div className="font-heading font-black text-xs sm:text-sm truncate">
                          {btn.name}
                        </div>
                        {btn.description && (
                          <div className="text-[10px] opacity-80 truncate font-sans">
                            {btn.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 opacity-80" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Announcements */}
        {announcements.length > 0 && (
          <div className="mb-8 sm:mb-10 space-y-4" data-testid="student-announcements">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-heading font-bold text-xl sm:text-2xl flex items-center gap-2">
                <Megaphone className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={2.5} />
                Avisos
                <span className="nb-badge bg-violet-200 ml-1">{announcements.length}</span>
              </h2>
            </div>

            {/* Special Announcements - Highly Highlighted & Prominent */}
            {specialAnnouncements.length > 0 && (
              <div className="space-y-3" data-testid="student-special-announcements">
                {specialAnnouncements.map((a, i) => (
                  <div
                    key={a.id}
                    className="nb-card p-4 sm:p-6 bg-gradient-to-br from-amber-200 via-amber-100 to-yellow-200 border-3 border-amber-600 shadow-[6px_6px_0px_0px_rgba(217,119,6,0.8)] nb-fade-in relative overflow-hidden"
                    style={{ animationDelay: `${i * 50}ms` }}
                    data-testid={`student-special-announcement-${a.id}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 nb-card flex items-center justify-center bg-black text-amber-300 flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]">
                          <Star className="w-5 h-5 sm:w-6 sm:h-6 fill-amber-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="bg-black text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-[1px_1px_0px_0px_rgba(0,0,0,0.3)]">
                              ⭐ Aviso Especial
                            </span>
                            <span className="text-[11px] text-amber-950 font-bold">{formatDateBR(a.created_at)}</span>
                          </div>
                          <h3 className="font-heading font-black text-lg sm:text-xl leading-tight text-neutral-900 mb-2">
                            {a.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed mb-3 bg-white/75 p-3 rounded-lg border border-amber-900/10">
                            {a.message}
                          </p>
                          <AnnouncementComments announcementId={a.id} />
                        </div>
                      </div>

                      <button
                        onClick={() => setSpecialModalAnnouncement(a)}
                        className="nb-btn bg-white hover:bg-amber-50 px-3.5 py-2 text-xs sm:text-sm font-bold flex items-center gap-1.5 self-start flex-shrink-0 border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                        data-testid={`open-special-announcement-popup-${a.id}`}
                        title="Abrir em pop-up elegante"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Ver em Pop-up</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Regular Announcements */}
            {regularAnnouncements.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4" data-testid="student-regular-announcements">
                {regularAnnouncements.map((a, i) => (
                  <div
                    key={a.id}
                    className="nb-card p-4 sm:p-5 bg-violet-100 nb-fade-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                    data-testid={`student-announcement-${a.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 nb-card flex items-center justify-center bg-violet-300 flex-shrink-0">
                        <Megaphone className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading font-bold text-base sm:text-lg leading-tight mb-1">{a.title}</h3>
                        <p className="text-xs sm:text-sm text-neutral-800 whitespace-pre-wrap mb-2">{a.message}</p>
                        <span className="text-[11px] text-neutral-600 font-medium">{formatDateBR(a.created_at)}</span>
                        <AnnouncementComments announcementId={a.id} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-6 sm:mb-8 max-w-2xl">
          <StatCard label="Total" value={total} bg="bg-sky-200" testId="stat-total" />
          <StatCard label="Pendentes" value={pending} bg="bg-amber-200" testId="stat-pending" />
          <StatCard label="Concluídas" value={done} bg="bg-emerald-200" testId="stat-done" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6 items-center">
          <div className="flex items-center gap-1 text-xs sm:text-sm font-bold mr-1">
            <Filter className="w-3.5 h-3.5" /> Filtrar:
          </div>
          {[["todas", "Todas"], ["pendentes", "Pendentes"], ["concluidas", "Concluídas"]].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`nb-btn px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm ${filter === k ? "bg-sky-400" : "bg-white"}`}
              data-testid={`filter-${k}`}
            >
              {label}
            </button>
          ))}
          {subjects.length > 1 && (
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="nb-btn bg-white px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm cursor-pointer"
              data-testid="subject-filter"
            >
              {subjects.map((s) => (
                <option key={s} value={s}>{s === "todas" ? "Todas as matérias" : s}</option>
              ))}
            </select>
          )}
          <div className="w-full sm:w-auto sm:ml-auto flex gap-2 mt-1 sm:mt-0">
            <button
              onClick={() => setView("cards")}
              className={`nb-btn px-3 py-1.5 sm:py-2 text-xs sm:text-sm flex items-center gap-1.5 ${view === "cards" ? "bg-sky-400" : "bg-white"}`}
              data-testid="view-cards"
            >
              <LayoutGrid className="w-4 h-4" /> Cartões
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`nb-btn px-3 py-1.5 sm:py-2 text-xs sm:text-sm flex items-center gap-1.5 ${view === "calendar" ? "bg-amber-300" : "bg-white"}`}
              data-testid="view-calendar"
            >
              <CalendarDays className="w-4 h-4" /> Calendário
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-neutral-500 text-sm">Carregando...</p>
        ) : view === "calendar" ? (
          <TaskCalendar tasks={filtered} />
        ) : filtered.length === 0 ? (
          <div className="nb-card bg-white p-8 sm:p-12 text-center max-w-xl mx-auto">
            <div className="w-12 h-12 nb-card bg-amber-100 mx-auto mb-3 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-lg sm:text-xl mb-1">
              {tasks.length === 0 ? "Nenhuma tarefa por enquanto" : "Nada por aqui"}
            </h3>
            <p className="text-neutral-600 text-xs sm:text-sm">
              {tasks.length === 0
                ? "Quando seu professor criar tarefas, elas aparecerão aqui."
                : "Tente alterar os filtros."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {filtered.map((t, i) => (
              <StudentTaskCard
                key={t.id}
                task={t}
                onToggle={() => toggle(t)}
                onAskDoubt={(task) => setChatTask(task)}
                index={i}
              />
            ))}
          </div>
        )}
        </>)}
      </div>

      {/* Special Announcement Pop-up Modal (appears automatically once on app load or on demand) */}
      <SpecialAnnouncementModal
        announcement={specialModalAnnouncement}
        isOpen={Boolean(specialModalAnnouncement)}
        onClose={handleCloseSpecialModal}
      />

      {/* AI Chat Dialog specifically bound to a task and its gabarito */}
      {chatTask && (
        <AIChatDialog
          open={Boolean(chatTask)}
          onClose={() => setChatTask(null)}
          taskId={chatTask.id}
          taskTitle={chatTask.title}
          sessionKey={`ai_chat_task_${chatTask.id}`}
          title={`Tira-dúvida: ${chatTask.title}`}
          initialAssistantMessage={
            chatTask.has_ai_source || chatTask.answer_source || chatTask.answer
              ? `Olá! Estou pronto para tirar suas dúvidas sobre "${chatTask.title}" (${chatTask.subject}). Tenho acesso ao enunciado e ao material oficial. Me conta o que você gostaria de entender melhor!`
              : `Olá! Estou aqui para te ajudar a compreender os conceitos de "${chatTask.title}" (${chatTask.subject}). Como posso te orientar no raciocínio desta atividade?`
          }
        />
      )}

      {/* AI Chat Dialog general */}
      <AIChatDialog
        open={globalChatOpen}
        onClose={() => setGlobalChatOpen(false)}
        sessionKey="ai_chat_student_global"
        title="Tira-dúvida Edutask"
        initialAssistantMessage="Oi! Sou seu tutor Edutask. Tenho acesso a todas as suas tarefas, aos gabaritos oficiais e ao seu perfil. Me conta o que você quer aprender ou tirar dúvida hoje!"
      />
    </div>
  );
}

function StatCard({ label, value, bg, testId }) {
  const { user } = useAuth();
  const isMinecraft = user?.equipped_effect === "minecraft";

  if (isMinecraft) {
    let mcBg = "bg-[#828282] text-white border-4 border-[#1a0f0a]";
    let iconSquare = "🪨";
    if (label === "Pendentes") {
      mcBg = "bg-[#c29b68] text-black border-4 border-[#1a0f0a]";
      iconSquare = "🪵";
    } else if (label === "Concluídas") {
      mcBg = "bg-[#3f2b18] text-white border-4 border-[#1a0f0a]";
      iconSquare = "📦";
    }

    return (
      <div className={`p-3.5 sm:p-4 rounded-xl font-minecraft shadow-[inset_2px_2px_0_rgba(255,255,255,0.3),inset_-2px_-2px_0_rgba(0,0,0,0.5),4px_4px_0_#000] flex items-center justify-between ${mcBg}`} data-testid={testId}>
        <div>
          <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">{label}</div>
          <div className="font-black text-2xl sm:text-4xl mt-0.5">{value}</div>
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-black/30 border-2 border-black/50 rounded flex items-center justify-center text-xl sm:text-2xl shadow-inner">
          {iconSquare}
        </div>
      </div>
    );
  }

  return (
    <div className={`nb-card p-4 ${bg}`} data-testid={testId}>
      <div className="text-xs font-bold uppercase tracking-wider">{label}</div>
      <div className="font-heading font-black text-3xl sm:text-4xl mt-1">{value}</div>
    </div>
  );
}

function StudentTaskCard({ task, onToggle, onAskDoubt, index }) {
  const { user } = useAuth();
  const { enabled: aiEnabled } = useAIStatus();
  const isMinecraft = user?.equipped_effect === "minecraft";
  const hasAiSource = Boolean(
    task.has_ai_source ||
    (task.answer_source && task.answer_source.trim()) ||
    (task.answer && task.answer.trim()) ||
    (task.admin_photos && task.admin_photos.length > 0)
  );
  const days = daysUntil(task.due_date);
  const priority = getPriority(task.due_date, task.completed);
  let dueLabel = formatDateBR(task.due_date);
  let dueBg = "bg-white";
  if (!task.completed && days != null) {
    if (days < 0) { dueLabel = `Atrasada (${Math.abs(days)}d)`; dueBg = "bg-red-200"; }
    else if (days === 0) { dueLabel = "Entrega hoje!"; dueBg = "bg-amber-200"; }
    else if (days <= 2) { dueLabel = `Em ${days} dia${days > 1 ? "s" : ""}`; dueBg = "bg-amber-100"; }
  }

  return (
    <div
      className={
        isMinecraft
          ? `border-4 border-[#1a0f0a] rounded-xl bg-[#e5c593] shadow-[inset_2px_2px_0_rgba(255,255,255,0.4),inset_-2px_-2px_0_rgba(0,0,0,0.5),4px_4px_0_#000] p-4 sm:p-5 nb-fade-in flex flex-col justify-between font-minecraft text-[#181109] relative overflow-hidden ${task.completed ? "opacity-80 brightness-95" : ""}`
          : `nb-card nb-card-hover p-4 sm:p-6 nb-fade-in flex flex-col justify-between ${task.completed ? "opacity-75" : ""}`
      }
      style={{ animationDelay: `${index * 60}ms` }}
      data-testid={`student-task-card-${task.id}`}
    >
      {/* Decorative Minecraft Corner Icons matching Screenshot 3 */}
      {isMinecraft && (
        <>
          <div className="absolute top-2.5 right-2.5 flex items-center gap-0.5 z-10">
            <span className="text-xs">❤️</span>
            <span className="text-xs">❤️</span>
            <span className="text-xs">🖤</span>
          </div>
          <div className="absolute bottom-2 left-2 text-xs opacity-75 z-10 pointer-events-none">
            ⛏️
          </div>
          <div className="absolute bottom-2 right-2 text-xs opacity-75 z-10 pointer-events-none">
            ⚔️
          </div>
        </>
      )}

      <div>
        <div className="flex items-center gap-2 mb-2 sm:mb-3 flex-wrap">
          {isMinecraft ? (
            <span className="px-3 py-1 bg-[#a8e6cf] border-2 border-black font-minecraft text-xs font-bold text-black rounded-full uppercase shadow-xs">
              {task.subject}
            </span>
          ) : (
            <span className={`nb-badge ${colorFor(task.subject)}`}>{task.subject}</span>
          )}

          {isMinecraft ? (
            <span className={`px-3 py-1 border-2 border-black font-minecraft text-xs font-bold text-black rounded-full uppercase shadow-xs flex items-center gap-1 ${
              priority.label === "Alta" || priority.label === "Urgente" ? "bg-[#ff7675]" : "bg-[#82ccdd]"
            }`} data-testid={`student-task-priority-${task.id}`}>
              {priority.icon || "📌"} {priority.label}
            </span>
          ) : (
            <span className={`nb-badge ${priority.bg}`} data-testid={`student-task-priority-${task.id}`}>
              {priority.icon} {priority.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs mb-2 sm:mb-3 flex-wrap">
          {isMinecraft ? (
            <span className="px-2.5 py-0.5 bg-white border-2 border-black font-minecraft text-xs font-bold text-black rounded-full shadow-xs">
              📅 {dueLabel}
            </span>
          ) : (
            <span className={`nb-badge ${dueBg}`}>
              <CalendarIcon className="w-3 h-3 inline mr-1 -mt-0.5" /> {dueLabel}
            </span>
          )}

          {task.points > 0 && (
            isMinecraft ? (
              <span className="px-2.5 py-0.5 bg-[#fbc531] border-2 border-black font-minecraft text-xs font-bold text-black rounded-full shadow-xs" data-testid={`task-points-${task.id}`}>
                +{task.points} PTS
              </span>
            ) : (
              <span className="nb-badge bg-amber-200" data-testid={`task-points-${task.id}`}>
                +{task.points} pts
              </span>
            )
          )}
        </div>

        <h3 className={`${isMinecraft ? "font-minecraft text-black font-black text-lg sm:text-xl" : "font-heading font-bold text-lg sm:text-xl"} mb-1 leading-tight ${task.completed ? "line-through opacity-75" : ""}`}>
          {task.title}
        </h3>
        <p className={`text-xs sm:text-sm ${isMinecraft ? "text-[#2d1d0f] font-minecraft font-bold" : "text-neutral-700"} mb-3 whitespace-pre-wrap`}>
          {task.description}
        </p>

        {task.attachments?.length > 0 && (
          <div className="mb-3 space-y-1.5">
            <div className={`text-[10px] font-bold ${isMinecraft ? "text-[#543d2b] font-minecraft" : "text-neutral-600"} uppercase tracking-wide`}>
              Anexos
            </div>
            {task.attachments.map((a) => (
              <div key={a.id} className={isMinecraft ? "p-2 bg-black/10 border-2 border-black rounded flex items-center gap-2" : ""}>
                <AttachmentLink file={a} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2 relative z-20">
        <button
          onClick={onToggle}
          className={
            isMinecraft
              ? `w-full px-3 py-2.5 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold cursor-pointer rounded border-2 border-black font-minecraft transition-transform active:translate-y-0.5 ${
                  task.completed
                    ? "bg-[#747d8c] text-white shadow-[inset_0_2px_0_#a4b0be,0_3px_0_#2f3542,0_4px_0_#000]"
                    : "bg-[#2ed573] text-black shadow-[inset_0_2px_0_#7bed9f,0_3px_0_#26af5f,0_4px_0_#000]"
                }`
              : `nb-btn w-full px-3 py-2 sm:py-2.5 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold ${task.completed ? "bg-white" : "bg-emerald-300"}`
          }
          data-testid={`toggle-complete-${task.id}`}
        >
          <Check className="w-4 h-4" strokeWidth={3} />
          {task.completed ? "Desmarcar" : "Marcar como concluída"}
        </button>

        {hasAiSource && <StudentAnswerSection task={task} aiEnabled={aiEnabled} isMinecraft={isMinecraft} />}

        {!useAIStatus().hidden && !useAIStatus().aiHidden && (
          <button
            onClick={() => {
              if (!aiEnabled) {
                toast.error("A Inteligência Artificial foi desativada temporariamente pelo administrador.");
                return;
              }
              onAskDoubt(task);
            }}
            disabled={!aiEnabled}
            className={
              isMinecraft
                ? "w-full px-2.5 py-2 flex items-center justify-center gap-1.5 text-xs font-bold rounded cursor-pointer bg-[#747d8c] hover:bg-[#a4b0be] border-2 border-black text-white font-minecraft shadow-[inset_0_2px_0_#a4b0be,0_3px_0_#2f3542,0_4px_0_#000]"
                : `nb-btn w-full px-2.5 py-1.5 sm:py-2 flex items-center justify-center gap-1.5 text-xs font-bold ${
                    !aiEnabled
                      ? "bg-neutral-200 text-neutral-500 border-neutral-400 cursor-not-allowed opacity-60"
                      : "bg-violet-100 hover:bg-violet-200 text-violet-950"
                  }`
            }
            data-testid={`ask-doubt-${task.id}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span>Tirar dúvida desta tarefa (IA)</span>
          </button>
        )}
      </div>
    </div>
  );
}

const cleanAnswerText = (text) => {
  if (!text) return "";
  return text
    .replace(/^#+\s*/gm, "")
    .replace(/#+/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/^[ \t]*(?:Explicação|Resolução|Passo a passo|Justificativa):\s*/gim, "")
    .trim();
};

function StudentAnswerSection({ task, aiEnabled = true, isMinecraft = false }) {
  const { hidden: aiHidden, aiHidden: aiHiddenAlt } = useAIStatus();
  const [open, setOpen] = useState(false);
  const [selectedLength, setSelectedLength] = useState(task.generated_answer?.length || "medium");
  const [answer, setAnswer] = useState(
    cleanAnswerText(task.generated_answer?.answer || task.answer || "")
  );
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  if (aiHidden || aiHiddenAlt) {
    return null;
  }

  const lengthLabels = {
    short: "Curto",
    medium: "Médio",
    detailed: "Detalhado",
  };

  const handleGenerate = async (len = selectedLength) => {
    if (!aiEnabled) {
      toast.error("IA desativada temporariamente pelo administrador.");
      return;
    }
    setGenerating(true);
    try {
      const { data } = await api.post(`/tasks/${task.id}/generate-answer`, { length: len });
      const sanitized = cleanAnswerText(data.answer || "");
      setAnswer(sanitized);
      setSelectedLength(data.length || len);
      toast.success(`Gabarito (${lengthLabels[len] || len}) gerado! ✨`);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao gerar resposta");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!answer) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(answer);
      } else {
        const ta = document.createElement("textarea");
        ta.value = answer;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      toast.success("Copiado para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  if (!aiEnabled) {
    return (
      <button
        disabled={true}
        className="nb-btn w-full px-3 py-2 flex items-center justify-center gap-2 bg-neutral-200 text-neutral-500 border-neutral-400 cursor-not-allowed opacity-60 text-xs font-bold"
        data-testid={`reveal-answer-disabled-${task.id}`}
        title="Gabarito com IA desativado pelo administrador"
      >
        <Lock className="w-4 h-4 text-neutral-500" />
        <span>Gabarito com IA (Bloqueado)</span>
      </button>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          if (!answer) {
            handleGenerate(selectedLength);
          }
        }}
        className={
          isMinecraft
            ? "w-full px-3 py-2 flex items-center justify-center gap-2 bg-white hover:bg-neutral-50 text-xs font-bold text-black border-2 border-black font-minecraft shadow-[0_4px_0_#c0c0c0,0_5px_0_#000] rounded cursor-pointer"
            : "nb-btn w-full px-3 py-2 flex items-center justify-center gap-2 bg-white hover:bg-amber-100 text-xs font-bold text-neutral-900 border-2 border-black"
        }
        data-testid={`reveal-answer-${task.id}`}
      >
        <Sparkles className="w-4 h-4 text-violet-600" />
        <span>{answer ? "Ver gabarito da tarefa" : "Gerar gabarito com IA"}</span>
      </button>
    );
  }

  return (
    <div
      className="nb-card bg-white p-3.5 sm:p-4 text-xs space-y-3 nb-fade-in border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
      data-testid={`answer-section-${task.id}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-black/10 pb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="w-4 h-4 text-violet-600 flex-shrink-0" />
          <span className="font-heading font-black text-xs sm:text-sm uppercase tracking-wider text-neutral-900 truncate">
            Gabarito da Tarefa
          </span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="nb-btn bg-white hover:bg-neutral-100 px-2 py-0.5 text-[10px] font-bold border border-black"
          data-testid={`hide-answer-${task.id}`}
        >
          Ocultar
        </button>
      </div>

      {/* Segmented Control - Seletor de Tamanho Clean Neobrutalista */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-neutral-700">
          <span>Tamanho do gabarito:</span>
          {generating && (
            <span className="text-amber-800 flex items-center gap-1 font-bold text-[10px]">
              <Loader2 className="w-3 h-3 animate-spin" /> Gerando {lengthLabels[selectedLength]}...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-lg border border-black/20">
          {[
            { key: "short", label: "⚡ Curto" },
            { key: "medium", label: "📝 Médio" },
            { key: "detailed", label: "📚 Detalhado" },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              disabled={generating}
              onClick={() => {
                if (selectedLength !== opt.key || !answer) {
                  setSelectedLength(opt.key);
                  handleGenerate(opt.key);
                }
              }}
              className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 ${
                selectedLength === opt.key
                  ? "bg-amber-300 text-neutral-950 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-transparent text-neutral-700 hover:text-black hover:bg-white/60"
              }`}
              data-testid={`select-length-${opt.key}-${task.id}`}
            >
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Caixa de Texto do Gabarito - A resposta anterior NÃO some enquanto gera outra */}
      {answer ? (
        <div className="space-y-2">
          <div className="relative">
            <div
              className={`bg-neutral-50 rounded-lg border border-black/20 p-3 text-xs sm:text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto font-sans transition-opacity ${
                generating ? "opacity-60" : "opacity-100"
              }`}
            >
              {answer}
            </div>
            {generating && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-lg">
                <div className="bg-white px-3 py-1.5 rounded-md border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 text-xs font-bold text-neutral-900">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  <span>Atualizando resposta...</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-[10px] text-neutral-500 font-medium">
              ✨ Gabarito gerado com base no enunciado e fotos
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="nb-btn bg-white hover:bg-amber-50 px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 text-neutral-900 border border-black"
              data-testid={`copy-answer-${task.id}`}
            >
              {copied ? <CheckCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? "Copiado!" : "Copiar"}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 bg-neutral-50 rounded-lg border border-black/15 space-y-2">
          {generating ? (
            <div className="flex flex-col items-center justify-center py-2 text-neutral-600 space-y-1">
              <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
              <span className="text-xs font-bold text-neutral-800">Elaborando gabarito...</span>
            </div>
          ) : (
            <>
              <p className="text-xs text-neutral-600">Clique para gerar o gabarito no tamanho desejado.</p>
              <button
                type="button"
                onClick={() => handleGenerate(selectedLength)}
                className="nb-btn bg-amber-300 hover:bg-amber-400 px-4 py-1.5 text-xs font-bold border border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                Gerar Gabarito Agora
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AttachmentLink({ file }) {
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : "";
  const url = `${API}/files/${file.id}/download?auth=${encodeURIComponent(token || "")}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 nb-card bg-amber-50 hover:bg-amber-100 px-3 py-1.5 text-xs font-medium"
      data-testid={`attachment-${file.id}`}
    >
      <Paperclip className="w-3.5 h-3.5" />
      <span className="truncate">{file.original_filename}</span>
    </a>
  );
}
