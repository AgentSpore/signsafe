"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Listen for SW update signal — hard reload when new SW takes over.
    const onMessage = (ev: MessageEvent) => {
      if (ev.data && ev.data.type === "sw-updated") {
        console.log("SignSafe: new service worker activated, reloading");
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          updateViaCache: "none",
        });
        // Force immediate update check on every mount
        await reg.update().catch(() => {});
      } catch (e) {
        console.warn("SW registration failed", e);
      }
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register);

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("load", register);
    };
  }, []);
  return null;
}
