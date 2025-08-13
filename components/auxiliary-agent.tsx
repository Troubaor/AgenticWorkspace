"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, Eye, X } from 'lucide-react';
import { AuxiliarySettings } from './auxiliary-settings';
import { neuralHighway, createNeuralContext } from '@/lib/neural-highway';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AuxiliaryAgentProps {
  mainAgentContext?: string;
  onClose?: () => void;
  isVisible: boolean;
  sessionId?: string;
}

export function AuxiliaryAgent({ mainAgentContext, onClose, isVisible, sessionId }: AuxiliaryAgentProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [neuralContext, setNeuralContext] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const neuralContextIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 🧠 Neural Highway context monitoring
  useEffect(() => {
    if (!sessionId) return;

    const updateNeuralContext = async () => {
      try {
        // Get recent context from the neural highway for this session (including last 50 vision contexts)
        const recentContext = await neuralHighway.getSessionContext(sessionId, 100, 'auxiliary');
        
        if (recentContext.length > 0) {
          // Get last 50 vision contexts for comprehensive visual timeline
          const visionContexts = recentContext.filter(ctx => ctx.agentId === 'vision').slice(0, 50);
          const otherContexts = recentContext.filter(ctx => ctx.agentId !== 'vision');
          
          let contextSummary = '';
          
          // Show comprehensive vision timeline (50 snapshots at 50 tokens each = ~2500 tokens total)
          if (visionContexts.length > 0) {
            contextSummary += `👁️ VISION TIMELINE (${visionContexts.length} snapshots):\n`;
            visionContexts.forEach((ctx, i) => {
              const timestamp = new Date(ctx.timestamp).toLocaleTimeString();
              contextSummary += `${timestamp}: ${ctx.payload.analysis}\n`;
            });
            contextSummary += '\n';
          }
          
          // Then show other agent contexts
          const otherSummary = otherContexts
            .slice(0, 4) // Last 4 non-vision context items
            .map(ctx => `[${ctx.agentId}]: ${JSON.stringify(ctx.payload).slice(0, 80)}...`)
            .join('\n');
            
          if (otherSummary) {
            contextSummary += otherSummary;
          }
          
          setNeuralContext(contextSummary);
        }
      } catch (error) {
        console.error('Failed to retrieve neural context:', error);
      }
    };

    // Start periodic neural context updates
    const startNeuralMonitoring = () => {
      updateNeuralContext(); // Initial update
      neuralContextIntervalRef.current = setInterval(updateNeuralContext, 3000); // Every 3 seconds
    };

    startNeuralMonitoring();

    return () => {
      if (neuralContextIntervalRef.current) {
        clearInterval(neuralContextIntervalRef.current);
        neuralContextIntervalRef.current = null;
      }
    };
  }, [sessionId]);


  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // 🧠 Broadcast user message to Neural Highway
      if (sessionId) {
        await neuralHighway.broadcastContextPulse(
          createNeuralContext('auxiliary', 'conversation', {
            role: 'user',
            content: input,
            timestamp: Date.now()
          }, sessionId, 'background')
        );
      }

      // Include neural context in the prompt
      let contextualPrompt = input;
      
      // Add neural highway context from other agents
      if (neuralContext) {
        contextualPrompt += `\n\nNeural Highway Context (from other agents):\n${neuralContext}`;
      }

      const response = await fetch('/api/auxiliary-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: contextualPrompt,
          context: mainAgentContext
        })
      });

      if (!response.ok) throw new Error('Failed to get response');

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      };

      // Add thinking message first
      const thinkingMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'thinking...',
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, thinkingMessage]);

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let hasStartedReceiving = false;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          
          if (!hasStartedReceiving) {
            // Replace thinking message with actual response
            setMessages(prev => 
              prev.map(msg => 
                msg.id === thinkingMessage.id 
                  ? { ...msg, content: chunk }
                  : msg
              )
            );
            hasStartedReceiving = true;
          } else {
            // Continue appending to response
            setMessages(prev => 
              prev.map(msg => 
                msg.id === thinkingMessage.id 
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              )
            );
          }
        }

        // 🧠 Broadcast final assistant response to Neural Highway
        if (sessionId) {
          const finalMessage = messages.find(msg => msg.id === thinkingMessage.id);
          if (finalMessage?.content && finalMessage.content !== 'thinking...') {
            await neuralHighway.broadcastContextPulse(
              createNeuralContext('auxiliary', 'conversation', {
                role: 'assistant',
                content: finalMessage.content,
                timestamp: Date.now()
              }, sessionId, 'background')
            );
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request.',
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup neural context monitoring
      if (neuralContextIntervalRef.current) {
        clearInterval(neuralContextIntervalRef.current);
        neuralContextIntervalRef.current = null;
      }
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full bg-background border-l border-border shadow-lg">
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <span className="font-semibold">Assistant</span>
          </div>
          <div className="flex items-center gap-2">
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Bot className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <div className="text-lg font-medium">Assistant Ready</div>
                <div className="text-sm">How can I help?</div>
                {mainAgentContext && (
                  <Badge variant="outline" className="mt-2">
                    Context: {mainAgentContext.slice(0, 30)}...
                  </Badge>
                )}
                {neuralContext && (
                  <Badge variant="secondary" className="mt-2">
                    👁️ Context: {neuralContext.includes('VISION TIMELINE') ? neuralContext.match(/(\d+) snapshots/)?.[1] || '0' : '0'} vision + {neuralContext.split('\n').filter(line => line.includes('[') && !line.includes('VISION')).length} other
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message auxiliary agent..."
              disabled={isLoading}
              className="text-sm"
            />
            <Button onClick={handleSendMessage} disabled={isLoading || !input.trim()} size="sm">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <AuxiliarySettings
        isVisible={showSettings}
        onClose={() => setShowSettings(false)}
        onSettingsChange={(settings) => {
          // TODO: Apply settings to vision monitoring
          console.log('Settings updated:', settings);
        }}
      />
    </div>
  );
}