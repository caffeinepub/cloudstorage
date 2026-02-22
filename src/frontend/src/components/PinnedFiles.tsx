import { useFavorites, useDownloadFile, useRecordFileAccess } from '../hooks/useQueries';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Star, FileIcon, Eye, Download } from 'lucide-react';
import { useState } from 'react';
import FilePreview from './FilePreview';

export default function PinnedFiles() {
  const { data: favorites = [] } = useFavorites();
  const recordAccess = useRecordFileAccess();
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const { data: previewFileData } = useDownloadFile(previewFileId);

  const handlePreview = (fileId: string) => {
    recordAccess.mutate(fileId);
    setPreviewFileId(fileId);
  };

  const previewFile = favorites.find((f) => f.fileId === previewFileId);

  if (favorites.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Star className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium mb-1">No pinned files</h3>
          <p className="text-sm text-muted-foreground">
            Star your favorite files to see them here
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
          Pinned Files
        </h3>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-4">
            {favorites.map((favorite) => (
              <Card key={favorite.fileId} className="shrink-0 w-48 p-3 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-2 mb-2">
                  <FileIcon className="h-6 w-6 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{favorite.fileName}</h4>
                    <p className="text-xs text-muted-foreground">
                      {(Number(favorite.size) / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handlePreview(favorite.fileId)}
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
      {previewFile && previewFile.metadata && (
        <FilePreview 
          file={previewFile.metadata} 
          fileData={previewFileData || null} 
          onClose={() => setPreviewFileId(null)} 
        />
      )}
    </>
  );
}
