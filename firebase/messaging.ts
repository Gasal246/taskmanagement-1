import { app } from "./config";
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
  type Messaging,
} from "firebase/messaging";

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
}

async function registerMessagingServiceWorker() {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;

  const registrations = await navigator.serviceWorker.getRegistrations();
  const existing = registrations.find((registration) =>
    registration.active?.scriptURL?.includes("/firebase-messaging-sw.js")
  );
  if (existing) {
    return waitForServiceWorkerActivation(existing);
  }

  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js",
    {
      scope: "/",
    }
  );
  return waitForServiceWorkerActivation(registration);
}

async function waitForServiceWorkerActivation(
  registration: ServiceWorkerRegistration
) {
  if (registration.active) return registration;

  const ready = await navigator.serviceWorker.ready;
  if (ready?.active) return ready;

  const worker = registration.installing || registration.waiting;
  if (!worker) return registration;

  await new Promise<void>((resolve) => {
    const handleStateChange = () => {
      if (worker.state === "activated") {
        worker.removeEventListener("statechange", handleStateChange);
        resolve();
      }
    };
    worker.addEventListener("statechange", handleStateChange);
  });

  return registration;
}

export async function requestFcmToken(): Promise<string | null> {
  const messaging = await getMessagingInstance();
  if (!messaging) return null;
  if (!vapidKey) {
    console.warn("Missing NEXT_PUBLIC_FIREBASE_VAPID_KEY");
    return null;
  }

  const registration = await registerMessagingServiceWorker();
  if (!registration) return null;

  try {
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    return token || null;
  } catch (error) {
    console.error("Unable to get FCM token", error);
    return null;
  }
}

export async function onForegroundMessage(
  handler: (payload: MessagePayload) => void
): Promise<() => void> {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => undefined;
  return onMessage(messaging, handler);
}
