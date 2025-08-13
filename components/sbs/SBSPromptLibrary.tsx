import React from 'react';
import { ChevronLeft, Trash2, BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SBSPrompt } from '@/lib/sbs-types';

interface SBSPromptLibraryProps {
  show: boolean;
  setShow: (show: boolean) => void;
  prompts: SBSPrompt[];
  onSelect: (content: string) => void;
  onDelete: (id: string) => void;
}

export const SBSPromptLibrary: React.FC<SBSPromptLibraryProps> = ({ 
  show, 
  setShow, 
  prompts, 
  onSelect, 
  onDelete 
}) => {
  return (
    <div className={`
        bg-background border-r flex flex-col transition-all duration-300 ease-in-out
        ${show ? 'w-full max-w-xs md:w-80' : 'w-0'} overflow-hidden h-full
      `}>
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b h-16">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-orange-500" />
            <h2 className="font-bold text-lg">Prompt Library</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShow(false)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          {prompts.length === 0 ? (
            <div className="text-center text-muted-foreground p-8 flex flex-col items-center gap-4 h-full justify-center">
              <Plus className="h-12 w-12 text-muted-foreground/50" />
              <p className="text-sm font-medium">Your library is empty.</p>
              <p className="text-xs text-muted-foreground/70">Save a "Receptive Prompt" to add it here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {prompts.map(prompt => (
                <Card key={prompt.id} className="group hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm truncate">{prompt.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        onClick={() => onSelect(prompt.content)}
                        size="sm"
                        className="bg-gray-800 hover:bg-gray-700 text-white"
                      >
                        Load
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (confirm(`Delete "${prompt.name}"?`)) {
                            onDelete(prompt.id);
                          }
                        }}
                        className="text-muted-foreground hover:text-red-600 hover:bg-red-50 opacity-50 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
    </div>
  );
};