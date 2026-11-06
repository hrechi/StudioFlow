"use client";
/**
 * Module : Contrats & Blockchain · Responsable : Yosser Rafrafi
 * Formulaire côté client : upload PDF (hash calculé dans le navigateur) ou saisie manuelle.
 * Aucun fichier n'est envoyé au serveur — seul le hash hex est soumis.
 */
import { FileText, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function VerifierForm({ initialHash }: { initialHash?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"upload" | "hash">(initialHash ? "hash" : "upload");
  const [hash, setHash] = useState(initialHash ?? "");
  const [hashing, setHashing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function computeHash(file: File) {
    setHashing(true);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const digest = await crypto.subtle.digest("SHA-256", buf);
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setHash(hex);
    } finally {
      setHashing(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const h = hash.trim().toLowerCase();
    if (/^[0-9a-f]{64}$/.test(h)) {
      router.push(`/verifier-contrat?hash=${h}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tab switcher */}
      <div className="flex rounded-xl border bg-muted/40 p-1">
        {(["upload", "hash"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 rounded-lg py-2 text-sm font-medium transition-all",
              tab === t
                ? "bg-card shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "upload" ? "Upload PDF" : "Paste hash"}
          </button>
        ))}
      </div>

      {tab === "upload" && (
        <div>
          <label
            htmlFor="pdf-file"
            className={cn(
              "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
              hashing
                ? "border-primary/40 bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-muted/30",
            )}
          >
            <FileText
              className={cn("size-10", hashing ? "text-primary-text animate-pulse" : "text-muted-foreground")}
              aria-hidden
            />
            <div>
              {hashing ? (
                <p className="text-sm font-medium text-primary-text">Computing fingerprint…</p>
              ) : fileName ? (
                <>
                  <p className="text-sm font-medium text-foreground">{fileName}</p>
                  <p className="text-xs text-muted-foreground">Click to change</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-foreground">Click to select your PDF</p>
                  <p className="text-xs text-muted-foreground">
                    The hash is computed locally — the file is never uploaded.
                  </p>
                </>
              )}
            </div>
            <input
              id="pdf-file"
              ref={fileRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void computeHash(f);
              }}
            />
          </label>
          {hash && !hashing && (
            <p className="mt-2 break-all rounded-md bg-muted px-3 py-2 font-mono text-xs text-foreground">
              {hash}
            </p>
          )}
        </div>
      )}

      {tab === "hash" && (
        <div className="space-y-1.5">
          <Label htmlFor="hash-input">SHA-256 fingerprint</Label>
          <Input
            id="hash-input"
            value={hash}
            onChange={(e) => setHash(e.target.value.trim())}
            placeholder="e.g. a3f5c2d1…"
            className="font-mono text-sm"
            maxLength={64}
          />
          <p className="text-xs text-muted-foreground">64 hexadecimal characters</p>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={hashing || hash.length !== 64}
      >
        <Search className="size-4" aria-hidden />
        Verify
      </Button>
    </form>
  );
}
