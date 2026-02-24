import React, { useState, useMemo } from 'react';
import {
  FileText, Folder, MoreVertical, Star, StarOff, Trash2,
  Eye, FolderOpen, Edit2, Move, AlertTriangle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import FileToolbar from './FileToolbar';
import FilePreview from './FilePreview';
import DeleteFileDialog from './DeleteFileDialog';
import DeleteFolderToTrashDialog from './DeleteFolderToTrashDialog';
import RenameFolderDialog from './RenameFolderDialog';
import MoveFolderDialog from './MoveFolderDialog';
import MoveToFolderDialog from './MoveToFolderDialog';
import {
  useListFiles, useListFolders, useAddFavorite, useRemoveFavorite,
  useIsFavorite, useGetFilesInFolder, useDeleteFile, useDeleteFolderToTrash,
  useRecordFileAccess,
} from '../hooks/useQueries';
import { useFileSearch } from '../hooks/useFileSearch';
import { useFileFilters } from '../hooks/useFileFilters';
import { useFileSorting } from '../hooks/useFileSorting';
import { usePagination } from '../hooks/usePagination';
import PaginationControls from './PaginationControls';
import type { FileMetadata, Folder as FolderType } from '../backend';
import { toast } from 'sonner';

interface FileListProps {
  currentFolderId?: string | null;
  onFolderClick?: (folderId: string) => void;
}

function formatBytes(n: bigint) {
  const v = Number(n);
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  if (v < 1024 * 1024 * 1024) return `${(v / (1024 * 1024)).toFixed(1)} MB`;
  return `${(v / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ── FileRow (list) ────────────────────────────────────────────────────────────

function FileRow({
  file,
  onPreview,
  onDelete,
  onMove,
}: {
  file: FileMetadata;
  onPreview: (f: FileMetadata) => void;
  onDelete: (f: FileMetadata) => void;
  onMove: (fileId: string) => void;
}) {
  const { data: isFav } = useIsFavorite(file.id);
  const addFav = useAddFavorite();
  const removeFav = useRemoveFavorite();

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/5 group transition-colors">
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <FileText className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onPreview(file)}>
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => (isFav ? removeFav.mutate(file.id) : addFav.mutate(file.id))}
        >
          {isFav
            ? <StarOff className="h-3.5 w-3.5 text-yellow-500" />
            : <Star className="h-3.5 w-3.5" />}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onPreview(file)}>
              <Eye className="h-4 w-4 mr-2" /> Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(file.id)}>
              <Move className="h-4 w-4 mr-2" /> Move
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(file)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ── FileCard (grid) ───────────────────────────────────────────────────────────

function FileCard({
  file,
  onPreview,
  onDelete,
  onMove,
}: {
  file: FileMetadata;
  onPreview: (f: FileMetadata) => void;
  onDelete: (f: FileMetadata) => void;
  onMove: (fileId: string) => void;
}) {
  const { data: isFav } = useIsFavorite(file.id);
  const addFav = useAddFavorite();
  const removeFav = useRemoveFavorite();

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card hover:bg-accent/5 group transition-colors p-3 gap-2">
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => (isFav ? removeFav.mutate(file.id) : addFav.mutate(file.id))}
          >
            {isFav
              ? <StarOff className="h-3 w-3 text-yellow-500" />
              : <Star className="h-3 w-3" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPreview(file)}>
                <Eye className="h-4 w-4 mr-2" /> Preview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove(file.id)}>
                <Move className="h-4 w-4 mr-2" /> Move
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(file)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="min-w-0 cursor-pointer" onClick={() => onPreview(file)}>
        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{formatBytes(file.size)}</p>
      </div>
    </div>
  );
}

// ── FolderRow (list) ──────────────────────────────────────────────────────────

function FolderRow({
  folder,
  onOpen,
  onDelete,
  onRename,
  onMove,
}: {
  folder: FolderType;
  onOpen: (id: string) => void;
  onDelete: (f: FolderType) => void;
  onRename: (f: FolderType) => void;
  onMove: (f: FolderType) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/5 group transition-colors">
      <div className="h-8 w-8 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0">
        <Folder className="h-4 w-4 text-secondary-foreground" />
      </div>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpen(folder.id)}>
        <p className="text-sm font-medium text-foreground truncate">{folder.name}</p>
        <p className="text-xs text-muted-foreground">Folder</p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpen(folder.id)}>
          <FolderOpen className="h-3.5 w-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onOpen(folder.id)}>
              <FolderOpen className="h-4 w-4 mr-2" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(folder)}>
              <Edit2 className="h-4 w-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(folder)}>
              <Move className="h-4 w-4 mr-2" /> Move
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(folder)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ── FolderCard (grid) ─────────────────────────────────────────────────────────

function FolderCard({
  folder,
  onOpen,
  onDelete,
  onRename,
  onMove,
}: {
  folder: FolderType;
  onOpen: (id: string) => void;
  onDelete: (f: FolderType) => void;
  onRename: (f: FolderType) => void;
  onMove: (f: FolderType) => void;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-card hover:bg-accent/5 group transition-colors p-3 gap-2">
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-lg bg-secondary/20 flex items-center justify-center shrink-0">
          <Folder className="h-5 w-5 text-secondary-foreground" />
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onOpen(folder.id)}>
            <FolderOpen className="h-3 w-3" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onOpen(folder.id)}>
                <FolderOpen className="h-4 w-4 mr-2" /> Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRename(folder)}>
                <Edit2 className="h-4 w-4 mr-2" /> Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove(folder)}>
                <Move className="h-4 w-4 mr-2" /> Move
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(folder)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="min-w-0 cursor-pointer" onClick={() => onOpen(folder.id)}>
        <p className="text-sm font-medium text-foreground truncate">{folder.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Folder</p>
      </div>
    </div>
  );
}

// ── FileList ──────────────────────────────────────────────────────────────────

export default function FileList({ currentFolderId, onFolderClick }: FileListProps) {
  const { data: allFiles, isLoading: filesLoading, isError: filesError } = useListFiles();
  const { data: folderFiles, isLoading: folderFilesLoading } = useGetFilesInFolder(currentFolderId ?? null);
  const { data: folders, isLoading: foldersLoading, isError: foldersError } = useListFolders();
  const deleteFileMutation = useDeleteFile();
  const deleteFolderToTrash = useDeleteFolderToTrash();
  const recordAccess = useRecordFileAccess();

  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [deleteFileData, setDeleteFileData] = useState<FileMetadata | null>(null);
  const [deleteFolderData, setDeleteFolderData] = useState<FolderType | null>(null);
  const [renameFolderData, setRenameFolderData] = useState<FolderType | null>(null);
  const [moveFolderData, setMoveFolderData] = useState<FolderType | null>(null);
  const [moveFileIds, setMoveFileIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Search / filter / sort hooks
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
  const { currentPage, itemsPerPage, setPage, setItemsPerPage, paginatedData, resetPage } =
    usePagination<FileMetadata>();

  // Derive raw files for current folder
  const rawFiles: FileMetadata[] = useMemo(() => {
    if (currentFolderId) return folderFiles ?? [];
    return (allFiles ?? []).filter((f) => !f.folderId);
  }, [allFiles, folderFiles, currentFolderId]);

  // Derive folders for current level
  const rawFolders: FolderType[] = useMemo(() => {
    return (folders ?? []).filter((f) =>
      currentFolderId ? f.parentId === currentFolderId : !f.parentId,
    );
  }, [folders, currentFolderId]);

  // Apply search → filter → sort
  const processedFiles = useMemo(() => {
    let result = searchFiles(rawFiles);
    result = filterFiles(result);
    result = sortFiles(result);
    return result;
  }, [rawFiles, searchFiles, filterFiles, sortFiles]);

  const paginatedFiles = paginatedData(processedFiles);

  const isLoading = filesLoading || foldersLoading || (!!currentFolderId && folderFilesLoading);

  const handleDeleteFile = async (customRetentionPeriod: bigint | null) => {
    if (!deleteFileData) return;
    try {
      await deleteFileMutation.mutateAsync({
        fileId: deleteFileData.id,
        originalPath: currentFolderId ? `/${currentFolderId}` : '/',
        customRetentionPeriod,
      });
      toast.success('File moved to Trash');
      setDeleteFileData(null);
    } catch {
      toast.error('Failed to delete file');
    }
  };

  const handleDeleteFolder = async (folderId: string, retentionPeriodNs: bigint) => {
    const retentionDays = retentionPeriodNs / BigInt(24 * 60 * 60 * 1_000_000_000);
    await deleteFolderToTrash.mutateAsync({ folderId, retentionDays });
  };

  const handlePreview = async (file: FileMetadata) => {
    setPreviewFile(file);
    try { await recordAccess.mutateAsync(file.id); } catch { /* ignore */ }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="shrink-0 mb-3">
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
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                <div key={i} className="rounded-xl border border-border p-3 space-y-2">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filesError || foldersError ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive mb-3" />
            <p className="text-sm text-destructive font-medium">Failed to load files</p>
            <p className="text-xs text-muted-foreground mt-1">Please try refreshing the page</p>
          </div>
        ) : rawFolders.length === 0 && processedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">No files yet</p>
            <p className="text-xs text-muted-foreground mt-1">Upload files or create a folder to get started</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {rawFolders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onOpen={(id) => onFolderClick?.(id)}
                onDelete={setDeleteFolderData}
                onRename={setRenameFolderData}
                onMove={setMoveFolderData}
              />
            ))}
            {paginatedFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                onPreview={handlePreview}
                onDelete={setDeleteFileData}
                onMove={(fileId) => setMoveFileIds([fileId])}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {rawFolders.map((folder) => (
              <FolderRow
                key={folder.id}
                folder={folder}
                onOpen={(id) => onFolderClick?.(id)}
                onDelete={setDeleteFolderData}
                onRename={setRenameFolderData}
                onMove={setMoveFolderData}
              />
            ))}
            {paginatedFiles.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                onPreview={handlePreview}
                onDelete={setDeleteFileData}
                onMove={(fileId) => setMoveFileIds([fileId])}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && processedFiles.length > itemsPerPage && (
        <div className="shrink-0 mt-3 border-t border-border pt-3">
          <PaginationControls
            currentPage={currentPage}
            totalItems={processedFiles.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setPage}
            onItemsPerPageChange={(n) => { setItemsPerPage(n); resetPage(); }}
          />
        </div>
      )}

      {/* Dialogs */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          fileData={null}
          onClose={() => setPreviewFile(null)}
        />
      )}

      <DeleteFileDialog
        open={!!deleteFileData}
        onOpenChange={(open) => !open && setDeleteFileData(null)}
        file={deleteFileData}
        onConfirm={handleDeleteFile}
      />

      <DeleteFolderToTrashDialog
        open={!!deleteFolderData}
        onOpenChange={(open) => !open && setDeleteFolderData(null)}
        folder={deleteFolderData}
        onConfirm={handleDeleteFolder}
      />

      <RenameFolderDialog
        open={!!renameFolderData}
        onOpenChange={(open) => !open && setRenameFolderData(null)}
        folder={renameFolderData}
      />

      <MoveFolderDialog
        open={!!moveFolderData}
        onOpenChange={(open) => !open && setMoveFolderData(null)}
        folder={moveFolderData}
      />

      <MoveToFolderDialog
        open={moveFileIds.length > 0}
        onOpenChange={(open) => !open && setMoveFileIds([])}
        fileIds={moveFileIds}
      />
    </div>
  );
}
