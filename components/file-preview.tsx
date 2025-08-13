"use client";

import * as React from "react";
import Image from "next/image";
import { FileText, Video, Music, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "ready" | "uploading" | "error";

interface FilePreviewProps {
  file: File;
  onRemove: () => void;
  /** Optional: show state (adds color + progress bar if uploading) */
  status?: Status;
  /** Optional: 0..100 progress bar when uploading */
  progress?: number;
}

export function FilePreview({
  file,
  onRemove,
  status = "ready",
  progress,
}: FilePreviewProps) {
  const [imgUrl, setImgUrl] = React.useState<string | null>(null);
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  const isAudio = file.type.startsWith("audio/");
  const isPdf = file.type === "application/pdf";
  const ext = getExt(file.name);

  // ESC to remove
  React.useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRemove();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onRemove]);

  // Object URL for image preview
  React.useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  // Object URL for video preview (muted loop)
  React.useEffect(() => {
    if (!isVideo) return;
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isVideo]);

  const stateClass =
    status === "error"
      ? "border-rose-500/40 bg-rose-500/5"
      : status === "uploading"
      ? "border-amber-500/40 bg-amber-500/5"
      : "border-border bg-card";

  return (
    <div className="absolute bottom-full left-0 mb-2 w-full px-4 md:px-6">
      <div className="mx-auto max-w-3xl">
        <div
          className={[
            "flex items-center justify-between rounded-lg border p-2 text-sm transition",
            stateClass,
          ].join(" ")}
          role="status"
          aria-live="polite"
        >
          <div className="flex min-w-0 items-center gap-2">
            <PreviewIcon
              isImage={isImage}
              imgUrl={imgUrl}
              isVideo={isVideo}
              videoUrl={videoUrl}
              isAudio={isAudio}
              isPdf={isPdf}
            />

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{file.name}</span>
                {ext && (
                  <span className="shrink-0 rounded border border-border bg-background px-1.5 py-[2px] text-[10px] uppercase text-muted-foreground">
                    {ext}
                  </span>
                )}
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                </span>
              </div>

              {/* Uploading progress */}
              {status === "uploading" && typeof progress === "number" && (
                <div className="mt-1 h-1.5 w-full rounded bg-muted">
                  <div
                    className="h-full rounded bg-amber-500 transition-[width]"
                    style={{
                      width: `${Math.max(0, Math.min(100, progress))}%`,
                    }}
                  />
                </div>
              )}

              {/* Error hint */}
              {status === "error" && (
                <div className="mt-1 flex items-center gap-1 text-xs text-rose-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Failed to attach. Press Esc to dismiss and try again.
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={onRemove}
            aria-label="Remove attachment"
            title="Remove (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function PreviewIcon({
  isImage,
  imgUrl,
  isVideo,
  videoUrl,
  isAudio,
  isPdf,
}: {
  isImage: boolean;
  imgUrl: string | null;
  isVideo: boolean;
  videoUrl: string | null;
  isAudio: boolean;
  isPdf: boolean;
}) {
  if (isImage && imgUrl) {
    return (
      <Image
        src={imgUrl}
        alt="Image preview"
        width={24}
        height={24}
        className="h-6 w-6 flex-shrink-0 rounded-sm object-cover"
      />
    );
  }
  if (isVideo && videoUrl) {
    return (
      // tiny looping preview; falls back to icon if autoplay blocked
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        src={videoUrl}
        className="h-6 w-6 flex-shrink-0 rounded-sm object-cover"
        muted
        playsInline
        loop
        autoPlay
        onError={(e) => {
          // if preview fails, hide element so parent layout stays clean
          (e.currentTarget as HTMLVideoElement).style.display = "none";
        }}
      />
    );
  }
  if (isAudio) return <Music className="h-5 w-5 flex-shrink-0" />;
  if (isPdf) return <FileText className="h-5 w-5 flex-shrink-0" />;
  return <FileText className="h-5 w-5 flex-shrink-0" />;
}

/* ---------- Helpers ---------- */

function getExt(name: string) {
  const m = /\.([a-z0-9]+)$/i.exec(name);
  return m ? m[1] : "";
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0,
    n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  const fixed = n < 10 && i > 0 ? 1 : 0;
  return `${n.toFixed(fixed)} ${units[i]}`;
}
