# Invitations

Wedding invitation editor for clients. It is a paid feature: locked until the client has paid for it,
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
| Templates | `invitation.templates.ts` |

Shortcuts: Ctrl+Z / Ctrl+Y undo and redo, Ctrl+C / Ctrl+V / Ctrl+D copy, paste and duplicate, Del removes,
arrows move (Shift = 10), Ctrl+S saves. The editor also saves by itself.

A card can be shared at `/invitation/<token>`: public, not indexed, and the client can turn it off.

Tests: `npm run test:invitations`.
