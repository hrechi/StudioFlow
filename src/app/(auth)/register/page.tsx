import type { Metadata } from "next";
import { AuthSplitLayout } from "@/components/layout/auth-split-layout";
import { FRONT_IMAGES } from "@/lib/mock-images";
import { RegisterForm } from "@/modules/utilisateurs/components/register-form";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <AuthSplitLayout
      image={FRONT_IMAGES.register}
      imageAlt="Hands of a newlywed couple"
      caption="Your most precious moments, gathered in a private space."
    >
      <RegisterForm />
    </AuthSplitLayout>
  );
}
