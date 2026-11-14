// Automatic browser cache, Service Worker, localStorage & memory cleanup manager.
// Runs silently in the background to prevent stale PWA bundles, quota issues, and memory leaks.

declare const __APP_BUILD_VERSION__: string | undefined;

const VERSION_STORAGE_KEY = "edutask_app_build_version";
const RELOAD_GUARD_KEY = "edutask_auto_reload_ts";
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const CHUNK_RELOAD_COOLDOWN_MS = 30 * 1000;

let initialized = false;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
let lastVisibilityCleanup = 0;

function getCurrentBuildVersion(): string {
  try {
    if (typeof __APP_BUILD_VERSION__ !== "undefined" && __APP_BUILD_VERSION__) {
      return String(__APP_BUILD_VERSION__);
    }
  } catch {}
  if (typeof document !== "undefined") {
    const mainScript = document.querySelector('script[type="module"][src*="/assets/"]') as HTMLScriptElement | null;
    if (mainScript?.src) return mainScript.src;
  }
  return "dev";
}

function sanitizeCachedUserInStorage() {
  try {
    const raw = localStorage.getItem("cached_user");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.id) {
      localStorage.removeItem("cached_user");
      return;
    }
    // Strip heavy base64 avatar_data from localStorage so quota/memory never bloats
    if ("avatar_data" in parsed && parsed.avatar_data) {
      const { avatar_data: _ignored, ...rest } = parsed;
      rest.has_avatar = true;
      localStorage.setItem("cached_user", JSON.stringify(rest));
    }
  } catch {
    try {
      localStorage.removeItem("cached_user");
    } catch {}
  }
}

function pruneStaleLocalStorage() {
  try {
    const now = Date.now();
    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Prune corrupt or huge legacy drafts (> 200 KB) or drafts older than 7 days
      if (key.startsWith("edutask_draft_")) {
        const val = localStorage.getItem(key) || "";
        if (val.length > 200_000) {
          keysToRemove.push(key);
          continue;
        }
        try {
          const parsed = JSON.parse(val);
          const savedAt = parsed?.savedAt ? Number(parsed.savedAt) : 0;
          if (savedAt && now - savedAt > SEVEN_DAYS) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }

    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }

    sanitizeCachedUserInStorage();
  } catch {}
}

export async function clearStaleCachesAndKeepAuth(): Promise<void> {
  if (typeof window === "undefined") return;

  // 1. Clear CacheStorage entries except active font caches
  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((cacheName) => {
          if (cacheName === "google-fonts-cache" || cacheName === "gstatic-fonts-cache") {
            return Promise.resolve(false);
          }
          return caches.delete(cacheName);
        })
      );
    } catch {}
  }

  // 2. Ask active/waiting Service Workers to update immediately
  if ("serviceWorker" in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs.map(async (reg) => {
          try {
            if (reg.waiting) {
              reg.waiting.postMessage({ type: "SKIP_WAITING" });
            }
            await reg.update();
          } catch {}
        })
      );
    } catch {}
  }

  // 3. Prune stale/heavy localStorage data
  pruneStaleLocalStorage();
}

export async function resetCorruptedFirestoreIndexedDB(): Promise<void> {
  if (typeof window === "undefined" || !("indexedDB" in window)) return;
  try {
    const idbAny = window.indexedDB as any;
    if (typeof idbAny.databases === "function") {
      const dbs: Array<{ name?: string }> = await idbAny.databases();
      for (const dbInfo of dbs) {
        if (dbInfo?.name && dbInfo.name.toLowerCase().includes("firestore")) {
          try {
            window.indexedDB.deleteDatabase(dbInfo.name);
          } catch {}
        }
      }
    }
  } catch {}
}

function triggerSafeReloadOnce() {
  try {
    const lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || "0");
    if (Date.now() - lastReload < CHUNK_RELOAD_COOLDOWN_MS) {
      return;
    }
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {}
  window.location.reload();
}

async function runMaintenanceCycle(forceCacheClear = false) {
  pruneStaleLocalStorage();

  if (forceCacheClear) {
    await clearStaleCachesAndKeepAuth();
    return;
  }

  // Even without a build mismatch, silently trigger SW update check & prune oversized caches
  if (typeof window !== "undefined") {
    if ("serviceWorker" in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: "SKIP_WAITING" });
          }
          reg.update().catch(() => {});
        }
      } catch {}
    }

    if ("caches" in window) {
      try {
        const keys = await caches.keys();
        // Remove legacy/duplicate workbox precaches if multiple exist
        const precacheKeys = keys.filter((k) => k.includes("workbox-precache"));
        if (precacheKeys.length > 1) {
          for (let i = 0; i < precacheKeys.length - 1; i++) {
            await caches.delete(precacheKeys[i]).catch(() => {});
          }
        }
      } catch {}
    }
  }
}

export function initAutoCacheAndMemoryManager() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  const currentVersion = getCurrentBuildVersion();
  let versionChanged = false;
  try {
    const previousVersion = localStorage.getItem(VERSION_STORAGE_KEY);
    if (previousVersion && previousVersion !== currentVersion && currentVersion !== "dev") {
      versionChanged = true;
    }
    localStorage.setItem(VERSION_STORAGE_KEY, currentVersion);
  } catch {}

  // Immediate startup cleanup (clears old caches automatically whenever a new deploy arrives)
  runMaintenanceCycle(versionChanged).catch(() => {});

  // Listen for new Service Worker taking control and refresh assets cleanly
  if ("serviceWorker" in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      // Only auto-reload if a previous build version existed (avoid reloading on very first visit)
      if (versionChanged) {
        triggerSafeReloadOnce();
      }
    });
  }

  // Auto-recover from stale chunk errors after a fresh deploy
  const handleChunkError = (msg: string) => {
    const lower = msg.toLowerCase();
    if (
      lower.includes("chunkloaderror") ||
      lower.includes("loading chunk") ||
      lower.includes("failed to fetch dynamically imported module") ||
      lower.includes("importing a module script failed")
    ) {
      clearStaleCachesAndKeepAuth().finally(() => {
        triggerSafeReloadOnce();
      });
    }
  };

  window.addEventListener("error", (event) => {
    if (event?.message) handleChunkError(String(event.message));
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    const msg = typeof reason === "string" ? reason : reason?.message || "";
    if (msg) handleChunkError(String(msg));
  });

  // Periodic background cleanup every 10 minutes
  cleanupTimer = setInterval(() => {
    runMaintenanceCycle(false).catch(() => {});
  }, CLEANUP_INTERVAL_MS);

  // Clean up & check for updates when user returns to the app after >= 5 min away
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      const now = Date.now();
      if (now - lastVisibilityCleanup > 5 * 60 * 1000) {
        lastVisibilityCleanup = now;
        runMaintenanceCycle(false).catch(() => {});
      }
    }
  });
}

export function stopAutoCacheAndMemoryManager() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
