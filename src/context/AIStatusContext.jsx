import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const AIStatusContext = createContext({
  enabled: true,
  aiEnabled: true,
  model: "gemini-3.8-flash",
  loading: true,
  refresh: async () => {},
  toggleAI: async () => false,
  changeModel: async () => false,
  setEnabled: () => {},
});

export function AIStatusProvider({ children }) {
  const { user } = useAuth();
  const [enabled, setEnabledState] = useState(true);
  const [model, setModelState] = useState("gemini-3.8-flash");
  const [loading, setLoading] = useState(true);

  const setEnabled = useCallback((val) => {
    setEnabledState(Boolean(val));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/ai/status");
      if (data) {
        if (typeof data.enabled === "boolean") {
          setEnabledState(data.enabled);
        }
        if (data.model) {
          setModelState(data.model);
        }
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
            if (data) {
              if (typeof data.ai_enabled === "boolean") {
                setEnabledState(data.ai_enabled);
              }
              if (data.ai_model) {
                setModelState(data.ai_model);
              }
            }
          }
        },
        (err) => {
          if (unsubscribeSystem) {
            try {
              unsubscribeSystem();
            } catch {
              // ignore
            }
            unsubscribeSystem = null;
          }
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
      setEnabledState(newStatus);
      try {
        const { data } = await api.put("/ai/status", { enabled: newStatus });
        if (data) {
          if (typeof data.enabled === "boolean") setEnabledState(data.enabled);
          if (data.model) setModelState(data.model);
        }
        return true;
      } catch (err) {
        await refresh();
        throw err;
      }
    },
    [refresh]
  );

  // 4. Gemini Model Selector Function
  const changeModel = useCallback(
    async (newModel) => {
      setModelState(newModel);
      try {
        const { data } = await api.put("/ai/status", { model: newModel });
        if (data && data.model) {
          setModelState(data.model);
        }
        return true;
      } catch (err) {
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
        model,
        loading,
        refresh,
        toggleAI,
        changeModel,
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
