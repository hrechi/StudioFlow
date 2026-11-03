"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Briefcase,
  Building2,
  ImageIcon,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { FormField, IconInput, PasswordInput, describedBy } from "@/components/shared/form-field";
import { applyFieldErrors } from "@/components/shared/form-utils";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminCreateUserAction, adminUpdateUserAction } from "../utilisateur.actions";
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
  type AdminCreateUserInput,
} from "../utilisateur.schemas";
import {
  ROLES,
  STATUTS_COMPTE,
  roleConfig,
  statutCompteConfig,
  type UtilisateurDTO,
} from "../utilisateur.types";
import { PasswordStrength } from "./password-strength";
import { TypeClientPicker } from "./type-client-picker";

type UserFormProps =
  | { mode: "create"; user?: undefined; isSelf?: false }
  | { mode: "edit"; user: UtilisateurDTO; isSelf: boolean };

// Create and edit share the same field shape (edit allows an empty password).
type Values = AdminCreateUserInput;

/** Admin form to create a user with any role, or edit every field + role + statut. */
export function UserForm({ mode, user, isSelf = false }: UserFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const resolver = zodResolver(
    mode === "create" ? adminCreateUserSchema : adminUpdateUserSchema,
  ) as Resolver<Values>;

  const form = useForm<Values>({
    resolver,
    defaultValues: {
      prenom: user?.prenom ?? "",
      nom: user?.nom ?? "",
      email: user?.email ?? "",
      telephone: user?.telephone ?? "",
      adresse: user?.adresse ?? "",
      photoProfil: user?.photoProfil ?? "",
      role: user?.role ?? "PHOTOGRAPHE",
      statut: user?.statut ?? "ACTIF",
      typeClient: user?.typeClient ?? "PARTICULIER",
      entreprise: user?.entreprise ?? "",
      specialite: user?.specialite ?? "",
      motDePasse: "",
      confirmation: "",
    },
  });
  const { errors, isDirty } = form.formState;
  const [role, typeClient, prenom, nom, photoProfil, motDePasse] = useWatch({
    control: form.control,
    name: ["role", "typeClient", "prenom", "nom", "photoProfil", "motDePasse"],
  });
  const previewUrl = /^https?:\/\/\S+$/i.test(photoProfil ?? "") ? photoProfil : undefined;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      if (mode === "create") {
        const result = await adminCreateUserAction(values);
        if (!result.ok) {
          applyFieldErrors(form.setError, result.fieldErrors);
          toast.error(result.error);
          return;
        }
        toast.success(`Account created for ${values.prenom} ${values.nom}`);
        router.push("/dashboard/utilisateurs");
        router.refresh();
        return;
      }

      const result = await adminUpdateUserAction(user.id, values);
      if (!result.ok) {
        applyFieldErrors(form.setError, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success("User updated");
      form.reset({ ...values, motDePasse: "", confirmation: "" });
      router.refresh();
    });
  });

  const a11y = (name: keyof Values) => ({
    invalid: !!errors[name],
    "aria-describedby": describedBy(name, errors[name]?.message),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identity and contact details</CardTitle>
          <CardDescription>Account and profile information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-4 rounded-xl bg-surface p-4 sm:flex-row sm:items-center">
            <UserAvatar prenom={prenom} nom={nom} photoProfil={previewUrl} size="xl" />
            <FormField
              id="photoProfil"
              label="Profile photo (URL)"
              error={errors.photoProfil?.message}
              className="flex-1"
            >
              <IconInput
                id="photoProfil"
                type="url"
                icon={ImageIcon}
                placeholder="https://…"
                {...a11y("photoProfil")}
                {...form.register("photoProfil")}
              />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="prenom" label="First name" required error={errors.prenom?.message}>
              <IconInput id="prenom" icon={User} {...a11y("prenom")} {...form.register("prenom")} />
            </FormField>
            <FormField id="nom" label="Last name" required error={errors.nom?.message}>
              <IconInput id="nom" icon={User} {...a11y("nom")} {...form.register("nom")} />
            </FormField>
            <FormField id="email" label="Email" required error={errors.email?.message}>
              <IconInput
                id="email"
                type="email"
                icon={Mail}
                autoComplete="off"
                {...a11y("email")}
                {...form.register("email")}
              />
            </FormField>
            <FormField id="telephone" label="Phone" error={errors.telephone?.message}>
              <IconInput
                id="telephone"
                type="tel"
                icon={Phone}
                {...a11y("telephone")}
                {...form.register("telephone")}
              />
            </FormField>
            <FormField
              id="adresse"
              label="Address"
              error={errors.adresse?.message}
              className="sm:col-span-2"
            >
              <IconInput
                id="adresse"
                icon={MapPin}
                {...a11y("adresse")}
                {...form.register("adresse")}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role and access</CardTitle>
          <CardDescription>
            The role decides which modules are visible in the backoffice (or the client area).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isSelf && (
            <p className="rounded-lg bg-accent px-3 py-2.5 text-sm text-primary-text" role="note">
              This is your account: you can&apos;t change your own role or status.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="role" label="Role" required error={errors.role?.message}>
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isSelf}>
                    <SelectTrigger
                      id="role"
                      className="h-10 w-full bg-card"
                      aria-invalid={!!errors.role || undefined}
                    >
                      <SelectValue>{roleConfig[field.value]?.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {roleConfig[value].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField id="statut" label="Account status" required error={errors.statut?.message}>
              <Controller
                control={form.control}
                name="statut"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isSelf}>
                    <SelectTrigger
                      id="statut"
                      className="h-10 w-full bg-card"
                      aria-invalid={!!errors.statut || undefined}
                    >
                      <SelectValue>{statutCompteConfig[field.value]?.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUTS_COMPTE.map((value) => (
                        <SelectItem key={value} value={value}>
                          {statutCompteConfig[value].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          {role === "CLIENT" ? (
            <div className="space-y-4">
              <Controller
                control={form.control}
                name="typeClient"
                render={({ field }) => (
                  <TypeClientPicker
                    value={field.value}
                    onChange={field.onChange}
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
                    {...a11y("entreprise")}
                    {...form.register("entreprise")}
                  />
                </FormField>
              )}
            </div>
          ) : (
            <FormField id="specialite" label="Specialty" error={errors.specialite?.message}>
              <IconInput
                id="specialite"
                icon={Briefcase}
                placeholder="Wedding, portrait, beauty retouching…"
                {...a11y("specialite")}
                {...form.register("specialite")}
              />
            </FormField>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Initial password" : "Reset password"}</CardTitle>
          <CardDescription>
            {mode === "create"
              ? "Share it with the person: they can change it from their profile."
              : "Leave empty to keep the current password."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <FormField
              id="motDePasse"
              label="Password"
              required={mode === "create"}
              error={errors.motDePasse?.message}
            >
              <PasswordInput
                id="motDePasse"
                icon={Lock}
                autoComplete="new-password"
                {...a11y("motDePasse")}
                {...form.register("motDePasse")}
              />
            </FormField>
            {(mode === "create" || motDePasse) && <PasswordStrength value={motDePasse ?? ""} />}
          </div>
          <FormField
            id="confirmation"
            label="Confirmation"
            required={mode === "create"}
            error={errors.confirmation?.message}
          >
            <PasswordInput
              id="confirmation"
              icon={Lock}
              autoComplete="new-password"
              {...a11y("confirmation")}
              {...form.register("confirmation")}
            />
          </FormField>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" asChild>
          <Link href="/dashboard/utilisateurs">Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending || (mode === "edit" && !isDirty)}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {mode === "create" ? "Create user" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
