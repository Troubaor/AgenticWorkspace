"use client";

import * as React from "react";
import { Mic, Send, Globe, ChevronDown, Square, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FilePreview } from "./file-preview";
import MarkdownToolbar from "./MarkdownToolbar";
import { useAgentConfig } from "@/hooks/use-agent-config";
import { PlugZap } from "lucide-react";
import { getMcpServerIcon, getMcpServerHint, getMcpServerTooltip } from "@/lib/mcp-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChatInputProps {
  onSend: (content: string, file?: File) => void;
  attachedFile: File | null;
  onFileRemove: () => void;
  model: 'gemini-2.5-pro' | 'gemini-2.5-flash';
  onToggleModel: () => void;
}

export function ChatInput({
  onSend,
  attachedFile,
  onFileRemove,
  model,
  onToggleModel,
}: ChatInputProps) {
  const { config } = useAgentConfig();
  const [content, setContent] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [selectedTool, setSelectedTool] = React.useState<string | null>(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordedAudio, setRecordedAudio] = React.useState<Blob | null>(null);
  const [showAudioDialog, setShowAudioDialog] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  const tools = [
    { id: 'firecrawl_scrape', name: 'Web Scraping', icon: Globe, description: 'Scrape single webpage content' },
    { id: 'firecrawl_crawl', name: 'Website Crawling', icon: Globe, description: 'Recursively crawl multiple pages' },
    { id: 'firecrawl_map', name: 'Website Mapping', icon: Globe, description: 'Fast discovery of all site URLs' },
  ];

  // Function to resize the textarea
  const resizeTextarea = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px"; // Reset height to calculate new scrollHeight
    el.style.height = Math.min(el.scrollHeight, 320) + "px"; // Cap height
  }, []);

  // Resize on content change
  React.useEffect(() => {
    resizeTextarea();
  }, [content, resizeTextarea]);

  // Resize on initial mount to ensure correct sizing from the start
  // Using requestAnimationFrame to ensure the browser has completed its layout pass
  React.useLayoutEffect(() => {
    const animationFrameId = requestAnimationFrame(() => {
      resizeTextarea();
    });
    return () => cancelAnimationFrame(animationFrameId);
  }, [resizeTextarea]);

  // Listen for custom event to insert text
  React.useEffect(() => {
    const handleInsertText = (event: CustomEvent<{ text: string }>) => {
      setContent(event.detail.text);
      textareaRef.current?.focus();
    };
    window.addEventListener("sylvia:insert-into-chat" as any, handleInsertText);
    return () => {
      window.removeEventListener("sylvia:insert-into-chat" as any, handleInsertText);
    };
  }, []);


  const handleMarkdownFormat = (format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    let newContent;

    // This logic handles both wrapping selected text and inserting the format string
    if (selectedText) {
      newContent = `${content.substring(0, start)}${format}${selectedText}${format}${content.substring(end)}`;
    } else {
      newContent = `${content.substring(0, start)}${format}${content.substring(end)}`;
    }

    setContent(newContent);

    // Focus and adjust cursor position after update
    setTimeout(() => {
      textarea.focus();
      const newCursorPosition = start + format.length;
      textarea.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  };

  const canSend = (content.trim().length > 0) || !!attachedFile;

  const handleSubmit = (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!canSend || isSending) return;
    setIsSending(true);
    try {
      // Add tool hint to the content if a tool is selected
      let finalContent = content;
      if (selectedTool) {
        const tool = tools.find(t => t.id === selectedTool);
        if (tool) {
          finalContent = `[Use ${tool.name}] ${content}`;
        }
      }
      onSend(finalContent, attachedFile || undefined);
      setContent("");
      setSelectedTool(null); // Reset tool selection
      // do NOT clear attachedFile here – parent owns it via props
    } finally {
      // small delay to avoid rapid-double-submits feeling janky
      setTimeout(() => setIsSending(false), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMac = typeof navigator !== "undefined" && navigator.platform.toLowerCase().includes("mac");
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    // Shift+Enter or Cmd/Ctrl+Enter sends the message
    if ((e.key === "Enter" && e.shiftKey) || (cmdOrCtrl && e.key === "Enter")) {
      e.preventDefault();
      handleSubmit(e);
    }
    // Pressing Enter without Shift or Cmd/Ctrl will just create a new line,
    // which is the default behavior of a textarea, so we don't need an else block.
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        setRecordedAudio(audioBlob);
        setShowAudioDialog(true);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Failed to start recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Model toggle button for toolbar
  const modelButton = {
    icon: PlugZap as any,
    label: model === 'gemini-2.5-pro' ? 'Gemini 2.5 Pro' : 'Gemini 2.5 Flash',
    tooltip: model === 'gemini-2.5-pro' ? 'Currently using Gemini 2.5 Pro — click to switch to Flash' : 'Currently using Gemini 2.5 Flash — click to switch to Pro',
    onClick: () => onToggleModel(),
    active: model === 'gemini-2.5-flash',
  } as any;

  // Build extra toolbar buttons for MCP servers with random icons
  const mcpButtons = (Array.isArray(config?.mcpServers) ? config.mcpServers : []).map((entry: any) => {
    const url = typeof entry === 'string' ? entry : entry?.url;
    if (!url) return null;
    
    const ServerIcon = getMcpServerIcon(url);
    const hint = getMcpServerHint(url);
    const tooltip = getMcpServerTooltip(url);
    
    return { 
      icon: ServerIcon as any, 
      label: `MCP: ${url.split('/').pop()}`, 
      format: hint,
      tooltip 
    };
  }).filter(Boolean) as any[];

  const sendAudio = () => {
    if (recordedAudio) {
      // Create a File object from the blob
      const audioFile = new File([recordedAudio], `recording-${Date.now()}.mp3`, {
        type: 'audio/mp3',
        lastModified: Date.now(),
      });
      onSend("", audioFile);
      setRecordedAudio(null);
      setShowAudioDialog(false);
    }
  };

  const discardAudio = () => {
    setRecordedAudio(null);
    setShowAudioDialog(false);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="relative mx-auto max-w-3xl">
        {attachedFile && (
          <FilePreview file={attachedFile} onRemove={onFileRemove} />
        )}

        {selectedTool && (
          <div className="mb-3">
            <Badge variant="secondary" className="text-sm">
              <Globe className="h-3 w-3 mr-1" />
              Using {tools.find(t => t.id === selectedTool)?.name}
            </Badge>
          </div>
        )}

        <MarkdownToolbar onFormat={handleMarkdownFormat} disabled={isSending} extraButtons={[modelButton, ...mcpButtons]} />
        <form onSubmit={handleSubmit} className="relative">
          <Textarea
            ref={textareaRef}
            rows={1}
            placeholder="How can Sylvia help?"
            className="min-h-[52px] max-h-[320px] resize-none rounded-2xl border-2 border-input bg-card p-4 pr-28 no-scrollbar"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Message Sylvia"
          />

          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  type="button"
                  aria-label="Select REST API tool"
                  title="REST API Tools"
                >
                  <div className="relative">
                    <Globe className="h-5 w-5" />
                    {selectedTool && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setSelectedTool(null)}>
                  <div className="flex flex-col">
                    <span className="font-medium">No Tool</span>
                    <span className="text-xs text-muted-foreground">Regular conversation</span>
                  </div>
                </DropdownMenuItem>
                {tools.map((tool) => (
                  <DropdownMenuItem key={tool.id} onClick={() => setSelectedTool(tool.id)}>
                    <div className="flex items-start space-x-2">
                      <tool.icon className="h-4 w-4 mt-0.5 text-primary" />
                      <div className="flex flex-col">
                        <span className="font-medium">{tool.name}</span>
                        <span className="text-xs text-muted-foreground">{tool.description}</span>
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full ${isRecording ? 'bg-red-500 text-white animate-pulse' : ''}`}
              type="button"
              onClick={handleMicClick}
              aria-label={isRecording ? "Stop recording" : "Start recording"}
              title={isRecording ? "Stop recording" : "Record audio message"}
            >
              {isRecording ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>

            <Button
              size="icon"
              className="rounded-full"
              type="submit"
              aria-label="Send message"
              title="Send (Enter)"
              disabled={!canSend || isSending}
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </div>

      {/* Audio Confirmation Dialog */}
      <Dialog open={showAudioDialog} onOpenChange={setShowAudioDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Audio Recording Ready</DialogTitle>
            <DialogDescription>
              Your audio recording is ready to send. Would you like to send it or discard it?
            </DialogDescription>
          </DialogHeader>
          
          {recordedAudio && (
            <div className="flex justify-center py-4">
              <audio controls src={URL.createObjectURL(recordedAudio)} className="w-full" />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={discardAudio}>
              Discard
            </Button>
            <Button onClick={sendAudio}>
              <Send className="h-4 w-4 mr-2" />
              Send Audio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}