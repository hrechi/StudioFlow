"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

// Reaching these means the signed-in user changes (sign-out lands on /?deconnecte=1).
const SESSION_CHANGE_PATHS = ["/login", "/register", "/deconnexion"];

/**
 * Registers the service worker (public/sw.js) that gives ReFrame its offline mode.
 * Production only: in `next dev` the build files change on every save and a cache
 * would serve stale code. Test the PWA with `npm run build && npm run start`.
 */
export function PwaRegister() {
  const pathname = usePathname();
  const signedOut = useSearchParams().has("deconnecte");

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => console.warn("[pwa] service worker registration failed", error));
  }, []);

  // Saved pages show the user's name in the header: forget them when the session changes.
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (signedOut || SESSION_CHANGE_PATHS.includes(pathname)) {
      navigator.serviceWorker.controller?.postMessage("CLEAR_PAGES");
    }
  }, [pathname, signedOut]);

  return null;
}
