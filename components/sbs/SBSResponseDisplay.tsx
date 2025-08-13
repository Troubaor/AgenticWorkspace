import React, { useState, useEffect } from 'react';
import { Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from 'react-markdown';

interface SBSResponseDisplayProps {
  response: string;
  isLoading: boolean;
  error: string | null;
}

export const SBSResponseDisplay: React.FC<SBSResponseDisplayProps> = ({ 
  response, 
  isLoading, 
  error 
}) => {
  const [visible, setVisible] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (response || error) {
      const timer = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [response, error]);

  const handleCopy = async () => {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(response);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handleDownload = () => {
    if (!response) return;
    const blob = new Blob([response], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sbs-response.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderContent = () => {
    if (isLoading) {
      return null;
    }

    if (error) {
      return (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-900">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      );
    }

    if (response) {
      return (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>SBS Response</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {isCopied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-base max-w-none text-gray-700">
              <ReactMarkdown>
                {response}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="text-center text-muted-foreground py-10">
        <p>Your SBS response will appear here...</p>
      </div>
    );
  };

  return (
    <div className={`flex-1 min-h-[200px] transition-opacity duration-700 ease-in-out ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {renderContent()}
    </div>
  );
};