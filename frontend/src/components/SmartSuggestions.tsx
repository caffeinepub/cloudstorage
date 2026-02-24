import { useGetSmartSuggestions, useRecordFileAccess } from '../hooks/useQueries';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, FileIcon, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import FilePreview from './FilePreview';
import type { FileMetadata } from '../backend';
import { Principal } from '@dfinity/principal';

export default function SmartSuggestions() {
  const { data: suggestions, isLoading } = useGetSmartSuggestions(BigInt(5));
  const recordAccess = useRecordFileAccess();
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);

  const handlePreview = async (fileId: string, fileName: string) => {
    const metadata: FileMetadata = {
      id: fileId,
      name: fileName,
      size: 0n,
      owner: Principal.anonymous(),
      uploadedAt: 0n,
    };
    setPreviewFile(metadata);
    try {
      await recordAccess.mutateAsync(fileId);
    } catch (error) {
      console.error('Failed to record file access:', error);
    }
  };

  const handleDownload = async (fileId: string) => {
    toast.info('Download functionality coming soon');
    try {
      await recordAccess.mutateAsync(fileId);
    } catch (error) {
      console.error('Failed to record file access:', error);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Smart Suggestions</h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[200px] h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Smart Suggestions</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            Not enough activity data yet. Keep using the app to see personalized suggestions!
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-chart-4" />
          Smart Suggestions
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.fileId}
              className="min-w-[220px] snap-start"
            >
              <Card className="p-4 hover:shadow-md transition-shadow h-full border-chart-4/20">
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-3">
                    <FileIcon className="h-10 w-10 text-primary" />
                    <Badge variant="secondary" className="text-xs">
                      {suggestion.accessCount.toString()}x
                    </Badge>
                  </div>
                  <h4 className="font-medium text-sm truncate mb-1" title={suggestion.fileName}>
                    {suggestion.fileName}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    {suggestion.reason}
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Last accessed {suggestion.relativeTime}
                  </p>
                  <div className="flex gap-2 mt-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => handlePreview(suggestion.fileId, suggestion.fileName)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDownload(suggestion.fileId)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>
      </Card>

      {previewFile && (
        <FilePreview
          file={previewFile}
          fileData={null}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
}
