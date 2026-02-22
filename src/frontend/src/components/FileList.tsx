import { useState, useMemo } from 'react';
import { useListFiles, useDeleteFile, useDownloadFile, useIsFavorite, useAddFavorite, useRemoveFavorite, useRecordFileAccess } from '../hooks/useQueries';
import { useFileSearch } from '../hooks/useFileSearch';
import { useFileFilters } from '../hooks/useFileFilters';
import { useFileSorting } from '../hooks/useFileSorting';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileIcon, Trash2, Eye, Download, MoreVertical, Star } from 'lucide-react';
import { toast } from 'sonner';
import FilePreview from './FilePreview';
import DeleteFileDialog from './DeleteFileDialog';
import FileToolbar from './FileToolbar';
import type { FileMetadata } from '../backend';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

export default function FileList() {
  const { data: files, isLoading } = useListFiles();
  const deleteFile = useDeleteFile();
  const recordAccess = useRecordFileAccess();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [deleteDialogFile, setDeleteDialogFile] = useState<FileMetadata | null>(null);
  const { data: fileData } = useDownloadFile(previewFile?.id || null);

  // Search, filter, and sort hooks
  const { searchQuery, setSearchQuery, searchFiles } = useFileSearch();
  const {
    filters,
    setNameFilter,
    setTypeFilter,
    setDateRange,
    setSizeRange,
    clearAllFilters,
    getActiveFilterCount,
    filterFiles,
  } = useFileFilters();
  const { sortBy, sortOrder, setSortOption, sortFiles } = useFileSorting();

  // Apply search, filter, and sort transformations
  const processedFiles = useMemo(() => {
    if (!files) return [];
    
    // First search
    let result = searchFiles(files);
    
    // Then filter
    result = filterFiles(result);
    
    // Finally sort
    result = sortFiles(result);
    
    return result;
  }, [files, searchFiles, filterFiles, sortFiles]);

  const handleDelete = async (customRetentionPeriod: bigint | null) => {
    if (!deleteDialogFile) return;

    try {
      await deleteFile.mutateAsync({
        fileId: deleteDialogFile.id,
        originalPath: '/',
        customRetentionPeriod,
      });
      toast.success('File moved to Trash');
      setDeleteDialogFile(null);
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const handlePreview = async (file: FileMetadata) => {
    setPreviewFile(file);
    try {
      await recordAccess.mutateAsync(file.id);
    } catch (error) {
      console.error('Failed to record file access:', error);
    }
  };

  const handleDownload = async (file: FileMetadata) => {
    toast.info('Download functionality coming soon');
    try {
      await recordAccess.mutateAsync(file.id);
    } catch (error) {
      console.error('Failed to record file access:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading files...</p>
        </div>
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <FileIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium">No files yet</p>
          <p className="text-sm text-muted-foreground mt-2">Upload your first file to get started</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <FileToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onNameFilterChange={setNameFilter}
        onTypeFilterChange={setTypeFilter}
        onDateRangeChange={setDateRange}
        onSizeRangeChange={setSizeRange}
        onClearAllFilters={clearAllFilters}
        activeFilterCount={getActiveFilterCount()}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSortOption}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {processedFiles.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <FileIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No files match your filters</p>
            <p className="text-sm text-muted-foreground mt-2">Try adjusting your search or filters</p>
            <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-4">
              Clear Filters
            </Button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {processedFiles.map((file) => (
            <FileCard key={file.id} file={file} onPreview={handlePreview} onDownload={handleDownload} onDelete={setDeleteDialogFile} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {processedFiles.map((file) => (
            <FileListItem key={file.id} file={file} onPreview={handlePreview} onDownload={handleDownload} onDelete={setDeleteDialogFile} />
          ))}
        </div>
      )}

      {previewFile && (
        <FilePreview
          file={previewFile}
          fileData={fileData ?? null}
          onClose={() => setPreviewFile(null)}
        />
      )}

      <DeleteFileDialog
        open={!!deleteDialogFile}
        onOpenChange={(open) => !open && setDeleteDialogFile(null)}
        file={deleteDialogFile}
        onConfirm={handleDelete}
      />
    </>
  );
}

function FileCard({ file, onPreview, onDownload, onDelete }: {
  file: FileMetadata;
  onPreview: (file: FileMetadata) => void;
  onDownload: (file: FileMetadata) => void;
  onDelete: (file: FileMetadata) => void;
}) {
  const { data: isFavorite } = useIsFavorite(file.id);
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isFavorite) {
        await removeFavorite.mutateAsync(file.id);
        toast.success('Removed from favorites');
      } else {
        await addFavorite.mutateAsync(file.id);
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow relative">
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <FileIcon className="h-10 w-10 text-primary" />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleToggleFavorite}
            >
              <Star className={`h-4 w-4 ${isFavorite ? 'fill-chart-1 text-chart-1' : 'text-muted-foreground'}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onPreview(file)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDownload(file)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(file)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <h3 className="font-medium truncate mb-2" title={file.name}>
          {file.name}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto">
          <Badge variant="outline">{file.name.split('.').pop()?.toUpperCase()}</Badge>
          <span>{(Number(file.size) / 1024).toFixed(2)} KB</span>
        </div>
      </div>
    </Card>
  );
}

function FileListItem({ file, onPreview, onDownload, onDelete }: {
  file: FileMetadata;
  onPreview: (file: FileMetadata) => void;
  onDownload: (file: FileMetadata) => void;
  onDelete: (file: FileMetadata) => void;
}) {
  const { data: isFavorite } = useIsFavorite(file.id);
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isFavorite) {
        await removeFavorite.mutateAsync(file.id);
        toast.success('Removed from favorites');
      } else {
        await addFavorite.mutateAsync(file.id);
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <FileIcon className="h-8 w-8 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate" title={file.name}>
              {file.name}
            </h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <Badge variant="outline">{file.name.split('.').pop()?.toUpperCase()}</Badge>
              <span>{(Number(file.size) / 1024).toFixed(2)} KB</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleFavorite}
          >
            <Star className={`h-4 w-4 ${isFavorite ? 'fill-chart-1 text-chart-1' : 'text-muted-foreground'}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onPreview(file)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDownload(file)}>
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(file)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
