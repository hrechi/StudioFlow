"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Briefcase, Building2, ImageIcon, Loader2, Lock, MapPin, Phone, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { FormField, IconInput, describedBy } from "@/components/shared/form-field";
import { applyFieldErrors } from "@/components/shared/form-utils";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfileAction } from "../utilisateur.actions";
import { profileSchema, type ProfileInput } from "../utilisateur.schemas";
import type { UtilisateurDTO } from "../utilisateur.types";
import { TypeClientPicker } from "./type-client-picker";

/** Profile edition — same component in the backoffice and the client area. */
export function ProfileForm({ user }: { user: UtilisateurDTO }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isClient = user.role === "CLIENT";

  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      prenom: user.prenom,
      nom: user.nom,
      telephone: user.telephone ?? "",
      adresse: user.adresse ?? "",
      photoProfil: user.photoProfil ?? "",
      typeClient: isClient ? (user.typeClient ?? "PARTICULIER") : undefined,
      entreprise: user.entreprise ?? "",
      specialite: user.specialite ?? "",
    },
  });
  const { errors, isDirty } = form.formState;
  const [prenom, nom, photoProfil, typeClient] = useWatch({
    control: form.control,
    name: ["prenom", "nom", "photoProfil", "typeClient"],
  });
  const previewUrl = /^https?:\/\/\S+$/i.test(photoProfil ?? "") ? photoProfil : undefined;

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateProfileAction(values);
      if (!result.ok) {
        applyFieldErrors(form.setError, result.fieldErrors);
        toast.error(result.error);
        return;
      }
      toast.success("Profile updated");
      form.reset(values);
      router.refresh();
    });
  });

  const a11y = (name: keyof ProfileInput) => ({
    invalid: !!errors[name],
    "aria-describedby": describedBy(name, errors[name]?.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal information</CardTitle>
        <CardDescription>This information is visible to the studio staff.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <div className="flex flex-col gap-4 rounded-xl bg-surface p-4 sm:flex-row sm:items-center">
            <UserAvatar prenom={prenom} nom={nom} photoProfil={previewUrl} size="xl" />
            <FormField
              id="photoProfil"
              label="Profile photo (URL)"
              error={errors.photoProfil?.message}
              hint="Paste an image link. File upload (Cloudinary) is coming later."
              className="flex-1"
            >
              <IconInput
                id="photoProfil"
                icon={ImageIcon}
                type="url"
                placeholder="https://…"
                {...a11y("photoProfil")}
                aria-describedby={describedBy("photoProfil", errors.photoProfil?.message, true)}
                {...form.register("photoProfil")}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="prenom" label="First name" required error={errors.prenom?.message}>
              <IconInput
                id="prenom"
                icon={User}
                autoComplete="given-name"
                {...a11y("prenom")}
                {...form.register("prenom")}
              />
            </FormField>
            <FormField id="nom" label="Last name" required error={errors.nom?.message}>
              <IconInput
                id="nom"
                icon={User}
                autoComplete="family-name"
                {...a11y("nom")}
                {...form.register("nom")}
              />
            </FormField>
            <FormField
              id="email"
              label="Email"
              hint="Your email is your login: contact the studio to change it."
            >
              <IconInput
                id="email"
                icon={Lock}
                value={user.email}
                readOnly
                disabled
                aria-describedby="email-hint"
              />
            </FormField>
            <FormField id="telephone" label="Phone" error={errors.telephone?.message}>
              <IconInput
                id="telephone"
                type="tel"
                icon={Phone}
                autoComplete="tel"
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
                autoComplete="street-address"
                {...a11y("adresse")}
                {...form.register("adresse")}
              />
            </FormField>
          </div>

          {isClient ? (
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
                    autoComplete="organization"
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

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="ghost"
              disabled={!isDirty || pending}
              onClick={() => form.reset()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !isDirty}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
