import { useEffect, useState } from "react";
import { Pencil, ShoppingBag, Palette } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
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
export default function MyProfileBanner({ bg = null, onOpenStore = null }) {
  const { user, refresh } = useAuth();
  const [hasAvatar, setHasAvatar] = useState(Boolean(user?.has_avatar));
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState(null);

  const currentTheme = getTheme(user?.equipped_effect);
  const bannerBg = bg || currentTheme.dashboardBannerClass || "bg-amber-200 border-2 border-black";

  useEffect(() => {
    const fetchMyStats = () => {
      if (user?.role === "aluno") {
        api.get("/me/stats").then(({ data }) => setStats(data)).catch(() => {});
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
    <div className={`nb-card p-3.5 sm:p-5 mb-4 sm:mb-8 transition-all duration-300 ${bannerBg}`} data-testid="my-profile-banner">
      <div className="flex flex-col md:flex-row items-stretch md:items-start justify-between gap-3 sm:gap-5 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full md:w-auto min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <AvatarUploader
              userId={user.id}
              name={user.name}
              hasAvatar={hasAvatar}
              onChanged={(present) => {
                setHasAvatar(present);
                refresh();
              }}
              path="/me/avatar"
              size={56}
              bg={user.role === "admin" ? "bg-red-300" : "bg-sky-300"}
              effect={effectClass(user.equipped_effect)}
              compact={false}
            />
            <div className="min-w-0 flex-1">
              <p className="font-heading font-bold text-base sm:text-lg leading-tight flex items-center gap-2 flex-wrap text-black">
                <span className="truncate">{user.name}</span>
              </p>
              <p className="text-xs font-semibold text-black/85">{user.role === "admin" ? "Administrador" : "Aluno"}</p>
              {user.role === "admin" && (
                <button
                  onClick={() => setEditing(true)}
                  className="nb-btn bg-white hover:bg-sky-100 px-3 py-1 text-xs flex items-center gap-1.5 mt-2"
                  data-testid="open-edit-profile-button"
                >
                  <Pencil className="w-3 h-3" />
                  Editar nome / senha
                </button>
              )}
            </div>
          </div>

          {onOpenStore && (
            <div className="w-full sm:w-auto">
              <button
                onClick={onOpenStore}
                className="nb-btn bg-amber-300 hover:bg-amber-400 active:bg-amber-500 text-neutral-950 px-3.5 py-2 text-xs sm:text-sm font-bold flex items-center justify-center sm:justify-start gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] min-h-[40px] w-full sm:w-auto touch-manipulation active:translate-y-0.5"
                data-testid="profile-open-store-button"
                title="Acessar a Loja de Molduras"
              >
                <Palette className="w-4 h-4 text-amber-950 flex-shrink-0" />
                <span className="font-heading font-black">Loja de Molduras</span>
                <span className="text-sm">🖼️</span>
              </button>
            </div>
          )}
        </div>
        {isAluno && stats && (
          <div className="flex-1 min-w-full sm:min-w-[280px] max-w-2xl">
            <StatsCard stats={stats} onOpenStore={onOpenStore} />
          </div>
        )}
        {!isAluno && (
          <div className="text-sm text-neutral-700 max-w-sm hidden sm:block">
            <p className="font-bold mb-1">Personalize seu perfil</p>
            <p>Sua foto e nome aparecem na tela de seleção de perfil.</p>
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
