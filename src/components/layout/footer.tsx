import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { FacebookIcon, InstagramIcon, LinkedinIcon } from "@/components/shared/social-icons";
import { PUBLIC_LINKS } from "./nav-config";

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com", icon: InstagramIcon },
  { label: "Facebook", href: "https://facebook.com", icon: FacebookIcon },
  { label: "LinkedIn", href: "https://linkedin.com", icon: LinkedinIcon },
];

/** Charcoal footer of the public site. */
export function Footer() {
  return (
    <footer className="bg-charcoal text-white/70">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="space-y-5">
          <Logo tone="onDark" showTagline />
          <p className="max-w-xs text-sm leading-relaxed">
            Photography studio in Tunis: weddings, portraits, products and events. Your sessions,
            private galleries and invoices in one place.
          </p>
          <ul className="flex gap-2">
            {SOCIALS.map(({ label, href, icon: Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="grid size-10 place-items-center rounded-full border border-white/15 text-white/80 transition-colors hover:border-white/40 hover:text-white"
                >
                  <Icon className="size-4.5" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <FooterColumn title="The studio">
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
          <li className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            Rue du Lac Léman, Les Berges du Lac, 1053 Tunis
          </li>
          <li className="flex items-center gap-2.5">
            <Phone className="size-4 shrink-0 text-primary" aria-hidden />
            <a href="tel:+21670000000" className="hover:text-white">
              +216 70 000 000
            </a>
          </li>
          <li className="flex items-center gap-2.5">
            <Mail className="size-4 shrink-0 text-primary" aria-hidden />
            <a href="mailto:contact@studioflow.tn" className="hover:text-white">
              contact@studioflow.tn
            </a>
          </li>
        </FooterColumn>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-5 py-6 text-xs sm:flex-row sm:px-8">
          <p>© {new Date().getFullYear()} StudioFlow. All rights reserved.</p>
          <p>AI-Powered Operating System for Photography Studios</p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold tracking-wide text-white">{title}</p>
      <ul className="space-y-3 text-sm">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="transition-colors hover:text-white">
        {children}
      </Link>
    </li>
  );
}
