import { Message as MessageComponent } from "@/components/message";
import type { Message } from "@/lib/types";

interface ChatMessagesProps {
  messages: Message[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const hasMessages = messages && messages.length > 0;
  const last = hasMessages ? messages[messages.length - 1] : null;
  const showThinking =
    last && last.role === "assistant" && (last as any).state === "thinking";

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {!hasMessages && (
          <EmptyState />
        )}

        {hasMessages &&
          messages.map((msg) => <MessageComponent key={msg.id} {...msg} />)}

        {/* Removed the TypingIndicator component */}
      </div>
    </div>
  );
}

/* ---------- extras (self-contained) ---------- */

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/40 p-6 text-center">
      <div className="text-sm text-muted-foreground">
        Ask Sylvia anything, or drop a file to analyze.
      </div>
    </div>
  );
}

// The TypingIndicator component is no longer used, so it can be removed.
// function TypingIndicator() {
//   return (
//     <div
//       aria-live="polite"
//       className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 w-fit"
//     >
//       <div className="h-2 w-2 animate-bounce rounded-full bg-foreground/70 [animation-delay:-0.2s]" />
//       <div className="h-2 w-2 animate-bounce rounded-full bg-foreground/70 [animation-delay:-0.1s]" />
//       <div className="h-2 w-2 animate-bounce rounded-full bg-foreground/70" />
//       <span className="sr-only">Assistant is thinking…</span>
//     </div>
//   );
// }