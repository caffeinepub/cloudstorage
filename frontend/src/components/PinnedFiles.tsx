import { useGetFavorites, useRecordFileAccess } from '../hooks/useQueries';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Star, FileIcon, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import FilePreview from './FilePreview';
import type { FileMetadata } from '../backend';
import { Principal } from '@dfinity/principal';

export default function PinnedFiles() {
  const { data: favorites, isLoading } = useGetFavorites();
  const recordAccess = useRecordFileAccess();
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);

  const handlePreview = async (fileId: string, fileName: string) => {
    const favorite = favorites?.find(f => f.fileId === fileId);
    const metadata: FileMetadata = {
      id: fileId,
      name: fileName,
      size: 0n,
      owner: favorite?.owner || Principal.anonymous(),
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
        <h3 className="text-lg font-semibold mb-4">Pinned Files</h3>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="min-w-[200px] h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (!favorites || favorites.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Pinned Files</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Star className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No pinned files yet. Star your favorite files for quick access.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Star className="h-5 w-5 text-chart-1 fill-chart-1" />
          Pinned Files
        </h3>
        <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
          {favorites.map((favorite) => (
            <div
              key={favorite.fileId}
              className="min-w-[200px] snap-start"
            >
              <Card className="p-4 hover:shadow-md transition-shadow h-full">
                <div className="flex flex-col h-full">
                  <FileIcon className="h-10 w-10 text-primary mb-3" />
                  <h4 className="font-medium text-sm truncate mb-2" title={favorite.fileName}>
                    {favorite.fileName}
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    {(Number(favorite.size) / 1024).toFixed(2)} KB
                  </p>
                  <div className="flex gap-2 mt-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => handlePreview(favorite.fileId, favorite.fileName)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDownload(favorite.fileId)}
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
