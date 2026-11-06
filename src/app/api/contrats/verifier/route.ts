/**
 * Module : Contrats & Blockchain · Responsable : Yosser Rafrafi
 * GET /api/contrats/verifier?hash=<sha256hex> — public blockchain lookup.
 * No authentication required (blockchain data is public).
 */
import { type NextRequest, NextResponse } from "next/server";
import { verifierContrat } from "@/modules/contrats/contrat.service";

export async function GET(req: NextRequest) {
  const hash = req.nextUrl.searchParams.get("hash")?.trim().toLowerCase();

  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) {
    return NextResponse.json(
      { error: "Invalid SHA-256 hash. Must be 64 hexadecimal characters." },
      { status: 400 },
    );
  }

  try {
    const result = await verifierContrat(hash);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[contrats/verifier]", error);
    return NextResponse.json(
      { error: "Unable to reach the blockchain node." },
      { status: 503 },
    );
  }
}
