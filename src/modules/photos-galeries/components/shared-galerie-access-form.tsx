"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Link2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { FormAlert } from "@/components/shared/form-alert";
import { FormField, IconInput, PasswordInput, describedBy } from "@/components/shared/form-field";
import { applyFieldErrors } from "@/components/shared/form-utils";
import { Button } from "@/components/ui/button";
import { openSharedGalerieAction } from "../galerie-guest.actions";
import { guestAccessSchema, type GuestAccessInput } from "../galerie.schemas";

/**
 * Front-office form to open a gallery shared by a client (guest, second opinion).
 * With `lien`, the link is already known (/g/[token]) and only the password is asked.
 */
export function SharedGalerieAccessForm({ lien }: { lien?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<GuestAccessInput>({
    resolver: zodResolver(guestAccessSchema),
    defaultValues: { lien: lien ?? "", motDePasse: "" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await openSharedGalerieAction(values);
      if (!result.ok) {
        applyFieldErrors(form.setError, result.fieldErrors);
        setError(result.error);
        return;
      }
      router.push(result.data.redirectTo);
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {error && <FormAlert>{error}</FormAlert>}
      {!lien && (
        <FormField
          id="lien"
          label="Gallery link or code"
          required
          error={errors.lien?.message}
          hint="The link the client shared with you, e.g. https://…/g/AbC123…"
        >
          <IconInput
            id="lien"
            icon={Link2}
            autoComplete="off"
            placeholder="Paste the link or the code"
            invalid={!!errors.lien}
            aria-describedby={describedBy("lien", errors.lien?.message, true)}
            {...form.register("lien")}
          />
        </FormField>
      )}
      <FormField
        id="motDePasse"
        label="Password"
        error={errors.motDePasse?.message}
        hint="Leave empty if the gallery has no password"
      >
        <PasswordInput
          id="motDePasse"
          icon={KeyRound}
          autoComplete="off"
          autoFocus={!!lien}
          invalid={!!errors.motDePasse}
          aria-describedby={describedBy("motDePasse", errors.motDePasse?.message, true)}
          {...form.register("motDePasse")}
        />
      </FormField>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        Open the gallery
      </Button>
    </form>
  );
}
