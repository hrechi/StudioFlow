import type { Metadata } from "next";
import { AuthSplitLayout } from "@/components/layout/auth-split-layout";
import { FRONT_IMAGES } from "@/lib/mock-images";
import { LoginForm } from "@/modules/utilisateurs/components/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { callbackUrl, raison } = await searchParams;
  return (
    <AuthSplitLayout
      image={FRONT_IMAGES.auth}
      imageAlt="Newlywed couple photographed in black and white"
      caption="Every session tells a story. Come back to yours."
    >
      <LoginForm
        callbackUrl={typeof callbackUrl === "string" ? callbackUrl : undefined}
        raison={typeof raison === "string" ? raison : undefined}
      />
    </AuthSplitLayout>
  );
}
