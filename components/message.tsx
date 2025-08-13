import ReactMarkdown from "react-markdown";
import { ThinkingIndicator } from "@/components/thinking-indicator";
import { Card } from "@/components/ui/card";
import type { Message as MessageType } from "@/lib/types";
import { AttachmentAdmonition } from "./attachment-admonition";
import { ToolCallPanel, type ToolEvent } from "@/components/tool-call-panel";

const attachmentRegex = /\[Attached file:\s*([^\]]+)\]/i;

export function Message({ role, content, state }: MessageType) {
  return role === "user" ? (
    <UserMessage content={content} />
  ) : (
    <AssistantMessage content={content} state={state} />
  );
}

/* ---------- User message ---------- */
function UserMessage({ content }: { content: string }) {
  const match = content.match(attachmentRegex);
  const mainContent = match ? content.replace(attachmentRegex, "").trim() : content.trim();
  const fileName = match?.[1];

  // Detect MCP/use hints like [Use MCP:server_smithery_ai] or [Use ...]
  const useHints = (content.match(/\[Use[^\]]+\]/gi) || []) as string[];

  return (
    <div className="flex justify-end">
      <Card className="max-w-xl rounded-2xl bg-card p-4 text-card-foreground space-y-2">
        {useHints.length > 0 && (
          <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
            Requested tools: {useHints.join(' ')}
          </div>
        )}
        {mainContent && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{mainContent}</ReactMarkdown>
          </div>
        )}
        {fileName && <AttachmentAdmonition fileName={fileName} />}
      </Card>
    </div>
  );
}

/* ---------- Assistant message ---------- */
function AssistantMessage({
  content,
  state,
}: {
  content: string;
  state?: MessageType["state"];
}) {
  const components = {
      p: ({ node, children }: any) => {
        const textContent = node.children.map((child: any) => child.value || '').join('');

        const patterns = [
          { type: 'inner-monologue', regex: /^\[(.*)\]$/s },
          { type: 'stage-direction', regex: /^\s*\[(.*)\]\s*$/s },
          { type: 'explanation', regex: /^(Here\'s how this works:|How it works:|The implementation:)/i },
          { type: 'example', regex: /^(For example:|Let\'s say:|Consider this:)/i },
          { type: 'warning', regex: /^(Important:|Warning:|Note:|Remember:)/i },
          { type: 'result', regex: /^(The result:|In summary:|Conclusion:|Final result:)/i }
        ];

        for (const pattern of patterns) {
          if (pattern.regex.test(textContent)) {
            const styleClasses = {
              'inner-monologue': "mb-4 p-3 rounded-lg bg-purple-50 border-l-4 border-purple-300 dark:bg-purple-900/20 dark:border-purple-400 text-sm italic text-purple-700 dark:text-purple-300",
              'stage-direction': "mb-4 p-3 rounded-lg bg-blue-50 border-l-4 border-blue-300 dark:bg-blue-900/20 dark:border-blue-400 text-sm italic text-blue-700 dark:text-blue-300",
              'explanation': "mb-4 p-3 rounded-lg bg-green-50 border-l-4 border-green-300 dark:bg-green-900/20 dark:border-green-400 text-sm font-medium text-green-700 dark:text-green-300",
              'example': "mb-4 p-3 rounded-lg bg-orange-50 border-l-4 border-orange-300 dark:bg-orange-900/20 dark:border-orange-400 text-sm text-orange-700 dark:text-orange-300",
              'warning': "mb-4 p-3 rounded-lg bg-red-50 border-l-4 border-red-300 dark:bg-red-900/20 dark:border-red-400 text-sm font-medium text-red-700 dark:text-red-300",
              'result': "mb-4 p-3 rounded-lg bg-yellow-50 border-l-4 border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-400 text-sm font-medium text-yellow-700 dark:text-yellow-300",
            }[pattern.type];

            return <div className={styleClasses}>{children}</div>;
          }
        }
        
        return <p className="mb-4 text-sm leading-relaxed text-muted-foreground last:mb-0">{children}</p>;
      },
    h1: ({ children }: any) => (
      <div className="mb-6 p-4 rounded-lg bg-blue-50 border-l-4 border-blue-400 dark:bg-blue-900/20 dark:border-blue-500">
        <h1 className="text-lg font-bold text-blue-800 dark:text-blue-200 m-0">{children}</h1>
      </div>
    ),
    h2: ({ children }: any) => (
      <div className="mb-4 p-3 rounded-lg bg-green-50 border-l-4 border-green-400 dark:bg-green-900/20 dark:border-green-500">
        <h2 className="text-base font-semibold text-green-800 dark:text-green-200 m-0">{children}</h2>
      </div>
    ),
    h3: ({ children }: any) => (
      <div className="mb-4 p-3 rounded-lg bg-purple-50 border-l-4 border-purple-400 dark:bg-purple-900/20 dark:border-purple-500">
        <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-200 m-0">{children}</h3>
      </div>
    ),
    blockquote: ({ children }: any) => (
      <div className="mb-4 p-4 rounded-lg bg-yellow-50 border-l-4 border-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-500">
        <div className="text-sm italic text-yellow-800 dark:text-yellow-200">{children}</div>
      </div>
    ),
    ul: ({ children }: any) => (
      <ul className="mb-4 text-sm space-y-1 list-disc list-inside text-muted-foreground">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="mb-4 text-sm space-y-1 list-decimal list-inside text-muted-foreground">{children}</ol>
    ),
    li: ({ children }: any) => (
      <li className="text-sm leading-relaxed">{children}</li>
    ),
    code: ({ children }: any) => (
      <code className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded text-gray-800 dark:text-gray-200">
        {children}
      </code>
    ),
    pre: ({ children }: any) => (
      <div className="mb-4 rounded-lg bg-green-50 border-l-4 border-green-400 dark:bg-green-900/30 dark:border-green-500 p-1">
        <div className="p-3 rounded-md bg-background/80">
          <pre className="text-xs overflow-x-auto text-gray-800 dark:text-gray-200 m-0 bg-transparent">{children}</pre>
        </div>
      </div>
    ),
    strong: ({ children }: any) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }: any) => (
      <em className="italic text-muted-foreground">{children}</em>
    ),
  };

  // Extract TOOL_EVENTS prelude if present
  let toolEvents: ToolEvent[] | null = null;
  let displayContent = content;
  const m = content.match(/\[\[TOOL_EVENTS:([A-Za-z0-9+/=]+)\]\]/);
  if (m) {
    try {
      const decoded = typeof atob !== 'undefined' ? atob(m[1]) : Buffer.from(m[1], 'base64').toString('utf-8');
      const obj = JSON.parse(decoded);
      toolEvents = Array.isArray(obj?.toolEvents) ? obj.toolEvents : null;
    } catch {}
    displayContent = content.replace(m[0], '');
  }

  return (
    <div className="flex justify-start">
      <Card className="w-full max-w-2xl rounded-2xl bg-muted p-6 space-y-3">
        {state === "thinking" && <ThinkingIndicator />}
        {toolEvents && toolEvents.length > 0 && (
          <ToolCallPanel events={toolEvents} />
        )}
        {displayContent && (
          <div className="prose-sm max-w-none">
            <ReactMarkdown 
              components={components}
            >
              {displayContent}
            </ReactMarkdown>
          </div>
        )}
      </Card>
    </div>
  );
}
