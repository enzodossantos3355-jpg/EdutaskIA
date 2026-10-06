import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const AIStatusContext = createContext({
  enabled: true,
  aiEnabled: true,
  loading: true,
  refresh: async () => {},
  toggleAI: async () => false,
  setEnabled: () => {},
});

export function AIStatusProvider({ children }) {
  const { user } = useAuth();
  const [enabled, setEnabledState] = useState(true);
  const [loading, setLoading] = useState(true);

  const setEnabled = useCallback((val) => {
    setEnabledState(Boolean(val));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/ai/status");
      if (data && typeof data.enabled === "boolean") {
        setEnabledState(data.enabled);
      }
    } catch {
      // Default to true or keep current state on network error
    } finally {
      setLoading(false);
    }
  }, []);

  // 1. Initial fetch from Backend API
  useEffect(() => {
    refresh();
  }, [refresh, user]);

  // 2. Real-Time Firestore Synchronization for Instant Multi-Device / Multi-Tab Updates
  useEffect(() => {
    let unsubscribeSystem = null;

    try {
      const systemDocRef = doc(db, "settings", "system");
      unsubscribeSystem = onSnapshot(
        systemDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data && typeof data.ai_enabled === "boolean") {
              setEnabledState(data.ai_enabled);
            }
          }
        },
        (err) => {
          // Fallback gracefully without breaking UI
          console.warn("[AIStatusContext] Firestore listener notice:", err?.message || err);
        }
      );
    } catch (e) {
      console.warn("[AIStatusContext] Firestore snapshot initialization skipped:", e);
    }

    return () => {
      if (unsubscribeSystem) unsubscribeSystem();
    };
  }, []);

  // 3. Global Toggle Function with Firestore & Backend Persistence
  const toggleAI = useCallback(
    async (newStatus) => {
      // Optimistic update
      setEnabledState(newStatus);
      try {
        const { data } = await api.put("/ai/status", { enabled: newStatus });
        if (data && typeof data.enabled === "boolean") {
          setEnabledState(data.enabled);
        }
        return true;
      } catch (err) {
        // Revert on failure
        await refresh();
        throw err;
      }
    },
    [refresh]
  );

  return (
    <AIStatusContext.Provider
      value={{
        enabled,
        aiEnabled: enabled,
        loading,
        refresh,
        toggleAI,
        setEnabled,
      }}
    >
      {children}
    </AIStatusContext.Provider>
  );
}

export function useAIStatus() {
  return useContext(AIStatusContext);
}
