import React from 'react';
import { Lightbulb, FileText, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetSmartSuggestions } from '../hooks/useQueries';

export default function SmartSuggestions() {
  const { data: suggestions, isLoading, isError } = useGetSmartSuggestions(5);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
            <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border border-border text-sm text-muted-foreground">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <span>Unable to load suggestions.</span>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Lightbulb className="h-7 w-7 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No suggestions yet</p>
        <p className="text-xs text-muted-foreground mt-1">Access files to get personalized suggestions</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.fileId}
          className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
        >
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{suggestion.fileName}</p>
            <p className="text-xs text-muted-foreground">{suggestion.reason} · {suggestion.relativeTime}</p>
          </div>
          <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
            {String(suggestion.accessCount)}×
          </span>
        </div>
      ))}
    </div>
  );
}
