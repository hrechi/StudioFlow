# Portfolio module

The portfolio module stores one portfolio per photographer. It manages draft blocks, consent, publication, public pages, contact requests, statistics and AI suggestions.

## Architecture

- `portfolio.model.ts`: Mongoose collections `portfolios`, `portfolio_stats` and `demandes_contact`.
- `portfolio.schemas.ts`: Zod schemas for portfolio settings, typed block configuration, media and public contact forms.
- `portfolio.service.ts`: database access and business rules. Public reads only serialize `blocsPublies`.
- `portfolio.actions.ts`: authenticated Server Actions with Zod validation and owner checks.
- `integrations/`: contracts and mocks for the shared users, photos, reviews, sessions and notifications modules.
- `components/`: block editor, public block renderer, the `gallery3d/` virtual exhibition, photo consent, contact and portfolio statistics.
- `ia.service.ts`: direct, server-only Gemini calls for portfolio audit guidance and photo vision checks.

## Configuration

```env
USE_MOCKS=true
PORTFOLIO_BASE_URL=http://localhost:3000
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
```

`GEMINI_API_KEY` is used only by server code and is never sent to the browser. The default `gemini-3.5-flash-lite` model supports multimodal input and is optimized for low latency. Portfolio audit sends text and structural summaries, not image bytes. Photo verification analyzes up to six of the photographer's newest matching gallery photos directly with Gemini; images are resized before upload and scores are saved to photo records. Captions and alternative text also use the selected photo bytes. The editor asks before sending images. Bio, SEO, case study, layout, and aggregated-statistics suggestions use only the portfolio facts supplied to them. Configure a Gemini API key before using these actions. `USE_MOCKS=true` still selects integration mocks for users, reviews, sessions, and notifications.

Cloudinary credentials are required for personal photo uploads. They are used only by `POST /api/portfolio/upload` and never sent to the browser. The endpoint accepts JPG, PNG and WebP images up to 20 MB. Public contact, view, like and upload limits currently use a per-process memory store; a shared limiter should replace it for multi-instance deployment.

## Routes

- `/portfolio`: published studio directory with live keyword, location, multi-category, style, service and availability filters. Criteria combine with AND semantics and pagination is applied on the server.
- `/portfolio/[slug]`: published studio profile and professional portfolio in one page, with profile details, location map, service/style metadata, category navigation, the selected gallery presentation, contact and social links. It reads the frozen `blocsPublies` snapshot and returns not found unless both publication status and visibility are public.
- `/dashboard/portfolio`: owner portfolio list and create form.
- `/dashboard/portfolio/[id]`: three-panel editor with autosave, block/photo sorting, keyboard controls, preview, undo/redo and publication controls. The Before/After block accepts separate personal image uploads and publishes them as a comparison slider.
- `/dashboard/portfolio/preview`: authenticated, owner-only rendering of the saved draft. It is marked `noindex`, filters photos without confirmed client consent, and disables public contact and like actions.
- `/dashboard/portfolio/stats`: views and contact metrics for the last 30 days.
- `/dashboard/portfolio/demandes`: contact request status and session conversion.
- `/espace-client/portfolio-consentements`: client approval and withdrawal of photo consent.
- `POST /api/contact-portfolio`, `POST /api/portfolio/[slug]/vue`, `POST /api/portfolio/[slug]/like`, `POST /api/portfolio/upload`.

## Service contracts expected from other modules

All cross-module calls go through `integrations/portfolio-integrations.types.ts`.

```ts
utilisateursService.getUtilisateur(id: string): Promise<UtilisateurPortfolio | null>
utilisateursService.verifierRole(userId: string, roles: readonly ("PHOTOGRAPHE" | "RETOUCHEUR" | "ADMIN")[]): Promise<boolean>

photosService.getPhotoPourPortfolio(photoId: string): Promise<PhotoPortfolio | null>
photosService.listerPhotosDuPhotographe(photographeId: string, filtres?: { categorie?: CategoriePortfolio }): Promise<PhotoPortfolio[]>
photosService.listerMeilleuresPhotos(photographeId: string, categorie?: CategoriePortfolio, limite?: number): Promise<PhotoPortfolio[]>

avisService.listerAvisPublies(photographeId: string): Promise<AvisPortfolio[]>
avisService.calculerNoteMoyenne(photographeId: string): Promise<number>

seancesService.getSeance(id: string): Promise<{ id: string; titre: string } | null>
seancesService.compterSeancesTerminees(photographeId: string): Promise<number>
seancesService.creerDepuisDemande(demande: { portfolioId: string; photographeId: string; nomVisiteur: string; email: string; telephone?: string; typeSeance: string; dateSouhaitee?: string; message: string }): Promise<{ id: string }>

notificationsService.envoyer(notification: { type: string; destinataireId: string; cible: string; message: string }): Promise<void>
```

The photos service must return only photos available to the requesting photographer and include client ownership when consent is required. Do not wire the current unfiltered library query into these contracts.

Public profile and directory metadata (bio, city/region/country, specialties, styles, services, availability, theme, accent color, watermark, visibility and social links) can be entered during portfolio creation and updated later in the portfolio editor. Photographers can combine a base theme with a preset accent or a custom HEX color; the editor preview and published portfolio use the selected appearance. The public search combines every selected category, style and service, and always includes the published/public visibility guard.

Publishing requires exactly one Hero block and complete before/after image pairs. A Hero background video is optional; the configured cover image is used when no video is set. The editor previews the saved draft through the protected dashboard route rather than exposing draft content through a public slug.

Each visible `GALERIE` or `COLLECTION` block renders as its own public gallery, with its own photos, title and selected display mode. Gallery photos can only be chosen from the authenticated photographer's accessible MongoDB photo library; external URLs and direct uploads are not accepted in the gallery picker. The server verifies each selected photo's MongoDB record and library access before saving, and legacy gallery entries without a matching database photo are omitted. Each block is limited to 12 photos. The editor supports a 3D album, accessible grid, portrait slideshow, product viewer, event mosaic, or fashion editorial layout. `/portfolio/album-demo` remains a static component demo.

## Checks

```bash
npm run test:portfolio
npm run test:e2e
npm run typecheck
npm run lint
npm run build
```

The local Vitest suite checks block and consent validation, public visibility enforcement, owner-scoped draft preview, the starter template structure, publication snapshots and automatic gallery room layout. Playwright includes public portfolio and unpublished-page smoke checks; set `PORTFOLIO_E2E_BASE_URL`, `PORTFOLIO_E2E_PUBLISHED_SLUG` and `PORTFOLIO_E2E_DRAFT_SLUG` to run them. The full create/edit/publish/contact journey needs a seeded photographer account and a MongoDB test database. This workspace currently has no Playwright browser cache or populated local MongoDB credentials, so browser checks cannot run here yet.

`next build` currently fails in this workspace when Next.js invokes its TypeScript CLI subprocess (`Could not parse output from TypeScript's --showConfig`). The direct `npm run typecheck` check succeeds. ESLint also reports a non-blocking Next.js warning for the QR image element in the editor.
