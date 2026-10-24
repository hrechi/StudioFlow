# Portfolio module

The portfolio module stores one portfolio per photographer. It manages draft blocks, consent, publication, public pages, contact requests, statistics and AI suggestions.

## Architecture

- `portfolio.model.ts`: Mongoose collections `portfolios`, `portfolio_stats` and `demandes_contact`.
- `portfolio.schemas.ts`: Zod schemas for portfolio settings, typed block configuration, media and public contact forms.
- `portfolio.service.ts`: database access and business rules. Public reads only serialize `blocsPublies`.
- `portfolio.actions.ts`: authenticated Server Actions with Zod validation and owner checks.
- `integrations/`: contracts and mocks for the shared users, photos, reviews, sessions and notifications modules.
- `components/`: block editor, public block renderer, photo consent, contact and portfolio statistics.
- `ia.service.ts`: mock suggestions. A shared `lib/ai` client is not present in this repository; real AI calls return a clear unavailable result until that service is provided.

## Configuration

```env
USE_MOCKS=true
PORTFOLIO_BASE_URL=http://localhost:3000
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

`USE_MOCKS=true` selects integration mocks for local development. With mocks disabled, the current gallery service does not expose photographer ownership and client-consent metadata, so portfolio photo selection fails closed and returns no photos. Reviews and sessions remain mock integrations until their service contracts are wired.

Cloudinary credentials are required for personal photo uploads. They are used only by `POST /api/portfolio/upload` and never sent to the browser. The endpoint accepts JPG, PNG and WebP images up to 20 MB. Public contact, view, like and upload limits currently use a per-process memory store; a shared limiter should replace it for multi-instance deployment.

## Routes

- `/portfolio`: published directory with specialty, city and pagination filters.
- `/portfolio/[slug]`: published portfolio page. It reads the frozen `blocsPublies` snapshot; private portfolios are accessible by direct link but excluded from the directory.
- `/dashboard/portfolio`: owner portfolio list and create form.
- `/dashboard/portfolio/[id]`: three-panel editor with autosave, block/photo sorting, keyboard controls, preview, undo/redo and publication controls.
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

## Checks

```bash
npm run test:portfolio
npm run test:e2e
npm run typecheck
npm run lint
npm run build
```

The local Vitest suite checks block and consent validation and the publication snapshot rule. Playwright includes public portfolio and unpublished-page smoke checks; set `PORTFOLIO_E2E_BASE_URL`, `PORTFOLIO_E2E_PUBLISHED_SLUG` and `PORTFOLIO_E2E_DRAFT_SLUG` to run them. The full create/edit/publish/contact journey needs a seeded photographer account and a MongoDB test database. This workspace currently has no Playwright browser cache or populated local MongoDB credentials, so browser checks cannot run here yet.

`next build` currently fails in this workspace when Next.js invokes its TypeScript CLI subprocess (`Could not parse output from TypeScript's --showConfig`). The direct `npm run typecheck` check succeeds. ESLint also reports a non-blocking Next.js warning for the QR image element in the editor.
