import { useEffect, useState } from "react";
import { Clock as ClockIcon } from "lucide-react";

/**
 * Floating clock. On mobile anchors to bottom-right (compact),
 * on sm+ screens anchors to top-right below header.
 */
export default function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);

  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const date = now.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });

  return (
    <div
      className="fixed bottom-3 right-3 sm:top-20 sm:right-4 sm:bottom-auto z-40 nb-card bg-white text-black px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center gap-2 select-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
      data-testid="floating-clock"
    >
      <ClockIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" strokeWidth={2.5} />
      <div className="leading-tight">
        <div className="font-mono font-bold text-sm sm:text-base tabular-nums text-black">{hh}:{mm}<span className="hidden sm:inline">:{ss}</span></div>
        <div className="text-[9px] sm:text-[10px] text-neutral-700 uppercase tracking-wider font-semibold">{date}</div>
      </div>
    </div>
  );
}
