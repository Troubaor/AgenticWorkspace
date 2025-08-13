"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { useAgentConfig } from "@/hooks/use-agent-config";
import { getMcpServerIcon, getMcpServerDisplayName } from "@/lib/mcp-icons";

interface ServerStatus {
  url: string;
  status: 'online' | 'offline' | 'checking' | 'error';
  lastCheck?: Date;
  toolCount?: number;
  latency?: number;
}

export function McpServerStatus() {
  const { config } = useAgentConfig();
  const [statuses, setStatuses] = React.useState<ServerStatus[]>([]);
  const [isChecking, setIsChecking] = React.useState(false);

  const servers = Array.isArray(config?.mcpServers) ? config.mcpServers : [];

  const checkServerHealth = async (serverUrl: string): Promise<ServerStatus> => {
    const startTime = Date.now();
    try {
      const response = await fetch('/api/mcp-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverUrl }),
      });
      
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        return {
          url: serverUrl,
          status: 'online',
          lastCheck: new Date(),
          toolCount: data.toolCount || 0,
          latency,
        };
      } else {
        return {
          url: serverUrl,
          status: 'error',
          lastCheck: new Date(),
          latency,
        };
      }
    } catch (error) {
      return {
        url: serverUrl,
        status: 'offline',
        lastCheck: new Date(),
        latency: Date.now() - startTime,
      };
    }
  };

  const checkAllServers = async () => {
    if (servers.length === 0) return;
    
    setIsChecking(true);
    const results = await Promise.all(
      servers.map(s => {
        const url = typeof s === 'string' ? s : s.url;
        return checkServerHealth(url);
      })
    );
    setStatuses(results);
    setIsChecking(false);
  };

  React.useEffect(() => {
    checkAllServers();
    const interval = setInterval(checkAllServers, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [servers]);

  if (servers.length === 0) {
    return null;
  }

  const getStatusIcon = (status: ServerStatus['status']) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'offline':
        return <XCircle className="h-3 w-3 text-red-500" />;
      case 'error':
        return <AlertCircle className="h-3 w-3 text-yellow-500" />;
      case 'checking':
        return <Clock className="h-3 w-3 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-3 w-3 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ServerStatus['status']) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'error':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">MCP Server Status</h3>
        <button
          onClick={checkAllServers}
          disabled={isChecking}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {isChecking ? 'Checking...' : 'Refresh'}
        </button>
      </div>
      
      <div className="grid gap-2">
        {statuses.map((status) => {
          const ServerIcon = getMcpServerIcon(status.url);
          const displayName = getMcpServerDisplayName(status.url);
          
          return (
            <div key={status.url} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <ServerIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{displayName}</span>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {status.toolCount !== undefined && (
                  <span className="text-muted-foreground">{status.toolCount} tools</span>
                )}
                {status.latency !== undefined && (
                  <span className="text-muted-foreground">{status.latency}ms</span>
                )}
                <Badge variant="outline" className={`text-xs px-1.5 py-0.5 ${getStatusColor(status.status)}`}>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(status.status)}
                    {status.status}
                  </div>
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}