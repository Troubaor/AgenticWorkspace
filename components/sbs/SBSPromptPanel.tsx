import React, { useState } from 'react';
import { Eye, Edit, Maximize2, Minimize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from 'react-markdown';

interface SBSPromptPanelProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  children?: React.ReactNode;
}

export const SBSPromptPanel: React.FC<SBSPromptPanelProps> = ({
  title,
  value,
  onChange,
  placeholder,
  children,
}) => {
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>(
    title.includes('Builder') || title.includes('Contextual') ? 'edit' : 'preview'
  );
  const [isExpanded, setIsExpanded] = useState(false);

  const renderContent = () => {
    if (viewMode === 'edit') {
      return (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[400px] resize-none text-base leading-relaxed font-mono"
        />
      );
    } else {
      return (
        <div className="prose prose-sm max-w-none text-gray-800 overflow-y-auto max-h-[400px] px-2">
          <ReactMarkdown>
            {value || placeholder}
          </ReactMarkdown>
        </div>
      );
    }
  };

  const panelContent = (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === 'edit' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('edit')}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'preview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('preview')}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="flex-1">{renderContent()}</div>
        {children && (
          <div className="flex-shrink-0 pt-4 border-t mt-4">{children}</div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <>
      <div className="flex flex-col h-[45vh] lg:h-auto min-h-0">
        {panelContent}
      </div>

      {/* Expanded Modal */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsExpanded(false)}
        >
          <div 
            className="w-full h-full max-w-6xl max-h-[95vh] bg-white rounded-lg shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-bold">{title}</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'edit' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('edit')}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant={viewMode === 'preview' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('preview')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex-1 p-6 overflow-hidden flex flex-col">
              {viewMode === 'edit' ? (
                <Textarea
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 resize-none text-base leading-relaxed font-mono"
                />
              ) : (
                <div className="flex-1 prose prose-base max-w-none text-gray-800 overflow-y-auto">
                  <ReactMarkdown>
                    {value || placeholder}
                  </ReactMarkdown>
                </div>
              )}
            </div>
            
            {children && (
              <div className="flex-shrink-0 p-4 border-t bg-gray-50">{children}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
};