import { useState, useEffect } from "react";
import { LogOut, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import Logo from "@/components/Logo";
import Avatar from "@/components/Avatar";
import AdminSystemClock from "@/components/AdminSystemClock";
import { isSoundEnabled, toggleSound } from "@/lib/soundEffects";

export default function AppHeader({ title }) {
  const { user, logout } = useAuth();
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const roleLabel = user?.role === "admin" ? "Admin" : "Aluno";
  const badgeClass = user?.role === "admin" ? "bg-red-300" : "bg-sky-300";

  useEffect(() => {
    const handler = (e) => setSoundOn(e.detail?.enabled);
    window.addEventListener("sound-setting-changed", handler);
    return () => window.removeEventListener("sound-setting-changed", handler);
  }, []);

  const handleToggleSound = () => {
    const next = toggleSound();
    setSoundOn(next);
    toast.info(next ? "🔊 Efeitos sonoros ativados!" : "🔇 Efeitos sonoros desativados!");
  };

  return (
    <header className="border-b-2 border-black bg-white sticky top-0 z-30" data-testid="app-header">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Logo size={34} />
          <div className="min-w-0">
            <div className="font-heading font-black text-base sm:text-lg leading-tight">
              <span>Edu</span><span className="text-sky-500">task</span>
            </div>
            <div className="text-[10px] sm:text-xs text-neutral-600 font-medium leading-tight truncate max-w-[130px] sm:max-w-none">
              {title}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {user?.role === "admin" && (
            <div className="hidden sm:block">
              <AdminSystemClock compact />
            </div>
          )}
          {user && (
            <Avatar
              userId={user.id}
              name={user.name}
              size={32}
              hasAvatar={user.has_avatar}
              bg={badgeClass}
            />
          )}
          <div className="hidden md:flex flex-col items-end leading-tight">
            <span className="font-bold text-sm" data-testid="user-name">{user?.name}</span>
            {user?.role === "admin" && user?.email && (
              <span className="text-xs text-neutral-600">{user?.email}</span>
            )}
          </div>
          <span className={`nb-badge hidden sm:inline-flex ${badgeClass}`} data-testid="user-role-badge">{roleLabel}</span>
          <button
            onClick={handleToggleSound}
            className="nb-btn bg-white hover:bg-neutral-100 p-1.5 sm:p-2 text-sm flex items-center justify-center rounded-lg"
            title={soundOn ? "Desativar efeitos sonoros" : "Ativar efeitos sonoros"}
            aria-label="Efeitos sonoros"
            data-testid="toggle-sound-btn"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-700" /> : <VolumeX className="w-4 h-4 text-neutral-400" />}
          </button>
          <button
            onClick={logout}
            className="nb-btn bg-white hover:bg-red-100 px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-2 text-sm"
            data-testid="logout-button"
            aria-label="Sair"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
