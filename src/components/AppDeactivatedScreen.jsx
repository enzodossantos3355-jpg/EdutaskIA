import React, { useState } from "react";
import { Lock, RefreshCw, Trophy, Calendar, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function AppDeactivatedScreen({ onCheckStatus }) {
  const { logout, user } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleRefresh = async () => {
    setChecking(true);
    if (onCheckStatus) {
      await onCheckStatus();
    } else {
      window.location.reload();
    }
    setTimeout(() => setChecking(false), 600);
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-b from-amber-50 via-sky-50 to-indigo-100 relative overflow-hidden"
      data-testid="app-deactivated-screen"
    >
      {/* Background Decorative Blur */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-amber-300/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-sky-300/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-lg w-full nb-card bg-white p-6 sm:p-8 text-center relative z-10 shadow-[8px_8px_0_0_#000] border-4 border-black">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 bg-amber-300 border-2 border-black px-4 py-1.5 rounded-full font-heading font-black text-xs sm:text-sm uppercase tracking-wider mb-6 shadow-[2px_2px_0_0_#000]">
          <Lock className="w-4 h-4 text-black" />
          Ano Letivo Encerrado
        </div>

        {/* Icon Illustration */}
        <div className="relative mx-auto w-24 h-24 mb-6 flex items-center justify-center bg-amber-100 border-4 border-black rounded-2xl shadow-[4px_4px_0_0_#000]">
          <Trophy className="w-12 h-12 text-amber-600 drop-shadow-[2px_2px_0_#000]" />
          <div className="absolute -bottom-2 -right-2 bg-red-400 text-white p-1.5 border-2 border-black rounded-lg shadow-[2px_2px_0_0_#000]">
            <Lock className="w-4 h-4" />
          </div>
        </div>

        {/* Title */}
        <h1 className="font-heading font-black text-2xl sm:text-3xl text-neutral-900 mb-3 leading-tight">
          O Ano Letivo foi Encerrado!
        </h1>

        {/* Description */}
        <p className="text-neutral-700 font-medium text-sm sm:text-base leading-relaxed mb-6">
          Olá, <strong className="text-black font-black">{user?.name || "Aluno"}</strong>! As atividades e o Ranking Anual deste ano letivo foram finalizados pelo professor.
        </p>

        {/* Alert Box */}
        <div className="bg-sky-50 border-2 border-black p-4 rounded-xl text-left mb-6 shadow-[3px_3px_0_0_#000] flex items-start gap-3">
          <Calendar className="w-6 h-6 text-sky-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-neutral-800">
            <p className="font-bold text-sky-950 mb-0.5">O que acontece agora?</p>
            <p>O aplicativo fica temporariamente desativado para alunos e retornará automaticamente assim que o professor iniciar o <strong>Ranking do Próximo Ano</strong>!</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleRefresh}
            disabled={checking}
            className="nb-btn bg-sky-400 hover:bg-sky-500 text-black px-5 py-3 text-sm flex items-center justify-center gap-2 flex-1 font-bold shadow-[3px_3px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px]"
            data-testid="deactivated-refresh-button"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            {checking ? "Verificando..." : "Verificar Status"}
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
