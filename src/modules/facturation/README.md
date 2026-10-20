# Facturation

Quotes are stored in MongoDB as `devis` documents. Invoice records are embedded
in their parent quote so quote visibility and invoice visibility use the same
permission boundary.

All persisted money values are integer millimes (`1 TND = 1000 millimes`).
The UI converts values at the boundary with `formatTND`; discounts and VAT are
percentages. Administrators create and manage quotes, clients can only read
their own non-draft quotes, and other staff roles are denied management access.

The Séances module does not yet expose a persistence service, so
`facturation.integrations.ts` is an explicit adapter with a TODO. Replace that
lookup when the service is available.

Run the test suite with the repository's test runner once configured. The
facturation seed should be run only in a non-production environment.
