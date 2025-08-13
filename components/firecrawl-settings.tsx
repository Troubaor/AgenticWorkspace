"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Globe, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { sylviaDB } from '@/lib/indexeddb';

interface FirecrawlSettingsProps {
  onBack: () => void;
}

export function FirecrawlSettings({ onBack }: FirecrawlSettingsProps) {
  const [settings, setSettings] = useState({
    enabled: false,
    timeout: [30],
    onlyMainContent: true,
    proxy: 'basic',
    formats: {
      markdown: true,
      html: false,
      rawHtml: false,
      screenshot: false,
      links: false
    },
    includeTags: ''
  });

  // Load settings from IndexedDB on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const extensionSettings = await sylviaDB.getExtensionSettings();
        if (extensionSettings.firecrawl) {
          setSettings(extensionSettings.firecrawl);
        }
      } catch (error) {
        console.error('Failed to load Firecrawl settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      const currentSettings = await sylviaDB.getExtensionSettings();
      await sylviaDB.setExtensionSettings({
        ...currentSettings,
        firecrawl: settings
      });
      console.log('Firecrawl settings saved successfully');
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to save Firecrawl settings:', error);
    }
  };

  return (
    <div className="h-full bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Extensions
          </Button>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-orange-100">
              <Globe className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Firecrawl Web Scraping</h1>
              <p className="text-sm text-muted-foreground">
                Advanced web scraping and content extraction
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        <Card className="mb-6 border-orange-200 bg-orange-50/50">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-800">Firecrawl Web Scraping</CardTitle>
            </div>
            <CardDescription className="text-orange-700">
              Advanced web scraping and content extraction. Perfect for deep-diving into specific websites and documents.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="enable-firecrawl" className="text-orange-800 font-medium">
                  Enable Firecrawl
                </Label>
                <p className="text-sm text-orange-600">
                  Advanced web scraping capabilities
                </p>
              </div>
              <Switch 
                id="enable-firecrawl"
                checked={settings.enabled}
                onCheckedChange={(enabled) => setSettings(prev => ({ ...prev, enabled }))}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <Card>
            <CardHeader>
              <CardTitle>Content Formats</CardTitle>
              <CardDescription>
                Choose which content formats to extract from scraped pages.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="markdown"
                    checked={settings.formats.markdown}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ 
                        ...prev, 
                        formats: { ...prev.formats, markdown: checked as boolean }
                      }))
                    }
                  />
                  <div>
                    <Label htmlFor="markdown" className="font-medium">Markdown</Label>
                    <p className="text-sm text-muted-foreground">AI-powered content parsing</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="html"
                    checked={settings.formats.html}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ 
                        ...prev, 
                        formats: { ...prev.formats, html: checked as boolean }
                      }))
                    }
                  />
                  <div>
                    <Label htmlFor="html" className="font-medium">HTML</Label>
                    <p className="text-sm text-muted-foreground">HTML, PDF, images, and more</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="raw-html"
                    checked={settings.formats.rawHtml}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ 
                        ...prev, 
                        formats: { ...prev.formats, rawHtml: checked as boolean }
                      }))
                    }
                  />
                  <div>
                    <Label htmlFor="raw-html" className="font-medium">Raw HTML</Label>
                    <p className="text-sm text-muted-foreground">Raw HTML content</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="links"
                    checked={settings.formats.links}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ 
                        ...prev, 
                        formats: { ...prev.formats, links: checked as boolean }
                      }))
                    }
                  />
                  <div>
                    <Label htmlFor="links" className="font-medium">Links</Label>
                    <p className="text-sm text-muted-foreground">Extract all links</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="screenshot"
                    checked={settings.formats.screenshot}
                    onCheckedChange={(checked) => 
                      setSettings(prev => ({ 
                        ...prev, 
                        formats: { ...prev.formats, screenshot: checked as boolean }
                      }))
                    }
                  />
                  <div>
                    <Label htmlFor="screenshot" className="font-medium">Screenshot</Label>
                    <p className="text-sm text-muted-foreground">Visual capture</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scraping Options</CardTitle>
              <CardDescription>
                Fine-tune how Firecrawl extracts and processes content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="proxy-type" className="font-medium">Proxy Type</Label>
                <Select value={settings.proxy} onValueChange={(proxy) => setSettings(prev => ({ ...prev, proxy }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">
                      <div className="flex flex-col">
                        <span>Basic (Default)</span>
                        <span className="text-xs text-muted-foreground">Fast, works for most sites</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="stealth">
                      <div className="flex flex-col">
                        <span>Stealth</span>
                        <span className="text-xs text-muted-foreground">Advanced anti-bot protection (5 credits)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="auto">
                      <div className="flex flex-col">
                        <span>Auto</span>
                        <span className="text-xs text-muted-foreground">Try basic, retry with stealth if needed</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Choose proxy type based on target site's anti-bot protection level
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="main-content" className="font-medium">Only Main Content</Label>
                  <p className="text-sm text-muted-foreground">
                    Extract only the main article content
                  </p>
                </div>
                <Switch
                  id="main-content"
                  checked={settings.onlyMainContent}
                  onCheckedChange={(onlyMainContent) => 
                    setSettings(prev => ({ ...prev, onlyMainContent }))
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="timeout">Timeout (seconds): {settings.timeout[0]}</Label>
                </div>
                <Slider
                  id="timeout"
                  min={5}
                  max={120}
                  step={5}
                  value={settings.timeout}
                  onValueChange={(timeout) => setSettings(prev => ({ ...prev, timeout }))}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>5s (Fast)</span>
                  <span>60s (Balanced)</span>
                  <span>120s (Thorough)</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="include-tags">Include Tags (comma-separated)</Label>
                <Textarea
                  id="include-tags"
                  placeholder="article, main, content, .post, #main-content"
                  value={settings.includeTags}
                  onChange={(e) => setSettings(prev => ({ ...prev, includeTags: e.target.value }))}
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  Specify HTML tags, classes, or IDs to target specific content areas
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Advanced Features</CardTitle>
              <CardDescription>
                Additional capabilities for comprehensive web analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 rounded-lg border bg-muted/50">
                  <h4 className="font-medium text-sm mb-2">Website Mapping</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Lightning-fast discovery of all URLs on a website
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">Site Discovery</span>
                    <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">Link Analysis</span>
                    <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">Search Filter</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-muted/50">
                  <h4 className="font-medium text-sm mb-2">Stealth Mode</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Bypass advanced anti-bot protection systems
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">Basic Proxy</span>
                    <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Stealth Proxy</span>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Auto Retry</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-muted/50">
                  <h4 className="font-medium text-sm mb-2">Multi-Format Output</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Extract content in multiple formats simultaneously
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Markdown</span>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">HTML</span>
                    <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">Screenshots</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        <div className="flex justify-end space-x-3 mt-8 pt-6 border-t">
          <Button variant="outline" onClick={onBack}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-orange-600 hover:bg-orange-700">
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}