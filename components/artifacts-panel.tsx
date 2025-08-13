'use client';

import { useEffect, useRef, useState } from 'react';
import {
  X, Copy, Download, FileCode, FileText, Image as ImageIcon,
  Link as LinkIcon, TerminalSquare, Braces, Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuxiliaryAgent } from '@/components/auxiliary-agent';

type ArtifactItem =
  | { id: string; kind: 'text'; title?: string; text: string }
  | { id: string; kind: 'code'; title?: string; language?: string; code: string }
  | { id: string; kind: 'stdout'; title?: string; text: string }
  | { id: string; kind: 'image'; title?: string; dataUrl: string; alt?: string }
  | { id: string; kind: 'link'; title?: string; url: string; label?: string }
  | { id: string; kind: 'json'; title?: string; data: any }
  | { id: string; kind: 'file'; title?: string; name: string; mimeType: string; base64: string };

interface ArtifactsPanelProps {
  onClose: () => void;
  /** Optional: provide artifacts to render. If omitted, shows the empty state. */
  items?: ArtifactItem[];
  /** Optional: custom title */
  title?: string;
  /** Main agent context for auxiliary agent */
  mainAgentContext?: string;
  /** Session ID for neural highway */
  sessionId?: string;
}

export function ArtifactsPanel({ onClose, items, title = 'Artifacts', mainAgentContext, sessionId }: ArtifactsPanelProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div ref={rootRef} className="flex h-full flex-col">
      <AuxiliaryAgent
        mainAgentContext={mainAgentContext}
        isVisible={true}
        sessionId={sessionId}
        onClose={onClose}
      />
    </div>
  );
}

/* ---------- RENDERERS ---------- */

function renderItem(item: ArtifactItem) {
  switch (item.kind) {
    case 'text':
      return (
        <Card key={item.id} Icon={FileText} title={item.title ?? 'Text'}>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{item.text}</p>
          <RowActions copyText={item.text} />
        </Card>
      );

    case 'code':
      return (
        <Card key={item.id} Icon={FileCode} title={item.title ?? (item.language ? item.language.toUpperCase() : 'Code')}>
          <pre className="overflow-auto rounded bg-muted/40 p-3 text-xs leading-relaxed">
            {item.code}
          </pre>
          <RowActions copyText={item.code} filename={suggestName(item.title, item.language ?? 'txt')} />
        </Card>
      );

    case 'stdout':
      return (
        <Card key={item.id} Icon={TerminalSquare} title={item.title ?? 'Output'}>
          <pre className="overflow-auto rounded bg-muted/30 p-3 text-xs text-muted-foreground">
            {item.text}
          </pre>
          <RowActions copyText={item.text} filename={suggestName(item.title, 'log')} />
        </Card>
      );

    case 'image':
      return (
        <Card key={item.id} Icon={ImageIcon} title={item.title ?? 'Image'}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.dataUrl} alt={item.alt ?? 'artifact'} className="max-h-[360px] w-auto rounded border border-border" />
          <RowActions downloadDataUrl={item.dataUrl} filename={suggestName(item.title, extFromDataUrl(item.dataUrl))} />
        </Card>
      );

    case 'link':
      return (
        <Card key={item.id} Icon={LinkIcon} title={item.title ?? 'Link'}>
          <a className="text-sm text-primary underline break-all" href={item.url} target="_blank" rel="noreferrer">
            {item.label ?? item.url}
          </a>
        </Card>
      );

    case 'json': {
      const pretty = safeStringify(item.data);
      return (
        <Card key={item.id} Icon={Braces} title={item.title ?? 'JSON'}>
          <pre className="overflow-auto rounded bg-muted/40 p-3 text-xs">
            {pretty}
          </pre>
          <RowActions copyText={pretty} filename={suggestName(item.title, 'json')} />
        </Card>
      );
    }

    case 'file': {
      const dataUrl = `data:${item.mimeType};base64,${item.base64}`;
      return (
        <Card key={item.id} Icon={FileText} title={item.title ?? item.name}>
          <p className="text-xs text-muted-foreground">{item.name} • {item.mimeType}</p>
          <RowActions downloadDataUrl={dataUrl} filename={item.name} />
        </Card>
      );
    }
  }
}

/* ---------- SMALL PIECES ---------- */

function Card({
  Icon,
  title,
  children,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div className="text-sm font-medium leading-none">{title}</div>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function RowActions({
  copyText,
  filename,
  downloadDataUrl,
}: {
  copyText?: string;
  filename?: string;
  downloadDataUrl?: string;
}) {
  return (
    <div className="mt-2 flex items-center gap-2">
      {copyText != null && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigator.clipboard?.writeText(copyText)}
          className="h-7 gap-1"
        >
          <Copy className="h-3.5 w-3.5" />
          <span className="text-xs">Copy</span>
        </Button>
      )}
      {downloadDataUrl && filename && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => download(downloadDataUrl, filename)}
          className="h-7 gap-1"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="text-xs">Download</span>
        </Button>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border p-4">
      <p className="text-sm text-muted-foreground">
        Generated artifacts will be displayed here. As you work with Sylvia, any code blocks, 
        documents, or other resources will appear in this tab for easy access and review.
      </p>
    </div>
  );
}

/* ---------- HELPERS ---------- */

function download(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function suggestName(title?: string, ext?: string) {
  const base = (title?.trim() || 'artifact').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
  return `${base}.${ext || 'txt'}`;
}

function extFromDataUrl(d: string) {
  const m = /^data:([^;]+)/.exec(d);
  if (!m) return 'png';
  const mime = m[1];
  if (mime.includes('png')) return 'png';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  if (mime.includes('webp')) return 'webp';
  return 'bin';
}

function safeStringify(v: any) {
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}
