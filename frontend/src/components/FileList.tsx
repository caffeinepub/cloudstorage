import { useState, useMemo, useEffect } from 'react';
import {
  useListFiles,
  useListFolders,
  useAddFavorite,
  useRemoveFavorite,
  useGetFavorites,
  useDeleteFile,
  useDeleteFolderToTrash,
  useRecordFileAccess,
  useIsFavoriteFolder,
  useFavoriteFolder,
  useUnfavoriteFolder,
} from '../hooks/useQueries';
import { useFileSearch } from '../hooks/useFileSearch';
import { useFileFilters } from '../hooks/useFileFilters';
import { useFileSorting } from '../hooks/useFileSorting';
import { usePagination } from '../hooks/usePagination';
import PaginationControls from './PaginationControls';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  FileIcon,
  Trash2,
  Eye,
  Download,
  MoreVertical,
  Star,
  Folder as FolderIcon,
  FolderOpen,
  Edit2,
  FolderInput,
} from 'lucide-react';
import { toast } from 'sonner';
import FilePreview from './FilePreview';
import DeleteFileDialog from './DeleteFileDialog';
import DeleteFolderToTrashDialog from './DeleteFolderToTrashDialog';
import FileToolbar from './FileToolbar';
import MoveToFolderDialog from './MoveToFolderDialog';
import RenameFolderDialog from './RenameFolderDialog';
import MoveFolderDialog from './MoveFolderDialog';
import type { FileMetadata, Folder } from '../backend';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface FileListProps {
  currentFolderId?: string | null;
  onFolderClick?: (folderId: string) => void;
}

