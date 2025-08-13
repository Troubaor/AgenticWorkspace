'use client';

import { useEffect } from 'react';
import { PanelRightOpen, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ChatHeaderProps {
  onToggleArtifacts: () => void;
  onToggleVision?: () => void;
}

export function ChatHeader({ onToggleArtifacts, onToggleVision }: ChatHeaderProps) {
  // Keyboard shortcuts: Cmd/Ctrl + Shift + A (artifacts), Cmd/Ctrl + Shift + V (vision)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      if (cmdOrCtrl && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        onToggleArtifacts();
      }
      if (cmdOrCtrl && e.shiftKey && (e.key === 'V' || e.key === 'v') && onToggleVision) {
        e.preventDefault();
        onToggleVision();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToggleArtifacts, onToggleVision]);

  return (
    <div className="flex h-14 items-center justify-between border-b bg-card px-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Sylvia</h2>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          // your agentic workspace
        </span>
      </div>

      <TooltipProvider delayDuration={0}>
        <div className="flex items-center gap-1">
          
          {onToggleVision && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggleVision}
                  aria-label="Toggle Vision Panel"
                  className="h-8 w-8"
                >
                  <Eye className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end">
                <p className="text-xs">
                  Toggle Vision Panel
                  <span className="ml-2 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    ⌘/Ctrl + ⇧ + V
                  </span>
                </p>
              </TooltipContent>
            </Tooltip>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleArtifacts}
                aria-label="Toggle Artifacts panel"
                className="h-8 w-8"
              >
                <PanelRightOpen className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="end">
              <p className="text-xs">
                Toggle Artifacts
                <span className="ml-2 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  ⌘/Ctrl + ⇧ + A
                </span>
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
