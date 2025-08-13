"use client";

import * as React from "react";
import { v4 as uuid } from "uuid";
import { Plus, Save, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type Command, type Cartridge } from "@/lib/indexeddb";

interface AgentCommandsProps {
  commands: Command[];
  cartridges: Cartridge[];
  onCommandsChange: (commands: Command[]) => void;
  onSendToChat: (text: string) => void;
  loading?: boolean;
}

export function AgentCommands({ 
  commands, 
  cartridges, 
  onCommandsChange, 
  onSendToChat,
  loading = false 
}: AgentCommandsProps) {
  const [editingCommandId, setEditingCommandId] = React.useState<string | null>(null);
  
  const emptyCmd: Command = {
    id: uuid(),
    slash: "",
    label: "",
    description: "",
    action: "insert_text",
    payload: "",
  };
  const [draftCommand, setDraftCommand] = React.useState<Command>(emptyCmd);

  const startNewCommand = () => {
    setDraftCommand({ ...emptyCmd, id: uuid() });
    setEditingCommandId("NEW");
  };

  const editCommand = (cmd: Command) => {
    setDraftCommand({ ...cmd });
    setEditingCommandId(cmd.id);
  };

  const deleteCommand = (id: string) => {
    onCommandsChange(commands.filter((c) => c.id !== id));
    if (editingCommandId === id) setEditingCommandId(null);
  };

  const saveCommand = () => {
    if (!draftCommand.slash || !draftCommand.label) return;
    
    if (editingCommandId === "NEW") {
      onCommandsChange([...commands, draftCommand]);
    } else {
      onCommandsChange(
        commands.map((c) => (c.id === draftCommand.id ? draftCommand : c))
      );
    }
    setEditingCommandId(null);
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">Slash Commands</h2>
        <Button variant="secondary" className="gap-2" onClick={startNewCommand} disabled={loading}>
          <Plus className="h-4 w-4" />
          New Command
        </Button>
      </div>

      <div className="grid gap-3">
        <ScrollArea className="h-[260px] rounded border">
          <div className="p-2">
            {commands.length === 0 && (
              <div className="text-sm text-muted-foreground">No commands yet. Click "New Command".</div>
            )}
            <div className="grid gap-2">
              {commands.map((cmd) => (
                <div key={cmd.id} className="flex items-start justify-between rounded border bg-card/50 p-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">/{cmd.slash}</Badge>
                      <span className="font-medium">{cmd.label}</span>
                      <span className="text-xs text-muted-foreground">· {cmd.action}</span>
                      {cmd.action === "load_cartridge" && cmd.cartridgeSlug && (
                        <Badge variant="outline">cartridge: {cmd.cartridgeSlug}</Badge>
                      )}
                    </div>
                    {cmd.description && (
                      <div className="mt-1 text-sm text-muted-foreground">{cmd.description}</div>
                    )}
                  </div>
                  <div className="ml-2 shrink-0 space-x-1">
                    <Button size="sm" variant="outline" onClick={() => editCommand(cmd)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteCommand(cmd.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {cmd.action === "insert_text" && cmd.payload && (
                      <Button size="sm" className="gap-1" onClick={() => onSendToChat(cmd.payload!)}>
                        <Send className="h-4 w-4" /> To Chat
                      </Button>
                    )}
                    {cmd.action === "load_cartridge" && cmd.cartridgeSlug && (
                      <Button
                        size="sm"
                        className="gap-1"
                        onClick={() => {
                          const cart = cartridges.find((c) => c.slug === cmd.cartridgeSlug);
                          if (cart) onSendToChat(cart.content);
                        }}
                      >
                        <Send className="h-4 w-4" /> Load
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        {editingCommandId && (
          <div className="rounded border p-3">
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Slash</label>
                  <Input
                    value={draftCommand.slash}
                    onChange={(e) =>
                      setDraftCommand((d) => ({ ...d, slash: e.target.value.replace(/^\//, "") }))
                    }
                    placeholder="e.g., research"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Label</label>
                  <Input
                    value={draftCommand.label}
                    onChange={(e) => setDraftCommand((d) => ({ ...d, label: e.target.value }))}
                    placeholder="Human-friendly name"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <Input
                  value={draftCommand.description || ""}
                  onChange={(e) => setDraftCommand((d) => ({ ...d, description: e.target.value }))}
                  placeholder="What does this command do?"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Action</label>
                  <select
                    className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                    value={draftCommand.action}
                    onChange={(e) =>
                      setDraftCommand((d) => ({
                        ...d,
                        action: e.target.value as Command["action"],
                      }))
                    }
                  >
                    <option value="insert_text">Insert Text</option>
                    <option value="load_cartridge">Load Cartridge</option>
                  </select>
                </div>

                {draftCommand.action === "load_cartridge" && (
                  <div>
                    <label className="text-xs text-muted-foreground">Cartridge</label>
                    <select
                      className="w-full rounded-md border bg-background px-2 py-2 text-sm"
                      value={draftCommand.cartridgeSlug || ""}
                      onChange={(e) =>
                        setDraftCommand((d) => ({ ...d, cartridgeSlug: e.target.value }))
                      }
                    >
                      <option value="">Select…</option>
                      {cartridges.map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.title} ({c.slug})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {draftCommand.action === "insert_text" && (
                <div>
                  <label className="text-xs text-muted-foreground">Payload (inserted into chat)</label>
                  <Textarea
                    value={draftCommand.payload || ""}
                    onChange={(e) => setDraftCommand((d) => ({ ...d, payload: e.target.value }))}
                    placeholder="What should Sylvia insert when you run /command?"
                    className="min-h-[100px]"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingCommandId(null)}>
                  Cancel
                </Button>
                <Button onClick={saveCommand} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Command
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}