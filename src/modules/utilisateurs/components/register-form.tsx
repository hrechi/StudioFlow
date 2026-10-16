"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2, Lock, Mail, Phone, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormAlert } from "@/components/shared/form-alert";
import { FormField, IconInput, PasswordInput, describedBy } from "@/components/shared/form-field";
import { applyFieldErrors } from "@/components/shared/form-utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { registerAction } from "../utilisateur.actions";
import { registerSchema, type RegisterInput } from "../utilisateur.schemas";
import { TypeClientPicker } from "./type-client-picker";
import { PasswordStrength } from "./password-strength";

export function RegisterForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      prenom: "",
      nom: "",
      email: "",
      telephone: "",
      typeClient: "PARTICULIER",
      entreprise: "",
      motDePasse: "",
      confirmation: "",
      accepteConditions: false,
    },
  });
  const { errors } = form.formState;
  const [typeClient, motDePasse] = useWatch({
    control: form.control,
    name: ["typeClient", "motDePasse"],
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await registerAction(values);
      if (!result.ok) {
        const inline = applyFieldErrors(form.setError, result.fieldErrors);
        if (!inline) setServerError(result.error);
        return;
      }
      toast.success("Welcome! Your account has been created.");
      router.replace(result.data.redirectTo);
      router.refresh();
    });
  });

  const field = (name: keyof RegisterInput) => ({
    invalid: !!errors[name],
    "aria-describedby": describedBy(name, errors[name]?.message),
  });

  return (
    <div className="space-y-7">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-charcoal">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Book a session, approve your photos and follow your invoices online.
        </p>
      </header>

      {serverError && <FormAlert>{serverError}</FormAlert>}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="prenom" label="First name" required error={errors.prenom?.message}>
            <IconInput
              id="prenom"
              icon={User}
              autoComplete="given-name"
              {...field("prenom")}
              {...form.register("prenom")}
            />
          </FormField>
          <FormField id="nom" label="Last name" required error={errors.nom?.message}>
            <IconInput
              id="nom"
              icon={User}
              autoComplete="family-name"
              {...field("nom")}
              {...form.register("nom")}
            />
          </FormField>
        </div>

        <FormField id="email" label="Email" required error={errors.email?.message}>
          <IconInput
            id="email"
            type="email"
            icon={Mail}
            autoComplete="email"
            placeholder="you@example.com"
            {...field("email")}
            {...form.register("email")}
          />
        </FormField>

        <FormField id="telephone" label="Phone (optional)" error={errors.telephone?.message}>
          <IconInput
            id="telephone"
            type="tel"
            icon={Phone}
            autoComplete="tel"
            placeholder="+216 20 000 000"
            {...field("telephone")}
            {...form.register("telephone")}
          />
        </FormField>

        <Controller
          control={form.control}
          name="typeClient"
          render={({ field: typeField }) => (
            <TypeClientPicker
              value={typeField.value}
              onChange={typeField.onChange}
              error={errors.typeClient?.message}
            />
          )}
        />

        {typeClient === "ENTREPRISE" && (
          <FormField
            id="entreprise"
            label="Company name"
            required
            error={errors.entreprise?.message}
          >
            <IconInput
              id="entreprise"
              icon={Building2}
              autoComplete="organization"
              {...field("entreprise")}
              {...form.register("entreprise")}
            />
          </FormField>
        )}

        <div className="space-y-2">
          <FormField id="motDePasse" label="Password" required error={errors.motDePasse?.message}>
            <PasswordInput
              id="motDePasse"
              icon={Lock}
              autoComplete="new-password"
              invalid={!!errors.motDePasse}
              aria-describedby={[
                describedBy("motDePasse", errors.motDePasse?.message),
                "motDePasse-force",
              ]
                .filter(Boolean)
                .join(" ")}
              {...form.register("motDePasse")}
            />
          </FormField>
          <PasswordStrength id="motDePasse-force" value={motDePasse ?? ""} />
        </div>

        <FormField
          id="confirmation"
          label="Confirm password"
          required
          error={errors.confirmation?.message}
        >
          <PasswordInput
            id="confirmation"
            icon={Lock}
            autoComplete="new-password"
            {...field("confirmation")}
            {...form.register("confirmation")}
          />
        </FormField>

        <div className="space-y-1.5">
          <div className="flex items-start gap-3">
            <Controller
              control={form.control}
              name="accepteConditions"
              render={({ field: checkField }) => (
                <Checkbox
                  id="accepteConditions"
                  checked={checkField.value}
                  onCheckedChange={(checked) => checkField.onChange(checked === true)}
                  aria-invalid={!!errors.accepteConditions || undefined}
                  aria-describedby={describedBy(
                    "accepteConditions",
                    errors.accepteConditions?.message,
                  )}
                  className="mt-0.5"
                />
              )}
            />
            <label htmlFor="accepteConditions" className="text-sm leading-snug text-slate">
              I accept the studio&apos;s terms of use and privacy policy.
            </label>
          </div>
          {errors.accepteConditions && (
            <p
              id="accepteConditions-error"
              role="alert"
              className="text-xs font-medium text-destructive-text"
            >
              {errors.accepteConditions.message}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {pending ? "Creating your account…" : "Create my account"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary-text hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
