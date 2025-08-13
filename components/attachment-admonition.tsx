"use client";

import { Paperclip, X, Loader2, AlertTriangle } from "lucide-react";

type Status = "ready" | "uploading" | "error";

interface AttachmentAdmonitionProps {
  fileName: string;
  fileSizeBytes?: number;       // optional: show "23.4 KB"
  status?: Status;              // optional: "ready" | "uploading" | "error"
  progress?: number;            // optional: 0..100 when uploading
  onRemove?: () => void;        // optional: show an X button
  onClick?: () => void;         // optional: click row to preview
}

export function AttachmentAdmonition({
  fileName,
  fileSizeBytes,
  status = "ready",
  progress,
  onRemove,
  onClick,
}: AttachmentAdmonitionProps) {
  const isUploading = status === "uploading";
  const isError = status === "error";

  return (
    <div
      role="button"
      onClick={onClick}
      className={[
        "mt-2 flex items-center gap-2 rounded-lg border p-2 transition",
        "bg-background/50",
        isError
          ? "border-rose-500/40 bg-rose-500/5"
          : isUploading
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-border",
        onClick ? "cursor-pointer hover:bg-accent/40" : "cursor-default",
      ].join(" ")}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
        {isError ? (
          <AlertTriangle className="h-4 w-4 text-rose-500" />
        ) : isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
        ) : (
          <Paperclip className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{fileName}</span>
          {fileSizeBytes != null && (
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {formatBytes(fileSizeBytes)}
            </span>
          )}
        </div>

        {/* Upload progress bar */}
        {isUploading && typeof progress === "number" && (
          <div className="mt-1 h-1.5 w-full rounded bg-muted">
            <div
              className="h-full rounded bg-amber-500 transition-[width]"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            />
          </div>
        )}

        {/* Error hint */}
        {isError && (
          <div className="mt-1 text-xs text-rose-400">
            Failed to attach. Click to retry or remove.
          </div>
        )}
      </div>

      {onRemove && (
        <button
          type="button"
          aria-label="Remove attachment"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ---------- Helpers (self-contained) ---------- */
function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}
