import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trophy, Sparkles, CheckCircle, Clock, ShoppingBag, Award, Star, Loader2, Info } from "lucide-react";
import api, { formatApiError } from "@/lib/api";
import Avatar from "@/components/Avatar";
import { effectClass } from "@/lib/effects";
import { useAuth } from "@/context/AuthContext";

/**
 * Statistics and AI Monthly Evaluation Leaderboard for Students.
 * Shows the student leading according to AI evaluation (punctuality & lack of pending tasks).
 * Streak (ofensiva) disabled. Discourse kept concise and uncluttered.
 */
export default function StudentAIStatsView() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const [{ data: aiData }, { data: meData }] = await Promise.all([
          api.get("/stats/monthly-ai"),
          api.get("/me/stats"),
        ]);
        setData(aiData);
        setMyStats(meData);
      } catch (e) {
        toast.error(formatApiError(e?.response?.data?.detail) || "Falha ao carregar estatísticas");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-16 text-neutral-500">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-sky-500" />
        <p className="font-heading font-bold text-lg">Consultando avaliação da IA...</p>
      </div>
    );
  }

  const leader = data?.leader;
  const rankings = data?.rankings || [];
  const monthLabel = data?.month_label || "Mês Atual";

  return (
    <div className="space-y-6 sm:space-y-8 nb-fade-in" data-testid="student-ai-stats-view">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="nb-badge bg-violet-200 text-violet-950 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
            Avaliação Mensal por IA
          </span>
          <span className="text-xs font-bold text-neutral-500">• {monthLabel}</span>
        </div>
        <h1 className="font-heading font-black text-2xl sm:text-4xl tracking-tight text-neutral-900 flex items-center gap-2 sm:gap-3">
          <Trophy className="w-7 h-7 sm:w-10 sm:h-10 text-amber-500" strokeWidth={2.2} />
          Estatísticas & Líder da IA
        </h1>
        <p className="text-neutral-600 mt-1 text-xs sm:text-sm">
          A liderança é calculada pela IA com base em <strong>pontualidade</strong> e penalizada por <strong>tarefas pendentes</strong>. Os pontos servem apenas para a Loja de Molduras.
        </p>
      </div>

      {/* 👑 Spotlight da Pessoa Certa que Está Liderando */}
      {leader ? (
        <div className="nb-card bg-gradient-to-br from-amber-300 via-amber-200 to-amber-300 p-5 sm:p-7 border-3 border-black relative overflow-hidden" data-testid="ai-leader-spotlight">
          <div className="absolute top-2 right-2 opacity-10 text-8xl sm:text-9xl select-none pointer-events-none">
            👑
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="nb-badge bg-black text-amber-300 text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-1">
                👑 Quem está liderando a avaliação
              </span>
              <span className="nb-badge bg-white text-neutral-900 text-[10px] sm:text-xs font-bold">
                Nota IA: {leader.score}/100
              </span>
            </div>

            <div className="flex items-start sm:items-center gap-3 sm:gap-5 flex-wrap sm:flex-nowrap">
              <div className="flex-shrink-0">
                <Avatar
                  userId={leader.id}
                  name={leader.name}
                  size={72}
                  hasAvatar={leader.has_avatar}
                  bg="bg-sky-300"
                  effect={effectClass(leader.equipped_effect)}
                />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="font-heading font-black text-xl sm:text-3xl text-neutral-900 leading-tight flex items-center gap-2 flex-wrap">
                  <span>{leader.name}</span>
                  {leader.id === user?.id && (
                    <span className="nb-badge bg-emerald-400 text-black text-xs font-bold">É você! 🎉</span>
                  )}
                </h2>

                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="nb-badge bg-white text-emerald-900 text-xs font-bold flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    {leader.on_time_month} tarefa(s) no prazo
                  </span>
                  <span className="nb-badge bg-white text-neutral-900 text-xs font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    {leader.uncompleted_count === 0 ? "Zero pendências" : `${leader.uncompleted_count} pendente(s)`}
                  </span>
                  <span className="nb-badge bg-white text-violet-950 text-xs font-bold flex items-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-violet-600" />
                    {leader.points} pts (molduras)
                  </span>
                </div>
              </div>
            </div>

            {/* Parecer Conciso da IA */}
            <div className="mt-4 nb-card bg-white/95 p-3.5 sm:p-4 border-2 border-black">
              <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-900 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Avaliação da IA:
              </div>
              <p className="text-xs sm:text-sm text-neutral-800 font-medium">
                {data.leader_verdict}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="nb-card bg-white p-6 text-center">
          <p className="font-bold text-neutral-700 text-sm">Nenhum aluno ativo registrado este mês.</p>
        </div>
      )}

      {/* Classificação Pedagógica Completa da Turma */}
      <div className="space-y-3 sm:space-y-4" data-testid="ai-classroom-rankings">
        <div>
          <h3 className="font-heading font-black text-xl sm:text-2xl text-neutral-900 flex items-center gap-2">
            <Award className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600" />
            Classificação da Turma
          </h3>
          <p className="text-xs text-neutral-600 mt-0.5">
            Baseada em entregas pontuais e menos pendências.
          </p>
        </div>

        <div className="space-y-2.5 sm:space-y-3">
          {rankings.map((r) => {
            const isMe = r.id === user?.id;
            return (
              <div
                key={r.id}
                className={`nb-card p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 transition-all ${
                  isMe
                    ? "bg-amber-100 ring-4 ring-amber-400 border-2 border-black"
                    : r.is_leader
                    ? "bg-amber-50 border-2 border-amber-900/30"
                    : "bg-white"
                }`}
                data-testid={`ranking-row-${r.id}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Position Badge */}
                  <div
                    className={`font-heading font-black text-lg sm:text-xl w-8 h-8 rounded-lg flex items-center justify-center border-2 border-black flex-shrink-0 ${
                      r.rank === 1
                        ? "bg-amber-300 text-amber-950"
                        : r.rank === 2
                        ? "bg-gray-200 text-gray-800"
                        : r.rank === 3
                        ? "bg-orange-300 text-orange-950"
                        : "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    #{r.rank}
                  </div>

                  <Avatar
                    userId={r.id}
                    name={r.name}
                    size={42}
                    hasAvatar={r.has_avatar}
                    bg="bg-sky-200"
                    effect={effectClass(r.equipped_effect)}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-bold text-sm sm:text-base text-neutral-900 truncate">
                        {r.name}
                      </span>
                      {isMe && (
                        <span className="nb-badge bg-emerald-300 text-emerald-950 text-[10px] font-bold">
                          Você
                        </span>
                      )}
                      <span className="nb-badge bg-sky-100 text-sky-900 text-[10px] font-bold">
                        {r.ai_status}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 mt-0.5 truncate">
                      {r.ai_feedback}
                    </p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-between sm:justify-end text-right">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">No Prazo</div>
                    <div className="font-heading font-black text-xs sm:text-sm text-emerald-700">{r.on_time_month}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Pendentes</div>
                    <div className={`font-heading font-black text-xs sm:text-sm ${r.uncompleted_count === 0 ? "text-emerald-700" : "text-amber-700"}`}>
                      {r.uncompleted_count ?? 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Nota IA</div>
                    <div className="font-heading font-black text-sm sm:text-base text-neutral-900">{r.score}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
