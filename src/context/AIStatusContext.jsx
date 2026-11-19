import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import api, { API } from "@/lib/api";
import { firebaseService } from "@/lib/firebaseService";
import { useAuth } from "@/context/AuthContext";
import { setGlobalFramesDisabled, setGlobalFrameRotationDisabled } from "@/lib/effects";

export const DEFAULT_STUDENT_AREAS = {
  tasks: true,
  announcements: true,
  resumos: true,
};

export const STUDENT_AREA_PRIORITY = ["tasks", "announcements", "resumos"];

export const STUDENT_AREA_LABELS = {
  tasks: "Tarefas",
  announcements: "Avisos",
  resumos: "Resumos de Estudo",
};

export const LAST_AREA_REQUIRED_MESSAGE = "Mantenha pelo menos uma área ativa para os alunos.";

export function normalizeStudentAreas(raw) {
  return {
    tasks: raw?.tasks !== false,
    announcements: raw?.announcements !== false,
    resumos: raw?.resumos !== false,
  };
}

export function hasAnyActiveStudentArea(areas) {
  const norm = normalizeStudentAreas(areas);
  return Boolean(norm.tasks || norm.announcements || norm.resumos);
}

export function getFirstActiveStudentArea(areas) {
  const norm = normalizeStudentAreas(areas);
  return STUDENT_AREA_PRIORITY.find((key) => norm[key] !== false) || "tasks";
}

export function isStudentAreaEnabled(areas, key) {
  if (!key) return true;
  return normalizeStudentAreas(areas)[key] !== false;
}

