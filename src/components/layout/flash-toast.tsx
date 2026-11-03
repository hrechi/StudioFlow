"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

const MESSAGES: Record<string, Record<string, string>> = {
  deconnecte: { "1": "You're signed out" },
  compte: { supprime: "Your account has been deleted" },
};

/** Shows a one-time toast after a redirect (?deconnecte=1, ?compte=supprime) and cleans the URL. */
export function FlashToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let shown = false;
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, messages] of Object.entries(MESSAGES)) {
      const message = messages[params.get(key) ?? ""];
      if (message) {
        toast.success(message, { id: `flash-${key}` }); // stable id: no duplicate in Strict Mode
        params.delete(key);
        shown = true;
      }
    }
    if (shown) {
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  return null;
}
