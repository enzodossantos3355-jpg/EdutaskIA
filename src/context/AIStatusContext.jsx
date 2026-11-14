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
      const hasToken = Boolean(localStorage.getItem("auth_token"));
      const [statusRes, aiRes] = await Promise.all([
        api.get("/app-status").catch(() => ({ data: null })),
        hasToken ? api.get("/ai/status").catch(() => ({ data: null })) : Promise.resolve({ data: null }),
      ]);
      if (statusRes?.data?.collection_prefix !== undefined) {
        firebaseService.setCollectionPrefix(statusRes.data.collection_prefix);
      }
      const data = aiRes?.data || statusRes?.data;
      if (data && typeof data === "object") {
        if (typeof data.enabled === "boolean") {
          setEnabledState(data.enabled);
        } else if (typeof data.ai_enabled === "boolean") {
          setEnabledState(data.ai_enabled);
        }
        if (typeof data.hidden === "boolean") {
          setHiddenState(data.hidden);
        } else if (typeof data.ai_hidden === "boolean") {
          setHiddenState(data.ai_hidden);
        }
        if (typeof data.frames_disabled === "boolean") {
          applyFramesDisabled(data.frames_disabled);
        }
        if (typeof data.frame_rotation_disabled === "boolean") {
          applyFrameRotationDisabled(data.frame_rotation_disabled);
        }
        if (data.model || data.ai_model) {
          setModelState(data.model || data.ai_model);
        }
      } else {
        // Fallback direto para Firestore settings/system
        const remote = await firebaseService.getSettings("system").catch(() => null);
        if (remote) {
          if (typeof remote.ai_enabled === "boolean") setEnabledState(remote.ai_enabled);
          if (typeof remote.ai_hidden === "boolean") setHiddenState(remote.ai_hidden);
          if (typeof remote.frames_disabled === "boolean") applyFramesDisabled(remote.frames_disabled);
          if (typeof remote.frame_rotation_disabled === "boolean") applyFrameRotationDisabled(remote.frame_rotation_disabled);
          if (remote.ai_model) setModelState(remote.ai_model);
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

    const applySnapshot = (data) => {
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
    };

    const attachSubscription = () => {
      if (unsubscribeSystem) {
        try { unsubscribeSystem(); } catch {}
        unsubscribeSystem = null;
      }
      try {
        unsubscribeSystem = firebaseService.subscribeToSystemSettings(applySnapshot, () => {});
      } catch (e) {
        console.warn("[AIStatusContext] Firestore snapshot skipped:", e);
      }
    };

    // Attach immediately with detected initial prefix so Firestore works even if backend is cold-starting
    const initialPrefix = firebaseService.getCollectionPrefix();
    attachSubscription();

    api.get("/app-status", { timeout: 6000 })
      .then((statusRes) => {
        if (cancelled) return;
        const remotePrefix = statusRes?.data?.collection_prefix;
        if (typeof remotePrefix === "string" && remotePrefix !== initialPrefix) {
          firebaseService.setCollectionPrefix(remotePrefix);
          attachSubscription();
        }
      })
      .catch(() => {});

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
