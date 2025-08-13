import React, { useState, useCallback } from 'react';
import { Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { addArticle } from '@/lib/article-db';

interface ArticleCreatorProps {
  onArticleCreated: (id: number) => void;
}

export const ArticleCreator: React.FC<ArticleCreatorProps> = ({ onArticleCreated }) => {
  const [rawText, setRawText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>('');

  const handleGenerate = useCallback(async () => {
    if (!rawText.trim()) {
      setError('Please enter some text to generate an article.');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Generate image prompts
      setLoadingStep('Analyzing text and generating image concepts...');
      const promptsResponse = await fetch('/api/articles/generate-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText })
      });

      if (!promptsResponse.ok) {
        throw new Error('Failed to generate image prompts');
      }

      const { prompts } = await promptsResponse.json();
      if (!prompts || prompts.length === 0) {
        throw new Error('Could not generate image prompts.');
      }

      // Step 2: Generate HTML content and images in parallel
      setLoadingStep('Generating images and formatting article...');
      
      const htmlResponse = fetch('/api/articles/generate-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText })
      });

      const imagesResponse = fetch('/api/articles/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts })
      });

      const [htmlResult, imagesResult] = await Promise.all([htmlResponse, imagesResponse]);

      if (!htmlResult.ok) {
        throw new Error('Failed to generate article content');
      }

      const { htmlContent } = await htmlResult.json();
      if (!htmlContent) {
        throw new Error('Failed to generate article content.');
      }

      // Images might fail without breaking the whole process
      let images: (string | null)[] = [];
      if (imagesResult.ok) {
        const imagesData = await imagesResult.json();
        images = imagesData.images || [];
      }

      // Step 3: Assemble final article
      setLoadingStep('Assembling final article...');
      let finalHtml = htmlContent;
      let articleTitle = "Untitled Article";
      
      // Extract title from HTML
      const titleMatch = htmlContent.match(/<h1.*?>(.*?)<\/h1>/);
      if (titleMatch && titleMatch[1]) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = titleMatch[1];
        articleTitle = tempDiv.textContent || tempDiv.innerText || "Untitled Article";
      }

      // Replace image placeholders
      images.forEach((imgData, index) => {
        if (imgData) {
          const imgTag = `<img src="data:image/jpeg;base64,${imgData}" alt="AI generated image for the article" class="my-8 rounded-lg shadow-xl mx-auto w-full max-w-4xl h-auto object-cover" />`;
          finalHtml = finalHtml.replace(`[IMAGE_${index + 1}]`, imgTag);
        } else {
          finalHtml = finalHtml.replace(`[IMAGE_${index + 1}]`, '');
        }
      });
      
      // Step 4: Save to database
      setLoadingStep('Saving article to library...');
      const newArticleId = await addArticle({ title: articleTitle, htmlContent: finalHtml });
      onArticleCreated(newArticleId);

    } catch (err: any) {
      console.error(err);
      setError(`An error occurred: ${err.message}`);
      setIsLoading(false);
      setLoadingStep('');
    }
  }, [rawText, onArticleCreated]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Input Section */}
      <div className="flex flex-col">
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-600">
            Create Your Article
          </h2>
          <p className="text-muted-foreground">
            Enter your raw thoughts, notes, or ideas. Our AI will transform them into a beautifully formatted article with generated images.
          </p>
        </div>

        <Textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Enter your raw text, ideas, or notes here... The AI will transform them into a professional article with stunning visuals."
          className="min-h-[400px] resize-none text-base"
          disabled={isLoading}
        />

        <Button
          onClick={handleGenerate}
          disabled={isLoading || !rawText.trim()}
          className="mt-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
          size="lg"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4 mr-2" />
          )}
          {isLoading ? 'Generating...' : 'Generate Article'}
        </Button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Preview Section */}
      <Card className="lg:h-[calc(100vh-200px)] flex flex-col">
        <CardContent className="flex-1 p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <div className="relative">
                <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
                <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-orange-200"></div>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Creating Your Article</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {loadingStep || 'Processing your content...'}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-full border-2 border-dashed border-gray-300 rounded-lg p-12">
                <Wand2 className="w-12 h-12 mb-4 mx-auto text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">Article Ready for Creation</h3>
                <p className="text-sm text-muted-foreground">
                  Your generated article will open in the editor upon creation.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};