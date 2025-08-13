"use client";
import React from "react";
import {
  Bot,
  Puzzle,
  X,
  LucideIcon,
  Settings,
  Split,
  Brain,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter, useSearchParams } from "next/navigation";

// Shared types with API
type Thread = {
  id: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  messages: { id: string; role: "user" | "assistant"; content: string; createdAt: number }[];
};

export function Sidebar() {
  const { theme, setTheme } = useTheme();
  const [openThreads, setOpenThreads] = React.useState(false);

  return (
    <div className="flex h-full flex-col items-center bg-sidebar p-1 text-sidebar-foreground">
      <TooltipProvider delayDuration={0}>
        {/* Top section */}
        <div className="flex flex-1 flex-col items-center space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="p-2 h-auto w-auto hover:bg-accent"
              >
                <Bot size={28} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="text-xs">
                Switch Theme
                <span className="block text-[10px] text-muted-foreground">
                  Currently: {theme === "light" ? "Light" : "Dark"}
                </span>
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Slide-out Threads icon */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Chat History" onClick={() => setOpenThreads(true)}>
                <History className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Chat History</TooltipContent>
          </Tooltip>

          <SidebarButton icon={Brain} label="Neural Highway" href="/neural-highway" />
          <SidebarButton icon={Puzzle} label="Extensions" href="/extensions" />
          <SidebarButton icon={Split} label="SBS Prompting" href="/sbs" />
          <SidebarButton icon={Settings} label="Agent Settings" href="/agent" />
        </div>

        {/* Bottom section */}
        <div className="mt-auto flex flex-col items-center space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="cursor-pointer">
                <AvatarFallback>J</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="right">User</TooltipContent>
          </Tooltip>
        </div>

        {/* Slide-out panel for Threads */}
        <ThreadsSlideOver open={openThreads} onOpenChange={setOpenThreads} />
      </TooltipProvider>
    </div>
  );
}

/* Reusable sidebar button */
function SidebarButton({ icon: Icon, label, href }: { icon: LucideIcon; label: string; href?: string }) {
  const content = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label}>
          <Icon className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

function ThreadsSlideOver({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [threads, setThreads] = React.useState<Thread[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();
  const search = useSearchParams();
  const activeThread = search?.get("thread") ?? undefined;

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    fetch("/api/threads")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setThreads(data.threads ?? []);
      })
      .catch(() => {
        if (!cancelled) setThreads([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const onSelect = (id: string) => {
    // Push query param to focus the thread in the chat UI
    const url = new URL(window.location.href);
    url.searchParams.set("thread", id);
    router.push(url.pathname + "?" + url.searchParams.toString());
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80 sm:w-96 p-0">
        <SheetHeader className="p-4 pb-2">
          <SheetTitle>Previous Chats</SheetTitle>
        </SheetHeader>
        <div className="p-2 pt-0">
          <ScrollArea className="h-[calc(100vh-5rem)] pr-2">
            <div className="flex flex-col gap-1">
              {loading && (
                <div className="p-3 text-sm text-muted-foreground">Loading…</div>
              )}
              {!loading && threads && threads.length === 0 && (
                <div className="p-3 text-sm text-muted-foreground">No previous chats yet.</div>
              )}
              {!loading && threads && threads.map((t) => {
                const last = t.messages[t.messages.length - 1];
                const preview = last?.content?.slice(0, 80) ?? "";
                const title = t.title || (t.messages[0]?.content?.slice(0, 40) || "Untitled chat");
                const isActive = activeThread === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelect(t.id)}
                    className={`text-left rounded-md px-3 py-2 hover:bg-accent ${isActive ? "bg-accent" : ""}`}
                  >
                    <div className="text-sm font-medium truncate">{title}</div>
                    <div className="text-xs text-muted-foreground truncate">{preview}</div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