export default function FileList({ currentFolderId, onFolderClick }: FileListProps) {
  const { data: allFiles, isLoading: filesLoading } = useListFiles();
  const { data: folders, isLoading: foldersLoading } = useListFolders();
  const deleteFileMutation = useDeleteFile();
  const deleteFolderToTrash = useDeleteFolderToTrash();
  const recordAccess = useRecordFileAccess();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [deleteDialogFile, setDeleteDialogFile] = useState<FileMetadata | null>(null);
  const [moveDialogFileIds, setMoveDialogFileIds] = useState<string[]>([]);
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);
  const [renameFolderData, setRenameFolderData] = useState<Folder | null>(null);
  const [moveFolderData, setMoveFolderData] = useState<Folder | null>(null);
  const [deleteFolderData, setDeleteFolderData] = useState<Folder | null>(null);

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
  const pagination = usePagination<FileMetadata | Folder>();

  // Filter files by current folder
  const files = useMemo(() => {
    if (!allFiles) return [];
    return allFiles.filter((file) => {
      if (currentFolderId) {
        return file.folderId === currentFolderId;
      } else {
        return !file.folderId;
      }
    });
  }, [allFiles, currentFolderId]);

  // Filter folders by current folder (show subfolders)
  const displayFolders = useMemo(() => {
    if (!folders) return [];
    return folders.filter((folder) => {
      if (currentFolderId) {
        return folder.parentId === currentFolderId;
      } else {
        return !folder.parentId;
      }
    });
  }, [folders, currentFolderId]);

  // Apply search, filter, and sort transformations to files
  const processedFiles = useMemo(() => {
    if (!files) return [];
    let result = searchFiles(files);
    result = filterFiles(result);
    result = sortFiles(result);
    return result;
  }, [files, searchFiles, filterFiles, sortFiles]);

  // Combined items: folders first, then files
  const allItems: (Folder | FileMetadata)[] = useMemo(
    () => [...displayFolders, ...processedFiles],
    [displayFolders, processedFiles]
  );

  // Reset to page 1 when search/filter/sort/folder changes
  useEffect(() => {
    pagination.resetPage();
  }, [searchQuery, filters, sortBy, sortOrder, currentFolderId]);

  const paginatedItems = pagination.paginatedData(allItems);

  const isLoading = filesLoading || foldersLoading;

  const handleDelete = async (customRetentionPeriod: bigint | null) => {
    if (!deleteDialogFile) return;
    try {
      await deleteFileMutation.mutateAsync({
        fileId: deleteDialogFile.id,
        originalPath: currentFolderId ? `/${currentFolderId}` : '/',
        customRetentionPeriod,
      });
      toast.success('File moved to Trash');
      setDeleteDialogFile(null);
    } catch (error) {
      toast.error('Failed to delete file');
    }
  };

  const handleDeleteFolder = async (folderId: string, retentionPeriodNs: bigint) => {
    try {
      const retentionDays = retentionPeriodNs / BigInt(24 * 60 * 60 * 1_000_000_000);
      await deleteFolderToTrash.mutateAsync({
        folderId,
        retentionPeriodDays: retentionDays,
      });
    } catch (error) {
      throw error;
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

  const handleDragStart = (fileId: string) => {
    setDraggedFileId(fileId);
  };

  const handleDragEnd = () => {
    setDraggedFileId(null);
    setDropTargetFolderId(null);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDropTargetFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDropTargetFolderId(null);
  };

  const handleDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    if (draggedFileId) {
      setMoveDialogFileIds([draggedFileId]);
      setDropTargetFolderId(null);
      setDraggedFileId(null);
    }
  };

  const isFolder = (item: Folder | FileMetadata): item is Folder => {
    return 'createdAt' in item && !('uploadedAt' in item);
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

  if (!files || (files.length === 0 && displayFolders.length === 0)) {
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

      {allItems.length === 0 ? (
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
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedItems.map((item) => {
                if (isFolder(item)) {
                  return (
                    <FolderCard
                      key={`folder-${item.id}`}
                      folder={item}
                      onFolderClick={onFolderClick}
                      onRename={setRenameFolderData}
                      onMove={setMoveFolderData}
                      onDelete={setDeleteFolderData}
                      isDropTarget={dropTargetFolderId === item.id}
                      onDragOver={(e) => handleDragOver(e, item.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, item.id)}
                    />
                  );
                }
                return (
                  <FileCard
                    key={`file-${item.id}`}
                    file={item as FileMetadata}
                    onPreview={handlePreview}
                    onDownload={handleDownload}
                    onDelete={setDeleteDialogFile}
                    onMoveToFolder={(fileId) => setMoveDialogFileIds([fileId])}
                    onDragStart={() => handleDragStart(item.id)}
                    onDragEnd={handleDragEnd}
                  />
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedItems.map((item) => {
                if (isFolder(item)) {
                  return (
                    <FolderListItem
                      key={`folder-${item.id}`}
                      folder={item}
                      onFolderClick={onFolderClick}
                      onRename={setRenameFolderData}
                      onMove={setMoveFolderData}
                      onDelete={setDeleteFolderData}
                      isDropTarget={dropTargetFolderId === item.id}
                      onDragOver={(e) => handleDragOver(e, item.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, item.id)}
                    />
                  );
                }
                return (
                  <FileListItem
                    key={`file-${item.id}`}
                    file={item as FileMetadata}
                    onPreview={handlePreview}
                    onDownload={handleDownload}
                    onDelete={setDeleteDialogFile}
                    onMoveToFolder={(fileId) => setMoveDialogFileIds([fileId])}
                    onDragStart={() => handleDragStart(item.id)}
                    onDragEnd={handleDragEnd}
                  />
                );
              })}
            </div>
          )}

          <PaginationControls
            totalItems={allItems.length}
            currentPage={pagination.currentPage}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={pagination.setPage}
            onItemsPerPageChange={pagination.setItemsPerPage}
          />
        </>
      )}

      {previewFile && (
        <FilePreview
          file={previewFile}
          fileData={null}
          onClose={() => setPreviewFile(null)}
        />
      )}

      <DeleteFileDialog
        open={!!deleteDialogFile}
        onOpenChange={(open) => !open && setDeleteDialogFile(null)}
        file={deleteDialogFile}
        onConfirm={handleDelete}
      />

      <DeleteFolderToTrashDialog
        open={!!deleteFolderData}
        onOpenChange={(open) => !open && setDeleteFolderData(null)}
        folder={deleteFolderData}
        onConfirm={handleDeleteFolder}
      />

      <MoveToFolderDialog
        open={moveDialogFileIds.length > 0}
        onOpenChange={(open) => !open && setMoveDialogFileIds([])}
        fileIds={moveDialogFileIds}
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
    </>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function FolderCard({
  folder,
  onFolderClick,
  onRename,
  onMove,
  onDelete,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  folder: Folder;
  onFolderClick?: (folderId: string) => void;
  onRename: (folder: Folder) => void;
  onMove: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
  isDropTarget: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const { data: isFavorite } = useIsFavoriteFolder(folder.id);
  const favoriteFolder = useFavoriteFolder();
  const unfavoriteFolder = useUnfavoriteFolder();

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isFavorite) {
        await unfavoriteFolder.mutateAsync(folder.id);
        toast.success('Removed from favorites');
      } else {
        await favoriteFolder.mutateAsync(folder.id);
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const handleMenuClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <Card
      className={`p-4 hover:shadow-lg transition-all cursor-pointer ${
        isDropTarget ? 'border-primary border-2 bg-primary/5' : ''
      }`}
      onClick={() => onFolderClick?.(folder.id)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-start justify-between mb-3">
          {isDropTarget ? (
            <FolderOpen className="h-10 w-10 text-primary" />
          ) : (
            <FolderIcon className="h-10 w-10 text-primary" />
          )}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleToggleFavorite}
            >
              <Star
                className={`h-4 w-4 ${isFavorite ? 'fill-chart-1 text-chart-1' : 'text-muted-foreground'}`}
              />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => handleMenuClick(e, () => onRename(folder))}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleMenuClick(e, () => onMove(folder))}>
                  <FolderInput className="mr-2 h-4 w-4" />
                  Move to Folder
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => handleMenuClick(e, () => onDelete(folder))}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <h3 className="font-medium truncate mb-2" title={folder.name}>
          {folder.name}
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto">
          <Badge variant="outline">FOLDER</Badge>
          <span>{new Date(Number(folder.createdAt) / 1000000).toLocaleDateString()}</span>
        </div>
      </div>
    </Card>
  );
}

