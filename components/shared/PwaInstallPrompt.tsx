"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const dismissStorageKey = "pwa-install-dismissed-until";

async function registerPwaServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const existingRegistration = await navigator.serviceWorker.getRegistration("/");
  if (
    existingRegistration?.active?.scriptURL?.includes("/firebase-messaging-sw.js")
  ) {
    return;
  }

  await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    scope: "/",
  });
}

function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isWebKit = /safari/.test(ua);
  const isOtherBrowser = /crios|fxios|edgios|edga|opr\//.test(ua);
  return isIos && isWebKit && !isOtherBrowser;
}

const PwaInstallPrompt = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  const supportsNativePrompt = useMemo(() => Boolean(installEvent), [installEvent]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isMobileDevice()) return;
    if (isStandaloneMode()) return;

    const dismissedUntil = window.localStorage.getItem(dismissStorageKey);
    if (dismissedUntil) {
      const untilDate = new Date(dismissedUntil);
      if (untilDate.getTime() > Date.now()) return;
    }

    registerPwaServiceWorker().catch((error) => {
      console.error("Failed to register service worker", error);
    });

    const iosSafari = isIosSafari();
    setIsIos(iosSafari);
    if (iosSafari) {
      setIsVisible(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setInstallEvent(null);
      setIsVisible(false);
      window.localStorage.removeItem(dismissStorageKey);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const dismissPrompt = () => {
    if (typeof window !== "undefined") {
      const nextDismissUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      window.localStorage.setItem(
        dismissStorageKey,
        nextDismissUntil.toISOString()
      );
    }
    setIsVisible(false);
  };

  const handleInstall = async () => {
    if (!installEvent) return;
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "accepted") {
        setIsVisible(false);
      }
    } catch (error) {
      console.error("PWA installation prompt failed", error);
    } finally {
      setInstallEvent(null);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9998] p-3 sm:p-4">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-slate-800/80 bg-slate-950/95 p-4 shadow-2xl backdrop-blur">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-100 sm:text-base">
            Install Taskmanager app
          </h2>
          {supportsNativePrompt ? (
            <p className="text-xs text-slate-400 sm:text-sm">
              Add this app to your phone for faster access and reliable push
              notifications.
            </p>
          ) : (
            <p className="text-xs text-slate-400 sm:text-sm">
              Add to Home Screen for app-like use and push notifications. Tap
              Share, then select Add to Home Screen.
            </p>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={dismissPrompt}>
            Not now
          </Button>
          {supportsNativePrompt ? (
            <Button type="button" onClick={handleInstall}>
              Install app
            </Button>
          ) : (
            <Button type="button" onClick={dismissPrompt} disabled={!isIos}>
              I understand
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PwaInstallPrompt;
