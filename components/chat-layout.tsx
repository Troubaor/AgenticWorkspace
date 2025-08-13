"use client";

import * as React from "react";
import { v4 as uuidv4 } from "uuid";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Sidebar } from "@/components/sidebar";
import { ChatHeader } from "@/components/chat-header";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import { ArtifactsPanel } from "@/components/artifacts-panel";
import { VisionPanel } from "@/components/vision-panel";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAgentConfig } from "@/hooks/use-agent-config";
import { neuralHighway, createNeuralContext } from "@/lib/neural-highway";
import { Button } from "@/components/ui/button";
import { X, Eye } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = (error) => reject(error);
  });

export function ChatLayout() {
  const { config } = useAgentConfig();
  const [isArtifactsOpen, setIsArtifactsOpen] = React.useState(false);
  const [isVisionOpen, setIsVisionOpen] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [attachedFile, setAttachedFile] = React.useState<File | null>(null);
  const [model, setModel] = React.useState<'gemini-2.5-pro' | 'gemini-2.5-flash'>('gemini-2.5-pro');
  const [isDragging, setIsDragging] = React.useState(false);
  const [sessionId, setSessionId] = React.useState<string | null>(null); // Use thread id
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Keep sessionId in sync with ?thread param and hydrate messages
  React.useEffect(() => {
    const threadId = searchParams?.get("thread");
    if (!threadId) {
      setSessionId(null);
      setMessages([]);
      return;
    }
    setSessionId(threadId);
    // Fetch thread messages
    (async () => {
      try {
        const res = await fetch(`/api/threads/${threadId}`);
        if (!res.ok) throw new Error("Failed to load thread");
        const data = await res.json();
        const thread = data.thread as { messages?: any[] };
        const msgs: Message[] = (thread?.messages || []).map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          state: m.state,
        }));
        setMessages(msgs);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [searchParams]);

  // Listen for agent settings insert events
  React.useEffect(() => {
    const handleInsertIntoChat = (event: CustomEvent<{ text: string }>) => {
      handleSend(event.detail.text);
    };

    const handleToggleVision = () => {
      setIsVisionOpen(prev => !prev);
    };

    const handleTogglePanels = () => {
      if (isVisionOpen) {
        setIsVisionOpen(false);
        setIsArtifactsOpen(true);
      } else if (isArtifactsOpen) {
        setIsArtifactsOpen(false);
        setIsVisionOpen(true);
      }
    };

    window.addEventListener('sylvia:insert-into-chat', handleInsertIntoChat as EventListener);
    window.addEventListener('sylvia:toggle-vision', handleToggleVision as EventListener);
    window.addEventListener('sylvia:toggle-panels', handleTogglePanels as EventListener);
    
    return () => {
      window.removeEventListener('sylvia:insert-into-chat', handleInsertIntoChat as EventListener);
      window.removeEventListener('sylvia:toggle-vision', handleToggleVision as EventListener);
      window.removeEventListener('sylvia:toggle-panels', handleTogglePanels as EventListener);
    };
  }, []);

  const onToggleArtifacts = () => setIsArtifactsOpen((prev) => !prev);
  const onCloseArtifacts = () => setIsArtifactsOpen(false);
  const onToggleVision = () => setIsVisionOpen((prev) => !prev);
  const onCloseVision = () => setIsVisionOpen(false);

  // Generate context for auxiliary agent from recent messages
  const getMainAgentContext = () => {
    const recentMessages = messages.slice(-50); // Last 50 messages - much more context
    return recentMessages
      .map(msg => `${msg.role}: ${msg.content}`) // No truncation - full message content
      .join('\n'); // No artificial size limit
  };

  const handleSend = async (content: string, file?: File) => {
    if (!content.trim() && !file) return;

    // Ensure we have a thread/session id
    let threadId = sessionId;
    if (!threadId) {
      try {
        const res = await fetch('/api/threads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
        const data = await res.json();
        threadId = data.thread?.id as string;
        if (threadId) {
          setSessionId(threadId);
          const url = new URL(window.location.href);
          url.searchParams.set('thread', threadId);
          router.push(url.pathname + '?' + url.searchParams.toString());
        }
      } catch (e) {
        console.error('Failed to create thread', e);
      }
    }

    const userMessageContent =
      content + (file ? `\n\n[Attached file: ${file.name}]` : "");
    const userMessage: Message = { id: uuidv4(), role: "user", content: userMessageContent };
    const assistantMessage: Message = {
      id: uuidv4(),
      role: "assistant",
      content: "",
      state: "thinking" as const,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setAttachedFile(null);

    // 🧠 Broadcast user message to Neural Highway
    if (threadId) {
      await neuralHighway.broadcastContextPulse(
        createNeuralContext('sylvia', 'conversation', {
          role: 'user',
          content: userMessageContent,
          timestamp: Date.now()
        }, threadId, 'background')
      );
    }

    try {
      const fileData = file
        ? {
            mimeType: file.type,
            data: await fileToBase64(file),
          }
        : undefined;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: content, 
          file: fileData,
          messages: messages, // Send full conversation history
          agentConfig: config, // Send agent configuration
          sessionId: threadId, // Use thread id
          // Pass any configured MCP servers
          mcpServers: Array.isArray(config?.mcpServers) ? config.mcpServers : [],
          model,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessage.id
              ? { ...msg, content: msg.content + chunk }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Streaming failed:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessage.id
            ? { ...msg, content: "Sorry, something went wrong.", state: "error" as const }
            : msg
        )
      );
    } finally {
      setMessages((prev) => {
        const updatedMessages = prev.map((msg) =>
          msg.id === assistantMessage.id ? { ...msg, state: "done" as const } : msg
        );
        
        // 🧠 Broadcast assistant response to Neural Highway
        const finalAssistantMessage = updatedMessages.find(msg => msg.id === assistantMessage.id);
        if (finalAssistantMessage?.content && sessionId) {
          neuralHighway.broadcastContextPulse(
            createNeuralContext('sylvia', 'conversation', {
              role: 'assistant',
              content: finalAssistantMessage.content,
              timestamp: Date.now()
            }, sessionId, 'background')
          );
        }
        
        return updatedMessages;
      });
    }
  };

  const handleDragEvents = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    handleDragEvents(e);
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    handleDragEvents(e);
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    handleDragEvents(e);
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (
        droppedFile.type.startsWith("image/") ||
        droppedFile.type.startsWith("video/") ||
        droppedFile.type.startsWith("audio/") ||
        droppedFile.type === "application/pdf"
      ) {
        setAttachedFile(droppedFile);
      } else {
        console.warn("Unsupported file type:", droppedFile.type);
      }
    }
  };

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full w-full items-stretch"
    >
      <ResizablePanel
        defaultSize={5}
        minSize={4}
        maxSize={10}
        className="hidden min-w-[50px] md:block"
      >
        <Sidebar />
      </ResizablePanel>
      <ResizableHandle withHandle className="hidden md:flex" />
      <ResizablePanel>
        <div
          className="relative flex h-full flex-col"
          onDrop={handleDrop}
          onDragOver={handleDragEvents}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
        >
          {isDragging && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10">
              <p className="font-semibold text-primary">Drop file here</p>
            </div>
          )}
          <ChatHeader onToggleArtifacts={onToggleArtifacts} onToggleVision={onToggleVision} />
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto"
          >
            <ChatMessages messages={messages} />
          </div>
          {/* FIX: Input is now in a shrink-0 wrapper so it never jumps */}
          <div className="shrink-0">
            <ChatInput
              onSend={handleSend}
              attachedFile={attachedFile}
              onFileRemove={() => setAttachedFile(null)}
              model={model}
              onToggleModel={() => setModel((prev) => prev === 'gemini-2.5-pro' ? 'gemini-2.5-flash' : 'gemini-2.5-pro')}
            />
          </div>
        </div>
      </ResizablePanel>
      {isArtifactsOpen && <ResizableHandle withHandle className="hidden md:flex" />}
      {isArtifactsOpen && (
        <ResizablePanel
          defaultSize={30}
          minSize={20}
          maxSize={50}
          className="hidden md:block"
        >
          <ArtifactsPanel 
            onClose={onCloseArtifacts} 
            mainAgentContext={getMainAgentContext()}
            sessionId={sessionId}
          />
        </ResizablePanel>
      )}
      {isVisionOpen && <ResizableHandle withHandle className="hidden md:flex" />}
      {isVisionOpen && (
        <ResizablePanel
          defaultSize={30}
          minSize={20}
          maxSize={50}
          className="hidden md:block"
        >
          <VisionPanel onClose={onCloseVision} sessionId={sessionId} />
        </ResizablePanel>
      )}
    </ResizablePanelGroup>
  );
}
