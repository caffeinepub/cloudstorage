import React from 'react';
import { Lightbulb, FileText, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetSmartSuggestions } from '../hooks/useQueries';
import type { SmartSuggestion } from '../hooks/useQueries';

export default function SmartSuggestions() {
  const { data: suggestions, isLoading, isError } = useGetSmartSuggestions();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        Failed to load suggestions
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="text-center py-8">
        <Lightbulb className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No suggestions yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          Access files more often to get smart suggestions
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {suggestions.slice(0, 5).map((suggestion: SmartSuggestion, index: number) => (
        <div
          key={index}
          className="flex gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{suggestion.fileName}</p>
            <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