function FolderListItem({
  folder,
  onFolderClick,
  onRename,
  onMove,
  onDelete,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  folder: Folder;
  onFolderClick?: (folderId: string) => void;
  onRename: (folder: Folder) => void;
  onMove: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
  isDropTarget: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  const { data: isFavorite } = useIsFavoriteFolder(folder.id);
  const favoriteFolder = useFavoriteFolder();
  const unfavoriteFolder = useUnfavoriteFolder();

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isFavorite) {
        await unfavoriteFolder.mutateAsync(folder.id);
        toast.success('Removed from favorites');
      } else {
        await favoriteFolder.mutateAsync(folder.id);
        toast.success('Added to favorites');
      }
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const handleMenuClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <Card
      className={`p-4 hover:shadow-md transition-all cursor-pointer ${
        isDropTarget ? 'border-primary border-2 bg-primary/5' : ''
      }`}
      onClick={() => onFolderClick?.(folder.id)}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {isDropTarget ? (
            <FolderOpen className="h-8 w-8 text-primary shrink-0" />
          ) : (
            <FolderIcon className="h-8 w-8 text-primary shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate" title={folder.name}>
              {folder.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Badge variant="outline">FOLDER</Badge>
              <span>{new Date(Number(folder.createdAt) / 1000000).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleToggleFavorite}
          >
            <Star
              className={`h-4 w-4 ${isFavorite ? 'fill-chart-1 text-chart-1' : 'text-muted-foreground'}`}
            />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => handleMenuClick(e, () => onRename(folder))}>
                <Edit2 className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleMenuClick(e, () => onMove(folder))}>
                <FolderInput className="mr-2 h-4 w-4" />
                Move to Folder
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => handleMenuClick(e, () => onDelete(folder))}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}

function FileCard({
  file,
  onPreview,
  onDownload,
  onDelete,
  onMoveToFolder,
  onDragStart,
  onDragEnd,
}: {
  file: FileMetadata;
  onPreview: (file: FileMetadata) => void;
  onDownload: (file: FileMetadata) => void;
  onDelete: (file: FileMetadata) => void;
  onMoveToFolder: (fileId: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const { data: favorites } = useGetFavorites();
  const isFavorite = favorites?.some((f) => f.fileId === file.id) ?? false;

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
    <Card
      className="p-4 hover:shadow-lg transition-shadow cursor-grab"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
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
                <DropdownMenuItem onClick={() => onDownload(file)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMoveToFolder(file.id)}>
                  <FolderInput className="mr-2 h-4 w-4" />
                  Move to Folder
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
  onDelete,
  onMoveToFolder,
  onDragStart,
  onDragEnd,
}: {
  file: FileMetadata;
  onPreview: (file: FileMetadata) => void;
  onDownload: (file: FileMetadata) => void;
  onDelete: (file: FileMetadata) => void;
  onMoveToFolder: (fileId: string) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const { data: favorites } = useGetFavorites();
  const isFavorite = favorites?.some((f) => f.fileId === file.id) ?? false;

  const handleToggleFavorite = async () => {
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
    <Card
      className="p-4 hover:shadow-md transition-shadow cursor-grab"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
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
              <span>
                {new Date(Number(file.uploadedAt) / 1_000_000).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleToggleFavorite}>
            <Star
              className={`h-4 w-4 ${isFavorite ? 'fill-chart-1 text-chart-1' : 'text-muted-foreground'}`}
            />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPreview(file)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDownload(file)}>
            <Download className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onMoveToFolder(file.id)}>
                <FolderInput className="mr-2 h-4 w-4" />
                Move to Folder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(file)} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}
