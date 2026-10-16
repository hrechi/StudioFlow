"use client";

import type { ComponentProps } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Toast shown by every template action that still needs its backend. */
export function comingSoon(feature?: string) {
  toast.info("Coming soon", {
    description: feature ?? "This action will be wired up by the module owner.",
  });
}

/**
 * Button for template pages: works like <Button>, but shows "Coming soon".
 * When wiring the module, replace it with a real Button + Server Action.
 */
export function ComingSoonButton({
  feature,
  onClick,
  ...props
}: ComponentProps<typeof Button> & { feature?: string }) {
  return (
    <Button
      {...props}
      onClick={(event) => {
        onClick?.(event);
        comingSoon(feature);
      }}
    />
  );
}
