import { useEffect, useState } from "react";
import { Pencil, ShoppingBag } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import AvatarUploader from "@/components/AvatarUploader";
import { effectClass } from "@/lib/effects";
import EditProfileDialog from "@/components/EditProfileDialog";
import StatsCard from "@/components/StatsCard";
import Avatar from "@/components/Avatar";

/**
 * Banner shown at top of admin and student dashboards letting the user
 * change their own avatar, name and password. Also shows stats for alunos.
 */
export default function MyProfileBanner({ bg = "bg-amber-200", onOpenStore = null }) {
  const { user, refresh } = useAuth();
  const [hasAvatar, setHasAvatar] = useState(Boolean(user?.has_avatar));
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (user?.role === "aluno") {
      api.get("/me/stats").then(({ data }) => setStats(data)).catch(() => {});
    }
  }, [user?.role]);

  if (!user) return null;
  const isAluno = user.role === "aluno";

  return (
    <div className={`nb-card p-3.5 sm:p-5 mb-4 sm:mb-8 ${bg}`} data-testid="my-profile-banner">
      <div className="flex items-start justify-between flex-wrap gap-3 sm:gap-5">
        <div className="flex items-center gap-3 sm:gap-4">
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
          />
          <div className="min-w-0">
            <p className="font-heading font-bold text-base sm:text-lg leading-tight flex items-center gap-2">
              <span className="truncate">{user.name}</span>
            </p>
            <p className="text-xs text-neutral-700">{user.role === "admin" ? "Administrador" : "Aluno"}</p>
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
            {isAluno && onOpenStore && (
              <button
                onClick={onOpenStore}
                className="nb-btn bg-amber-300 hover:bg-amber-400 text-neutral-950 px-2.5 py-1 text-xs font-bold flex items-center gap-1.5 mt-1.5"
                data-testid="profile-open-store-button"
                title="Acessar a Loja de Molduras"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-950" />
                <span>Loja de Molduras</span>
                <span className="nb-badge bg-white text-[10px] ml-0.5">{user.points || 0} pts</span>
              </button>
            )}
          </div>
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
