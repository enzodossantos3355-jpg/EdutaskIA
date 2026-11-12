import { CheckSquare, Megaphone, BookOpen, ShoppingBag, User } from "lucide-react";

export default function MobileBottomNav({ activeTab, onTabChange, framesDisabled, hasUnreadAnnouncements = false }) {
  const navItems = [
    { id: "tasks", label: "Tarefas", icon: CheckSquare },
    { id: "announcements", label: "Avisos", icon: Megaphone },
    { id: "resumos", label: "Estudos", icon: BookOpen },
    ...(!framesDisabled ? [{ id: "store", label: "Loja", icon: ShoppingBag }] : []),
    { id: "profile", label: "Perfil", icon: User },
  ];

  return (
    <div
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-3 border-black p-1.5 flex items-center justify-around shadow-[0_-4px_0_0_#000] pb-safe"
      data-testid="mobile-bottom-nav"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        const isUnreadAnnouncements = item.id === "announcements" && hasUnreadAnnouncements;

        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex-1 py-1.5 px-1 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-all relative ${
              isActive
                ? "bg-amber-300 text-black border-2 border-black font-black shadow-[2px_2px_0_0_#000] -translate-y-0.5"
                : isUnreadAnnouncements
                ? "bg-violet-100 text-violet-950 border-2 border-violet-800 font-black shadow-[2px_2px_0_0_rgba(109,40,217,1)]"
                : "text-neutral-700 font-bold hover:bg-neutral-100"
            }`}
            data-testid={`mobile-nav-${item.id}`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 ${isActive ? "text-black" : isUnreadAnnouncements ? "text-violet-900" : "text-neutral-600"}`} strokeWidth={isActive ? 2.5 : 2} />
              {isUnreadAnnouncements && !isActive && (
                <span className="absolute -top-1 -right-1.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-black"></span>
                </span>
              )}
            </div>
            <span className="text-[10px] leading-none uppercase font-heading flex items-center gap-0.5">
              {item.label}
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
