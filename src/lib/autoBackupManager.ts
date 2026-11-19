import { useEffect, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import {
  DriveAuthState,
  getDriveAccessToken,
  getDriveAuthState,
  initDriveAuth,
  signInWithGoogleDrive,
  signOutGoogleDrive,
  subscribeDriveAuth,
  uploadBackupToDriveFolder,
} from "@/lib/googleDrive";

export interface AutoBackupConfig {
  enabled: boolean;
  interval_minutes: number;
  backup_on_changes: boolean;
  include_uploads: boolean;
  last_backup_at: string | null;
  last_backup_filename: string | null;
  last_backup_status: "idle" | "success" | "needs_auth" | "error";
  last_backup_error: string | null;
  last_backup_file_id: string | null;
  last_backup_web_link: string | null;
  total_backups_sent: number;
}

const DEFAULT_CONFIG: AutoBackupConfig = {
  enabled: false,
  interval_minutes: 60,
  backup_on_changes: true,
  include_uploads: true,
  last_backup_at: null,
  last_backup_filename: null,
  last_backup_status: "idle",
  last_backup_error: null,
  last_backup_file_id: null,
  last_backup_web_link: null,
  total_backups_sent: 0,
};

let sharedConfig: AutoBackupConfig = { ...DEFAULT_CONFIG };
let sharedConfigLoaded = false;
let isBackingUp = false;
let lastAutoRunAtMs = 0;
let pendingChangeTimer: ReturnType<typeof setTimeout> | null = null;
let authPromptedThisSession = false;

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      // ignore
    }
  });
}

export function getAutoBackupSnapshot() {
  return {
    config: sharedConfig,
    loaded: sharedConfigLoaded,
    backingUp: isBackingUp,
    driveAuth: getDriveAuthState(),
  };
}

export async function loadAutoBackupConfig(): Promise<AutoBackupConfig> {
  try {
    const { data } = await api.get("/admin/auto-backup/config");
    if (data && typeof data === "object") {
      sharedConfig = { ...DEFAULT_CONFIG, ...data };
      sharedConfigLoaded = true;
      notifyListeners();
    }
  } catch {
    // ignore if non-admin or network error
  }
  return sharedConfig;
}

export async function updateAutoBackupConfig(
  patch: Partial<
    Pick<
      AutoBackupConfig,
      "enabled" | "interval_minutes" | "backup_on_changes" | "include_uploads"
    >
  >
): Promise<AutoBackupConfig> {
  const { data } = await api.put("/admin/auto-backup/config", patch);
  if (data && typeof data === "object") {
    sharedConfig = { ...DEFAULT_CONFIG, ...data };
    sharedConfigLoaded = true;
    notifyListeners();
  }
  return sharedConfig;
}

