import React, { useState } from 'react';
import { Clock, FileText, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useListFiles, useDeleteFile } from '../hooks/useQueries';
import type { FileMetadata } from '../backend';
import FilePreview from '../components/FilePreview';
import DeleteFileDialog from '../components/DeleteFileDialog';
import FileToolbar from '../components/FileToolbar';
import PaginationControls from '../components/PaginationControls';
import { usePagination } from '../hooks/usePagination';
import { useFileSearch } from '../hooks/useFileSearch';
import { useFileFilters } from '../hooks/useFileFilters';
import { useFileSorting } from '../hooks/useFileSorting';
import { toast } from 'sonner';

function formatFileSize(bytes: bigint): string {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileExtension(name: string): string {
  const parts = name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
}

function RecentFileCard({
  file,
  isSelected,
  onSelect,
  onPreview,
  onDelete,
}: {
  file: FileMetadata;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onPreview: (file: FileMetadata) => void;
  onDelete: (file: FileMetadata) => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelect(file.id, !!checked)}
            className="mt-0.5"
          />
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {getFileExtension(file.name)}
              </Badge>
              <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(Number(file.uploadedAt) / 1_000_000).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onPreview(file)}
          >
            Preview
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive text-xs"
            onClick={() => onDelete(file)}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentFileRow({
  file,
  isSelected,
  onSelect,
  onPreview,
  onDelete,
}: {
  file: FileMetadata;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onPreview: (file: FileMetadata) => void;
  onDelete: (file: FileMetadata) => void;
}) {
  return (
    <tr className="border-b border-border hover:bg-muted/20">
      <td className="px-4 py-3 w-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(file.id, !!checked)}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{getFileExtension(file.name)}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">
        {formatFileSize(file.size)}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
        {new Date(Number(file.uploadedAt) / 1_000_000).toLocaleDateString()}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => onPreview(file)}>
            Preview
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={() => onDelete(file)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export default function Recent() {
  const { data: files, isLoading, isError } = useListFiles();
  const deleteFileMutation = useDeleteFile();

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileMetadata | null>(null);

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
  const { currentPage, itemsPerPage, setPage, setItemsPerPage, paginatedData } =
    usePagination<FileMetadata>();

  const allFiles = (files ?? []) as FileMetadata[];
  // Sort by most recently uploaded
  const recentFiles = [...allFiles].sort(
    (a, b) => Number(b.uploadedAt) - Number(a.uploadedAt),
  );

  const searched = searchFiles(recentFiles);
  const filtered = filterFiles(searched);
  const sorted = sortFiles(filtered);
  const paginated = paginatedData(sorted) as FileMetadata[];

  const handleSelect = (id: string, checked: boolean) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(sorted.map((f) => f.id)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const handleDeleteConfirm = async (customRetentionPeriod: bigint | null) => {
    if (!deleteTarget) return;
    try {
      await deleteFileMutation.mutateAsync({
        fileId: deleteTarget.id,
        originalPath: '/',
        customRetentionPeriod,
      });
      toast.success(`"${deleteTarget.name}" moved to trash`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete file';
      toast.error(message);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedFiles);
    let succeeded = 0;
    for (const fileId of ids) {
      try {
        await deleteFileMutation.mutateAsync({ fileId, originalPath: '/', customRetentionPeriod: null });
        succeeded++;
      } catch {
        // continue
      }
    }
    toast.success(`Moved ${succeeded} file(s) to trash`);
    setSelectedFiles(new Set());
  };

  const handleCopyNames = () => {
    const names = Array.from(selectedFiles)
      .map((id) => sorted.find((f) => f.id === id)?.name ?? id)
      .join(', ');
    navigator.clipboard.writeText(names);
    toast.success('File names copied');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Recent Files
          </h1>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            Recent Files
          </h1>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Failed to load recent files
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="w-6 h-6 text-primary" />
          Recent Files
        </h1>
        <p className="text-muted-foreground mt-1">Your most recently uploaded files</p>
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

      {/* Bulk actions */}
      {selectedFiles.size > 0 && (
        <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20 mb-4">
          <span className="text-sm font-medium">{selectedFiles.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" onClick={handleCopyNames}>
              Copy Names
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive"
              onClick={handleBulkDelete}
              disabled={deleteFileMutation.isPending}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-16">
          <Clock className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No recent files</p>
          <p className="text-sm text-muted-foreground mt-1">
            Upload files to see them here
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginated.map((file) => (
            <RecentFileCard
              key={file.id}
              file={file}
              isSelected={selectedFiles.has(file.id)}
              onSelect={handleSelect}
              onPreview={setPreviewFile}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={sorted.length > 0 && sorted.every((f) => selectedFiles.has(f.id))}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((file) => (
                <RecentFileRow
                  key={file.id}
                  file={file}
                  isSelected={selectedFiles.has(file.id)}
                  onSelect={handleSelect}
                  onPreview={setPreviewFile}
                  onDelete={setDeleteTarget}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sorted.length > itemsPerPage && (
        <div className="mt-4">
          <PaginationControls
            currentPage={currentPage}
            totalItems={sorted.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      )}

      {previewFile && (
        <FilePreview
          file={previewFile}
          fileData={null}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {deleteTarget && (
        <DeleteFileDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          file={deleteTarget}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
