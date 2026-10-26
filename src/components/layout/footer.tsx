import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { FacebookIcon, InstagramIcon, LinkedinIcon } from "@/components/shared/social-icons";
import { PUBLIC_LINKS } from "./nav-config";

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com", icon: InstagramIcon },
  { label: "Facebook", href: "https://facebook.com", icon: FacebookIcon },
  { label: "LinkedIn", href: "https://linkedin.com", icon: LinkedinIcon },
];

/** Public site footer: oversized wordmark, three quiet columns, hairline rules. */
export function Footer() {
  return (
    <footer className="border-t border-foreground/[0.06] bg-background text-foreground/60">
      <div className="container-wide py-20 lg:py-28">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
          <div className="space-y-6">
            <p className="max-w-xs text-sm leading-relaxed">
              Photography studio in Tunis. Weddings, portraits, products and events, told in images
              that last.
            </p>
            <ul className="flex gap-2">
              {SOCIALS.map(({ label, href, icon: Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${label} (opens in a new tab)`}
                    className="grid size-11 place-items-center border border-foreground/10 text-foreground/70 transition-colors duration-500 hover:border-gold hover:text-gold"
                  >
                    <Icon className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <FooterColumn title="Studio">
            {PUBLIC_LINKS.map((link) => (
              <FooterLink key={link.href} href={link.href}>
                {link.label}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="Client area">
            <FooterLink href="/login">Sign in</FooterLink>
            <FooterLink href="/register">Create an account</FooterLink>
            <FooterLink href="/espace-client/seances/reserver">Book a session</FooterLink>
            <FooterLink href="/espace-client/galeries">My galleries</FooterLink>
          </FooterColumn>

          <FooterColumn title="Contact">
            <li>Rue du Lac Léman, Les Berges du Lac, 1053 Tunis</li>
            <li>
              <a href="tel:+21670000000" className="transition-colors hover:text-foreground">
                +216 70 000 000
              </a>
            </li>
            <li>
              <a
                href="mailto:contact@reframe.tn"
                className="inline-flex items-center gap-1.5 text-foreground transition-colors hover:text-gold"
              >
                contact@reframe.tn
                <ArrowUpRight className="size-3.5" aria-hidden />
              </a>
            </li>
          </FooterColumn>
        </div>

        <Link
          href="/"
          aria-label="ReFrame — back to top"
          className="mt-20 block py-4 text-foreground/90 transition-colors duration-700 hover:text-foreground lg:mt-28"
        >
          <Logo className="flex w-full" iconClassName="h-auto w-full" />
        </Link>
      </div>
      <div className="border-t border-foreground/[0.06]">
        <div className="container-wide flex flex-col items-center justify-between gap-2 py-6 text-[0.7rem] tracking-[0.2em] uppercase sm:flex-row">
          <p>© {new Date().getFullYear()} ReFrame. All rights reserved.</p>
          <p>Tunis · Photography studio</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-5">
      <p className="eyebrow">{title}</p>
      <ul className="space-y-3 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="transition-colors hover:text-foreground">
        {children}
      </Link>
    </li>
  );
}
