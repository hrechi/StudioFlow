# Invitations

Invitation editor for clients, for 11 kinds of events (wedding, engagement, henna night, birthday, baby shower,
graduation, corporate event, conference, anniversary, religious celebration, housewarming). It is a paid feature: locked until the client has paid for it,
through the same billing path as a session.

## Unlocking (link with Facturation)

1. On `/espace-client/invitations` the client sees the price and clicks **Unlock the editor**. This opens
   a sent quote (`Devis` with `objet: "INVITATION"`, no session, no deposit) at the price set by the admin
   on `/dashboard/facturation/invitations`.
2. The client accepts it on `/espace-client/factures`; the invoice is issued.
3. The client pays like any invoice: online (Konnect, Stripe, test checkout), or by transfer, cheque or cash
   with a proof. The admin confirms a proof on the quote page, or records a payment at the desk.
4. As soon as the invoice is fully paid, the editor is unlocked and the client is notified.

"Unlocked" is never stored. `invitation.acces.ts` reads it from the invoice, so all the payment paths unlock
the editor with no extra code. `assertDebloque` guards every read, write, upload and AI call on the server.
One payment unlocks the whole account, for up to `MAX_INVITATIONS` cards.

## The document

`invitation.schema.ts` (Zod) is the single source of truth: size, background, elements (`id`, `type`, `x`, `y`,
`width`, `height`, `rotation`, `layer`, `style`, `linkedTo`) and the form details. Announce any change to it.

**Changes (event types, editor tools, animations, QR):** every new field is optional, so cards saved before stay valid
as they are and need no migration (checked on the 25 cards of the local demo database).

- `typeEvenement` (absent = `MARIAGE`), read with `typeDe()`; details gain `titre`, `hotes`, `tenue`, `contact`,
  `adresse`, `coordonnees` and the matching `linkedTo` values.
- Elements gain `nom`, `visible`, `verrouille`, `flipX`, `flipY`, `groupe` and `animation` (bounded in `BORNES_ANIMATION`).
  Text style: `lineHeight`, `majuscules`, `ombre`, `contour`, `courbe`. Shapes: `star`, `ring`, `arch`, `frame`,
  `degrade`, `cornerRadius`, `epaisseur`. Images: `masque`, `cadre`, `filtre`.
- New element types `qrcode` (Google Maps link of the venue; the schema refuses a pale or tiny code) and `countdown`.
- Card-level `ouverture`, `ambiance`, `musique` (public page only; exports always show the still card).
Two examples are in `examples/`. Images can only be a bundled decoration (`public/invitations/decorations`) or
an upload (GridFS bucket `imagesInvitations`): outside links are refused because they break the export.

## Main pieces

| What | Where |
| --- | --- |
| `renderInvitation` (Konva stage, browser only) | `components/invitation-stage.tsx` |
| `saveInvitation` / `loadInvitation`, access rights | `invitation.service.ts` |
| `exportInvitation` (PNG, PDF with pdf-lib, 300 dpi) | `invitation.canvas.ts` |
| Fields linked to the card | `invitation.linked.ts` |
| Undo / redo, alignment guides | `invitation.history.ts`, `invitation.snap.ts` |
| AI text and colors, with written fallbacks | `invitation.ia.ts` (needs `GEMINI_API_KEY`) |
| Templates (5 hand-made weddings + a factory for the other types) | `invitation.templates.ts` |
| Event types: labels, palettes, decorations, AI tone, written texts | `invitation.evenements.ts` |
| Align, distribute, group, layers, flip | `invitation.outils.ts` |
| Animation timing, countdown, device profile | `invitation.animation.ts`, `components/invitation-animee.tsx` |
| Map links (Google Maps, Apple Maps, Waze), QR code, contrast | `invitation.lieu.ts`, `invitation.qr.ts`, `invitation.couleurs.ts` |
| Link preview (Open Graph picture in GridFS) | `saveApercu` / `openApercu`, `/api/invitations/[id]/apercu`, `/api/invitations/apercu/[token]` |
| Music library (files in `public/invitations/musique`, hidden while missing) | `MUSIQUES`, `invitation.musique.ts` |

Shortcuts: Ctrl+Z / Ctrl+Y undo and redo, Ctrl+C / Ctrl+V / Ctrl+D copy, paste and duplicate, Del removes,
arrows move (Shift = 10), Ctrl+S saves, Ctrl+A selects all, Ctrl+G / Ctrl+Shift+G group and ungroup, [ and ] change
the layer (Ctrl = to the back / front), Shift+H / Shift+V flip, G shows the grid, Ctrl+wheel or Ctrl +/- zoom,
Space + drag moves the view, Shift + click selects several. The editor also saves by itself.

A card can be shared at `/invitation/<token>`: public, not indexed, and the client can turn it off.

Tests: `npm run test:invitations`.
