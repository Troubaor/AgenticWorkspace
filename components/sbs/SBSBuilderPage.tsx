import React, { useState, useCallback } from 'react';
import { Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SBSPromptPanel } from './SBSPromptPanel';

interface SBSBuilderPageProps {
  onUsePrompt: (content: string) => void;
}

export const SBSBuilderPage: React.FC<SBSBuilderPageProps> = ({ onUsePrompt }) => {
  const [query, setQuery] = useState<string>('Create a prompt for a "Socratic Tutor" that helps me learn complex topics by asking guiding questions.');
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!query) {
      setError('Please enter a description of the prompt you want to build.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedPrompt('');
    
    try {
      const builderResponse = await fetch('/api/sbs/build-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      if (!builderResponse.ok) {
        throw new Error('Failed to generate receptive prompt');
      }

      const { prompt: result } = await builderResponse.json();
      setGeneratedPrompt(result);
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <SBSPromptPanel
          title="Builder Query"
          value={query}
          onChange={setQuery}
          placeholder="Describe the receptive prompt you want to create. For example: 'Build a prompt that acts as a CEO of a tech startup, focused on product strategy.'"
        >
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-2.5 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all duration-300 ease-in-out disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-base"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Building Prompt...
              </>
            ) : (
              <>
                <Wand2 className="h-5 w-5" />
                Generate Receptive Prompt
              </>
            )}
          </Button>
        </SBSPromptPanel>
        
        <SBSPromptPanel
          title="Generated Receptive Prompt"
          value={generatedPrompt}
          onChange={setGeneratedPrompt}
          placeholder="Your generated prompt will appear here..."
        >
          {generatedPrompt && !isLoading && (
            <Button
              onClick={() => onUsePrompt(generatedPrompt)}
              className="w-full bg-gray-800 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-4 focus:ring-gray-400/30 transition-colors"
            >
              Use this Prompt
            </Button>
          )}
          {isLoading && (
            <div className="w-full bg-gray-100 text-gray-400 font-semibold py-2.5 px-4 rounded-lg text-center">
              Generating...
            </div>
          )}
        </SBSPromptPanel>
      </div>
      
      {error && (
        <div className="flex-shrink-0 bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          <h3 className="font-bold mb-2 text-red-900">Error</h3>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};