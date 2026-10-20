import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import { ThemeScript } from "@/components/theme/theme";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

/** Body text: clean neo-grotesque. */
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

/** Headings: geometric sans that matches the RE FRAME wordmark (set in uppercase, wide tracking). */
const outfit = Outfit({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

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
      className={`dark ${inter.variable} ${outfit.variable} h-full`}
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
