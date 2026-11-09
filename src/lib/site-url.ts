/**
 * The site's public address, without a trailing slash: payment return links, portfolio share
 * links, page metadata. Set APP_URL to force one (e.g. a custom domain); on Vercel it is
 * otherwise the project's production address, which Vercel provides by itself.
 */
export function siteUrl(): string {
  const explicit = process.env.APP_URL?.trim() || process.env.SITE_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  return (explicit || (vercel ? `https://${vercel}` : "http://localhost:3000")).replace(/\/$/, "");
}
