import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Paperclip, Check, BookOpen, Filter, Megaphone, LayoutGrid, CalendarDays, Sparkles, ShoppingBag, BarChart3, HelpCircle, Star, ExternalLink, Image as ImageIcon, Loader2, Copy, CheckCheck, FileText, ChevronDown, ChevronUp, Lock } from "lucide-react";
import api, { API, formatApiError } from "@/lib/api";
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
import { getPriority, formatDateBR, daysUntil } from "@/lib/priority";
import { fireConfetti } from "@/lib/celebrate";

const subjectColors = ["bg-sky-200", "bg-amber-200", "bg-red-200", "bg-emerald-200", "bg-violet-200", "bg-rose-200"];
const colorFor = (s) => subjectColors[(s || "").length % subjectColors.length];

export default function StudentDashboard() {
  const { user } = useAuth();
  const { enabled: aiEnabled } = useAIStatus();
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: t }, { data: a }] = await Promise.all([
        api.get("/tasks"),
        api.get("/announcements"),
      ]);
      setTasks(t);
      setAnnouncements(a);
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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
        toast("Tarefa desmarcada");
      } else {
        const { data } = await api.post(`/tasks/${task.id}/complete`);
        const earned = data?.points_earned || 0;
        const onTime = data?.on_time;
        toast.success(
          earned > 0
            ? `+${earned} pontos! ${onTime ? "🎯 No prazo!" : "Entregue com atraso"}`
            : "Tarefa concluída! 🎉"
        );
        fireConfetti();
      }
      load();
    } catch (e) {
      toast.error(formatApiError(e?.response?.data?.detail));
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <AppHeader title="Minhas tarefas" />
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-28 sm:pb-8">
        <MyProfileBanner bg="bg-sky-100" />
        <PrizeBanner />
        <AIDailySummary />

        {/* Dynamic & responsive navigation bar */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap">
          <button
            onClick={() => setTab("tasks")}
            className={`nb-btn px-3.5 sm:px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 ${tab === "tasks" ? "bg-sky-400" : "bg-white"}`}
            data-testid="student-tab-tasks"
          >
            <BookOpen className="w-4 h-4" /> Minhas tarefas
          </button>
          <button
            onClick={() => setTab("store")}
            className={`nb-btn px-3.5 sm:px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 ${tab === "store" ? "bg-amber-300" : "bg-white"}`}
            data-testid="student-tab-store"
          >
            <ShoppingBag className="w-4 h-4" /> Loja de Molduras
          </button>
          <button
            onClick={() => setTab("stats")}
            className={`nb-btn px-3.5 sm:px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 flex-shrink-0 ${tab === "stats" ? "bg-violet-300" : "bg-white"}`}
            data-testid="student-tab-stats"
          >
            <BarChart3 className="w-4 h-4" /> Estatísticas & Líder IA
          </button>
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
            {!aiEnabled ? (
              <>
                <Lock className="w-4 h-4 text-neutral-500" />
                <span>IA Bloqueada</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-violet-700" />
                <span>Tirar Dúvida</span>
              </>
            )}
          </button>
        </div>

        {tab === "store" ? (
          <StoreEffects />
        ) : tab === "stats" ? (
          <StudentAIStatsView />
        ) : (<>
        <div className="mb-4 sm:mb-8">
          <h1 className="font-heading font-black text-2xl sm:text-5xl tracking-tight">Olá! Vamos estudar?</h1>
          <p className="text-neutral-600 mt-1 text-xs sm:text-sm">Marque suas tarefas conforme as conclui.</p>
        </div>

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
  return (
    <div className={`nb-card p-4 ${bg}`} data-testid={testId}>
      <div className="text-xs font-bold uppercase tracking-wider">{label}</div>
      <div className="font-heading font-black text-3xl sm:text-4xl mt-1">{value}</div>
    </div>
  );
}

function StudentTaskCard({ task, onToggle, onAskDoubt, index }) {
  const { enabled: aiEnabled } = useAIStatus();
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
      className={`nb-card nb-card-hover p-4 sm:p-6 nb-fade-in flex flex-col justify-between ${task.completed ? "opacity-75" : ""}`}
      style={{ animationDelay: `${index * 60}ms` }}
      data-testid={`student-task-card-${task.id}`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3 flex-wrap">
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
        <h3 className={`font-heading font-bold text-lg sm:text-xl mb-1 leading-tight ${task.completed ? "line-through" : ""}`}>
          {task.title}
        </h3>
        <p className="text-xs sm:text-sm text-neutral-700 mb-3 whitespace-pre-wrap">{task.description}</p>

        {task.attachments?.length > 0 && (
          <div className="mb-3 space-y-1.5">
            <div className="text-[10px] font-bold text-neutral-600 uppercase tracking-wide">Anexos</div>
            {task.attachments.map((a) => <AttachmentLink key={a.id} file={a} />)}
          </div>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <button
          onClick={onToggle}
          className={`nb-btn w-full px-3 py-2 sm:py-2.5 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold ${task.completed ? "bg-white" : "bg-emerald-300"}`}
          data-testid={`toggle-complete-${task.id}`}
        >
          <Check className="w-4 h-4" strokeWidth={3} />
          {task.completed ? "Desmarcar" : "Marcar como concluída"}
        </button>

        {/* Answer section only if admin provided an AI source / answer / photos */}
        {hasAiSource && <StudentAnswerSection task={task} aiEnabled={aiEnabled} />}

        <button
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
          title={!aiEnabled ? "IA desativada pelo administrador" : "Tirar dúvida desta tarefa"}
        >
          {!aiEnabled ? (
            <>
              <Lock className="w-3.5 h-3.5 text-neutral-500" />
              <span>Tirar Dúvida (IA Bloqueada)</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              <span>Tirar dúvida desta tarefa (IA)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function StudentAnswerSection({ task, aiEnabled = true }) {
  const [open, setOpen] = useState(false);
  const [selectedLength, setSelectedLength] = useState(task.generated_answer?.length || "medium");
  const [answer, setAnswer] = useState(task.generated_answer?.answer || task.answer || "");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

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
      setAnswer(data.answer || "");
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
        className="nb-btn w-full px-3 py-2 flex items-center justify-center gap-2 bg-white hover:bg-amber-100 text-xs font-bold text-neutral-900 border-2 border-black"
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
