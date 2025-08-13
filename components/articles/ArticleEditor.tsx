import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Download, Eye, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getArticleById, updateArticle } from '@/lib/article-db';
import type { Article } from '@/lib/article-types';

interface ArticleEditorProps {
  articleId: number;
  onBack: () => void;
}

export const ArticleEditor: React.FC<ArticleEditorProps> = ({ articleId, onBack }) => {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

  useEffect(() => {
    loadArticle();
  }, [articleId]);

  const loadArticle = async () => {
    try {
      setLoading(true);
      const data = await getArticleById(articleId);
      if (data) {
        setArticle(data);
      } else {
        setError('Article not found');
      }
    } catch (err) {
      console.error('Failed to load article:', err);
      setError('Failed to load article');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!article) return;

    try {
      setSaving(true);
      await updateArticle(articleId, {
        title: article.title,
        htmlContent: article.htmlContent
      });
    } catch (err) {
      console.error('Failed to save article:', err);
      setError('Failed to save article');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (!article) return;

    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 text-gray-900">
    <div class="max-w-4xl mx-auto py-12 px-4">
        ${article.htmlContent}
    </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${article.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-4">Loading article...</span>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <p className="text-red-500 mb-4">{error || 'Article not found'}</p>
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Library
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <input
            type="text"
            value={article.title}
            onChange={(e) => setArticle({ ...article, title: e.target.value })}
            className="text-3xl font-bold bg-transparent border-none outline-none text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-600 placeholder-gray-400"
            placeholder="Article Title"
          />
          <p className="text-muted-foreground text-sm mt-2">
            Last updated: {new Date(article.updatedAt).toLocaleString()}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export HTML
          </Button>
        </div>
      </div>

      {/* Editor Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'preview' | 'code')}>
        <TabsList>
          <TabsTrigger value="preview">
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="code">
            <Code className="h-4 w-4 mr-2" />
            HTML Code
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Article Preview</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-lg max-w-none">
              <div
                className="article-content"
                dangerouslySetInnerHTML={{ __html: article.htmlContent }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="code" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>HTML Source Code</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                value={article.htmlContent}
                onChange={(e) => setArticle({ ...article, htmlContent: e.target.value })}
                className="w-full h-[600px] p-4 font-mono text-sm border rounded-md resize-none"
                spellCheck={false}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};