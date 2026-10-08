import { useEffect, useState, useCallback } from "react";
import { Clock as ClockIcon } from "lucide-react";
import api from "@/lib/api";

/**
 * Floating clock sincronizado com o Relógio do Sistema (Servidor).
 * On mobile anchors to bottom-right (compact),
 * on sm+ screens anchors to top-right below header.
 */
export default function Clock() {
  const [serverOffset, setServerOffset] = useState(0);
  const [serverTime, setServerTime] = useState(() => new Date());

  const syncWithServer = useCallback(async () => {
    try {
      const clientReqTime = Date.now();
      const { data } = await api.get("/system/time");
      const clientRecvTime = Date.now();
      const latency = (clientRecvTime - clientReqTime) / 2;
      const actualServerTimestamp = (data.timestamp || new Date(data.iso).getTime()) + latency;
      const offset = actualServerTimestamp - clientRecvTime;
      setServerOffset(offset);
      setServerTime(new Date(Date.now() + offset));
    } catch {
      // Fallback em caso de erro de rede temporário
      setServerTime(new Date());
    }
  }, []);

  useEffect(() => {
    syncWithServer();
    const syncInterval = setInterval(syncWithServer, 30000);
    return () => clearInterval(syncInterval);
  }, [syncWithServer]);

  useEffect(() => {
    const timer = setInterval(() => {
      setServerTime(new Date(Date.now() + serverOffset));
    }, 1000);
    return () => clearInterval(timer);
  }, [serverOffset]);

  const timeString = serverTime.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const [hh, mm, ss] = timeString.split(":");
  const date = serverTime.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  return (
    <div
      className="fixed bottom-3 right-3 sm:top-20 sm:right-4 sm:bottom-auto z-40 nb-card bg-white text-black px-2.5 py-1.5 sm:px-3 sm:py-2 flex items-center gap-2 select-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
      data-testid="floating-clock"
      title="Relógio Oficial do Sistema (Sincronizado)"
    >
      <ClockIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" strokeWidth={2.5} />
      <div className="leading-tight">
        <div className="font-mono font-bold text-sm sm:text-base tabular-nums text-black">{hh}:{mm}<span className="hidden sm:inline">:{ss}</span></div>
        <div className="text-[9px] sm:text-[10px] text-neutral-700 uppercase tracking-wider font-semibold">{date}</div>
      </div>
    </div>
  );
}
