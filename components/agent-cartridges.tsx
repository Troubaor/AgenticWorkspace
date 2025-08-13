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
import { type Cartridge, type Command } from "@/lib/indexeddb";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 64);
}

interface AgentCartridgesProps {
  cartridges: Cartridge[];
  commands: Command[];
  onCartridgesChange: (cartridges: Cartridge[]) => void;
  onCommandsChange: (commands: Command[]) => void;
  onSendToChat: (text: string) => void;
  loading?: boolean;
}

export function AgentCartridges({ 
  cartridges, 
  commands,
  onCartridgesChange,
  onCommandsChange, 
  onSendToChat,
  loading = false 
}: AgentCartridgesProps) {
  const [editingCartId, setEditingCartId] = React.useState<string | null>(null);
  
  const emptyCart: Cartridge = {
    id: uuid(),
    title: "",
    slug: "",
    description: "",
    tags: [],
    content: "",
  };
  const [draftCart, setDraftCart] = React.useState<Cartridge>(emptyCart);

  const startNewCartridge = () => {
    setDraftCart({ ...emptyCart, id: uuid() });
    setEditingCartId("NEW");
  };

  const editCartridge = (cart: Cartridge) => {
    setDraftCart({ ...cart });
    setEditingCartId(cart.id);
  };

  const deleteCartridge = (id: string) => {
    const updatedCartridges = cartridges.filter((c) => c.id !== id);
    const cartridgeSlug = cartridges.find(c => c.id === id)?.slug;
    
    onCartridgesChange(updatedCartridges);
    
    // Update commands that reference this cartridge
    const updatedCommands = commands.map((cmd) =>
      cmd.action === "load_cartridge" && cmd.cartridgeSlug === cartridgeSlug
        ? { ...cmd, cartridgeSlug: undefined }
        : cmd
    );
    onCommandsChange(updatedCommands);
    
    if (editingCartId === id) setEditingCartId(null);
  };

  const saveCartridge = () => {
    let normalized = { ...draftCart };
    if (!normalized.slug) normalized.slug = slugify(normalized.title || "");
    if (!normalized.slug) return;

    const dup = cartridges.some(
      (c) => c.slug === normalized.slug && c.id !== normalized.id
    );
    if (dup) {
      alert("That slug is already used by another cartridge.");
      return;
    }

    if (editingCartId === "NEW") {
      onCartridgesChange([...cartridges, normalized]);
    } else {
      onCartridgesChange(
        cartridges.map((c) => (c.id === normalized.id ? normalized : c))
      );
    }
    setEditingCartId(null);
  };

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">Context Cartridges</h2>
        <Button variant="secondary" className="gap-2" onClick={startNewCartridge} disabled={loading}>
          <Plus className="h-4 w-4" />
          New Cartridge
        </Button>
      </div>

      <div className="grid gap-3">
        <ScrollArea className="h-[260px] rounded border">
          <div className="p-2">
            {cartridges.length === 0 && (
              <div className="text-sm text-muted-foreground">No cartridges yet. Click "New Cartridge".</div>
            )}
            <div className="grid gap-2">
              {cartridges.map((c) => (
                <div key={c.id} className="flex items-start justify-between rounded border bg-card/50 p-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{c.title}</span>
                      <Badge variant="secondary">{c.slug}</Badge>
                      {(c.tags || []).map((t) => (
                        <Badge key={t} variant="outline">{t}</Badge>
                      ))}
                    </div>
                    {c.description && (
                      <div className="mt-1 text-sm text-muted-foreground">{c.description}</div>
                    )}
                  </div>
                  <div className="ml-2 shrink-0 space-x-1">
                    <Button size="sm" variant="outline" onClick={() => editCartridge(c)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteCartridge(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" className="gap-1" onClick={() => onSendToChat(c.content)}>
                      <Send className="h-4 w-4" />
                      To Chat
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>

        {editingCartId && (
          <div className="rounded border p-3">
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Title</label>
                  <Input
                    value={draftCart.title}
                    onChange={(e) =>
                      setDraftCart((d) => ({
                        ...d,
                        title: e.target.value,
                        slug: d.slug || slugify(e.target.value),
                      }))
                    }
                    placeholder="e.g., Product Brief Context"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Slug</label>
                  <Input
                    value={draftCart.slug}
                    onChange={(e) =>
                      setDraftCart((d) => ({ ...d, slug: slugify(e.target.value) }))
                    }
                    placeholder="auto-generated from title"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <Input
                  value={draftCart.description || ""}
                  onChange={(e) => setDraftCart((d) => ({ ...d, description: e.target.value }))}
                  placeholder="Short explanation"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Tags (comma-separated)</label>
                <Input
                  value={(draftCart.tags || []).join(", ")}
                  onChange={(e) =>
                    setDraftCart((d) => ({
                      ...d,
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    }))
                  }
                  placeholder="research, planning, api"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Content</label>
                <Textarea
                  value={draftCart.content}
                  onChange={(e) => setDraftCart((d) => ({ ...d, content: e.target.value }))}
                  placeholder="Paste context, prompt blocks, or guidelines here…"
                  className="min-h-[140px]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingCartId(null)}>
                  Cancel
                </Button>
                <Button onClick={saveCartridge} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Cartridge
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}