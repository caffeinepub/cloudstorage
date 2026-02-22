import { useSmartSuggestions, useDownloadFile, useRecordFileAccess } from '../hooks/useQueries';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Sparkles, FileIcon, Eye, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SmartSuggestions() {
  const { data: suggestions = [] } = useSmartSuggestions();
  const recordAccess = useRecordFileAccess();

  if (suggestions.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium mb-1">No suggestions yet</h3>
          <p className="text-sm text-muted-foreground">
            We'll suggest files based on your activity
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-500" />
        Smart Suggestions
      </h3>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4">
          {suggestions.map((suggestion: any) => (
            <Card key={suggestion.fileId} className="shrink-0 w-56 p-3 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-2 mb-2">
                <FileIcon className="h-6 w-6 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">{suggestion.fileName}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{suggestion.reason}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {suggestion.accessCount} views
                    </Badge>
                    <span className="text-xs text-muted-foreground">{suggestion.relativeTime}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => recordAccess.mutate(suggestion.fileId)}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </Card>
  );
}
