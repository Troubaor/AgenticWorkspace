import React, { useState, useCallback } from 'react';
import { Save, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SBSPromptPanel } from './SBSPromptPanel';
import { SBSResponseDisplay } from './SBSResponseDisplay';
import type { SBSPrompt } from '@/lib/sbs-types';
import { INITIAL_CONTEXTUAL_QUERY } from '@/lib/sbs-constants';

interface SBSPrompterPageProps {
  receptivePrompt: string;
  setReceptivePrompt: (value: string) => void;
  savedPrompts: SBSPrompt[];
  setSavedPrompts: (value: SBSPrompt[]) => void;
}

export const SBSPrompterPage: React.FC<SBSPrompterPageProps> = ({ 
  receptivePrompt, 
  setReceptivePrompt, 
  savedPrompts, 
  setSavedPrompts 
}) => {
  const [contextualQuery, setContextualQuery] = useState<string>(INITIAL_CONTEXTUAL_QUERY);
  const [response, setResponse] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newPromptName, setNewPromptName] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [responseKey, setResponseKey] = useState(0);

  const handleGenerate = useCallback(async () => {
    if (!receptivePrompt || !contextualQuery) {
      setError('Both receptive prompt and contextual query are required.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setResponse('');
    
    try {
      const sbsResponse = await fetch('/api/sbs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          receptivePrompt, 
          contextualQuery 
        })
      });

      if (!sbsResponse.ok) {
        throw new Error('Failed to generate SBS response');
      }

      const { response: result } = await sbsResponse.json();
      setResponse(result);
      setResponseKey(prev => prev + 1);
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [receptivePrompt, contextualQuery]);

  const handleSavePrompt = () => {
    if (!newPromptName.trim()) {
      alert("Please enter a name for the prompt.");
      return;
    }
    const newPrompt: SBSPrompt = {
      id: Date.now().toString(),
      name: newPromptName.trim(),
      content: receptivePrompt,
    };
    setSavedPrompts([...savedPrompts, newPrompt]);
    setNewPromptName('');
    setIsSaving(false);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-shrink-0">
        <SBSPromptPanel
          title="Receptive Prompt"
          value={receptivePrompt}
          onChange={setReceptivePrompt}
          placeholder="Enter the priming prompt here..."
        >
          {isSaving ? (
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={newPromptName}
                onChange={(e) => setNewPromptName(e.target.value)}
                placeholder="Enter prompt name..."
                className="flex-grow"
              />
              <Button onClick={handleSavePrompt} size="sm">
                Save
              </Button>
              <Button onClick={() => setIsSaving(false)} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => setIsSaving(true)}
              variant="outline"
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Save to Library
            </Button>
          )}
        </SBSPromptPanel>
        
        <SBSPromptPanel
          title="Contextual Query"
          value={contextualQuery}
          onChange={setContextualQuery}
          placeholder="Enter the contextual query here..."
        />
      </div>

      <div className="flex-shrink-0">
        <Button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/30 transition-all duration-300 ease-in-out disabled:from-gray-300 disabled:to-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Generate SBS Response
            </>
          )}
        </Button>
      </div>
      
      <SBSResponseDisplay 
        key={responseKey} 
        response={response} 
        isLoading={isLoading} 
        error={error} 
      />
    </>
  );
};