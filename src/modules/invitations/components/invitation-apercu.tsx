"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContenuInvitation } from "../invitation.schema";

/** Konva needs the browser: the stage is never rendered on the server. */
export const InvitationStage = dynamic(() => import("./invitation-stage"), {
  ssr: false,
  loading: () => <Skeleton className="size-full" />,
});

/** Read-only card that fits the width of its container (thumbnails, public page). */
export function InvitationApercu({ contenu, className }: { contenu: ContenuInvitation; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [largeur, setLargeur] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setLargeur(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ aspectRatio: `${contenu.size.width} / ${contenu.size.height}` }}>
      {largeur > 0 && <InvitationStage contenu={contenu} scale={largeur / contenu.size.width} />}
    </div>
  );
}
