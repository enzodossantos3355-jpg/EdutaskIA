import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { firebaseService } from "@/lib/firebaseService";
import { useAuth } from "@/context/AuthContext";
import { setGlobalFramesDisabled, setGlobalFrameRotationDisabled } from "@/lib/effects";

const AIStatusContext = createContext({
  enabled: true,
  aiEnabled: true,
  hidden: false,
  aiHidden: false,
  framesDisabled: false,
  frameRotationDisabled: true,
  model: "gemini-3.8-flash",
  loading: true,
  refresh: async () => {},
  toggleAI: async () => false,
  toggleHideAI: async () => false,
  toggleFramesDisabled: async () => false,
  toggleFrameRotationDisabled: async () => false,
  changeModel: async () => false,
  setEnabled: () => {},
  setHidden: () => {},
});

export function AIStatusProvider({ children }) {
  const { user } = useAuth();
  const [enabledState, setEnabledState] = useState(true);
  const [hiddenState, setHiddenState] = useState(false);
  const [framesDisabled, setFramesDisabledState] = useState(false);
  const [frameRotationDisabled, setFrameRotationDisabledState] = useState(true);
  const [modelState, setModelState] = useState("gemini-3.8-flash");
  const [loading, setLoading] = useState(true);

  const applyFramesDisabled = useCallback((val) => {
    setFramesDisabledState(val);
    setGlobalFramesDisabled(val);
  }, []);

  const applyFrameRotationDisabled = useCallback((val) => {
    setFrameRotationDisabledState(val);
    setGlobalFrameRotationDisabled(val);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [{ data }, statusRes] = await Promise.all([
        api.get("/ai/status"),
        api.get("/app-status").catch(() => ({ data: null })),
      ]);
      if (statusRes?.data?.collection_prefix !== undefined) {
        firebaseService.setCollectionPrefix(statusRes.data.collection_prefix);
      }
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
        if (typeof data.frame_rotation_disabled === "boolean") {
          applyFrameRotationDisabled(data.frame_rotation_disabled);
        }
        if (data.model) {
          setModelState(data.model);
        }
      }
    } catch {
      // Default state
    } finally {
      setLoading(false);
    }
  }, [applyFramesDisabled, applyFrameRotationDisabled]);

  useEffect(() => {
    refresh();
  }, [refresh, user]);

  useEffect(() => {
    let unsubscribeSystem = null;
    let cancelled = false;

    const attach = async () => {
      try {
        const statusRes = await api.get("/app-status").catch(() => null);
        if (cancelled) return;
        if (statusRes?.data?.collection_prefix !== undefined) {
          firebaseService.setCollectionPrefix(statusRes.data.collection_prefix);
        }
        unsubscribeSystem = firebaseService.subscribeToSystemSettings(
          (data) => {
            if (!data) return;
            if (typeof data.ai_enabled === "boolean") {
              setEnabledState(data.ai_enabled);
            }
            if (typeof data.ai_hidden === "boolean") {
              setHiddenState(data.ai_hidden);
            }
            if (typeof data.frames_disabled === "boolean") {
              applyFramesDisabled(data.frames_disabled);
            }
            if (typeof data.frame_rotation_disabled === "boolean") {
              applyFrameRotationDisabled(data.frame_rotation_disabled);
            }
            if (data.ai_model) {
              setModelState(data.ai_model);
            }
          },
          () => {}
        );
      } catch (e) {
        console.warn("[AIStatusContext] Firestore snapshot skipped:", e);
      }
    };

    attach();

    return () => {
      cancelled = true;
      if (unsubscribeSystem) unsubscribeSystem();
    };
  }, [applyFramesDisabled, applyFrameRotationDisabled]);

  const toggleAI = useCallback(
    async (newStatus) => {
      setEnabledState(newStatus);
      try {
        const { data } = await api.put("/ai/status", { enabled: newStatus });
        if (data) {
          if (typeof data.enabled === "boolean") setEnabledState(data.enabled);
          if (typeof data.hidden === "boolean") setHiddenState(data.hidden);
          if (typeof data.frames_disabled === "boolean") applyFramesDisabled(data.frames_disabled);
          if (typeof data.frame_rotation_disabled === "boolean") applyFrameRotationDisabled(data.frame_rotation_disabled);
          if (data.model) setModelState(data.model);
        }
        return true;
      } catch (err) {
        await refresh();
        throw err;
      }
    },
    [refresh, applyFramesDisabled, applyFrameRotationDisabled]
  );

  const toggleHideAI = useCallback(
    async (newHidden) => {
      setHiddenState(newHidden);
      try {
        const { data } = await api.put("/ai/status", { hidden: newHidden });
        if (data) {
          if (typeof data.enabled === "boolean") setEnabledState(data.enabled);
          if (typeof data.hidden === "boolean") setHiddenState(data.hidden);
          if (typeof data.frames_disabled === "boolean") applyFramesDisabled(data.frames_disabled);
          if (typeof data.frame_rotation_disabled === "boolean") applyFrameRotationDisabled(data.frame_rotation_disabled);
          if (data.model) setModelState(data.model);
        }
        return true;
      } catch (err) {
        await refresh();
        throw err;
      }
    },
    [refresh, applyFramesDisabled, applyFrameRotationDisabled]
  );

  const toggleFramesDisabled = useCallback(
    async (newDisabled) => {
      applyFramesDisabled(newDisabled);
      try {
        const { data } = await api.put("/ai/status", { frames_disabled: newDisabled });
        if (data) {
          if (typeof data.enabled === "boolean") setEnabledState(data.enabled);
          if (typeof data.hidden === "boolean") setHiddenState(data.hidden);
          if (typeof data.frames_disabled === "boolean") applyFramesDisabled(data.frames_disabled);
          if (typeof data.frame_rotation_disabled === "boolean") applyFrameRotationDisabled(data.frame_rotation_disabled);
          if (data.model) setModelState(data.model);
        }
        return true;
      } catch (err) {
        await refresh();
        throw err;
      }
    },
    [refresh, applyFramesDisabled, applyFrameRotationDisabled]
  );

  const toggleFrameRotationDisabled = useCallback(
    async (newDisabled) => {
      applyFrameRotationDisabled(newDisabled);
      try {
        const { data } = await api.put("/ai/status", { frame_rotation_disabled: newDisabled });
        if (data) {
          if (typeof data.frame_rotation_disabled === "boolean") {
            applyFrameRotationDisabled(data.frame_rotation_disabled);
          }
        }
        return true;
      } catch (err) {
        await refresh();
        throw err;
      }
    },
    [refresh, applyFrameRotationDisabled]
  );

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
        enabled: enabledState,
        aiEnabled: enabledState,
        hidden: hiddenState,
        aiHidden: hiddenState,
        framesDisabled,
        frameRotationDisabled,
        model: modelState,
        loading,
        refresh,
        toggleAI,
        toggleHideAI,
        toggleFramesDisabled,
        toggleFrameRotationDisabled,
        changeModel,
        setEnabled: setEnabledState,
        setHidden: setHiddenState,
      }}
    >
      {children}
    </AIStatusContext.Provider>
  );
}

export function useAIStatus() {
  return useContext(AIStatusContext);
}
