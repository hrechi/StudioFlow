"use client";

import { CloudUpload, FileImage, Sparkles } from "lucide-react";
import { useState } from "react";
import { comingSoon } from "@/components/shared/coming-soon-button";
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const DEMO_QUEUE = [
  { name: "IMG_4512.CR3", progress: 100, state: "AI analysis done" },
  { name: "IMG_4513.CR3", progress: 64, state: "Uploading to Cloudinary…" },
  { name: "IMG_4514.CR3", progress: 12, state: "Waiting" },
];

/** Bulk upload dropzone (Cloudinary + AI analysis will be wired by the module). */
export function UploadDialog({ trigger }: { trigger: React.ReactNode }) {
  const [dragging, setDragging] = useState(false);
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import photos</DialogTitle>
          <DialogDescription>
            Photos are uploaded to Cloudinary, then analyzed by the AI (sharpness, closed eyes,
            duplicates, tags).
          </DialogDescription>
        </DialogHeader>

        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            comingSoon("Import the dropped photos");
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
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
            or click to browse · JPG, PNG, RAW (CR3, NEF, ARW) · 50 MB max per file
          </span>
          <input
            type="file"
            multiple
            accept="image/*,.cr3,.nef,.arw"
            className="sr-only"
            onChange={() => comingSoon("Import the selected photos")}
          />
        </label>

        <div className="space-y-3">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Example of upload tracking
          </p>
          {DEMO_QUEUE.map((file) => (
            <div key={file.name} className="flex items-center gap-3">
              <FileImage className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex justify-between gap-2 text-xs">
                  <span className="truncate font-medium text-charcoal">{file.name}</span>
                  <span
                    className={cn(
                      "shrink-0",
                      file.progress === 100 ? "text-ai-text" : "text-muted-foreground",
                    )}
                  >
                    {file.progress === 100 && (
                      <Sparkles className="mr-1 inline size-3" aria-hidden />
                    )}
                    {file.state}
                  </span>
                </div>
                <Progress
                  value={file.progress}
                  aria-label={`Progress ${file.name}`}
                  className={cn(file.progress === 100 && "[&>div]:bg-ai")}
                />
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={() => comingSoon("Start the import (Cloudinary + AI analysis)")}>
            <CloudUpload aria-hidden />
            Start import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
