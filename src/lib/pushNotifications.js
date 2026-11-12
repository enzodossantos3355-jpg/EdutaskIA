import api from "@/lib/api";

const PUSH_OPT_OUT_KEY = "edutask_push_opted_out";

export function isPushSupportedInBrowser() {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function isStandalonePWA() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true ||
    document.referrer.includes("android-app://")
  );
}

export function isIOSDevice() {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) && !window.MSStream;
}

export function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function ensurePushServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker não suportado neste navegador.");
  }

  let reg = await navigator.serviceWorker.getRegistration("/");
  if (!reg) {
    const swUrl = import.meta.env.PROD ? "/sw.js" : "/sw-push.js";
    reg = await navigator.serviceWorker.register(swUrl, { scope: "/" });
  }

  if (reg.installing || reg.waiting) {
    await new Promise((resolve) => {
      const target = reg.installing || reg.waiting;
      if (!target) return resolve();
      const done = () => resolve();
      target.addEventListener("statechange", () => {
        if (target.state === "activated") done();
      });
      setTimeout(done, 4000);
    });
  }

  const readyReg = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((resolve) => setTimeout(() => resolve(reg), 4000)),
  ]);

  return readyReg || reg;
}

export async function getCurrentPushSubscription() {
  if (!isPushSupportedInBrowser()) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    if (!reg || !reg.pushManager) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function subscribeDeviceToPush() {
  if (!isPushSupportedInBrowser()) {
    throw new Error("Este navegador não suporta notificações Web Push.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "Permissão bloqueada no navegador. Libere as notificações nas configurações do site."
        : "Permissão de notificação não concedida."
    );
  }

  const reg = await ensurePushServiceWorker();
  const { data } = await api.get("/push/public-key");
  const publicKey = data?.publicKey;
  if (!publicKey) {
    throw new Error("Chave pública VAPID indisponível no servidor.");
  }

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const subJson = typeof sub.toJSON === "function" ? sub.toJSON() : JSON.parse(JSON.stringify(sub));
  await api.post("/push/subscribe", {
    subscription: subJson,
    user_agent: navigator.userAgent,
  });

  try {
    localStorage.removeItem(PUSH_OPT_OUT_KEY);
  } catch {}

  return subJson;
}

export async function unsubscribeDeviceFromPush() {
  let endpoint = null;
  try {
    const sub = await getCurrentPushSubscription();
    if (sub) {
      endpoint = sub.endpoint;
      await sub.unsubscribe();
    }
  } catch {}

  await api.post("/push/unsubscribe", { endpoint });
  try {
    localStorage.setItem(PUSH_OPT_OUT_KEY, "true");
  } catch {}
}

export async function syncPushSubscriptionIfGranted() {
  if (!isPushSupportedInBrowser()) return false;
  if (Notification.permission !== "granted") return false;
  try {
    if (localStorage.getItem(PUSH_OPT_OUT_KEY) === "true") {
      return false;
    }
  } catch {}

  try {
    const sub = await getCurrentPushSubscription();
    if (!sub) return false;
    const subJson = typeof sub.toJSON === "function" ? sub.toJSON() : JSON.parse(JSON.stringify(sub));
    await api.post("/push/subscribe", {
      subscription: subJson,
      user_agent: navigator.userAgent,
    });
    return true;
  } catch {
    return false;
  }
}

export async function sendTestPushNotification() {
  const { data } = await api.post("/push/test");
  return data;
}