export async function runGoogleDriveBackup(
  reason: "manual" | "interval" | "change" = "manual",
  includeUploadsOverride?: boolean
): Promise<{ ok: boolean; filename?: string; error?: string }> {
  if (isBackingUp) {
    return { ok: false, error: "Já existe um backup em andamento." };
  }

  const token = getDriveAccessToken();
  if (!token) {
    if (reason === "manual") {
      toast.error(
        "Conecte sua conta do Google Drive clicando em 'Sign in with Google' primeiro."
      );
    } else if (sharedConfig.enabled && !authPromptedThisSession) {
      authPromptedThisSession = true;
      try {
        const { data } = await api.post("/admin/auto-backup/record", {
          status: "needs_auth",
          error: "Conecte o Google Drive nesta sessão para retomar envios automáticos.",
        });
        sharedConfig = { ...DEFAULT_CONFIG, ...data };
        notifyListeners();
      } catch {
        // ignore
      }
      toast.info(
        "Backup automático está ativo: conecte sua conta Google em 'Dados ZIP' para enviar cópias ao Drive.",
        { duration: 5000 }
      );
    }
    return { ok: false, error: "Google Drive não conectado nesta sessão." };
  }

  const includeUploads =
    includeUploadsOverride !== undefined
      ? includeUploadsOverride
      : sharedConfig.include_uploads !== false;

  isBackingUp = true;
  notifyListeners();

  try {
    if (reason === "manual") {
      toast.loading(
        "Gerando pacote ZIP e enviando para a pasta 'EduTask Backups' no Google Drive...",
        { id: "drive-backup" }
      );
    }

    const response = await api.get(
      `/admin/zip/export?include_uploads=${includeUploads}&type=${
        reason === "manual" ? "full" : "auto"
      }`,
      { responseType: "blob" }
    );

    const blob = new Blob([response.data], { type: "application/zip" });
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const timestampStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
      now.getDate()
    )}_${pad(now.getHours())}-${pad(now.getMinutes())}`;
    const fileName = `edutask_backup_${
      reason === "manual" ? "" : "auto_"
    }${timestampStr}.zip`;

    const driveItem = await uploadBackupToDriveFolder(token, blob, fileName);
    lastAutoRunAtMs = Date.now();

    const { data: updated } = await api.post("/admin/auto-backup/record", {
      status: "success",
      filename: driveItem.name || fileName,
      file_id: driveItem.id || null,
      web_link: driveItem.webViewLink || null,
      timestamp: now.toISOString(),
    });
    if (updated && typeof updated === "object") {
      sharedConfig = { ...DEFAULT_CONFIG, ...updated };
    }
    notifyListeners();

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("edutask:drive-backup-completed"));
    }

    if (reason === "manual") {
      toast.success(
        `Backup enviado para a pasta "EduTask Backups" no Google Drive! (${fileName})`,
        { id: "drive-backup", duration: 5000 }
      );
    } else {
      toast.success(
        `Backup automático salvo no Google Drive (${fileName})`,
        { duration: 3500 }
      );
    }

    return { ok: true, filename: fileName };
  } catch (err: any) {
    const errMsg =
      err?.message || "Erro ao enviar backup para o Google Drive.";
    try {
      const { data: updated } = await api.post("/admin/auto-backup/record", {
        status: errMsg.includes("expir") ? "needs_auth" : "error",
        error: errMsg,
      });
      if (updated && typeof updated === "object") {
        sharedConfig = { ...DEFAULT_CONFIG, ...updated };
      }
    } catch {
      // ignore
    }
    notifyListeners();

    if (reason === "manual") {
      toast.error(errMsg, { id: "drive-backup" });
    } else {
      toast.error(`Backup automático no Drive falhou: ${errMsg}`);
    }
    return { ok: false, error: errMsg };
  } finally {
    isBackingUp = false;
    notifyListeners();
  }
}

export async function connectGoogleDriveAccount() {
  const res = await signInWithGoogleDrive();
  authPromptedThisSession = false;
  notifyListeners();
  return res;
}

export async function disconnectGoogleDriveAccount() {
  await signOutGoogleDrive();
  notifyListeners();
}

function scheduleDebouncedChangeBackup() {
  if (!sharedConfig.enabled || !sharedConfig.backup_on_changes) return;
  if (!getDriveAccessToken()) return;

  if (pendingChangeTimer) clearTimeout(pendingChangeTimer);
  pendingChangeTimer = setTimeout(() => {
    pendingChangeTimer = null;
    if (!sharedConfig.enabled || !sharedConfig.backup_on_changes) return;
    if (!getDriveAccessToken() || isBackingUp) return;

    const minCooldownMs = 2 * 60 * 1000;
    const lastRecordedMs = sharedConfig.last_backup_at
      ? new Date(sharedConfig.last_backup_at).getTime()
      : 0;
    const recentMs = Math.max(lastAutoRunAtMs, lastRecordedMs || 0);
    if (Date.now() - recentMs < minCooldownMs) return;

    runGoogleDriveBackup("change");
  }, 20000);
}

let engineMountedCount = 0;
let intervalTimer: ReturnType<typeof setInterval> | null = null;
let unsubscribeAuthEngine: (() => void) | null = null;
let dataChangedHandler: (() => void) | null = null;

function startAutoBackupEngine() {
  if (engineMountedCount > 0) {
    engineMountedCount++;
    return;
  }
  engineMountedCount = 1;
  unsubscribeAuthEngine = initDriveAuth();
  loadAutoBackupConfig();

  dataChangedHandler = () => {
    scheduleDebouncedChangeBackup();
  };
  window.addEventListener("edutask:data-changed", dataChangedHandler);

  intervalTimer = setInterval(() => {
    if (!sharedConfig.enabled || isBackingUp) return;
    const token = getDriveAccessToken();
    const intervalMs = Math.max(5, Number(sharedConfig.interval_minutes) || 60) * 60 * 1000;
    const lastMs = sharedConfig.last_backup_at
      ? new Date(sharedConfig.last_backup_at).getTime()
      : 0;
    const effectiveLastMs = Math.max(lastAutoRunAtMs, lastMs || 0);

    if (Date.now() - effectiveLastMs >= intervalMs) {
      if (token) {
        runGoogleDriveBackup("interval");
      } else if (!authPromptedThisSession) {
        runGoogleDriveBackup("interval");
      }
    }
  }, 60 * 1000);
}

function stopAutoBackupEngine() {
  engineMountedCount = Math.max(0, engineMountedCount - 1);
  if (engineMountedCount > 0) return;

  if (intervalTimer) {
    clearInterval(intervalTimer);
    intervalTimer = null;
  }
  if (pendingChangeTimer) {
    clearTimeout(pendingChangeTimer);
    pendingChangeTimer = null;
  }
  if (dataChangedHandler) {
    window.removeEventListener("edutask:data-changed", dataChangedHandler);
    dataChangedHandler = null;
  }
  if (unsubscribeAuthEngine) {
    unsubscribeAuthEngine();
    unsubscribeAuthEngine = null;
  }
}

export function useAutoDriveBackup(startEngine = false) {
  const [state, setState] = useState<{
    config: AutoBackupConfig;
    loaded: boolean;
    backingUp: boolean;
    driveAuth: DriveAuthState;
  }>(() => getAutoBackupSnapshot());

  useEffect(() => {
    const sync = () => setState(getAutoBackupSnapshot());
    listeners.add(sync);
    const unsubDrive = subscribeDriveAuth(sync);

    if (startEngine) {
      startAutoBackupEngine();
    } else if (!sharedConfigLoaded) {
      loadAutoBackupConfig();
    }

    sync();

    return () => {
      listeners.delete(sync);
      unsubDrive();
      if (startEngine) {
        stopAutoBackupEngine();
      }
    };
  }, [startEngine]);

  return state;
}
