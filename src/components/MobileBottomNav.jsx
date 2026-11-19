import { CheckSquare, Megaphone, BookOpen, ShoppingBag, User, Lock } from "lucide-react";

export default function MobileBottomNav({
  activeTab,
  onTabChange,
  framesDisabled,
  studentAreas,
  hasUnreadAnnouncements = false,
  isMentalist = false,
}) {
  const navItems = [
    { id: "tasks", label: "Tarefas", icon: CheckSquare },
    { id: "announcements", label: "Avisos", icon: Megaphone },
    { id: "resumos", label: "Estudos", icon: BookOpen },
    ...(!framesDisabled ? [{ id: "store", label: "Loja", icon: ShoppingBag }] : []),
    { id: "profile", label: "Perfil", icon: User },
  ];

  const isAnnouncementsEnabled = studentAreas?.announcements !== false;

  return (
    <div
      className={`sm:hidden fixed bottom-0 left-0 right-0 z-40 border-t-3 border-black p-1.5 flex items-center justify-around shadow-[0_-4px_0_0_#000] pb-safe ${
        isMentalist ? "bg-[#5b0e14] text-[#fdf6e7]" : "bg-white"
      }`}
      data-testid="mobile-bottom-nav"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        const isLocked =
          ["tasks", "announcements", "resumos"].includes(item.id) &&
          studentAreas?.[item.id] === false;
        const isUnreadAnnouncements =
          item.id === "announcements" && isAnnouncementsEnabled && !isLocked && hasUnreadAnnouncements;

        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`mentalist-btn-keep flex-1 py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all relative ${
              isActive
                ? isLocked
                  ? "bg-neutral-300 text-neutral-900 border-2 border-neutral-800 font-black shadow-[2px_2px_0_0_#262626] -translate-y-0.5"
                  : isMentalist
                  ? "bg-[#e2b03a] text-[#1a0505] border-2 border-black font-black shadow-[2px_2px_0_0_#000] -translate-y-0.5"
                  : "bg-amber-300 text-black border-2 border-black font-black shadow-[2px_2px_0_0_#000] -translate-y-0.5"
                : isLocked
                ? isMentalist
                  ? "text-[#e5d5b5]/75 font-bold hover:bg-white/10"
                  : "text-neutral-500 font-bold hover:bg-neutral-100"
                : isUnreadAnnouncements
                ? "bg-violet-100 text-violet-950 border-2 border-violet-800 font-black shadow-[2px_2px_0_0_rgba(109,40,217,1)]"
                : isMentalist
                ? "text-[#f5e6c8] font-bold hover:bg-white/10"
                : "text-neutral-700 font-bold hover:bg-neutral-100"
            }`}
            data-testid={`mobile-nav-${item.id}`}
          >
            <div className="relative">
              <Icon
                className={`w-5 h-5 ${
                  isLocked
                    ? isActive
                      ? "text-neutral-800"
                      : isMentalist
                      ? "text-[#e5d5b5]/75"
                      : "text-neutral-500"
                    : isActive
                    ? "text-black"
                    : isUnreadAnnouncements
                    ? "text-violet-900"
                    : isMentalist
                    ? "text-[#f5e6c8]"
                    : "text-neutral-600"
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {isUnreadAnnouncements && !isActive && (
                <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-black"></span>
                </span>
              )}
            </div>
            <span className="text-[10px] leading-none uppercase font-heading flex items-center gap-0.5">
              {item.label}
              {isLocked && (
                <Lock
                  className="w-2.5 h-2.5 flex-shrink-0"
                  data-testid={`mobile-nav-lock-${item.id}`}
                />
              )}
              {isUnreadAnnouncements && !isActive && (
                <span className="nb-badge bg-red-500 text-white text-[8px] font-black px-1 py-0 leading-tight border border-black">
                  !
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
