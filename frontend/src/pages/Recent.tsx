import { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, FileIcon, Eye, Download, Star, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import FilePreview from '../components/FilePreview';
import FileToolbar from '../components/FileToolbar';
import PaginationControls from '../components/PaginationControls';
import type { FileMetadata } from '../backend';
import { useRecentUploads } from '../contexts/RecentUploadsContext';
import { useAddFavorite, useRemoveFavorite, useIsFavorite } from '../hooks/useQueries';
import { useFileSearch } from '../hooks/useFileSearch';
import { useFileFilters } from '../hooks/useFileFilters';
import { useFileSorting } from '../hooks/useFileSorting';
import { usePagination } from '../hooks/usePagination';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Recent() {
  const { recentUploads } = useRecentUploads();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  // Pagination
  const pagination = usePagination<FileMetadata>();

  // Convert recentUploads to FileMetadata format
  const recentFilesAsMetadata: FileMetadata[] = useMemo(() => {
    return recentUploads.map((upload) => ({
      id: upload.fileId,
      name: upload.fileName,
      size: upload.size,
      owner: upload.owner,
      uploadedAt: BigInt(upload.uploadedAt * 1_000_000),
    }));
  }, [recentUploads]);

  // Apply search, filter, and sort transformations
  const processedFiles = useMemo(() => {
    let result = searchFiles(recentFilesAsMetadata);
    result = filterFiles(result);
    result = sortFiles(result);
    return result;
  }, [recentFilesAsMetadata, searchFiles, filterFiles, sortFiles]);

  // Reset page when search/filter/sort changes
  useEffect(() => {
    pagination.resetPage();
  }, [searchQuery, filters, sortBy, sortOrder]);

  const paginatedFiles = pagination.paginatedData(processedFiles);

  const handlePreview = (file: FileMetadata) => {
    setPreviewFile(file);
  };

  const handleDownload = (fileName: string) => {
    toast.success(`Downloading ${fileName}...`);
  };

  const handleToggleFavorite = async (fileId: string, isFav: boolean) => {
    try {
      if (isFav) {
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

  if (recentUploads.length === 0) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Recent Files</h1>
          <p className="text-muted-foreground mt-2">
            Files you've recently uploaded in this session
          </p>
        </div>
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No recent uploads</h3>
            <p className="text-sm text-muted-foreground">
              Files you upload in this session will appear here
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Recent Files</h1>
          <p className="text-muted-foreground mt-2">
            Files you've recently uploaded in this session
          </p>
        </div>

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
          <Card className="p-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileIcon className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No files match your filters</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your search or filters
              </p>
              <Button variant="outline" onClick={clearAllFilters}>
                Clear Filters
              </Button>
            </div>
          </Card>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    onPreview={handlePreview}
                    onDownload={handleDownload}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {paginatedFiles.map((file) => (
                  <FileListItem
                    key={file.id}
                    file={file}
                    onPreview={handlePreview}
                    onDownload={handleDownload}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}

            <PaginationControls
              totalItems={processedFiles.length}
              currentPage={pagination.currentPage}
              itemsPerPage={pagination.itemsPerPage}
              onPageChange={pagination.setPage}
              onItemsPerPageChange={pagination.setItemsPerPage}
            />
          </>
        )}
      </div>

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

function FileCard({
  file,
  onPreview,
  onDownload,
  onToggleFavorite,
}: {
  file: FileMetadata;
  onPreview: (file: FileMetadata) => void;
  onDownload: (fileName: string) => void;
  onToggleFavorite: (fileId: string, isFav: boolean) => void;
}) {
  const { data: isFavorite } = useIsFavorite(file.id);

  return (
    <Card className="p-4 hover:shadow-lg transition-shadow">
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          <FileIcon className="h-10 w-10 text-primary" />
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onToggleFavorite(file.id, isFavorite || false)}
            >
              <Star
                className={`h-4 w-4 ${isFavorite ? 'fill-chart-1 text-chart-1' : 'text-muted-foreground'}`}
              />
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
                <DropdownMenuItem onClick={() => onDownload(file.name)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <h3 className="font-medium truncate mb-2" title={file.name}>
          {file.name}
        </h3>
        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
          <span>{(Number(file.size) / 1024).toFixed(2)} KB</span>
          <Badge variant="outline">
            {new Date(Number(file.uploadedAt) / 1_000_000).toLocaleDateString()}
          </Badge>
        </div>
      </div>
    </Card>
  );
}

function FileListItem({
  file,
  onPreview,
  onDownload,
  onToggleFavorite,
}: {
  file: FileMetadata;
  onPreview: (file: FileMetadata) => void;
  onDownload: (fileName: string) => void;
  onToggleFavorite: (fileId: string, isFav: boolean) => void;
}) {
  const { data: isFavorite } = useIsFavorite(file.id);

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileIcon className="h-8 w-8 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate" title={file.name}>
              {file.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <span>{(Number(file.size) / 1024).toFixed(2)} KB</span>
              <span>•</span>
              <span>{new Date(Number(file.uploadedAt) / 1_000_000).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleFavorite(file.id, isFavorite || false)}
          >
            <Star
              className={`h-4 w-4 ${isFavorite ? 'fill-chart-1 text-chart-1' : 'text-muted-foreground'}`}
            />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onPreview(file)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDownload(file.name)}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
