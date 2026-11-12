import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Paperclip, Check, BookOpen, Filter, Megaphone, LayoutGrid, CalendarDays, Sparkles, ShoppingBag, BarChart3, HelpCircle, Star, ExternalLink, Image as ImageIcon, Loader2, Copy, CheckCheck, FileText, ChevronDown, ChevronUp, Lock, Bot, Coins, RotateCcw, Scissors, Gem, Link2, Zap, X, Download, Smartphone, Bell, BellRing, BellOff } from "lucide-react";
import api, { API, formatApiError } from "@/lib/api";
import { firebaseService } from "@/lib/firebaseService";
import { useAuth } from "@/context/AuthContext";
import { useAIStatus } from "@/context/AIStatusContext";
import { usePWA } from "@/context/PWAContext";
import AppHeader from "@/components/AppHeader";
import MyProfileBanner from "@/components/MyProfileBanner";
import AnnouncementComments from "@/components/AnnouncementComments";
import TaskCalendar from "@/components/TaskCalendar";
import PrizeBanner from "@/components/PrizeBanner";
import AIDailySummary from "@/components/AIDailySummary";
import StoreEffects from "@/components/StoreEffects";
import StudentAIStatsView from "@/components/StudentAIStatsView";
import StudentResumosPanel from "@/components/StudentResumosPanel";
import AIChatDialog from "@/components/AIChatDialog";
import SpecialAnnouncementModal from "@/components/SpecialAnnouncementModal";
import AppDeactivatedScreen from "@/components/AppDeactivatedScreen";
import MobileBottomNav from "@/components/MobileBottomNav";
import { getButtonColorStyle } from "@/components/StudentButtonsPanel";
import { getPriority, formatDateBR, daysUntil } from "@/lib/priority";
import { fireConfetti } from "@/lib/celebrate";
import { getTheme } from "@/lib/themes";
import { pullScreenToStore } from "@/lib/effects";

import FormattedGabaritoViewer from "@/components/FormattedGabaritoViewer";
import { colorFor, setCachedSubjects, getSubjectBadgeClass, getSubjectColorConfig } from "@/lib/subjectColors";

function BotSandboxBanner({ onPointsUpdated }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

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
        </div>
      </div>

      {/* Cortes explicativos */}
      <div className="mt-3 pt-3 border-t border-cyan-800/20 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-neutral-800 bg-white/70 p-1.5 border border-black/30 font-medium">
          <Scissors className="w-3.5 h-3.5 text-cyan-900 flex-shrink-0" />
          <span className="font-black text-cyan-950">Corte 1:</span> Fora do ranking e prêmio mensal da IA
        </div>
        <div className="flex items-center gap-1.5 text-neutral-800 bg-white/70 p-1.5 border border-black/30 font-medium">
          <Scissors className="w-3.5 h-3.5 text-cyan-900 flex-shrink-0" />
          <span className="font-black text-cyan-950">Corte 2:</span> Bloqueado de disparos de WhatsApp
        </div>
        <div className="flex items-center gap-1.5 text-neutral-800 bg-white/70 p-1.5 border border-black/30 font-medium">
          <Scissors className="w-3.5 h-3.5 text-cyan-900 flex-shrink-0" />
          <span className="font-black text-cyan-950">Corte 3:</span> Não afeta médias gerais da turma
        </div>
      </div>
    </div>
  );
}

