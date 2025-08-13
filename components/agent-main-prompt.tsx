"use client";

import * as React from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

interface AgentMainPromptProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onSave: () => void;
  loading?: boolean;
  title?: string;
  placeholder?: string;
}

export function AgentMainPrompt({ 
  prompt, 
  onPromptChange, 
  onSave, 
  loading = false,
  title = "Main System Prompt",
  placeholder = "Define Sylvia's global behavior, rules, and priorities here."
}: AgentMainPromptProps) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-medium">{title}</h2>
        <Button onClick={onSave} className="gap-2" disabled={loading}>
          <Save className="h-4 w-4" />
          Save
        </Button>
      </div>
      <Textarea
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[140px]"
        disabled={loading}
      />
      <div className="mt-2 text-xs text-muted-foreground">
        Stored locally in IndexedDB and used as the top-level system prompt.
      </div>
    </Card>
  );
}