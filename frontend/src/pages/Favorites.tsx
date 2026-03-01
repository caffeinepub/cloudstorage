import React, { useState } from 'react';
import { Star, Download, Eye, FileText } from 'lucide-react';
import { useGetFavorites, useRemoveFavorite } from '../hooks/useQueries';
import { FavoriteFileInfo, FileMetadata } from '../backend';
import FilePreview from '../components/FilePreview';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

function formatFileSize(bytes: bigint | number): string {
  const size = typeof bytes === 'bigint' ? Number(bytes) : bytes;
  if (size === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(size) / Math.log(k));
  return `${parseFloat((size / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileExtension(name: string): string {
  return name.split('.').pop()?.toUpperCase() || 'FILE';
}

const Favorites: React.FC = () => {
  const { data: favorites = [], isLoading, isError } = useGetFavorites();
  const removeFavoriteMutation = useRemoveFavorite();
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);

  const handleRemoveFavorite = async (fileId: string, fileName: string) => {
    try {
      await removeFavoriteMutation.mutateAsync(fileId);
      toast.success(`Removed "${fileName}" from favorites`);
    } catch {
      toast.error('Failed to remove from favorites');
    }
  };

  const handlePreview = (fav: FavoriteFileInfo) => {
    if (fav.metadata) {
      setPreviewFile(fav.metadata);
    } else {
      toast.info('File metadata not available for preview');
    }
  };

  const handleDownload = (fav: FavoriteFileInfo) => {
    toast.info(`Downloading ${fav.fileName}...`);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10">
          <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Favorites</h1>
          <p className="text-sm text-muted-foreground">
            Files you've starred for quick access
          </p>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border"
            >
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 flex-1 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-6 w-12 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Star className="h-16 w-16 text-destructive/30 mb-4" />
          <p className="text-muted-foreground font-medium">Failed to load favorites</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Please try refreshing the page
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && favorites.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-amber-500/10 mb-6">
            <Star className="h-10 w-10 text-amber-500/50" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No favorites yet</h2>
          <p className="text-muted-foreground max-w-sm">
            Star files from your file list to add them here for quick access.
          </p>
        </div>
      )}

      {/* Favorites list */}
      {!isLoading && !isError && favorites.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-3 px-4 py-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {favorites.length} {favorites.length === 1 ? 'file' : 'files'}
            </span>
          </div>
          {favorites.map((fav) => (
            <div
              key={fav.fileId}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 rounded-lg group transition-colors border border-transparent hover:border-border"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fav.fileName}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(fav.size)}</p>
              </div>
              <Badge variant="outline" className="text-xs hidden sm:flex shrink-0">
                {getFileExtension(fav.fileName)}
              </Badge>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handlePreview(fav)}
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDownload(fav)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-amber-500 hover:text-amber-600"
                  onClick={() => handleRemoveFavorite(fav.fileId, fav.fileName)}
                  title="Remove from favorites"
                  disabled={removeFavoriteMutation.isPending}
                >
                  <Star className="h-4 w-4 fill-current" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File preview modal */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          fileData={null}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};

export default Favorites;
