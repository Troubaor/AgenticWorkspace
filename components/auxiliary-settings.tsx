"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  X, 
  Eye, 
  Clock, 
  MessageSquare, 
  Save,
  Trash2,
  Download,
  Upload
} from 'lucide-react';

interface VisionSettings {
  enabled: boolean;
  interval: number; // seconds
  tokenLimit: number;
  prompt: string;
  assistantPrompt: string;
  autoSummarize: boolean;
  summarizeInterval: number; // minutes
}

interface AuxiliarySettingsProps {
  onClose: () => void;
  isVisible: boolean;
  onSettingsChange?: (settings: VisionSettings) => void;
}

const defaultSettings: VisionSettings = {
  enabled: false,
  interval: 5,
  tokenLimit: 50,
  prompt: "Describe what you see on screen in 50 tokens or less. Focus on UI elements, text, and user actions.",
  assistantPrompt: "You are a helpful AI assistant. Be concise, accurate, and provide context-aware responses based on the user's conversation and any available vision data.",
  autoSummarize: false,
  summarizeInterval: 10
};

export function AuxiliarySettings({ onClose, isVisible, onSettingsChange }: AuxiliarySettingsProps) {
  const [settings, setSettings] = useState<VisionSettings>(defaultSettings);
  const [visionLog, setVisionLog] = useState<string[]>([]);

  const updateSettings = (updates: Partial<VisionSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  const clearLog = () => {
    setVisionLog([]);
  };

  const exportLog = () => {
    const logData = visionLog.join('\n');
    const blob = new Blob([logData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vision-log-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          setSettings({ ...defaultSettings, ...imported });
        } catch (error) {
          console.error('Failed to import settings:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'auxiliary-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] bg-background">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Vision Monitoring Settings</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Core Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Core Settings</h3>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Vision Monitoring</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically capture and analyze screen content
                  </p>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(enabled) => updateSettings({ enabled })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="interval">Capture Interval (seconds)</Label>
                  <Input
                    id="interval"
                    type="number"
                    min="1"
                    max="60"
                    value={settings.interval}
                    onChange={(e) => updateSettings({ interval: Number(e.target.value) })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tokenLimit">Analysis Token Limit</Label>
                  <Input
                    id="tokenLimit"
                    type="number"
                    min="10"
                    max="500"
                    value={settings.tokenLimit}
                    onChange={(e) => updateSettings({ tokenLimit: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Scout Vision Prompt</Label>
                <Textarea
                  id="prompt"
                  value={settings.prompt}
                  onChange={(e) => updateSettings({ prompt: e.target.value })}
                  placeholder="What should Scout focus on when analyzing the screen?"
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assistantPrompt">Assistant Chat Prompt</Label>
                <Textarea
                  id="assistantPrompt"
                  value={settings.assistantPrompt}
                  onChange={(e) => updateSettings({ assistantPrompt: e.target.value })}
                  placeholder="How should Assistant behave in conversations?"
                  className="min-h-[80px]"
                />
              </div>
            </div>

            {/* Summarization Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Summarization</h3>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-Summarize Vision Log</Label>
                  <p className="text-sm text-muted-foreground">
                    Periodically create summaries of observed activity
                  </p>
                </div>
                <Switch
                  checked={settings.autoSummarize}
                  onCheckedChange={(autoSummarize) => updateSettings({ autoSummarize })}
                />
              </div>

              {settings.autoSummarize && (
                <div className="space-y-2">
                  <Label htmlFor="summarizeInterval">Summarize Every (minutes)</Label>
                  <Input
                    id="summarizeInterval"
                    type="number"
                    min="1"
                    max="120"
                    value={settings.summarizeInterval}
                    onChange={(e) => updateSettings({ summarizeInterval: Number(e.target.value) })}
                  />
                </div>
              )}
            </div>

            {/* Vision Log Management */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Vision Log</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {visionLog.length} entries
                  </Badge>
                  <Button variant="outline" size="sm" onClick={exportLog} disabled={visionLog.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearLog} disabled={visionLog.length === 0}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>

              <Card className="p-4">
                {visionLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Vision log is empty. Enable monitoring to start capturing.
                  </p>
                ) : (
                  <ScrollArea className="h-40">
                    <div className="space-y-1">
                      {visionLog.slice(-20).map((entry, i) => (
                        <div key={i} className="text-xs text-muted-foreground font-mono">
                          {entry}
                        </div>
                      ))}
                      {visionLog.length > 20 && (
                        <div className="text-xs text-muted-foreground italic">
                          ...and {visionLog.length - 20} more entries
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </Card>
            </div>

            {/* Settings Management */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Settings Management</h3>
              
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={exportSettings}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Settings
                </Button>
                
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".json"
                    onChange={importSettings}
                    className="hidden"
                  />
                  <Button variant="outline" asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Settings
                    </span>
                  </Button>
                </label>

                <Button 
                  variant="outline" 
                  onClick={() => setSettings(defaultSettings)}
                >
                  Reset to Defaults
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="border-t p-6">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onClose}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}