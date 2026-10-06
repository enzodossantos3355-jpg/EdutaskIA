import { useState, useEffect, useCallback } from "react";
import { Clock, RefreshCw, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";

/**
 * Live System Clock component for Admin.
 * Displays real-time synchronized server time (HH:MM:SS and DD/MM/YYYY)
 * to guarantee the admin knows exactly what time the server has,
 * ensuring task cleanup and deadlines run at the intended moment.
 */
export default function AdminSystemClock({ compact = false, nextCleanupTime = null, cleanupEnabled = false, onConfigureCleanup = null }) {
  const [serverOffset, setServerOffset] = useState(0);
  const [serverTime, setServerTime] = useState(new Date());
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [timezone, setTimezone] = useState("");

  const syncWithServer = useCallback(async () => {
    setSyncing(true);
    try {
      const clientReqTime = Date.now();
      const { data } = await api.get("/system/time");
      const clientRecvTime = Date.now();
      const latency = (clientRecvTime - clientReqTime) / 2;
      const actualServerTimestamp = (data.timestamp || new Date(data.iso).getTime()) + latency;
      const offset = actualServerTimestamp - clientRecvTime;
      setServerOffset(offset);
      setServerTime(new Date(Date.now() + offset));
      setLastSync(new Date());
      if (data.timezone) setTimezone(data.timezone);
    } catch {
      // Fallback to local time if network hiccups
      setServerTime(new Date());
    } finally {
      setSyncing(false);
    }
  }, []);

  // Sync on mount and every 30s
  useEffect(() => {
    syncWithServer();
    const syncInterval = setInterval(syncWithServer, 30000);
    return () => clearInterval(syncInterval);
  }, [syncWithServer]);

  // Tick every second
  useEffect(() => {
    const timer = setInterval(() => {
      setServerTime(new Date(Date.now() + serverOffset));
    }, 1000);
    return () => clearInterval(timer);
  }, [serverOffset]);

  const hours = String(serverTime.getHours()).padStart(2, "0");
  const minutes = String(serverTime.getMinutes()).padStart(2, "0");
  const seconds = String(serverTime.getSeconds()).padStart(2, "0");
  const timeString = `${hours}:${minutes}:${seconds}`;
  const dateString = serverTime.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  if (compact) {
    return (
      <div
        className="nb-card px-2.5 sm:px-3 py-1.5 bg-amber-100 text-black flex items-center gap-2 text-xs font-mono select-none border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        title={`Relógio do Servidor: ${timeString} (${timezone || "UTC"}). Clique para sincronizar.`}
        data-testid="admin-system-clock-compact"
      >
        <Clock className="w-3.5 h-3.5 text-neutral-950 animate-pulse flex-shrink-0" />
        <span className="font-bold tracking-wider text-black">{timeString}</span>
        <button
          onClick={syncWithServer}
          disabled={syncing}
          className="hover:text-amber-800 text-neutral-700 p-0.5 transition-colors"
          title="Sincronizar agora"
          aria-label="Sincronizar relógio"
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin text-neutral-950" : ""}`} />
        </button>
      </div>
    );
  }

  return (
    <div
      className="nb-card p-4 sm:p-5 bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 text-neutral-900 border-2 border-black mb-6 relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      data-testid="admin-system-clock-card"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 nb-card bg-amber-300 text-neutral-950 flex items-center justify-center flex-shrink-0 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Clock className="w-6 h-6 animate-pulse" strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-950">
                Relógio do Sistema (Servidor)
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-200 text-emerald-950 px-2 py-0.5 rounded-md border border-emerald-600 font-bold">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-800" />
                Sincronizado
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono font-black text-2xl sm:text-3xl tracking-wider text-black" data-testid="system-time-display">
                {timeString}
              </span>
              <span className="text-xs text-neutral-700 font-bold capitalize">
                • {dateString}
              </span>
            </div>
            <p className="text-[11px] text-neutral-700 mt-0.5 font-medium">
              Horário oficial de execução de rotinas, prazos de entrega e auto-exclusão de tarefas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-amber-900/20 pt-2 sm:pt-0 flex-wrap">
          {nextCleanupTime !== undefined && nextCleanupTime !== null && (
            <button
              onClick={onConfigureCleanup || undefined}
              className={`nb-card bg-white border-2 border-black px-3 py-1.5 text-xs text-left shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                onConfigureCleanup ? "cursor-pointer hover:bg-amber-50 transition-colors" : ""
              }`}
              title={onConfigureCleanup ? "Clique para configurar a auto-exclusão" : undefined}
            >
              <div className="text-[10px] uppercase font-bold text-neutral-600 flex items-center justify-between gap-2">
                <span>Auto-exclusão</span>
                {onConfigureCleanup && <span className="text-amber-800 text-[9px] underline font-bold">Alterar</span>}
              </div>
              <div className="font-mono font-black text-black text-sm">
                {cleanupEnabled ? `Hoje às ${nextCleanupTime}` : "Desativada"}
              </div>
            </button>
          )}

          <button
            onClick={syncWithServer}
            disabled={syncing}
            className="nb-btn bg-white hover:bg-amber-100 text-black px-3 py-1.5 text-xs flex items-center gap-1.5 font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            title="Verificar hora exata com o servidor agora"
            data-testid="sync-system-clock-btn"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin text-neutral-900" : ""}`} />
            <span>{syncing ? "Sincronizando..." : "Sincronizar"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