function StudentAnnouncementsView({ announcements, specialAnnouncements, regularAnnouncements, onOpenSpecialModal }) {
  return (
    <div className="space-y-6" data-testid="student-announcements-panel">
      <div className="flex items-center justify-between gap-2 border-b-2 border-black/10 pb-3">
        <div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl flex items-center gap-2 text-black">
            <Megaphone className="w-7 h-7 text-violet-700" strokeWidth={2.5} />
            Avisos da Escola
          </h1>
        </div>
        <span className="nb-badge bg-violet-300 text-violet-950 text-xs font-black px-3 py-1 border-2 border-black shadow-[2px_2px_0_0_#000]">
          {announcements.length} aviso(s)
        </span>
      </div>

      {announcements.length === 0 ? (
        <div className="nb-card bg-white p-8 sm:p-12 text-center max-w-xl mx-auto border-2 border-black shadow-[4px_4px_0_0_#000]">
          <div className="w-12 h-12 nb-card bg-violet-100 mx-auto mb-3 flex items-center justify-center border-2 border-black">
            <Megaphone className="w-6 h-6 text-violet-800" />
          </div>
          <h3 className="font-heading font-black text-lg sm:text-xl mb-1 text-black">
            Nenhum aviso por enquanto
          </h3>
          <p className="text-neutral-600 text-xs sm:text-sm font-bold">
            Quando seu professor publicar novos comunicados, eles aparecerão nesta aba.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {specialAnnouncements.length > 0 && (
            <div className="space-y-3" data-testid="student-special-announcements">
              <h2 className="font-heading font-black text-sm uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-600 fill-amber-400" />
                <span>Avisos Especiais em Destaque</span>
              </h2>
              {specialAnnouncements.map((a, i) => (
                <div
                  key={a.id}
                  className="nb-card p-4 sm:p-6 bg-gradient-to-br from-amber-200 via-amber-100 to-yellow-200 border-3 border-amber-600 shadow-[6px_6px_0px_0px_rgba(217,119,6,0.8)] nb-fade-in relative overflow-hidden"
                  style={{ animationDelay: `${Math.min(i, 7) * 30}ms` }}
                  data-testid={`student-special-announcement-${a.id}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 nb-card flex items-center justify-center bg-black text-amber-300 flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]">
                        <Star className="w-5 h-5 sm:w-6 sm:h-6 fill-amber-300" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="bg-black text-white text-[10px] sm:text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-[1px_1px_0px_0px_rgba(0,0,0,0.3)] inline-flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
                            <span>Aviso Especial</span>
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
                      type="button"
                      onClick={() => onOpenSpecialModal(a)}
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

          {regularAnnouncements.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-heading font-black text-sm uppercase tracking-wider text-neutral-800 flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-violet-700" />
                <span>Comunicados</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4" data-testid="student-regular-announcements">
                {regularAnnouncements.map((a, i) => (
                  <div
                    key={a.id}
                    className="nb-card p-4 sm:p-5 bg-violet-100 nb-fade-in border-2 border-black shadow-[4px_4px_0_0_#000]"
                    style={{ animationDelay: `${Math.min(i, 7) * 30}ms` }}
                    data-testid={`student-announcement-${a.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 nb-card flex items-center justify-center bg-violet-300 flex-shrink-0 border-2 border-black">
                        <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 text-violet-950" strokeWidth={2.5} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-heading font-bold text-base sm:text-lg leading-tight mb-1 text-black">{a.title}</h3>
                        <p className="text-xs sm:text-sm text-neutral-800 whitespace-pre-wrap mb-2">{a.message}</p>
                        <span className="text-[11px] text-neutral-600 font-bold">{formatDateBR(a.created_at)}</span>
                        <AnnouncementComments announcementId={a.id} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const { enabled: aiEnabled, hidden: aiHidden, framesDisabled } = useAIStatus();
  const {
    canInstallOrGuide,
    installApp,
    pushSupported,
    pushPermission,
    pushSubscribed,
    pushLoading,
    requiresIOSInstallForPush,
    enablePush,
    disablePush,
    testPush,
  } = usePWA();
  const [searchParams] = useSearchParams();
  const initialTab = (() => {
    const t = searchParams.get("tab");
    return ["tasks", "announcements", "resumos", "store", "profile", "stats"].includes(t) ? t : "tasks";
  })();
  const [tasks, setTasks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("todas");
  const [subjectFilter, setSubjectFilter] = useState("todas");
  const [view, setView] = useState("cards"); // "cards" | "calendar"
  const [tab, setTab] = useState(initialTab); // "tasks" | "store" | "stats"
  const [chatTask, setChatTask] = useState(null);
  const [globalChatOpen, setGlobalChatOpen] = useState(false);
  const [specialModalAnnouncement, setSpecialModalAnnouncement] = useState(null);
  const [customButtons, setCustomButtons] = useState([]);
  const [annualCycle, setAnnualCycle] = useState(null);

  const [loadError, setLoadError] = useState(null);
  const [isOfflineData, setIsOfflineData] = useState(false);

  const [seenAnnIds, setSeenAnnIds] = useState(() => {
    if (!user?.id) return [];
    try {
      const stored = localStorage.getItem(`edutask_seen_ann_ids_${user.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!user?.id) return;
    try {
      const stored = localStorage.getItem(`edutask_seen_ann_ids_${user.id}`);
      setSeenAnnIds(stored ? JSON.parse(stored) : []);
    } catch {
      setSeenAnnIds([]);
    }
  }, [user?.id]);

  const unreadAnnouncementsCount = useMemo(() => {
    if (!announcements || announcements.length === 0) return 0;
    const seenSet = new Set(seenAnnIds);
    return announcements.filter((a) => !seenSet.has(a.id)).length;
  }, [announcements, seenAnnIds]);

  const hasUnreadAnnouncements = unreadAnnouncementsCount > 0;

  const markAnnouncementsAsSeen = useCallback(() => {
    if (!user?.id || !announcements || announcements.length === 0) return;
    const allIds = announcements.map((a) => a.id);
    setSeenAnnIds(allIds);
    try {
      localStorage.setItem(`edutask_seen_ann_ids_${user.id}`, JSON.stringify(allIds));
    } catch {}
  }, [user?.id, announcements]);

  useEffect(() => {
    if (tab === "announcements" && hasUnreadAnnouncements) {
      markAnnouncementsAsSeen();
    }
  }, [tab, hasUnreadAnnouncements, markAnnouncementsAsSeen]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id) return; // Prevent race condition when auth profile is not yet loaded
    if (!silent) setLoading(true);
    setLoadError(null);
    try {
      const [{ data: t }, { data: a }, btnRes, statusRes, subjRes] = await Promise.all([
        api.get("/tasks"),
        api.get("/announcements"),
        api.get("/student-buttons").catch(() => ({ data: [] })),
        api.get("/app-status").catch(() => ({ data: null })),
        api.get("/subjects").catch(() => ({ data: [] })),
      ]);
      setTasks(t || []);
      setAnnouncements(a || []);
      setCustomButtons(btnRes?.data || []);
      if (subjRes?.data && Array.isArray(subjRes.data)) {
        setCachedSubjects(subjRes.data);
      }
      if (statusRes?.data?.annual_cycle) {
        setAnnualCycle(statusRes.data.annual_cycle);
      }
      setIsOfflineData(false);
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
          .filter((t) => {
            const validAssigned = (t.assigned_to || []).filter((id) => id && typeof id === "string" && id.trim().length > 0);
            if (validAssigned.length === 0) return true;
            return validAssigned.some((id) => String(id).trim() === String(currentUserId).trim());
          })
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
        setIsOfflineData(true);
      } catch (e2) {
        const msg = formatApiError(e?.response?.data?.detail || e2?.message) || "Erro ao conectar com o banco de dados";
        setLoadError(msg);
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

  // Subscrições em Tempo Real com Limpeza Garantida (onSnapshot Unsubscribe Cleanup)
  useEffect(() => {
    if (!user?.id) return;

    let unsubTasks = null;
    let unsubAnnouncements = null;

    try {
      unsubTasks = firebaseService.subscribeToTasks(
        user.id,
        (remoteTasks, fromCache) => {
          setIsOfflineData(fromCache);
          const currentUserId = user.id;
          setTasks((prevTasks) => {
            const prevCompletionsMap = new Map();
            prevTasks.forEach((pt) => {
              if (pt.completed) {
                prevCompletionsMap.set(pt.id, {
                  completed_at: pt.completed_at,
                  points_awarded: pt.points_awarded,
                });
              }
            });

            return (remoteTasks || [])
              .filter((t) => {
                const validAssigned = (t.assigned_to || []).filter((id) => id && typeof id === "string" && id.trim().length > 0);
                if (validAssigned.length === 0) return true;
                return validAssigned.some((id) => String(id).trim() === String(currentUserId).trim());
              })
              .map((t) => {
                const prevComp = prevCompletionsMap.get(t.id);
                return {
                  ...t,
                  completed: t.completed !== undefined ? Boolean(t.completed) : Boolean(prevComp),
                  completed_at: t.completed_at || prevComp?.completed_at,
                  points_awarded: t.points_awarded || prevComp?.points_awarded,
                };
              });
          });
        },
        (err) => {
          console.warn("[StudentDashboard] Fallback em erro de subscription tasks:", err);
        }
      );

      unsubAnnouncements = firebaseService.subscribeToAnnouncements(
        user.id,
        (remoteAnn, fromCache) => {
          setIsOfflineData(fromCache);
          setAnnouncements(remoteAnn || []);
        },
        (err) => {
          console.warn("[StudentDashboard] Fallback em erro de subscription announcements:", err);
        }
      );
    } catch (err) {
      console.warn("[StudentDashboard] Não foi possível iniciar snapshot listeners:", err);
    }

    return () => {
      if (unsubTasks) unsubTasks();
      if (unsubAnnouncements) unsubAnnouncements();
    };
  }, [user?.id]);

  // Listener para auto-atualização de tarefas quando criadas/modificadas pelo professor ou ao focar a aba
  const lastFocusRefreshRef = useRef(0);
  useEffect(() => {
    const handleTasksUpdated = () => load({ silent: true });
    const handleFocusRefresh = () => {
      const now = Date.now();
      if (now - lastFocusRefreshRef.current < 15000) return;
      lastFocusRefreshRef.current = now;
      load({ silent: true });
    };
    window.addEventListener("tasks-updated", handleTasksUpdated);
    window.addEventListener("focus", handleFocusRefresh);
    return () => {
      window.removeEventListener("tasks-updated", handleTasksUpdated);
      window.removeEventListener("focus", handleFocusRefresh);
    };
  }, [load]);

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
    const list = Array.isArray(announcements) ? announcements : [];
    if (!user?.id || list.length === 0) return;
    const unseenSpecial = list.find((a) => {
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
    const list = Array.isArray(announcements) ? announcements : [];
    return list.filter((a) => a.is_special);
  }, [announcements]);

  const regularAnnouncements = useMemo(() => {
    const list = Array.isArray(announcements) ? announcements : [];
    return list.filter((a) => !a.is_special);
  }, [announcements]);

  const subjects = useMemo(() => {
    const s = new Set(tasks.map((t) => t.subject));
    return ["todas", ...Array.from(s)];
  }, [tasks]);

  const filtered = useMemo(() => {
    const list = tasks.filter((t) => {
      if (subjectFilter !== "todas" && t.subject !== subjectFilter) return false;
      if (filter === "pendentes" && t.completed) return false;
      if (filter === "concluidas" && !t.completed) return false;
      return true;
    });
    // Ordenar pendentes primeiro (por prazo), depois concluídas
    return [...list].sort((a, b) => {
      if (Boolean(a.completed) !== Boolean(b.completed)) {
        return a.completed ? 1 : -1;
      }
      const da = daysUntil(a.due_date) ?? 9999;
      const db = daysUntil(b.due_date) ?? 9999;
      return da - db;
    });
  }, [tasks, filter, subjectFilter]);

  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const pending = total - done;

  const [pendingToggles, setPendingToggles] = useState({});

  const toggle = async (task) => {
    if (pendingToggles[task.id]) return;
    setPendingToggles((prev) => ({ ...prev, [task.id]: true }));

    const handleUndo = async () => {
      try {
        await api.post(`/tasks/${task.id}/uncomplete`);
        toast.info("Conclusão desfeita!", { description: task.title });
        load({ silent: true });
        window.dispatchEvent(new CustomEvent("task-completed"));
        window.dispatchEvent(new CustomEvent("tasks-updated"));
        window.dispatchEvent(new CustomEvent("prize-updated"));
        window.dispatchEvent(new Event("profile-updated"));
      } catch (e) {
        try {
          await firebaseService.deleteCompletion(user.id, task.id);
          toast.info("Conclusão desfeita!");
          load({ silent: true });
          window.dispatchEvent(new CustomEvent("task-completed"));
          window.dispatchEvent(new CustomEvent("tasks-updated"));
          window.dispatchEvent(new CustomEvent("prize-updated"));
          window.dispatchEvent(new Event("profile-updated"));
        } catch {
          toast.error("Não foi possível desfazer a conclusão");
        }
      }
    };

    try {
      if (task.completed) {
        await api.post(`/tasks/${task.id}/uncomplete`);
        toast("Tarefa desmarcada", { description: task.title });
      } else {
        const { data } = await api.post(`/tasks/${task.id}/complete`);
        const earned = data?.points_earned || 0;
        const onTime = data?.on_time;
        fireConfetti();

        toast.success(
          earned > 0
            ? `Concluída! +${earned} pts (${onTime ? "No prazo!" : "Com atraso"})`
            : "Tarefa concluída com sucesso!",
          {
            duration: 5000,
            action: {
              label: "Desfazer",
              onClick: handleUndo,
            },
          }
        );
      }
      load({ silent: true });
      window.dispatchEvent(new CustomEvent("task-completed"));
      window.dispatchEvent(new CustomEvent("tasks-updated"));
      window.dispatchEvent(new CustomEvent("prize-updated"));
      window.dispatchEvent(new Event("profile-updated"));
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
          fireConfetti();
          toast.success("Tarefa concluída com sucesso!", {
            duration: 5000,
            action: {
              label: "Desfazer",
              onClick: handleUndo,
            },
          });
        }
        load({ silent: true });
        window.dispatchEvent(new CustomEvent("task-completed"));
        window.dispatchEvent(new CustomEvent("tasks-updated"));
        window.dispatchEvent(new CustomEvent("prize-updated"));
        window.dispatchEvent(new Event("profile-updated"));
      } catch (e2) {
        toast.error(formatApiError(e?.response?.data?.detail) || "Erro ao atualizar status");
      }
    } finally {
      setPendingToggles((prev) => ({ ...prev, [task.id]: false }));
    }
  };

  const handleOpenStore = () => {
    if (framesDisabled) return;
    setTab("store");
    pullScreenToStore();
  };

  const markUpdateRead = async (taskId) => {
    try {
      await api.post(`/tasks/${taskId}/mark-update-read`);
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, has_unread_update: false, update_changes: [] } : t
        )
      );
    } catch {}
  };

  if (annualCycle?.is_closed) {
    return <AppDeactivatedScreen onCheckStatus={load} annualCycle={annualCycle} />;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader title="Minhas tarefas" />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-28 sm:pb-8 relative z-10 page-enter">
        {/* Navigation Bar */}
        <div className="flex items-center gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 scrollbar-none sm:flex-wrap -mx-3 px-3 sm:mx-0 sm:px-0 relative z-20">
          <button
            onClick={() => setTab("tasks")}
            className={`nb-btn px-3.5 sm:px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 ${
              tab === "tasks" ? "bg-sky-400 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-white"
            }`}
            data-testid="student-tab-tasks"
          >
            <Gem className="w-4 h-4 text-cyan-800 flex-shrink-0" />
            <span>Minhas tarefas</span>
          </button>
          <button
            onClick={() => {
              setTab("announcements");
              markAnnouncementsAsSeen();
            }}
            className={`nb-btn px-3.5 sm:px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 transition-all ${
              tab === "announcements"
                ? "bg-violet-300 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                : hasUnreadAnnouncements
                ? "bg-violet-200 border-2 border-violet-950 font-black shadow-[3px_3px_0px_0px_rgba(109,40,217,1)] ring-2 ring-violet-500 animate-pulse"
                : "bg-white"
            }`}
            data-testid="student-tab-announcements"
          >
            <Megaphone className={`w-4 h-4 flex-shrink-0 ${hasUnreadAnnouncements && tab !== "announcements" ? "text-violet-950 animate-bounce" : "text-violet-900"}`} />
            <span>Avisos ({announcements.length})</span>
            {hasUnreadAnnouncements && tab !== "announcements" && (
              <span className="nb-badge bg-red-500 text-white border border-black text-[10px] font-black px-1.5 py-0.5 ml-1 animate-none">
                Novo!
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("resumos")}
            className={`nb-btn px-3.5 sm:px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 ${
              tab === "resumos" ? "bg-yellow-300 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-white"
            }`}
            data-testid="student-tab-resumos"
          >
            <BookOpen className="w-4 h-4 text-yellow-900 flex-shrink-0" />
            <span>Resumos de Estudo</span>
          </button>
          {!framesDisabled && (
            <button
              onClick={handleOpenStore}
              className={`nb-btn px-3.5 sm:px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 ${
                tab === "store" ? "bg-amber-300 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-white"
              }`}
              data-testid="student-tab-store"
            >
              <ShoppingBag className="w-4 h-4 text-amber-900 flex-shrink-0" />
              <span>Loja de Molduras</span>
            </button>
          )}
          <button
            onClick={() => setTab("profile")}
            className={`nb-btn px-3.5 sm:px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 ${
              tab === "profile" ? "bg-emerald-300 font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" : "bg-white"
            }`}
            data-testid="student-tab-profile"
          >
            <Bot className="w-4 h-4 text-emerald-900 flex-shrink-0" />
            <span>Meu Perfil</span>
          </button>
          {!aiHidden && (
            <button
              onClick={() => setTab("stats")}
              className={`nb-btn px-3.5 sm:px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 ${
                tab === "stats" ? "bg-violet-300 font-bold" : "bg-white"
              }`}
              data-testid="student-tab-stats"
            >
              <BarChart3 className="w-4 h-4 text-violet-900 flex-shrink-0" />
              <span>Estatísticas & Líder IA</span>
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
              className={`nb-btn px-3.5 sm:px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 sm:ml-auto ${
                !aiEnabled
                  ? "bg-neutral-200 text-neutral-500 border-neutral-400 cursor-not-allowed opacity-60"
                  : "bg-gradient-to-r from-violet-200 to-pink-200 hover:from-violet-300 hover:to-pink-300"
              }`}
              data-testid="student-tab-chat"
              title={!aiEnabled ? "IA desativada temporariamente" : "Tirar Dúvidas com IA"}
            >
              <Sparkles className="w-4 h-4 text-pink-700 flex-shrink-0" />
              <span>Tirar Dúvida</span>
            </button>
          )}
        </div>

        {tab === "store" && !framesDisabled ? (
          <StoreEffects />
        ) : tab === "announcements" ? (
          <StudentAnnouncementsView
            announcements={announcements}
            specialAnnouncements={specialAnnouncements}
            regularAnnouncements={regularAnnouncements}
            onOpenSpecialModal={(a) => setSpecialModalAnnouncement(a)}
          />
        ) : tab === "stats" ? (
          <StudentAIStatsView />
        ) : tab === "resumos" ? (
          <StudentResumosPanel />
        ) : tab === "profile" ? (
          <div className="space-y-6">
            <MyProfileBanner onOpenStore={!framesDisabled ? handleOpenStore : null} showStatsDetails={true} />
            {canInstallOrGuide && (
              <div
                className="nb-card bg-amber-100 border-2 border-black p-4 shadow-[4px_4px_0_0_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200"
                data-testid="profile-pwa-install-card"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 nb-card bg-amber-300 border-2 border-black flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_0_#000]">
                    <Smartphone className="w-5 h-5 text-amber-950" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-sm sm:text-base text-black">
                      Adicionar EduTask IA à Tela Inicial
                    </h3>
                    <p className="text-xs text-neutral-700 font-medium">
                      Acesse suas tarefas e estudos mais rápido sem precisar abrir o navegador toda vez.
                    </p>
                  </div>
                </div>
                <button
                  onClick={installApp}
                  className="nb-btn bg-sky-400 hover:bg-sky-500 text-black px-4 py-2 text-xs font-black flex items-center justify-center gap-1.5 flex-shrink-0 shadow-[2px_2px_0_0_#000]"
                  data-testid="profile-pwa-install-button"
                >
                  <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Instalar aplicativo</span>
                </button>
              </div>
            )}

            {(pushSupported || requiresIOSInstallForPush) && (
              <div
                className={`nb-card border-2 border-black p-4 shadow-[4px_4px_0_0_#000] flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  pushSubscribed ? "bg-emerald-100" : "bg-sky-100"
                }`}
                data-testid="profile-push-card"
              >
                <div className="flex items-start sm:items-center gap-3">
                  <div
                    className={`w-10 h-10 nb-card border-2 border-black flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0_0_#000] ${
                      pushSubscribed ? "bg-emerald-300" : "bg-sky-300"
                    }`}
                  >
                    {pushSubscribed ? (
                      <BellRing className="w-5 h-5 text-emerald-950" />
                    ) : (
                      <Bell className="w-5 h-5 text-sky-950" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-sm sm:text-base text-black">
                      Notificações no Dispositivo
                    </h3>
                    <p className="text-xs text-neutral-700 font-medium">
                      {requiresIOSInstallForPush
                        ? "No iPhone/iPad, adicione o app à Tela de Início pelo Safari e abra pelo ícone para ativar notificações."
                        : pushPermission === "denied"
                        ? "As notificações estão bloqueadas nas configurações deste navegador."
                        : pushSubscribed
                        ? "Ativadas! Você receberá alertas quando uma tarefa ou aviso for criado ou editado."
                        : "Receba alertas direto no celular ou computador quando tarefas ou avisos forem criados ou editados."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                  {requiresIOSInstallForPush ? (
                    <button
                      type="button"
                      onClick={installApp}
                      className="nb-btn bg-amber-300 hover:bg-amber-400 text-black px-4 py-2 text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0_0_#000]"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Ver como instalar</span>
                    </button>
                  ) : pushSubscribed ? (
                    <>
                      <button
                        type="button"
                        disabled={pushLoading}
                        onClick={async () => {
                          try {
                            await testPush();
                            toast.success("Notificação de teste enviada!");
                          } catch (err) {
                            toast.error(err?.response?.data?.detail || err?.message || "Falha ao enviar teste");
                          }
                        }}
                        className="nb-btn bg-white hover:bg-neutral-100 text-black px-3.5 py-2 text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0_0_#000]"
                        data-testid="profile-push-test-btn"
                      >
                        <BellRing className="w-3.5 h-3.5" />
                        <span>Testar aviso</span>
                      </button>
                      <button
                        type="button"
                        disabled={pushLoading}
                        onClick={async () => {
                          try {
                            await disablePush();
                            toast.info("Notificações desativadas neste dispositivo.");
                          } catch {
                            toast.error("Não foi possível desativar.");
                          }
                        }}
                        className="nb-btn bg-red-100 hover:bg-red-200 text-red-950 px-3.5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-[2px_2px_0_0_#000]"
                        data-testid="profile-push-disable-btn"
                      >
                        <BellOff className="w-3.5 h-3.5" />
                        <span>Desativar</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={pushLoading}
                      onClick={async () => {
                        try {
                          await enablePush();
                          toast.success("Notificações ativadas com sucesso!");
                        } catch (err) {
                          toast.error(err?.message || "Não foi possível ativar as notificações.");
                        }
                      }}
                      className="nb-btn bg-emerald-300 hover:bg-emerald-400 text-black px-4 py-2 text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0_0_#000]"
                      data-testid="profile-push-enable-btn"
                    >
                      {pushLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Bell className="w-3.5 h-3.5 stroke-[2.5]" />
                      )}
                      <span>Ativar notificações</span>
                    </button>
                  )}
                </div>
              </div>
            )}
            {user?.status === "bot" && (
              <BotSandboxBanner onPointsUpdated={load} />
            )}
            <StudentAIStatsView />
          </div>
        ) : (<>
        {/* Banner do Perfil Compacto (apenas saldo/pontos) no topo da aba de tarefas */}
        <MyProfileBanner onOpenStore={!framesDisabled ? handleOpenStore : null} showStatsDetails={false} />
        {user?.status === "bot" && (
          <BotSandboxBanner onPointsUpdated={load} />
        )}

        {/* Prêmio do mês logo abaixo das informações do aluno */}
        <PrizeBanner />

        {/* Resumo Diário da IA no topo das tarefas */}
        <AIDailySummary />

        {/* 2. Botões & Links de Atalho Criados pelo Professor (Posicionados acima das tarefas) */}
        {customButtons && customButtons.length > 0 && (
          <div className="mb-6 space-y-2.5" data-testid="student-custom-buttons-section">
            <div className="flex items-center gap-2">
              <span className="font-heading font-black text-sm sm:text-base text-neutral-800 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-indigo-700 flex-shrink-0" />
                <span>Acessos Rápidos & Links Úteis</span>
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
                      <Link2 className="w-5 h-5 flex-shrink-0 text-black/80" />
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

        {/* 2. Filtros e Modos de Visualização */}
        <div className="flex flex-wrap gap-2 mb-6 items-center menu-enter">
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

        {/* Indicadores de Estado de Conexão, Cache Offline ou Erro de Quota */}
        {isOfflineData && (
          <div className="mb-4 nb-card bg-amber-100 border-2 border-black p-3 shadow-[3px_3px_0_0_#000] flex items-center justify-between text-xs font-bold text-amber-950">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <span>Modo Cache Offline: Exibindo dados locais sincronizados anteriormente.</span>
            </div>
            <button type="button" onClick={() => load()} className="nb-btn bg-white px-2 py-1 text-[11px] font-black border border-black hover:bg-neutral-100">
              Atualizar
            </button>
          </div>
        )}

        {loadError && (
          <div className="mb-4 nb-card bg-red-100 border-2 border-black p-3 shadow-[3px_3px_0_0_#000] flex items-center justify-between text-xs font-bold text-red-950">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              <span>{loadError}</span>
            </div>
            <button type="button" onClick={() => load()} className="nb-btn bg-white px-2 py-1 text-[11px] font-black border border-black hover:bg-neutral-100">
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Lista Única de Tarefas (Sem separação por grupos, usando os filtros ativos) */}
        {loading ? (
          <div className="nb-card bg-white p-8 sm:p-12 text-center max-w-xl mx-auto flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            <p className="text-neutral-700 text-sm font-bold">Carregando suas tarefas...</p>
          </div>
        ) : view === "calendar" ? (
          <TaskCalendar tasks={filtered} />
        ) : filtered.length === 0 ? (
          <div className="nb-card bg-white p-8 sm:p-12 text-center max-w-xl mx-auto nb-fade-in">
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 items-stretch" data-testid="student-tasks-grid">
            {filtered.map((t, i) => (
              <div id={`task-card-${t.id}`} key={t.id} className="h-full">
                <StudentTaskCard
                  task={t}
                  onToggle={() => toggle(t)}
                  onAskDoubt={(task) => setChatTask(task)}
                  onMarkUpdateRead={(id) => markUpdateRead(id)}
                  index={i}
                />
              </div>
            ))}
          </div>
        )}

        </>)}
      </div>

      {/* Navegação Inferior Fixa para Celular */}
      <MobileBottomNav
        activeTab={tab}
        onTabChange={(newTab) => {
          setTab(newTab);
          if (newTab === "announcements") markAnnouncementsAsSeen();
        }}
        framesDisabled={framesDisabled}
        hasUnreadAnnouncements={hasUnreadAnnouncements}
      />

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
  return (
    <div className={`nb-card p-4 ${bg}`} data-testid={testId}>
      <div className="text-xs font-bold uppercase tracking-wider">{label}</div>
      <div className="font-heading font-black text-3xl sm:text-4xl mt-1">{value}</div>
    </div>
  );
}

function StudentTaskCard({ task, onToggle, onAskDoubt, onMarkUpdateRead, index }) {
  const { enabled: aiEnabled, hidden: aiHidden, aiHidden: aiHiddenAlt } = useAIStatus();
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
      className={`nb-card nb-card-hover p-4 sm:p-5 nb-fade-in h-full flex flex-col justify-between transition-all duration-200 ease-out ${task.completed ? "opacity-75 bg-neutral-50/90" : "bg-white"}`}
      style={{ animationDelay: `${Math.min(index || 0, 7) * 30}ms` }}
      data-testid={`student-task-card-${task.id}`}
    >
      <div>
        {/* Banner de alteração efetuada pelo professor */}
        {task.has_unread_update && task.update_changes?.length > 0 && (
          <div
            className="mb-3 nb-card bg-amber-300 border-2 border-black p-2.5 shadow-[2px_2px_0_0_#000] flex items-center justify-between gap-2 animate-in fade-in duration-200"
            data-testid={`task-update-banner-${task.id}`}
          >
            <div className="flex items-center gap-1.5 flex-wrap text-xs font-bold text-amber-950">
              <span className="nb-badge bg-black text-white text-[10px] font-black uppercase inline-flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-300" />
                <span>Alteração</span>
              </span>
              {task.update_changes.map((c, idx) => (
                <span key={idx} className="nb-badge bg-white text-black border border-black text-[10px] font-bold">
                  {c}
                </span>
              ))}
            </div>
            {onMarkUpdateRead && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkUpdateRead(task.id);
                }}
                className="nb-btn bg-white hover:bg-neutral-100 text-[10px] font-black px-2 py-0.5 border border-black shadow-[1px_1px_0_0_#000] flex-shrink-0"
                data-testid={`mark-update-read-${task.id}`}
                title="Marcar como lida"
              >
                Entendi
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mb-2 sm:mb-3 flex-wrap">
          <span className={`nb-badge ${colorFor(task.subject)}`}>{task.subject}</span>
          <span className={`nb-badge ${priority.bg}`} data-testid={`student-task-priority-${task.id}`}>
            {priority.icon} {priority.label}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs mb-2 sm:mb-3 flex-wrap">
          <span className={`nb-badge ${dueBg}`}>
            <CalendarIcon className="w-3 h-3 inline mr-1 -mt-0.5" /> {dueLabel}
          </span>

          {task.points > 0 && (
            <span className="nb-badge bg-amber-200" data-testid={`task-points-${task.id}`}>
              +{task.points} pts
            </span>
          )}
        </div>

        <h3 className={`font-heading font-bold text-lg sm:text-xl mb-1 leading-tight transition-all duration-200 ${task.completed ? "line-through opacity-70 text-neutral-600" : "text-black"}`}>
          {task.title}
        </h3>
        <p className="text-xs sm:text-sm text-neutral-700 mb-3 whitespace-pre-wrap transition-opacity duration-200">
          {task.description}
        </p>

        {task.attachments?.length > 0 && (
          <div className="mb-3 space-y-1.5">
            <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide">
              Anexos
            </div>
            {task.attachments.map((a) => (
              <AttachmentLink key={a.id} file={a} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2 relative z-20">
        <button
          type="button"
          onClick={onToggle}
          className={`nb-btn w-full px-3 py-2 sm:py-2.5 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold transition-all duration-200 ease-out ${task.completed ? "bg-white text-neutral-800" : "bg-emerald-300 text-black hover:bg-emerald-400"}`}
          data-testid={`toggle-complete-${task.id}`}
        >
          <span className={`inline-flex items-center justify-center transition-transform duration-200 ${task.completed ? "animate-check-pop text-emerald-600" : ""}`}>
            <Check className={`w-4 h-4 stroke-[3] ${task.completed ? "text-emerald-600" : ""}`} />
          </span>
          <span>{task.completed ? "Desmarcar" : "Marcar como concluída"}</span>
        </button>

        {hasAiSource && <StudentAnswerSection task={task} aiEnabled={aiEnabled} />}

        {!aiHidden && !aiHiddenAlt && (
          <button
            type="button"
            onClick={() => {
              if (!aiEnabled) {
                toast.error("A Inteligência Artificial foi desativada temporariamente pelo administrador.");
                return;
              }
              onAskDoubt(task);
            }}
            disabled={!aiEnabled}
            className={`nb-btn w-full px-2.5 py-1.5 sm:py-2 flex items-center justify-center gap-1.5 text-xs font-bold ${
              !aiEnabled
                ? "bg-neutral-200 text-neutral-500 border-neutral-400 cursor-not-allowed opacity-60"
                : "bg-violet-100 hover:bg-violet-200 text-violet-950"
            }`}
            data-testid={`ask-doubt-${task.id}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-700" />
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
    .trim();
};

function StudentAnswerSection({ task, aiEnabled = true }) {
  const { hidden: aiHidden, aiHidden: aiHiddenAlt } = useAIStatus();
  const [open, setOpen] = useState(false);
  const [selectedLength, setSelectedLength] = useState(task.generated_answer?.length || "medium");
  const [answer, setAnswer] = useState(
    cleanAnswerText(task.generated_answer?.answer || task.answer || "")
  );
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const generatingRef = useRef(false);

  useEffect(() => {
    const incoming = cleanAnswerText(task.generated_answer?.answer || task.answer || "");
    if (incoming && !generatingRef.current) {
      setAnswer((prev) => prev || incoming);
    }
  }, [task.generated_answer?.answer, task.answer]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (aiHidden || aiHiddenAlt) {
    return null;
  }

  const lengthLabels = {
    short: "Curto",
    medium: "Médio",
    detailed: "Detalhado",
  };

  const handleGenerate = async (len = selectedLength) => {
    if (generatingRef.current) return;
    if (!aiEnabled) {
      toast.error("IA desativada temporariamente pelo administrador.");
      return;
    }
    generatingRef.current = true;
    setGenerating(true);
    try {
      const { data } = await api.post(`/tasks/${task.id}/generate-answer`, { length: len });
      const sanitized = cleanAnswerText(data.answer || "");
      setAnswer(sanitized);
      setSelectedLength(data.length || len);
      toast.success(`Gabarito (${lengthLabels[len] || len}) gerado!`);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao gerar resposta");
    } finally {
      generatingRef.current = false;
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
        type="button"
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

  const modalContent = open ? (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs modal-backdrop font-sans"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        className="nb-card bg-[#FAFAFA] w-[96vw] max-w-6xl h-[93vh] sm:h-[92vh] border-3 border-black shadow-[8px_8px_0_0_#000] rounded-2xl relative modal-window flex flex-col overflow-hidden"
        data-testid={`answer-section-${task.id}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Gabarito da tarefa ${task.title}`}
      >
        {/* Top Banner Header */}
        <div className="bg-gradient-to-r from-amber-300 via-amber-200 to-sky-200 border-b-3 border-black px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-black text-amber-300 border-2 border-black flex items-center justify-center shadow-[2px_2px_0_0_#000] flex-shrink-0">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                {task.subject && (
                  <span className={`nb-badge text-[10px] sm:text-xs font-black ${colorFor(task.subject)}`}>
                    {task.subject}
                  </span>
                )}
                <span className="nb-badge bg-black text-white text-[10px] sm:text-xs font-black uppercase tracking-wider inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Gabarito IA</span>
                </span>
                {task.due_date && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-neutral-800 bg-white/80 px-2 py-0.5 rounded border border-black/30">
                    <CalendarIcon className="w-3 h-3" />
                    {formatDateBR(task.due_date)}
                  </span>
                )}
              </div>
              <h3 className="font-heading font-black text-base sm:text-xl md:text-2xl text-black truncate leading-tight">
                {task.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="nb-btn bg-white hover:bg-red-100 p-2 sm:p-2.5 border-2 border-black shadow-[2px_2px_0_0_#000] text-black flex-shrink-0"
            data-testid={`hide-answer-${task.id}`}
            aria-label="Fechar gabarito"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Control Toolbar */}
        <div className="bg-white border-b-2 border-black px-4 py-3 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-heading font-black text-neutral-700 uppercase tracking-wider mr-1">
              Nível da Resposta:
            </span>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 rounded-xl border-2 border-black">
              {[
                { key: "short", label: "Curto", Icon: Zap },
                { key: "medium", label: "Médio", Icon: FileText },
                { key: "detailed", label: "Detalhado", Icon: BookOpen },
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
                  className={`py-1.5 px-3 sm:px-4 rounded-lg text-[11px] sm:text-xs font-heading font-black uppercase transition-all flex items-center justify-center gap-1.5 border-2 ${
                    selectedLength === opt.key
                      ? "bg-amber-300 text-black border-black shadow-[2px_2px_0_0_#000]"
                      : "border-transparent text-neutral-700 hover:text-black hover:bg-white"
                  }`}
                  data-testid={`select-length-${opt.key}-${task.id}`}
                >
                  <opt.Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-end">
            {generating ? (
              <span className="nb-badge bg-amber-100 text-amber-950 border-black flex items-center gap-1.5 font-bold text-xs px-3 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                <span>Gerando {lengthLabels[selectedLength]}...</span>
              </span>
            ) : (
              answer && (
                <button
                  type="button"
                  onClick={() => handleGenerate(selectedLength)}
                  className="nb-btn bg-sky-100 hover:bg-sky-200 text-sky-950 px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 border-2 border-black shadow-[2px_2px_0_0_#000]"
                  data-testid={`regenerate-answer-${task.id}`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Gerar novamente</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Spacious Scrollable Answer Canvas */}
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6 relative">
          <div className="max-w-4xl mx-auto h-full">
            {answer ? (
              <div className="pb-4">
                <FormattedGabaritoViewer text={answer} />
              </div>
            ) : (
              <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center bg-white rounded-2xl border-2 border-black p-6 sm:p-10 space-y-4 shadow-[4px_4px_0_0_#000]">
                {generating ? (
                  <div className="flex flex-col items-center justify-center py-6 text-neutral-800 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-amber-300 border-2 border-black flex items-center justify-center shadow-[3px_3px_0_0_#000]">
                      <Loader2 className="w-7 h-7 animate-spin text-black" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-heading font-black text-base sm:text-lg text-black">
                        Elaborando gabarito ({lengthLabels[selectedLength] || selectedLength})...
                      </p>
                      <p className="text-xs sm:text-sm font-medium text-neutral-600">
                        Analisando o enunciado e organizando as respostas com clareza.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-xl bg-violet-100 border-2 border-black flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-violet-700" />
                    </div>
                    <div className="space-y-1 max-w-md">
                      <p className="text-sm sm:text-base font-heading font-black text-neutral-900">
                        Pronto para gerar o gabarito
                      </p>
                      <p className="text-xs sm:text-sm text-neutral-600 font-medium">
                        Clique abaixo para gerar a resposta no nível selecionado.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGenerate(selectedLength)}
                      className="nb-btn bg-amber-300 hover:bg-amber-400 font-heading font-black text-xs sm:text-sm px-6 py-3 border-2 border-black shadow-[3px_3px_0_0_#000] text-black inline-flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-black" />
                      <span>Gerar Resposta Agora</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {generating && answer && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
              <div className="bg-amber-300 px-5 py-3 rounded-xl border-2 border-black shadow-[4px_4px_0_0_#000] flex items-center gap-2.5 text-xs sm:text-sm font-heading font-black text-black">
                <Loader2 className="w-5 h-5 animate-spin text-black" />
                <span>Atualizando gabarito...</span>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Modal Footer */}
        <div className="bg-white border-t-3 border-black px-4 py-3 sm:px-6 flex items-center justify-between gap-3 flex-shrink-0">
          <span className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-violet-700 flex-shrink-0" />
            <span className="hidden xs:inline sm:inline">Gabarito direto gerado por IA</span>
          </span>
          <div className="flex items-center gap-2 ml-auto">
            {answer && (
              <button
                type="button"
                onClick={handleCopy}
                className="nb-btn bg-emerald-300 hover:bg-emerald-400 text-black px-4 py-2 text-xs sm:text-sm font-heading font-black flex items-center gap-1.5 border-2 border-black shadow-[2px_2px_0_0_#000]"
                data-testid={`copy-answer-${task.id}`}
              >
                {copied ? <CheckCheck className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4 text-black" />}
                <span>{copied ? "Copiado!" : "Copiar Resposta"}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="nb-btn bg-white hover:bg-neutral-100 text-black px-4 py-2 text-xs sm:text-sm font-bold border-2 border-black shadow-[2px_2px_0_0_#000]"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          if (!answer && !generatingRef.current) {
            handleGenerate(selectedLength);
          }
        }}
        className="nb-btn w-full px-3 py-2 flex items-center justify-center gap-2 bg-white hover:bg-amber-100 text-xs font-bold text-neutral-900 border-2 border-black shadow-[2px_2px_0_0_#000]"
        data-testid={`reveal-answer-${task.id}`}
      >
        <Sparkles className="w-4 h-4 text-violet-600" />
        <span>{answer ? "Ver gabarito da tarefa" : "Gerar gabarito com IA"}</span>
      </button>

      {modalContent && typeof document !== "undefined" ? createPortal(modalContent, document.body) : null}
    </>
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
