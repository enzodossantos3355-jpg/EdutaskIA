import { LogOut, Download, Bell, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { usePWA } from "@/context/PWAContext";
import Logo from "@/components/Logo";
import Avatar from "@/components/Avatar";
import AdminSystemClock from "@/components/AdminSystemClock";

export default function AppHeader({ title }) {
  const { user, logout } = useAuth();
  const {
    canInstallOrGuide,
    installApp,
    pushSupported,
    pushSubscribed,
    pushLoading,
    requiresIOSInstallForPush,
    enablePush,
    disablePush,
  } = usePWA();
  const roleLabel = user?.role === "admin" ? "Admin" : "Aluno";
  const badgeClass = user?.role === "admin" ? "bg-red-300" : "bg-sky-300";

  const handleTogglePush = async () => {
    if (pushLoading) return;
    if (requiresIOSInstallForPush) {
      toast.info("No iPhone/iPad, adicione o EduTask IA à Tela de Início primeiro para receber notificações.");
      installApp();
      return;
    }
    try {
      if (pushSubscribed) {
        await disablePush();
        toast.info("Notificações neste aparelho desativadas.");
      } else {
        await enablePush();
        toast.success("Notificações ativadas! Você receberá avisos de novas tarefas e comunicados.");
      }
    } catch (err) {
      toast.error(err?.message || "Não foi possível ativar as notificações.");
    }
  };

  return (
    <header
      className="border-b-2 border-black bg-white sticky top-0 z-30"
      data-testid="app-header"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4 relative z-10">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Logo size={34} />
          <div className="min-w-0">
            <div className="font-heading font-black text-base sm:text-lg leading-tight">
              <span>Edu</span><span className="text-sky-500">task</span>
            </div>
            <div className="text-[10px] sm:text-xs font-medium leading-tight truncate max-w-[130px] sm:max-w-none text-neutral-600">
              {title}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {user?.role === "admin" && (
            <div className="block">
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
            <span className="font-bold text-sm" data-testid="user-name">
              {user?.name}
            </span>
            {user?.role === "admin" && user?.email && (
              <span className="text-xs text-neutral-600">{user?.email}</span>
            )}
          </div>
          <span className={`nb-badge hidden sm:inline-flex ${badgeClass}`} data-testid="user-role-badge">
            {roleLabel}
          </span>
          {user?.role === "aluno" && (pushSupported || requiresIOSInstallForPush) && (
            <button
              type="button"
              onClick={handleTogglePush}
              disabled={pushLoading}
              className={`nb-btn px-2 sm:px-2.5 py-1.5 sm:py-2 text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0_0_#000] ${
                pushSubscribed
                  ? "bg-emerald-300 hover:bg-emerald-400 text-emerald-950"
                  : "bg-white hover:bg-sky-100 text-neutral-900"
              }`}
              title={
                pushSubscribed
                  ? "Notificações ativadas — clique para desativar"
                  : "Ativar notificações de tarefas e avisos"
              }
              aria-label={pushSubscribed ? "Desativar notificações" : "Ativar notificações"}
              data-testid="toggle-push-btn"
            >
              {pushLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : pushSubscribed ? (
                <BellRing className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                <Bell className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
              <span className="hidden lg:inline">
                {pushSubscribed ? "Notificações ativas" : "Ativar avisos"}
              </span>
            </button>
          )}
          {canInstallOrGuide && (
            <button
              onClick={installApp}
              className="nb-btn bg-amber-300 hover:bg-amber-400 text-black px-2 sm:px-2.5 py-1.5 sm:py-2 text-xs font-black flex items-center gap-1.5 shadow-[2px_2px_0_0_#000]"
              title="Instalar aplicativo EduTask IA na tela inicial"
              aria-label="Instalar aplicativo"
              data-testid="header-pwa-install-btn"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden md:inline">Instalar app</span>
            </button>
          )}
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
