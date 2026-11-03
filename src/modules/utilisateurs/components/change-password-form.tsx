"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, Lock } from "lucide-react";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormField, PasswordInput, describedBy } from "@/components/shared/form-field";
import { applyFieldErrors } from "@/components/shared/form-utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { changePasswordAction } from "../utilisateur.actions";
import { changePasswordSchema, type ChangePasswordInput } from "../utilisateur.schemas";
import { PasswordStrength } from "./password-strength";

const EMPTY: ChangePasswordInput = {
  motDePasseActuel: "",
  nouveauMotDePasse: "",
  confirmation: "",
};

export function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });
  const { errors } = form.formState;
  const nouveau = useWatch({ control: form.control, name: "nouveauMotDePasse" });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await changePasswordAction(values);
      if (!result.ok) {
        if (!applyFieldErrors(form.setError, result.fieldErrors)) toast.error(result.error);
        return;
      }
      toast.success("Password changed");
      form.reset(EMPTY);
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" aria-hidden />
          Password
        </CardTitle>
        <CardDescription>
          Choose a password of at least 8 characters with a letter and a digit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormField
            id="motDePasseActuel"
            label="Current password"
            required
            error={errors.motDePasseActuel?.message}
          >
            <PasswordInput
              id="motDePasseActuel"
              icon={Lock}
              autoComplete="current-password"
              invalid={!!errors.motDePasseActuel}
              aria-describedby={describedBy("motDePasseActuel", errors.motDePasseActuel?.message)}
              {...form.register("motDePasseActuel")}
            />
          </FormField>
          <div className="space-y-2">
            <FormField
              id="nouveauMotDePasse"
              label="New password"
              required
              error={errors.nouveauMotDePasse?.message}
            >
              <PasswordInput
                id="nouveauMotDePasse"
                icon={Lock}
                autoComplete="new-password"
                invalid={!!errors.nouveauMotDePasse}
                aria-describedby={[
                  describedBy("nouveauMotDePasse", errors.nouveauMotDePasse?.message),
                  "nouveau-force",
                ]
                  .filter(Boolean)
                  .join(" ")}
                {...form.register("nouveauMotDePasse")}
              />
            </FormField>
            <PasswordStrength id="nouveau-force" value={nouveau ?? ""} />
          </div>
          <FormField
            id="confirmationMdp"
            label="Confirm new password"
            required
            error={errors.confirmation?.message}
          >
            <PasswordInput
              id="confirmationMdp"
              icon={Lock}
              autoComplete="new-password"
              invalid={!!errors.confirmation}
              aria-describedby={describedBy("confirmationMdp", errors.confirmation?.message)}
              {...form.register("confirmation")}
            />
          </FormField>
          <div className="flex justify-end border-t pt-4">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              Change password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
