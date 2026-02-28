import React, { useState } from 'react';
import { Star, FileText, StarOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useGetFavorites, useRemoveFavorite } from '../hooks/useQueries';
import type { FavoriteFileInfo } from '../hooks/useQueries';
import type { FileMetadata } from '../backend';
import FilePreview from '../components/FilePreview';

function formatFileSize(bytes: bigint): string {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function Favorites() {
  const { data: favorites, isLoading, isError } = useGetFavorites();
  const removeFavorite = useRemoveFavorite();
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500" />
            Favorites
          </h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-500" />
            Favorites
          </h1>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Failed to load favorites
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Star className="w-6 h-6 text-amber-500" />
          Favorites
        </h1>
        <p className="text-muted-foreground mt-1">Your starred files</p>
      </div>

      {!favorites || favorites.length === 0 ? (
        <div className="text-center py-16">
          <Star className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No favorites yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Star files to add them to your favorites
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(favorites as FavoriteFileInfo[]).map((fav) => (
            <Card key={fav.fileId} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 -mt-1 -mr-1"
                    onClick={() => removeFavorite.mutate(fav.fileId)}
                    title="Remove from favorites"
                  >
                    <StarOff className="w-3.5 h-3.5 text-amber-500" />
                  </Button>
                </div>
                <p className="text-sm font-medium truncate mb-1">{fav.fileName}</p>
                <p className="text-xs text-muted-foreground mb-3">{formatFileSize(fav.size)}</p>
                {fav.metadata && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => setPreviewFile(fav.metadata!)}
                  >
                    Preview
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {previewFile && (
        <FilePreview
          file={previewFile}
          fileData={null}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
