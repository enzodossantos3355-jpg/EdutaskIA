import { useEffect, useState } from "react";
import { Pencil, Bot } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useAIStatus } from "@/context/AIStatusContext";
import api from "@/lib/api";
import AvatarUploader from "@/components/AvatarUploader";
import { effectClass, getTheme } from "@/lib/themes";
import EditProfileDialog from "@/components/EditProfileDialog";
import StatsCard from "@/components/StatsCard";
import Avatar from "@/components/Avatar";

/**
 * Banner shown at top of admin and student dashboards letting the user
 * change their own avatar, name and password. Also shows stats for alunos and active theme.
 */
export default function MyProfileBanner({ bg = null, onOpenStore = null, showStatsDetails = true }) {
  const { user, refresh } = useAuth();
  const { framesDisabled } = useAIStatus();
  const [hasAvatar, setHasAvatar] = useState(Boolean(user?.has_avatar));
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const currentTheme = getTheme(user?.equipped_effect);
  const bannerBg = bg || currentTheme.dashboardBannerClass || "bg-amber-200 border-2 border-black";

  useEffect(() => {
    const fetchMyStats = () => {
      if (user?.role === "aluno") {
        setStatsLoading(true);
        api.get("/me/stats")
          .then(({ data }) => setStats(data))
          .catch(() => {})
          .finally(() => setStatsLoading(false));
      } else {
        setStatsLoading(false);
      }
    };
    fetchMyStats();
    window.addEventListener("task-completed", fetchMyStats);
    window.addEventListener("tasks-updated", fetchMyStats);
    window.addEventListener("prize-updated", fetchMyStats);
    return () => {
      window.removeEventListener("task-completed", fetchMyStats);
      window.removeEventListener("tasks-updated", fetchMyStats);
      window.removeEventListener("prize-updated", fetchMyStats);
    };
  }, [user?.role]);

  if (!user) return null;
  const isAluno = user.role === "aluno";

  return (
    <div className={`nb-card p-3 sm:p-4 mb-4 sm:mb-6 transition-all duration-300 ${bannerBg}`} data-testid="my-profile-banner">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 w-full">
        <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
          <AvatarUploader
            userId={user.id}
            name={user.name}
            hasAvatar={hasAvatar}
            onChanged={(present) => {
              setHasAvatar(present);
              refresh();
            }}
            path="/me/avatar"
            size={48}
            bg={user.role === "admin" ? "bg-red-300" : "bg-sky-300"}
            effect={effectClass(user.equipped_effect)}
            compact={true}
            showLabelButtons={false}
          />
          <div className="min-w-0 flex-1">
            <p className="font-heading font-bold text-base sm:text-lg leading-tight flex items-center gap-2 flex-wrap text-black">
              <span className="truncate">{user.name}</span>
              {user.status === "bot" && (
                <span className="nb-badge bg-cyan-200 text-cyan-950 border border-black text-[10px] font-black inline-flex items-center gap-1">
                  <Bot className="w-3 h-3" /> Sandbox
                </span>
              )}
            </p>
            <p className="text-xs font-semibold text-black/80">
              {user.role === "admin" ? "Administrador" : user.status === "bot" ? "Aluno (Teste Sandbox)" : "Aluno"}
            </p>
            {user.role === "admin" && (
              <button
                onClick={() => setEditing(true)}
                className="nb-btn bg-white hover:bg-sky-100 px-2.5 py-0.5 text-xs flex items-center gap-1 mt-1 font-bold"
                data-testid="open-edit-profile-button"
              >
                <Pencil className="w-3 h-3" />
                Editar perfil
              </button>
            )}
          </div>
        </div>

        {isAluno && (
          <div className="flex-1 min-w-full sm:min-w-[280px] max-w-2xl">
            <StatsCard stats={stats} loading={statsLoading} onOpenStore={!framesDisabled ? onOpenStore : null} showDetails={showStatsDetails} />
          </div>
        )}

        {!isAluno && (
          <div className="text-xs text-neutral-800 max-w-xs hidden sm:block">
            <p className="font-bold">Painel de Perfil</p>
            <p>Gerencie tarefas, alunos e avisos da escola.</p>
          </div>
        )}
      </div>

      {editing && user.role === "admin" && (
        <EditProfileDialog
          userId={user.id}
          hasAvatar={hasAvatar}
          avatarPath="/me/avatar"
          initialName={user.name}
          path="/me"
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}
