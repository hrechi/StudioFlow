/**
 * Module : Contrats & Blockchain · Responsable : Yosser Rafrafi
 * GET /api/contrats/[id]/pdf — serve the frozen (or generated) contract PDF.
 */
import { type NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/guards";
import { NotFoundError, readPdfContrat } from "@/modules/contrats/contrat.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireUser();
    const { id } = await params;
    const { data, filename } = await readPdfContrat(id, actor);

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Content-Length": String(data.length),
        // Frozen PDFs can be cached; generated ones should not
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: "Contract not found." }, { status: 404 });
    }
    console.error("[contrats/pdf]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
