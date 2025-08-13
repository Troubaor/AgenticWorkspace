"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, LinkIcon } from "lucide-react";
import { useAgentConfig } from "@/hooks/use-agent-config";
import { getMcpServerIcon, getMcpServerDisplayName } from "@/lib/mcp-icons";
import { McpServerStatus } from "./mcp-server-status";

export function AgentMcpServers() {
  const { config, save, loading } = useAgentConfig();
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState<string>("");
  const [busy, setBusy] = React.useState(false);

  const servers = Array.isArray(config.mcpServers) ? config.mcpServers : [];

  const validateUrl = (value: string) => {
    try {
      const u = new URL(value);
      if (!(u.protocol === 'http:' || u.protocol === 'https:')) return false;
      return true;
    } catch {
      return false;
    }
  };

  const addServer = async () => {
    setError("");
    let trimmed = url.trim();
    if (!trimmed) return;

    let serverConfig: any = trimmed;

    // Check if it's JSON (CLI config)
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.type === 'sse-cli' && parsed.name && parsed.command && parsed.args) {
          serverConfig = parsed;
        } else {
          setError("Invalid CLI config format. Must include type, name, command, and args.");
          return;
        }
      } catch (e) {
        setError("Invalid JSON format.");
        return;
      }
    } else {
      // It's a URL
      if (!validateUrl(trimmed)) {
        setError("Enter a valid http(s) URL or JSON CLI config.");
        return;
      }
      // Extract token from query if present
      try {
        const u = new URL(trimmed);
        const qToken = u.searchParams.get('token') || u.searchParams.get('access_token');
        if (qToken) {
          u.searchParams.delete('token');
          u.searchParams.delete('access_token');
          serverConfig = u.toString();
        }
      } catch {}
    }

    // Check for duplicates
    const isDuplicate = servers.some(s => {
      if (typeof s === 'string' && typeof serverConfig === 'string') {
        return s === serverConfig;
      }
      if (typeof s === 'object' && typeof serverConfig === 'object') {
        return s.name === serverConfig.name;
      }
      return false;
    });

    if (isDuplicate) {
      setError("That server is already installed.");
      return;
    }

    setBusy(true);
    try {
      await save({ mcpServers: [...servers, serverConfig] });
      setUrl("");
    } catch (e) {
      setError("Failed to save.");
    } finally {
      setBusy(false);
    }
  };

  const removeServer = async (removeUrl: string) => {
    setBusy(true);
    try {
      const next = servers.filter(s => s !== removeUrl);
      await save({ mcpServers: next });
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') addServer();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>MCP Servers</CardTitle>
        <CardDescription>
          Install MCP servers by URL or CLI config. For Smithery servers, use CLI format with embedded keys for better reliability.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="https://server.smithery.ai/@ref-tools/ref-tools-mcp/mcp or paste CLI config JSON"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading || busy}
            />
            <Button onClick={addServer} disabled={loading || busy || !url.trim()} className="gap-2">
              <Plus className="h-4 w-4" />
              Install
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            <strong>URL:</strong> https://server.smithery.ai/@ref-tools/ref-tools-mcp/mcp<br/>
            <strong>CLI:</strong> {`{"type": "sse-cli", "name": "clear-thought", "command": "npx", "args": ["-y", "@smithery/cli@latest", "run", "@waldzellai/clear-thought", "--key", "YOUR_KEY"]}`}
          </div>
        </div>
        {error && <div className="text-sm text-red-500">{error}</div>}
        <div className="space-y-2">
          {servers.length === 0 ? (
            <div className="text-sm text-muted-foreground">No MCP servers installed.</div>
          ) : (
            servers.map((s) => {
              const ServerIcon = getMcpServerIcon(s);
              const displayName = getMcpServerDisplayName(s);
              return (
                <div key={s} className="flex items-center justify-between rounded-md border p-2">
                  <div className="flex items-center gap-2 truncate">
                    <ServerIcon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col truncate">
                      <span className="text-sm font-medium">{displayName}</span>
                      <a href={s} target="_blank" rel="noreferrer" className="truncate text-xs text-muted-foreground underline">
                        {s}
                      </a>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeServer(s)} disabled={busy} aria-label={`Remove ${s}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
        
        {servers.length > 0 && (
          <div className="border-t pt-4">
            <McpServerStatus />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
