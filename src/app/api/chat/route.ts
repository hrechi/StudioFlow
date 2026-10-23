import { NextResponse } from "next/server";
import { z } from "zod";
import { answerChat } from "@/modules/seances/chatbot/chatbot.service";

/**
 * Module : Chatbot IA · Responsable : Yosser Rafrafi
 * Endpoint public (les visiteurs ne sont pas connectés). Lecture seule : le chatbot n'écrit jamais.
 *
 * Protection :
 *  - Limites sur la taille du payload (Zod)
 *  - Rate-limit par IP en mémoire (1 compteur par instance serveur)
 *    → À migrer vers Redis/Upstash si le site est déployé sur plusieurs instances.
 */
export const runtime = "nodejs";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(600),
      }),
    )
    .min(1)
    .max(12),
});

const WINDOW_MS = 60_000; // 1 minute
const MAX_PER_WINDOW = 8; // max 8 messages par minute et par IP
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  // Nettoyage : évite une fuite mémoire sur les IPs inactives
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (limited(ip)) {
    return NextResponse.json(
      { error: "Trop de messages. Veuillez patienter un moment." },
      { status: 429 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const result = await answerChat(parsed.data.messages);
  return NextResponse.json(result);
}
