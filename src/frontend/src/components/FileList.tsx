import { useState } from 'react';
import { useListRootFiles, useDeleteFile, useDownloadFile, useIsFavorite, useAddFavorite, useRemoveFavorite, useRecordFileAccess } from '../hooks/useQueries';
import FilePreview from './FilePreview';
import DeleteFileDialog from './DeleteFileDialog';
import FileToolbar from './FileToolbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileIcon, Download, Trash2, Eye, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useFileSearch } from '../hooks/useFileSearch';
import { useFileFilters } from '../hooks/useFileFilters';
import { useFileSorting } from '../hooks/useFileSorting';
import type { FileMetadata } from '../backend';

export default function FileList() {
  const { data: files = [], isLoading } = useListRootFiles();
  const deleteFile = useDeleteFile();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const recordAccess = useRecordFileAccess();

  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { searchQuery, setSearchQuery, searchFiles } = useFileSearch();
  const { filters, setNameFilter, setTypeFilter, setDateRange, setSizeRange, clearAllFilters, getActiveFilterCount, filterFiles } = useFileFilters();
  const { sortBy, sortOrder, setSortOption, sortFiles } = useFileSorting();

  const filteredBySearch = searchFiles(files);
  const filteredByFilters = filterFiles(filteredBySearch);
  const sortedFiles = sortFiles(filteredByFilters);
  const activeFilterCount = getActiveFilterCount();

  const handleDownload = async (fileId: string, fileName: string) => {
    try {
      recordAccess.mutate(fileId);
      const response = await fetch(`/api/download/${fileId}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('File downloaded successfully');
    } catch (error) {
      toast.error('Failed to download file');
    }
  };

  const handleToggleFavorite = async (fileId: string, isFavorite: boolean) => {
    try {
      if (isFavorite) {
        await removeFavorite.mutateAsync(fileId);
        toast.success('Removed from favorites');
      } else {
        await addFavorite.mutateAsync(fileId);
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const previewFile = files.find((f) => f.id === previewFileId);
  const deleteFileData = files.find((f) => f.id === deleteFileId);
  const { data: previewFileData } = useDownloadFile(previewFileId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <FileToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onNameFilterChange={setNameFilter}
        onTypeFilterChange={setTypeFilter}
        onDateRangeChange={setDateRange}
        onSizeRangeChange={setSizeRange}
        activeFilterCount={activeFilterCount}
        onClearAllFilters={clearAllFilters}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={setSortOption}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {sortedFiles.length === 0 && files.length > 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No files match your search or filters</p>
          <Button variant="link" onClick={clearAllFilters} className="mt-2">
            Clear filters
          </Button>
        </Card>
      )}

      {sortedFiles.length === 0 && files.length === 0 && (
        <Card className="p-8 text-center">
          <FileIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No files yet</h3>
          <p className="text-muted-foreground">Upload your first file to get started</p>
        </Card>
      )}

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedFiles.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onPreview={() => setPreviewFileId(file.id)}
              onDownload={() => handleDownload(file.id, file.name)}
              onDelete={() => setDeleteFileId(file.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedFiles.map((file) => (
            <FileListItem
              key={file.id}
              file={file}
              onPreview={() => setPreviewFileId(file.id)}
              onDownload={() => handleDownload(file.id, file.name)}
              onDelete={() => setDeleteFileId(file.id)}
              onToggleFavorite={handleToggleFavorite}
            />
          ))}
        </div>
      )}

      {previewFile && (
        <FilePreview file={previewFile} fileData={previewFileData || null} onClose={() => setPreviewFileId(null)} />
      )}

      {deleteFileData && (
        <DeleteFileDialog
          open={!!deleteFileId}
          onOpenChange={(open) => !open && setDeleteFileId(null)}
          file={deleteFileData}
          onConfirm={async (customRetentionPeriod) => {
            try {
              await deleteFile.mutateAsync({
                fileId: deleteFileId!,
              });
              toast.success('File deleted successfully');
              setDeleteFileId(null);
            } catch (error) {
              toast.error('Failed to delete file');
            }
          }}
        />
      )}
    </div>
  );
}

function FileCard({ file, onPreview, onDownload, onDelete, onToggleFavorite }: any) {
  const { data: isFavorite = false } = useIsFavorite(file.id);

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <FileIcon className="h-8 w-8 text-primary" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onToggleFavorite(file.id, isFavorite)}
        >
          <Star className={`h-4 w-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
        </Button>
      </div>
      <h3 className="font-medium truncate mb-1">{file.name}</h3>
      <p className="text-sm text-muted-foreground mb-3">
        {(Number(file.size) / 1024).toFixed(2)} KB
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onPreview} className="flex-1">
          <Eye className="h-4 w-4 mr-1" />
          Preview
        </Button>
        <Button variant="outline" size="sm" onClick={onDownload} className="flex-1">
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function FileListItem({ file, onPreview, onDownload, onDelete, onToggleFavorite }: any) {
  const { data: isFavorite = false } = useIsFavorite(file.id);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-4">
        <FileIcon className="h-8 w-8 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{file.name}</h3>
          <p className="text-sm text-muted-foreground">
            {(Number(file.size) / 1024).toFixed(2)} KB
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleFavorite(file.id, isFavorite)}
          >
            <Star className={`h-4 w-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={onPreview}>
            <Eye className="h-4 w-4 mr-1" />
            Preview
          </Button>
          <Button variant="outline" size="sm" onClick={onDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