const AIStatusContext = createContext({
  enabled: true,
  aiEnabled: true,
  hidden: false,
  aiHidden: false,
  framesDisabled: false,
  frameRotationDisabled: true,
  studentAreas: DEFAULT_STUDENT_AREAS,
  model: "gemini-3.8-flash",
  loading: true,
  refresh: async () => {},
  toggleAI: async () => false,
  toggleHideAI: async () => false,
  toggleFramesDisabled: async () => false,
  toggleFrameRotationDisabled: async () => false,
  toggleStudentArea: async () => ({ ok: false }),
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
  const [studentAreas, setStudentAreas] = useState(DEFAULT_STUDENT_AREAS);
  const [modelState, setModelState] = useState("gemini-3.8-flash");
  const [loading, setLoading] = useState(true);
  const studentAreasUpdatedAtRef = useRef(0);
  const settingsUpdatedAtRef = useRef(0);
  const hasServerStatusRef = useRef(false);
  const inFlightFlagsMutationRef = useRef(0);

  const applyFramesDisabled = useCallback((val) => {
    setFramesDisabledState(val);
    setGlobalFramesDisabled(val);
  }, []);

  const applyFrameRotationDisabled = useCallback((val) => {
    setFrameRotationDisabledState(val);
    setGlobalFrameRotationDisabled(val);
  }, []);

  const applyStudentAreas = useCallback((rawAreas, rawUpdatedAt = 0) => {
    if (!rawAreas || typeof rawAreas !== "object") return;
    const normalized = normalizeStudentAreas(rawAreas);
    if (!hasAnyActiveStudentArea(normalized)) return;
    const incomingTs = Number(rawUpdatedAt || 0);
    if (incomingTs > 0 && studentAreasUpdatedAtRef.current > 0 && incomingTs < studentAreasUpdatedAtRef.current) {
      return;
    }
    if (incomingTs > studentAreasUpdatedAtRef.current) {
      studentAreasUpdatedAtRef.current = incomingTs;
    }
    setStudentAreas((prev) => {
      if (
        prev.tasks === normalized.tasks &&
        prev.announcements === normalized.announcements &&
        prev.resumos === normalized.resumos
      ) {
        return prev;
      }
      return normalized;
    });
  }, []);

  const applyPayload = useCallback(
    (data, source = "server") => {
      if (!data || typeof data !== "object") return;
      const incomingSettingsTs = Number(data.settings_updated_at || 0);

      if (source === "server") {
        hasServerStatusRef.current = true;
      }

      const allowGlobalFlags =
        source === "mutation" ||
        (inFlightFlagsMutationRef.current === 0 &&
          (source === "server" ||
            (!hasServerStatusRef.current && settingsUpdatedAtRef.current === 0) ||
            (incomingSettingsTs > 0 && incomingSettingsTs > settingsUpdatedAtRef.current)));

      if (incomingSettingsTs > settingsUpdatedAtRef.current) {
        settingsUpdatedAtRef.current = incomingSettingsTs;
      }

      if (allowGlobalFlags) {
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
      }

      if (data.student_areas && typeof data.student_areas === "object") {
        applyStudentAreas(data.student_areas, data.student_areas_updated_at || data.updated_at || 0);
      }
    },
    [applyFramesDisabled, applyFrameRotationDisabled, applyStudentAreas]
  );

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
        applyPayload(data, "server");
      } else {
        // Fallback direto para Firestore settings/system apenas se o backend estiver indisponível
        const remote = await firebaseService.getSettings("system").catch(() => null);
        if (remote) {
          applyPayload(remote, "firestore");
        }
      }
    } catch {
      // Default state
    } finally {
      setLoading(false);
    }
  }, [applyPayload]);

  useEffect(() => {
    refresh();
  }, [refresh, user]);

  // Real-time SSE + polling fallback + Firestore snapshot for live updates without re-login
  useEffect(() => {
    let unsubscribeSystem = null;
    let eventSource = null;
    let pollTimer = null;
    let cancelled = false;

    const attachSubscription = () => {
      if (unsubscribeSystem) {
        try { unsubscribeSystem(); } catch {}
        unsubscribeSystem = null;
      }
      try {
        unsubscribeSystem = firebaseService.subscribeToSystemSettings(
          (snapData) => {
            if (!cancelled && snapData) applyPayload(snapData, "firestore");
          },
          () => {}
        );
      } catch (e) {
        console.warn("[AIStatusContext] Firestore snapshot skipped:", e);
      }
    };

    const initialPrefix = firebaseService.getCollectionPrefix();
    attachSubscription();

    api.get("/app-status", { timeout: 6000 })
      .then((statusRes) => {
        if (cancelled) return;
        if (statusRes?.data) applyPayload(statusRes.data, "server");
        const remotePrefix = statusRes?.data?.collection_prefix;
        if (typeof remotePrefix === "string" && remotePrefix !== initialPrefix) {
          firebaseService.setCollectionPrefix(remotePrefix);
          attachSubscription();
        }
      })
      .catch(() => {});

    if (typeof window !== "undefined" && typeof EventSource !== "undefined") {
      try {
        eventSource = new EventSource(`${API}/system-events`);
        eventSource.addEventListener("settings", (event) => {
          if (cancelled) return;
          try {
            const parsed = JSON.parse(event.data);
            applyPayload(parsed, "server");
          } catch {}
        });
      } catch {}
    }

    const syncNow = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      api.get("/app-status", { timeout: 5000 })
        .then((res) => {
          if (!cancelled && res?.data) applyPayload(res.data, "server");
        })
        .catch(() => {});
    };

    pollTimer = setInterval(syncNow, 4000);
    if (typeof window !== "undefined") {
      window.addEventListener("focus", syncNow);
      document.addEventListener("visibilitychange", syncNow);
    }

    return () => {
      cancelled = true;
      if (unsubscribeSystem) unsubscribeSystem();
      if (eventSource) {
        try { eventSource.close(); } catch {}
      }
      if (pollTimer) clearInterval(pollTimer);
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", syncNow);
        document.removeEventListener("visibilitychange", syncNow);
      }
    };
  }, [applyPayload]);

  const toggleAI = useCallback(
    async (newStatus) => {
      inFlightFlagsMutationRef.current += 1;
      setEnabledState(newStatus);
      try {
        const { data } = await api.put("/ai/status", { enabled: newStatus });
        inFlightFlagsMutationRef.current = Math.max(0, inFlightFlagsMutationRef.current - 1);
        if (data) applyPayload(data, "mutation");
        return true;
      } catch (err) {
        inFlightFlagsMutationRef.current = Math.max(0, inFlightFlagsMutationRef.current - 1);
        await refresh();
        throw err;
      }
    },
    [refresh, applyPayload]
  );

  const toggleHideAI = useCallback(
    async (newHidden) => {
      inFlightFlagsMutationRef.current += 1;
      setHiddenState(newHidden);
      try {
        const { data } = await api.put("/ai/status", { hidden: newHidden });
        inFlightFlagsMutationRef.current = Math.max(0, inFlightFlagsMutationRef.current - 1);
        if (data) applyPayload(data, "mutation");
        return true;
      } catch (err) {
        inFlightFlagsMutationRef.current = Math.max(0, inFlightFlagsMutationRef.current - 1);
        await refresh();
        throw err;
      }
    },
    [refresh, applyPayload]
  );

  const toggleFramesDisabled = useCallback(
    async (newDisabled) => {
      inFlightFlagsMutationRef.current += 1;
      applyFramesDisabled(newDisabled);
      try {
        const { data } = await api.put("/ai/status", { frames_disabled: newDisabled });
        inFlightFlagsMutationRef.current = Math.max(0, inFlightFlagsMutationRef.current - 1);
        if (data) applyPayload(data, "mutation");
        return true;
      } catch (err) {
        inFlightFlagsMutationRef.current = Math.max(0, inFlightFlagsMutationRef.current - 1);
        await refresh();
        throw err;
      }
    },
    [refresh, applyFramesDisabled, applyPayload]
  );

  const toggleFrameRotationDisabled = useCallback(
    async (newDisabled) => {
      inFlightFlagsMutationRef.current += 1;
      applyFrameRotationDisabled(newDisabled);
      try {
        const { data } = await api.put("/ai/status", { frame_rotation_disabled: newDisabled });
        inFlightFlagsMutationRef.current = Math.max(0, inFlightFlagsMutationRef.current - 1);
        if (data) applyPayload(data, "mutation");
        return true;
      } catch (err) {
        inFlightFlagsMutationRef.current = Math.max(0, inFlightFlagsMutationRef.current - 1);
        await refresh();
        throw err;
      }
    },
    [refresh, applyFrameRotationDisabled, applyPayload]
  );

  const toggleStudentArea = useCallback(
    async (areaKey, nextEnabled) => {
      try {
        const { data } = await api.put("/admin/student-areas", {
          area: areaKey,
          enabled: Boolean(nextEnabled),
        });
        if (data?.student_areas) {
          applyStudentAreas(data.student_areas, data.updated_at || Date.now());
        }
        return data;
      } catch (err) {
        if (err?.response?.data?.student_areas) {
          applyStudentAreas(err.response.data.student_areas, Date.now());
        } else {
          await refresh();
        }
        const detail = err?.response?.data?.detail;
        throw new Error(typeof detail === "string" ? detail : LAST_AREA_REQUIRED_MESSAGE);
      }
    },
    [applyStudentAreas, refresh]
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
        studentAreas,
        model: modelState,
        loading,
        refresh,
        toggleAI,
        toggleHideAI,
        toggleFramesDisabled,
        toggleFrameRotationDisabled,
        toggleStudentArea,
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

