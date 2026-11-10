import React, { useState, useEffect } from "react";
import { Lock, RefreshCw, Trophy, Calendar, LogOut, Medal, Sparkles, CheckCircle2, Clock, Crown, Award } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Avatar from "@/components/Avatar";
import { effectClass } from "@/lib/effects";
import api from "@/lib/api";

export default function AppDeactivatedScreen({ onCheckStatus, annualCycle }) {
  const { logout, user } = useAuth();
  const [checking, setChecking] = useState(false);
  const [top3, setTop3] = useState([]);
  const [loadingTop3, setLoadingTop3] = useState(true);
  const [activeYear, setActiveYear] = useState(annualCycle?.active_year || 2026);

  useEffect(() => {
    let mounted = true;
    const fetchTop3 = async () => {
      try {
        const { data } = await api.get("/app-status");
        if (mounted) {
          if (data?.annual_cycle?.active_year) {
            setActiveYear(data.annual_cycle.active_year);
          }
          if (Array.isArray(data?.top3)) {
            setTop3(data.top3);
          }
        }
      } catch (err) {
        console.warn("[AppDeactivatedScreen] Falha ao carregar top 3:", err);
      } finally {
        if (mounted) setLoadingTop3(false);
      }
    };
    fetchTop3();
    return () => { mounted = false; };
  }, []);

  const handleRefresh = async () => {
    setChecking(true);
    if (onCheckStatus) {
      await onCheckStatus();
    } else {
      window.location.reload();
    }
    setTimeout(() => setChecking(false), 600);
  };

  const currentUserInTop3 = top3.find((r) => r.user_id === user?.id);

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-3 sm:p-6 bg-gradient-to-b from-amber-100 via-sky-50 to-indigo-100 relative overflow-y-auto"
      data-testid="app-deactivated-screen"
    >
      {/* Background Decorative Blur */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-amber-300/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-sky-300/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl w-full nb-card bg-white p-5 sm:p-8 text-center relative z-10 shadow-[8px_8px_0_0_#000] border-4 border-black my-8">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 bg-amber-300 border-2 border-black px-4 py-1.5 rounded-full font-heading font-black text-xs sm:text-sm uppercase tracking-wider mb-5 shadow-[2px_2px_0_0_#000]">
          <Lock className="w-4 h-4 text-black" />
          Ano Letivo {activeYear} Encerrado
        </div>

        {/* Title & Description */}
        <h1 className="font-heading font-black text-2xl sm:text-4xl text-neutral-900 mb-2 leading-tight">
          O Ano Letivo foi Finalizado!
        </h1>
        <p className="text-neutral-700 font-medium text-xs sm:text-sm leading-relaxed mb-6 max-w-xl mx-auto">
          Olá, <strong className="text-black font-black">{user?.name || "Aluno"}</strong>! O professor encerrou o ano letivo. O acesso regular às tarefas está temporariamente bloqueado até que o próximo ano seja iniciado.
        </p>

        {/* PÓDIO DO TOP 3 DO RANKING ANUAL */}
        <div className="mb-8 text-left bg-gradient-to-b from-amber-50/80 to-yellow-50/60 p-4 sm:p-6 rounded-2xl border-2 border-black shadow-[4px_4px_0_0_#000]">
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Trophy className="w-7 h-7 text-amber-500 flex-shrink-0" />
              <div>
                <h2 className="font-heading font-black text-base sm:text-xl text-neutral-950">
                  Pódio Final — Top 3 do Ranking Anual
                </h2>
                <p className="text-[11px] sm:text-xs text-neutral-600">
                  Os 3 alunos que mais realizaram tarefas e mantiveram as entregas em dia:
                </p>
              </div>
            </div>
            <span className="nb-badge bg-amber-300 text-amber-950 border border-black text-xs font-black">
              Ciclo {activeYear}
            </span>
          </div>

          {loadingTop3 ? (
            <div className="py-8 text-center text-xs text-neutral-600 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
              <span>Carregando pódio dos campeões...</span>
            </div>
          ) : top3.length === 0 ? (
            <div className="py-6 text-center text-xs text-neutral-600 bg-white/70 border border-black/20 rounded-xl">
              Nenhum dado de ranking registrado para este ano letivo.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 items-end pt-2">
              {/* Ordem visual no desktop: 2º Lugar (Prata), 1º Lugar (Ouro), 3º Lugar (Bronze) */}
              {[
                top3[1] ? { ...top3[1], podiumRank: 2 } : null,
                top3[0] ? { ...top3[0], podiumRank: 1 } : null,
                top3[2] ? { ...top3[2], podiumRank: 3 } : null,
              ].filter(Boolean).map((student) => {
                const isFirst = student.podiumRank === 1;
                const isSecond = student.podiumRank === 2;
                const isThird = student.podiumRank === 3;

                const cardBg = isFirst
                  ? "bg-gradient-to-b from-amber-200 via-yellow-100 to-amber-200 border-amber-600 shadow-[4px_4px_0_0_#b45309]"
                  : isSecond
                  ? "bg-gradient-to-b from-slate-200 via-gray-100 to-slate-200 border-slate-600 shadow-[3px_3px_0_0_#475569]"
                  : "bg-gradient-to-b from-orange-200 via-amber-100 to-orange-200 border-amber-800 shadow-[3px_3px_0_0_#9a3412]";

                const badgeBg = isFirst
                  ? "bg-amber-400 text-amber-950 border-amber-700"
                  : isSecond
                  ? "bg-slate-300 text-slate-900 border-slate-600"
                  : "bg-amber-600 text-white border-amber-900";

                const MedalIcon = isFirst ? Crown : isSecond ? Medal : Award;
                const rankTitle = isFirst ? "1º Campeão Anual" : isSecond ? "2º Vice-Campeão" : "3º Lugar";

                return (
                  <div
                    key={student.user_id}
                    className={`nb-card p-4 rounded-xl border-2 text-center transition-transform ${cardBg} ${
                      isFirst ? "sm:-translate-y-2 order-1 sm:order-2" : isSecond ? "order-2 sm:order-1" : "order-3"
                    }`}
                  >
                    <MedalIcon className={`w-8 h-8 mx-auto mb-1 ${isFirst ? "text-amber-600" : isSecond ? "text-slate-600" : "text-amber-800"}`} />
                    <span className={`nb-badge text-[10px] sm:text-xs font-black uppercase tracking-wider px-2 py-0.5 border mb-2 inline-block ${badgeBg}`}>
                      {rankTitle}
                    </span>

                    <div className="w-16 h-16 mx-auto mb-2 flex items-center justify-center">
                      <Avatar
                        userId={student.user_id}
                        name={student.name}
                        size={56}
                        hasAvatar={student.has_avatar}
                        bg={isFirst ? "bg-amber-300" : isSecond ? "bg-slate-300" : "bg-orange-300"}
                        effect={effectClass(student.equipped_effect)}
                      />
                    </div>

                    <h3 className="font-heading font-black text-sm sm:text-base text-neutral-950 truncate px-1">
                      {student.name}
                    </h3>

                    <div className="mt-2.5 pt-2 border-t border-black/10 space-y-1 text-left">
                      <div className="flex items-center justify-between text-[11px] bg-white/80 px-2 py-0.5 rounded border border-black/20">
                        <span className="font-bold text-emerald-900 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Feitas:
                        </span>
                        <span className="font-black text-emerald-950">{student.completed_tasks}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] bg-white/80 px-2 py-0.5 rounded border border-black/20">
                        <span className="font-bold text-amber-900 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" /> Pendentes:
                        </span>
                        <span className="font-black text-amber-950">{student.pending_tasks}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Destaque individual para o aluno conectado */}
          {currentUserInTop3 && (
            <div className="mt-4 p-3 bg-emerald-100 border-2 border-emerald-600 rounded-xl text-center font-bold text-emerald-950 text-xs sm:text-sm shadow-[2px_2px_0_0_#059669] flex items-center justify-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              <span>Parabéns, {user?.name}! Você conquistou o <strong className="font-black text-emerald-950">{currentUserInTop3.rank}º Lugar Geral</strong> no Ranking Anual deste ano letivo!</span>
            </div>
          )}
        </div>

        {/* Informação sobre o reinício */}
        <div className="bg-sky-50 border-2 border-black p-4 rounded-xl text-left mb-6 shadow-[3px_3px_0_0_#000] flex items-start gap-3">
          <Calendar className="w-6 h-6 text-sky-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-neutral-800">
            <p className="font-bold text-sky-950 mb-0.5">O que acontece agora?</p>
            <p>
              O sistema fica temporariamente desativado para os alunos e será reaberto automaticamente assim que o professor iniciar o <strong>Ano Letivo Seguinte</strong> na plataforma.
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleRefresh}
            disabled={checking}
            className="nb-btn bg-sky-400 hover:bg-sky-500 text-black px-5 py-3 text-sm flex items-center justify-center gap-2 flex-1 font-bold shadow-[3px_3px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px]"
            data-testid="deactivated-refresh-button"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Verificando se o novo ano começou..." : "Verificar se o Próximo Ano foi Aberto"}
          </button>
          <button
            onClick={logout}
            className="nb-btn bg-neutral-200 hover:bg-neutral-300 text-black px-5 py-3 text-sm flex items-center justify-center gap-2 font-bold shadow-[3px_3px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px]"
            data-testid="deactivated-logout-button"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
