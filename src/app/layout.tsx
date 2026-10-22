import type { Metadata, Viewport } from "next";
import { ThemeScript } from "@/components/theme/theme";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// next/font/google removed: requires internet access at build time (fonts.gstatic.com).
// --font-sans and --font-display are defined as CSS variables in globals.css instead.

const DESCRIPTION =
  "ReFrame, photography studio in Tunis: weddings, portraits, products and events. Book your session, discover your private gallery and approve your selection online.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  applicationName: "ReFrame",
  title: {
    default: "ReFrame — Photography studio",
    template: "%s · ReFrame",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "ReFrame",
    title: "ReFrame — Photography studio",
    description: DESCRIPTION,
    locale: "en_GB",
  },
  twitter: { card: "summary_large_image", title: "ReFrame — Photography studio" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a", // updated by ThemeScript / setTheme in light mode
  colorScheme: "dark light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark h-full`}
      data-scroll-behavior="smooth"
      // ThemeScript may switch the class to light before hydration.
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster position="top-right" richColors={false} closeButton />
      </body>
    </html>
  );
}
