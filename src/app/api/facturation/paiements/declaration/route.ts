/* Module : Gestion de la Facturation · Responsable : Aya Flah */
import { revalidatePath } from "next/cache";
import { after, NextResponse, type NextRequest } from "next/server";
import { failure, success, toFailure, validationFailure } from "@/lib/action-result";
import { getCurrentUser } from "@/lib/guards";
import { declarationFormSchema } from "@/modules/facturation/facturation.schema";
import { toMillimes } from "@/modules/facturation/facturation.utils";
import { declarePaiement } from "@/modules/facturation/paiement.service";
import { analyserDeclaration } from "@/modules/facturation/preuve.analyse";

/**
 * Declares a payment.
 * POST multipart/form-data { devisId, factureId, montant, date, modePaiement, reference?, commentaire?, preuve? }
 * The client declares a transfer / cheque / cash payment with its proof. A Route Handler (not a
 * Server Action) because Server Actions cap request bodies at 1 MB.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json(failure("Please sign in again."), { status: 401 });
  if (user.role !== "CLIENT") return NextResponse.json(failure("Only the client can declare a payment."), { status: 403 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(failure("Invalid form."), { status: 400 });
  }
  const devisId = form.get("devisId");
  const factureId = form.get("factureId");
  if (typeof devisId !== "string" || typeof factureId !== "string") {
    return NextResponse.json(failure("Invoice missing."), { status: 400 });
  }
  const parsed = declarationFormSchema.safeParse({
    montant: form.get("montant"),
    date: form.get("date"),
    modePaiement: form.get("modePaiement"),
    reference: form.get("reference") ?? undefined,
    commentaire: form.get("commentaire") ?? undefined,
  });
  if (!parsed.success) return NextResponse.json(validationFailure(parsed.error), { status: 400 });

  const file = form.get("preuve");
  const preuve = file instanceof File && file.size > 0
    ? { name: file.name, type: file.type, size: file.size, data: Buffer.from(await file.arrayBuffer()) }
    : null;

  try {
    const { declarationId, aPreuve } = await declarePaiement(devisId, factureId, { ...parsed.data, montant: toMillimes(parsed.data.montant) }, preuve, user);
    // The AI reads the proof once the client already has the answer (it can take a few seconds).
    if (aPreuve) after(() => analyserDeclaration(devisId, factureId, declarationId));
    revalidatePath("/espace-client/factures");
    revalidatePath(`/dashboard/facturation/devis/${devisId}`);
    revalidatePath("/dashboard/facturation/factures");
    return NextResponse.json(success(), { status: 201 });
  } catch (error) {
    return NextResponse.json(toFailure(error), { status: 400 });
  }
}
