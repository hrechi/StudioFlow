"use client";

import { CloudUpload, FileImage, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/utils";
import { PHOTO_MAX_BYTES, PHOTO_MIME_TYPES, type Galerie } from "../galerie.types";

type QueueItem = {
  key: string;
  file: File;
  progress: number;
  state: "waiting" | "uploading" | "done" | "error";
  error?: string;
};

const MAX_MB = PHOTO_MAX_BYTES / 1024 / 1024;

function checkFile(file: File): string | undefined {
  if (!(PHOTO_MIME_TYPES as readonly string[]).includes(file.type)) {
    return "Only JPG, PNG and WebP";
  }
  if (file.size > PHOTO_MAX_BYTES) return `${MAX_MB} MB maximum`;
  return undefined;
}

/** POST one file to /api/photos/upload, reporting upload progress (fetch can't). */
function uploadOne(
  galerieId: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<ActionResult<{ id: string }>> {
  return new Promise((resolve) => {
    const body = new FormData();
    body.set("galerieId", galerieId);
    body.set("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/photos/upload");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress((e.loaded / e.total) * 100);
    xhr.onload = () =>
      resolve(
        (xhr.response as ActionResult<{ id: string }> | null) ?? {
          ok: false,
          error: `Upload failed (${xhr.status})`,
        },
      );
    xhr.onerror = () => resolve({ ok: false, error: "Network error" });
    xhr.send(body);
  });
}

const STATE_LABEL: Record<QueueItem["state"], string> = {
  waiting: "Waiting",
  uploading: "Uploading…",
  done: "Imported",
  error: "Failed",
};

/** Bulk photo import into a gallery (files are stored in MongoDB GridFS). */
export function UploadDialog({
  trigger,
  galeries,
  galerieId: fixedGalerieId,
}: {
  trigger: React.ReactNode;
  /** Galleries to choose from (photo library); omit when `galerieId` is fixed. */
  galeries?: Pick<Galerie, "id" | "titre">[];
  galerieId?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [galerieId, setGalerieId] = useState(fixedGalerieId ?? galeries?.[0]?.id ?? "");
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);

  const update = (key: string, patch: Partial<QueueItem>) =>
    setQueue((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const items = [...files].map((file, i): QueueItem => {
      const error = checkFile(file);
      return {
        key: `${Date.now()}-${i}-${file.name}`,
        file,
        progress: 0,
        state: error ? "error" : "waiting",
        error,
      };
    });
    setQueue((prev) => [...prev.filter((item) => item.state !== "done"), ...items]);
  };

  const start = async () => {
    if (!galerieId) {
      toast.error("Choose a gallery first");
      return;
    }
    setRunning(true);
    let imported = 0;
    for (const item of queue.filter((q) => q.state === "waiting")) {
      update(item.key, { state: "uploading" });
      const result = await uploadOne(galerieId, item.file, (progress) =>
        update(item.key, { progress }),
      );
      if (result.ok) {
        imported += 1;
        update(item.key, { state: "done", progress: 100 });
      } else {
        update(item.key, { state: "error", error: result.error });
      }
    }
    setRunning(false);
    if (imported) {
      toast.success(`${imported} photo${imported > 1 ? "s" : ""} imported`);
      router.refresh();
    }
  };

  const waiting = queue.filter((q) => q.state === "waiting").length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (running) return;
        setOpen(next);
        if (!next) setQueue([]);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import photos</DialogTitle>
          <DialogDescription>
            Photos are stored by StudioFlow with a thumbnail. AI analysis (sharpness, tags…) comes
            in a later step.
          </DialogDescription>
        </DialogHeader>

        {!fixedGalerieId && (
          <div className="space-y-1.5">
            <Label htmlFor="upload-galerie" className="text-sm font-medium text-slate">
              Gallery
            </Label>
            <Select value={galerieId} onValueChange={setGalerieId} disabled={running}>
              <SelectTrigger id="upload-galerie" className="h-10 w-full bg-white">
                <SelectValue placeholder="Choose a gallery">
                  {galeries?.find((g) => g.id === galerieId)?.titre}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {galeries?.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.titre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {galeries?.length === 0 && (
              <p className="text-xs text-muted-foreground">Create a gallery first.</p>
            )}
          </div>
        )}

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!running) addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
            dragging
              ? "border-primary bg-accent"
              : "border-light-gray bg-surface hover:border-primary/50",
          )}
        >
          <span className="grid size-12 place-items-center rounded-full bg-accent text-primary-text">
            <CloudUpload className="size-6" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-charcoal">Drag your photos here</span>
          <span className="text-xs text-muted-foreground">
            or click to browse · JPG, PNG, WebP · {MAX_MB} MB max per file
          </span>
          <input
            type="file"
            multiple
            accept={PHOTO_MIME_TYPES.join(",")}
            className="sr-only"
            disabled={running}
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>

        {queue.length > 0 && (
          <ul className="max-h-60 space-y-3 overflow-y-auto pr-1">
            {queue.map((item) => (
              <li key={item.key} className="flex items-center gap-3">
                <FileImage className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-charcoal">{item.file.name}</span>
                    <span
                      className={cn(
                        "shrink-0",
                        item.state === "done" && "text-success-text",
                        item.state === "error" && "text-destructive-text",
                        (item.state === "waiting" || item.state === "uploading") &&
                          "text-muted-foreground",
                      )}
                    >
                      {item.error ?? STATE_LABEL[item.state]}
                    </span>
                  </div>
                  <Progress
                    value={item.progress}
                    aria-label={`Progress ${item.file.name}`}
                    className={cn(item.state === "error" && "[&>div]:bg-destructive")}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={running} type="button">
            Close
          </Button>
          <Button onClick={start} disabled={running || waiting === 0 || !galerieId}>
            {running ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <CloudUpload aria-hidden />
            )}
            {waiting > 0 ? `Import ${waiting} photo${waiting > 1 ? "s" : ""}` : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
