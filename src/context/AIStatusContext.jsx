import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { setGlobalFramesDisabled } from "@/lib/effects";

const AIStatusContext = createContext({
  enabled: true,
  aiEnabled: true,
  hidden: false,
  aiHidden: false,
  framesDisabled: false,
  model: "gemini-3.8-flash",
  loading: true,
  refresh: async () => {},
  toggleAI: async () => false,
  toggleHideAI: async () => false,
  toggleFramesDisabled: async () => false,
  changeModel: async () => false,
  setEnabled: () => {},
  setHidden: () => {},
});

export function AIStatusProvider({ children }) {
  const { user } = useAuth();
  const [enabled, setEnabledState] = useState(true);
  const [hidden, setHiddenState] = useState(false);
  const [framesDisabled, setFramesDisabledState] = useState(false);
  const [model, setModelState] = useState("gemini-3.8-flash");
  const [loading, setLoading] = useState(true);

  const applyFramesDisabled = useCallback((val) => {
    const disabledBool = Boolean(val);
    setFramesDisabledState(disabledBool);
    setGlobalFramesDisabled(disabledBool);
  }, []);

  const setEnabled = useCallback((val) => {
    setEnabledState(Boolean(val));
  }, []);

  const setHidden = useCallback((val) => {
    setHiddenState(Boolean(val));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/ai/status");
      if (data) {
        if (typeof data.enabled === "boolean") {
          setEnabledState(data.enabled);
        }
        if (typeof data.hidden === "boolean") {
          setHiddenState(data.hidden);
        }
        if (typeof data.frames_disabled === "boolean") {
          applyFramesDisabled(data.frames_disabled);
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
  }, [applyFramesDisabled]);

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
              if (typeof data.ai_hidden === "boolean") {
                setHiddenState(data.ai_hidden);
              }
              if (typeof data.frames_disabled === "boolean") {
                applyFramesDisabled(data.frames_disabled);
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
  }, [applyFramesDisabled]);

  // 3. Global Toggle Function with Firestore & Backend Persistence
  const toggleAI = useCallback(
    async (newStatus) => {
      setEnabledState(newStatus);
      try {
        const { data } = await api.put("/ai/status", { enabled: newStatus });
        if (data) {
          if (typeof data.enabled === "boolean") setEnabledState(data.enabled);
          if (typeof data.hidden === "boolean") setHiddenState(data.hidden);
          if (typeof data.frames_disabled === "boolean") applyFramesDisabled(data.frames_disabled);
          if (data.model) setModelState(data.model);
        }
        return true;
      } catch (err) {
        await refresh();
        throw err;
      }
    },
    [refresh, applyFramesDisabled]
  );

  // 3b. Toggle Hide AI Function
  const toggleHideAI = useCallback(
    async (newHidden) => {
      setHiddenState(newHidden);
      try {
        const { data } = await api.put("/ai/status", { hidden: newHidden });
        if (data) {
          if (typeof data.enabled === "boolean") setEnabledState(data.enabled);
          if (typeof data.hidden === "boolean") setHiddenState(data.hidden);
          if (typeof data.frames_disabled === "boolean") applyFramesDisabled(data.frames_disabled);
          if (data.model) setModelState(data.model);
        }
        return true;
      } catch (err) {
        await refresh();
        throw err;
      }
    },
    [refresh, applyFramesDisabled]
  );

  // 3c. Toggle Disable Frames Function
  const toggleFramesDisabled = useCallback(
    async (newDisabled) => {
      applyFramesDisabled(newDisabled);
      try {
        const { data } = await api.put("/ai/status", { frames_disabled: newDisabled });
        if (data) {
          if (typeof data.enabled === "boolean") setEnabledState(data.enabled);
          if (typeof data.hidden === "boolean") setHiddenState(data.hidden);
          if (typeof data.frames_disabled === "boolean") applyFramesDisabled(data.frames_disabled);
          if (data.model) setModelState(data.model);
        }
        return true;
      } catch (err) {
        await refresh();
        throw err;
      }
    },
    [refresh, applyFramesDisabled]
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
        hidden,
        aiHidden: hidden,
        framesDisabled,
        model,
        loading,
        refresh,
        toggleAI,
        toggleHideAI,
        toggleFramesDisabled,
        changeModel,
        setEnabled,
        setHidden,
      }}
    >
      {children}
    </AIStatusContext.Provider>
  );
}

export function useAIStatus() {
  return useContext(AIStatusContext);
}
