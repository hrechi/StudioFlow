# Facturation

Quotes are stored in MongoDB as `devis` documents. Invoice records are embedded
in their parent quote so quote visibility and invoice visibility use the same
permission boundary.

All persisted money values are integer millimes (`1 TND = 1000 millimes`).
The UI converts values at the boundary with `formatTND`; discounts and VAT are
percentages. Administrators create and manage quotes, clients can only read
their own non-draft quotes, and other staff roles are denied management access.

## Flow

1. A session is confirmed in Séances (`CONFIRMEE`, `EN_COURS`, `TERMINEE` or
   `REPORTEE`) and has a client account → the admin creates a quote from it
   (`facturation.integrations.ts` reads the Séances service).
2. `BROUILLON` → send → `ENVOYE` (the client gets a notification). A sent quote
   can be taken back to draft. Past its validity date it becomes `EXPIRE`.
3. The client accepts or declines from `/espace-client/factures`. Accepting means
   choosing how to pay: **in full** (one invoice, due in 7 days) or **deposit +
   balance** (`tauxAcompte` % due in 7 days, the rest due on the session date),
   plus the payment method. The invoices are issued at that moment.
4. The client pays the studio with that method; the admin confirms each payment
   received (full or partial) on the invoice. The invoice status (`EN_ATTENTE`,
   `PARTIELLEMENT_PAYEE`, `PAYEE`, `EN_RETARD`) is computed from the amounts and
   today's date. Before any payment the admin can cancel the invoices and issue
   them again.
5. Quotes and invoices download as branded PDFs (`facturation.pdf.ts`, route
   `/api/facturation/devis/[id]/pdf[?facture=<id>]`), for the admin and the client.

"Generate with AI" reuses the latest accepted quote for the same event type,
falling back to the session's agreed or pack price. The late-payment risk is a
heuristic from the client's payment history.

Rules: only drafts are edited; a quote with invoices cannot be deleted;
invoices with a payment cannot be cancelled. The facturation seed should be run
only in a non-production environment.
