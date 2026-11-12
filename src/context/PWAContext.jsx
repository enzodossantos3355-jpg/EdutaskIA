import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import {
  isPushSupportedInBrowser,
  isStandalonePWA,
  isIOSDevice,
  subscribeDeviceToPush,
  unsubscribeDeviceFromPush,
  syncPushSubscriptionIfGranted,
  sendTestPushNotification,
} from "@/lib/pushNotifications";

const PWAContext = createContext(null);

const DISMISSED_KEY = "edutask_pwa_dismissed_until";
const INSTALLED_KEY = "edutask_pwa_installed";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function PWAProvider({ children }) {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [guideMode, setGuideMode] = useState("ios"); // "ios" | "inapp" | "generic"

  // Web Push states
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState("default");
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Detect platform & standalone mode on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isStandalone = isStandalonePWA();
    const isIOSDev = isIOSDevice();
    setIsIOS(isIOSDev);
    setPushSupported(isPushSupportedInBrowser());
    if ("Notification" in window) {
      setPushPermission(Notification.permission);
    }

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    if (localStorage.getItem(INSTALLED_KEY) === "true") {
      setIsInstalled(true);
    }

    // Detect internal/in-app browsers (Instagram, Facebook, TikTok, Messenger, etc.)
    const ua = window.navigator.userAgent.toLowerCase();
    const isInternal =
      ua.includes("fban") ||
      ua.includes("fbav") ||
      ua.includes("instagram") ||
      ua.includes("bytedance") ||
      ua.includes("tiktok") ||
      ua.includes("micromessenger") ||
      ua.includes("line/") ||
      ua.includes("webview");
    setIsInAppBrowser(isInternal);

    // Capture native beforeinstallprompt (also resets stale installed flag if user uninstalled)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      try {
        localStorage.removeItem(INSTALLED_KEY);
      } catch {}
      setIsInstalled(false);
      setDeferredPrompt(e);
    };

    // Listen for real app installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowCard(false);
      setShowGuide(false);
      try {
        localStorage.setItem(INSTALLED_KEY, "true");
        localStorage.removeItem(DISMISSED_KEY);
      } catch {}
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  // Sync Web Push status when authenticated user changes
  useEffect(() => {
    if (!user?.id) {
      setPushSubscribed(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const synced = await syncPushSubscriptionIfGranted();
      if (cancelled) return;
      if (synced) {
        setPushSubscribed(true);
        if (typeof Notification !== "undefined") setPushPermission(Notification.permission);
      }
      try {
        const { data } = await api.get("/push/status");
        if (!cancelled) {
          setPushSubscribed(Boolean(data?.subscribed) || synced);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Timer: Show invitation card after 20 seconds of usage, if eligible
  useEffect(() => {
    if (isInstalled) return;

    // Check if dismissed in last 7 days
    try {
      const dismissedUntil = parseInt(localStorage.getItem(DISMISSED_KEY) || "0", 10);
      if (Date.now() < dismissedUntil) {
        return;
      }
    } catch {}

    const timer = setTimeout(() => {
      // Re-verify conditions before showing
      const dismissedUntil = parseInt(localStorage.getItem(DISMISSED_KEY) || "0", 10);
      if (Date.now() >= dismissedUntil && !isInstalled) {
        setShowCard(true);
      }
    }, 20000); // 20 seconds delay as requested

    return () => clearTimeout(timer);
  }, [isInstalled]);

  // Dismiss for 7 days
  const dismissCard = useCallback(() => {
    setShowCard(false);
    try {
      const nextAllowed = Date.now() + SEVEN_DAYS_MS;
      localStorage.setItem(DISMISSED_KEY, String(nextAllowed));
    } catch {}
  }, []);

  // Trigger installation or guided prompt
  const installApp = useCallback(async () => {
    // 1. If in-app browser, show guidance to open in Chrome/Safari
    if (isInAppBrowser) {
      setGuideMode("inapp");
      setShowGuide(true);
      return;
    }

    // 2. If native beforeinstallprompt is ready (Chrome, Edge, Android)
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult?.outcome === "accepted") {
          setIsInstalled(true);
          setShowCard(false);
          setDeferredPrompt(null);
          try {
            localStorage.setItem(INSTALLED_KEY, "true");
          } catch {}
        } else {
          dismissCard();
        }
      } catch (err) {
        console.warn("[PWA] Prompt error:", err);
      }
      return;
    }

    // 3. If iOS device (Safari)
    if (isIOS) {
      setGuideMode("ios");
      setShowGuide(true);
      return;
    }

    // 4. Other browsers without beforeinstallprompt available
    setGuideMode("generic");
    setShowGuide(true);
  }, [deferredPrompt, isIOS, isInAppBrowser, dismissCard]);

  const enablePush = useCallback(async () => {
    setPushLoading(true);
    try {
      await subscribeDeviceToPush();
      setPushSubscribed(true);
      if (typeof Notification !== "undefined") {
        setPushPermission(Notification.permission);
      }
      return { ok: true };
    } catch (err) {
      if (typeof Notification !== "undefined") {
        setPushPermission(Notification.permission);
      }
      throw err;
    } finally {
      setPushLoading(false);
    }
  }, []);

  const disablePush = useCallback(async () => {
    setPushLoading(true);
    try {
      await unsubscribeDeviceFromPush();
      setPushSubscribed(false);
    } finally {
      setPushLoading(false);
    }
  }, []);

  const testPush = useCallback(async () => {
    setPushLoading(true);
    try {
      return await sendTestPushNotification();
    } finally {
      setPushLoading(false);
    }
  }, []);

  const canInstallOrGuide = !isInstalled && (Boolean(deferredPrompt) || isIOS || isInAppBrowser);
  const requiresIOSInstallForPush = isIOS && !isStandalonePWA();

  return (
    <PWAContext.Provider
      value={{
        isInstallable: Boolean(deferredPrompt),
        isInstalled,
        isIOS,
        isInAppBrowser,
        canInstallOrGuide,
        showCard,
        showGuide,
        guideMode,
        setShowGuide,
        installApp,
        dismissCard,
        pushSupported,
        pushPermission,
        pushSubscribed,
        pushLoading,
        requiresIOSInstallForPush,
        enablePush,
        disablePush,
        testPush,
      }}
    >
      {children}
    </PWAContext.Provider>
  );
}

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error("usePWA must be used within a PWAProvider");
  }
  return context;
}
