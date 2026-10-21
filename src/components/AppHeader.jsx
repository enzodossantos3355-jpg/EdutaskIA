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
  const isMinecraft = user?.equipped_effect === "minecraft";
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
    <header
      className={
        isMinecraft
          ? "border-b-4 border-[#333333] bg-[#757575] sticky top-0 z-30 font-minecraft text-white shadow-md relative overflow-hidden"
          : "border-b-2 border-black bg-white sticky top-0 z-30"
      }
      data-testid="app-header"
    >
      {/* Textura sutil de tijolos de pedra (Stone Bricks) do Minecraft */}
      {isMinecraft && (
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, #000 0px, #000 2px, transparent 2px, transparent 20px), repeating-linear-gradient(90deg, #000 0px, #000 2px, transparent 2px, transparent 40px)`,
          }}
        />
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4 relative z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Logo size={34} />
          <div className="min-w-0">
            <div className={`font-heading font-black text-base sm:text-lg leading-tight ${isMinecraft ? "font-minecraft text-white" : ""}`}>
              <span>Edu</span><span className={isMinecraft ? "text-[#76e3d9]" : "text-sky-500"}>task</span>
            </div>
            <div className={`text-[10px] sm:text-xs font-medium leading-tight truncate max-w-[130px] sm:max-w-none ${isMinecraft ? "font-minecraft text-[#e0e0e0]" : "text-neutral-600"}`}>
              {title}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* Relógio estilo bloco de obsidiana (Imagem 3) */}
          {isMinecraft ? (
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-[#1a0f26] border-2 border-[#3d245c] rounded text-[#fef08a] font-minecraft text-[11px] shadow-inner">
              <AdminSystemClock compact />
            </div>
          ) : user?.role === "admin" && (
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
            <span className={`font-bold text-sm ${isMinecraft ? "font-minecraft text-white" : ""}`} data-testid="user-name">
              {user?.name}
            </span>
            {user?.role === "admin" && user?.email && (
              <span className={`text-xs ${isMinecraft ? "text-[#ccc]" : "text-neutral-600"}`}>{user?.email}</span>
            )}
          </div>
          {isMinecraft ? (
            <span className="hidden sm:inline-flex px-2.5 py-0.5 bg-[#76e3d9] text-black border border-black font-minecraft text-[10px] font-bold rounded shadow-xs" data-testid="user-role-badge">
              {roleLabel}
            </span>
          ) : (
            <span className={`nb-badge hidden sm:inline-flex ${badgeClass}`} data-testid="user-role-badge">{roleLabel}</span>
          )}
          <button
            onClick={handleToggleSound}
            className={
              isMinecraft
                ? "btn-minecraft-wood p-1.5 sm:p-2 text-sm flex items-center justify-center rounded cursor-pointer"
                : "nb-btn bg-white hover:bg-neutral-100 p-1.5 sm:p-2 text-sm flex items-center justify-center rounded-lg"
            }
            title={soundOn ? "Desativar efeitos sonoros" : "Ativar efeitos sonoros"}
            aria-label="Efeitos sonoros"
            data-testid="toggle-sound-btn"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-neutral-400" />}
          </button>
          <button
            onClick={logout}
            className={
              isMinecraft
                ? "btn-minecraft-wood px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer"
                : "nb-btn bg-white hover:bg-red-100 px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-2 text-sm"
            }
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
