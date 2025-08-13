"use client";

import * as React from 'react';
import { CheckCircle2, AlertTriangle, Clock, Server, Wrench } from 'lucide-react';
import { Card } from '@/components/ui/card';

export type ToolEvent = {
  name: string;
  args: any;
  serverUrl: string;
  ok: boolean;
  error?: string;
  durationMs: number;
  preview?: string;
};

export function ToolCallPanel({ events }: { events: ToolEvent[] }) {
  if (!events || events.length === 0) return null;
  return (
    <div className="space-y-3">
      {events.map((e, i) => (
        <Card key={i} className={`border ${e.ok ? 'border-green-400/50' : 'border-red-400/50'} bg-background/60 p-3`}> 
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className={`h-4 w-4 ${e.ok ? 'text-green-500' : 'text-red-500'}`} />
              <div className="text-sm font-medium">{e.name}</div>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1"><Server className="h-3 w-3" /> {new URL(e.serverUrl).hostname}</div>
              <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {e.durationMs}ms</div>
              {e.ok ? (
                <div className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" /> ok</div>
              ) : (
                <div className="flex items-center gap-1 text-red-600"><AlertTriangle className="h-3 w-3" /> error</div>
              )}
            </div>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="rounded-md bg-muted p-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Args</div>
              <pre className="m-0 whitespace-pre-wrap break-words text-xs">{JSON.stringify(e.args, null, 2)}</pre>
            </div>
            <div className="rounded-md bg-muted p-2">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Result</div>
              <pre className="m-0 whitespace-pre-wrap break-words text-xs">{e.ok ? (e.preview || '(no preview)') : (e.error || '(error)')}</pre>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
