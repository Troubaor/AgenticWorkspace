import React from 'react';
import { Plus, Calendar, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Article } from '@/lib/article-types';
import { deleteArticle } from '@/lib/article-db';

interface ArticleLibraryProps {
  articles: Article[];
  onNewArticle: () => void;
  onSelectArticle: (id: number) => void;
}

export const ArticleLibrary: React.FC<ArticleLibraryProps> = ({
  articles,
  onNewArticle,
  onSelectArticle,
}) => {
  const handleDeleteArticle = async (id: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click
    if (window.confirm('Are you sure you want to delete this article?')) {
      try {
        await deleteArticle(id);
        window.location.reload(); // Simple refresh - could be optimized
      } catch (error) {
        console.error('Failed to delete article:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const extractPreview = (htmlContent: string) => {
    // Remove HTML tags and get first 150 characters
    const textContent = htmlContent.replace(/<[^>]*>/g, '');
    return textContent.substring(0, 150) + (textContent.length > 150 ? '...' : '');
  };

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No articles yet</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Create your first AI-powered article with stunning visuals and professional formatting.
        </p>
        <Button onClick={onNewArticle} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create First Article
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Article Library</h2>
          <p className="text-muted-foreground">
            {articles.length} article{articles.length !== 1 ? 's' : ''} in your collection
          </p>
        </div>
        <Button 
          onClick={onNewArticle}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Article
        </Button>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <Card
            key={article.id}
            className="cursor-pointer hover:shadow-lg transition-shadow duration-200 group"
            onClick={() => onSelectArticle(article.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg line-clamp-2 group-hover:text-orange-600 transition-colors">
                  {article.title}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                  onClick={(e) => handleDeleteArticle(article.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(article.createdAt)}
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="line-clamp-3">
                {extractPreview(article.htmlContent)}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};