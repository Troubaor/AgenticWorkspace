"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, Clock, Activity, RotateCw } from "lucide-react";

interface KeyStats {
  keyPreview: string;
  requestCount: number;
  lastUsed: Date;
  isHealthy: boolean;
  lastError?: string;
  errorCount: number;
  successCount: number;
  quotaExhausted?: boolean;
  lastQuotaReset?: Date;
}

export function KeyRotationDashboard() {
  const [keyStats, setKeyStats] = React.useState<KeyStats[]>([]);
  const [healthyCount, setHealthyCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [lastUpdate, setLastUpdate] = React.useState<Date | null>(null);

  const fetchKeyStats = async () => {
    try {
      const response = await fetch('/api/key-stats');
      if (response.ok) {
        const data = await response.json();
        // Convert date strings back to Date objects
        const processedStats = (data.keyStats || []).map((key: any) => ({
          ...key,
          lastUsed: new Date(key.lastUsed),
          lastQuotaReset: key.lastQuotaReset ? new Date(key.lastQuotaReset) : undefined,
        }));
        setKeyStats(processedStats);
        setHealthyCount(data.healthyCount || 0);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch key stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchKeyStats();
    const interval = setInterval(fetchKeyStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (key: KeyStats) => {
    if (key.quotaExhausted) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    } else if (!key.isHealthy) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    } else {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusBadge = (key: KeyStats) => {
    if (key.quotaExhausted) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">Quota Exhausted</Badge>;
    } else if (!key.isHealthy) {
      return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Unhealthy</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Healthy</Badge>;
    }
  };

  const getSuccessRate = (key: KeyStats) => {
    const total = key.successCount + key.errorCount;
    if (total === 0) return 100;
    return Math.round((key.successCount / total) * 100);
  };

  const resetQuotaFlags = async () => {
    try {
      await fetch('/api/key-stats/reset-quota', { method: 'POST' });
      fetchKeyStats(); // Refresh stats
    } catch (error) {
      console.error('Failed to reset quota flags:', error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Key Rotation Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Gemini Key Rotation Status
            </CardTitle>
            <CardDescription>
              {healthyCount}/{keyStats.length} keys healthy
              {lastUpdate && (
                <span className="ml-2 text-xs">
                  • Last updated: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetQuotaFlags}>
              <RotateCw className="h-4 w-4 mr-1" />
              Reset Quotas
            </Button>
            <Button variant="outline" size="sm" onClick={fetchKeyStats}>
              <Clock className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {keyStats.map((key, index) => (
            <div key={key.keyPreview} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3 flex-1">
                {getStatusIcon(key)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{key.keyPreview}</span>
                    {getStatusBadge(key)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {key.requestCount} requests • {getSuccessRate(key)}% success rate
                    {key.lastUsed && key.lastUsed.getTime && key.lastUsed.getTime() > 0 && (
                      <span> • Last used: {key.lastUsed.toLocaleTimeString()}</span>
                    )}
                  </div>
                  {key.lastError && (
                    <div className="text-xs text-red-600 mt-1 truncate max-w-md">
                      Last error: {key.lastError}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm font-medium text-green-600">{key.successCount}</div>
                <div className="text-xs text-muted-foreground">success</div>
                {key.errorCount > 0 && (
                  <div className="text-sm font-medium text-red-600">{key.errorCount}</div>
                )}
                {key.errorCount > 0 && (
                  <div className="text-xs text-muted-foreground">errors</div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {keyStats.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            No key statistics available
          </div>
        )}
      </CardContent>
    </Card>
  );
}