import React, { useState } from 'react';
import type { FileMetadata, Folder } from '../backend';
import {
  File,
  Folder as FolderIcon,
  MoreVertical,
  Trash2,
  Star,
  StarOff,
  Lock,
  Unlock,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import FilePreview from './FilePreview';
import DeleteFileDialog from './DeleteFileDialog';
import RenameFileDialog from './RenameFileDialog';
import MoveToFolderDialog from './MoveToFolderDialog';
import BulkShareDialog from './BulkShareDialog';
import FolderPasswordPrompt from './FolderPasswordPrompt';
import FolderProtectionModal from './FolderProtectionModal';
import RenameFolderDialog from './RenameFolderDialog';
import MoveFolderDialog from './MoveFolderDialog';
import DeleteFolderToTrashDialog from './DeleteFolderToTrashDialog';
import {
  useIsFavorite,
  useAddFavorite,
  useRemoveFavorite,
  useIsFavoriteFolder,
  useFavoriteFolder,
  useUnfavoriteFolder,
  useGetFolderProtectionStatus,
  useDeleteFile,
} from '../hooks/useQueries';
import { useFileSearch } from '../hooks/useFileSearch';
import { useFileFilters } from '../hooks/useFileFilters';
import { useFileSorting } from '../hooks/useFileSorting';
import { usePagination } from '../hooks/usePagination';
import FileToolbar from './FileToolbar';
import PaginationControls from './PaginationControls';
import { toast } from 'sonner';

interface FileListProps {
  files?: FileMetadata[];
  folders?: Folder[];
  isLoading?: boolean;
  onFolderClick?: (folderId: string) => void;
  currentFolderId?: string | null;
  showFolders?: boolean;
}

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

// File row component
function FileRow({
  file,
  isSelected,
  onSelect,
  onPreview,
  onDelete,
  onRename,
  onMove,
}: {
  file: FileMetadata;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onPreview: (file: FileMetadata) => void;
  onDelete: (file: FileMetadata) => void;
  onRename: (file: FileMetadata) => void;
  onMove: (file: FileMetadata) => void;
}) {
  const { data: isFav } = useIsFavorite(file.id);
  const addFav = useAddFavorite();
  const removeFav = useRemoveFavorite();

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isFav) {
        await removeFav.mutateAsync(file.id);
      } else {
        await addFav.mutateAsync(file.id);
      }
    } catch {
      // Favorites not available in this version
    }
  };

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3 w-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(file.id, !!checked)}
        />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
            <File className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
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
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleFavorite}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFav ? (
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            ) : (
              <StarOff className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPreview(file)}>Preview</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRename(file)}>Rename</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove(file)}>Move to folder</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(file)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}

// Folder row component
function FolderRow({
  folder,
  onFolderClick,
  onRename,
  onMove,
  onDelete,
}: {
  folder: Folder;
  onFolderClick?: (id: string) => void;
  onRename: (folder: Folder) => void;
  onMove: (folder: Folder) => void;
  onDelete: (folder: Folder) => void;
}) {
  const { data: isFav } = useIsFavoriteFolder(folder.id);
  const favFolder = useFavoriteFolder();
  const unfavFolder = useUnfavoriteFolder();
  const { data: protection } = useGetFolderProtectionStatus(folder.id);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showProtectionModal, setShowProtectionModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'rename' | 'move' | 'delete' | null>(null);

  const isLocked = protection?.isLocked ?? false;

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (isFav) {
        await unfavFolder.mutateAsync(folder.id);
      } else {
        await favFolder.mutateAsync(folder.id);
      }
    } catch {
      // Folder favorites not available
    }
  };

  const handleFolderClick = () => {
    if (isLocked) {
      setShowPasswordPrompt(true);
    } else {
      onFolderClick?.(folder.id);
    }
  };

  const handleActionWithPasswordCheck = (action: 'rename' | 'move' | 'delete') => {
    if (isLocked) {
      setPendingAction(action);
      setShowPasswordPrompt(true);
    } else {
      executeAction(action);
    }
  };

  const executeAction = (action: 'rename' | 'move' | 'delete') => {
    if (action === 'rename') onRename(folder);
    else if (action === 'move') onMove(folder);
    else if (action === 'delete') onDelete(folder);
  };

  return (
    <>
      <tr className="border-b border-border hover:bg-muted/30 transition-colors">
        <td className="px-4 py-3 w-10">
          <Checkbox disabled />
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3 cursor-pointer" onClick={handleFolderClick}>
            <div className="w-8 h-8 rounded bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
              <FolderIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{folder.name}</p>
              <p className="text-xs text-muted-foreground">Folder</p>
            </div>
            {isLocked && <Lock className="w-3.5 h-3.5 text-muted-foreground ml-1" />}
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">—</td>
        <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
          {new Date(Number(folder.createdAt) / 1_000_000).toLocaleDateString()}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={toggleFavorite}
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFav ? (
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              ) : (
                <StarOff className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowProtectionModal(true)}
              title="Folder protection"
            >
              {isLocked ? (
                <Lock className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleActionWithPasswordCheck('rename')}>
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleActionWithPasswordCheck('move')}>
                  Move
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => handleActionWithPasswordCheck('delete')}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>

      {showPasswordPrompt && (
        <FolderPasswordPrompt
          folder={folder}
          isOpen={showPasswordPrompt}
          onClose={() => {
            setShowPasswordPrompt(false);
            setPendingAction(null);
          }}
          onSuccess={() => {
            setShowPasswordPrompt(false);
            if (pendingAction) {
              executeAction(pendingAction);
              setPendingAction(null);
            } else {
              onFolderClick?.(folder.id);
            }
          }}
        />
      )}

      {showProtectionModal && (
        <FolderProtectionModal
          folder={folder}
          isOpen={showProtectionModal}
          onClose={() => setShowProtectionModal(false)}
        />
      )}
    </>
  );
}

export default function FileList({
  files = [],
  folders = [],
  isLoading = false,
  onFolderClick,
  currentFolderId,
  showFolders = true,
}: FileListProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<FileMetadata | null>(null);
  const [renameFileTarget, setRenameFileTarget] = useState<FileMetadata | null>(null);
  const [moveFileTarget, setMoveFileTarget] = useState<FileMetadata | null>(null);
  const [bulkShareOpen, setBulkShareOpen] = useState(false);
  const [renameFolder, setRenameFolder] = useState<Folder | null>(null);
  const [moveFolder, setMoveFolder] = useState<Folder | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<Folder | null>(null);
  const [sortField, setSortField] = useState<'name' | 'size' | 'date'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Use the actual hook APIs
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

  const deleteFileMutation = useDeleteFile();

  // Apply search, filter, sort pipeline
  const searched = searchFiles(files);
  const filtered = filterFiles(searched);
  const sorted = sortFiles(filtered);
  const paginated = paginatedData(sorted) as FileMetadata[];

  const handleSelectFile = (id: string, checked: boolean) => {
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

  const toggleSort = (field: 'name' | 'size' | 'date') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }: { field: 'name' | 'size' | 'date' }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 inline ml-1" />
    );
  };

  const handleDeleteFileConfirm = async (customRetentionPeriod: bigint | null) => {
    if (!deleteFileTarget) return;
    try {
      await deleteFileMutation.mutateAsync({
        fileId: deleteFileTarget.id,
        originalPath: '/',
        customRetentionPeriod,
      });
      toast.success(`"${deleteFileTarget.name}" moved to trash`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete file';
      toast.error(message);
    } finally {
      setDeleteFileTarget(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const allEmpty = files.length === 0 && folders.length === 0;

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
        <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
          <span className="text-sm font-medium">{selectedFiles.size} selected</span>
          <div className="flex gap-2 ml-auto">
            <Button size="sm" variant="outline" onClick={() => setBulkShareOpen(true)}>
              Share
            </Button>
          </div>
        </div>
      )}

      {allEmpty ? (
        <div className="text-center py-16">
          <FolderIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No files or folders</p>
          <p className="text-sm text-muted-foreground mt-1">
            Upload files or create folders to get started
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="px-4 py-3 w-10">
                  <Checkbox
                    checked={
                      sorted.length > 0 && sorted.every((f) => selectedFiles.has(f.id))
                    }
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer"
                  onClick={() => toggleSort('name')}
                >
                  Name <SortIcon field="name" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer hidden md:table-cell"
                  onClick={() => toggleSort('size')}
                >
                  Size <SortIcon field="size" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground cursor-pointer hidden lg:table-cell"
                  onClick={() => toggleSort('date')}
                >
                  Date <SortIcon field="date" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {showFolders &&
                folders.map((folder) => (
                  <FolderRow
                    key={folder.id}
                    folder={folder}
                    onFolderClick={onFolderClick}
                    onRename={setRenameFolder}
                    onMove={setMoveFolder}
                    onDelete={setDeleteFolder}
                  />
                ))}
              {paginated.map((file: FileMetadata) => (
                <FileRow
                  key={file.id}
                  file={file}
                  isSelected={selectedFiles.has(file.id)}
                  onSelect={handleSelectFile}
                  onPreview={setPreviewFile}
                  onDelete={setDeleteFileTarget}
                  onRename={setRenameFileTarget}
                  onMove={setMoveFileTarget}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sorted.length > itemsPerPage && (
        <PaginationControls
          currentPage={currentPage}
          totalItems={sorted.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}

      {/* Dialogs */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          fileData={null}
          onClose={() => setPreviewFile(null)}
        />
      )}
      {deleteFileTarget && (
        <DeleteFileDialog
          open={!!deleteFileTarget}
          onOpenChange={(open) => !open && setDeleteFileTarget(null)}
          file={deleteFileTarget}
          onConfirm={handleDeleteFileConfirm}
        />
      )}
      {renameFileTarget && (
        <RenameFileDialog
          open={!!renameFileTarget}
          onOpenChange={(open) => !open && setRenameFileTarget(null)}
          fileId={renameFileTarget.id}
          currentName={renameFileTarget.name}
        />
      )}
      {moveFileTarget && (
        <MoveToFolderDialog
          open={!!moveFileTarget}
          onOpenChange={(open) => !open && setMoveFileTarget(null)}
          fileIds={[moveFileTarget.id]}
        />
      )}
      {bulkShareOpen && (
        <BulkShareDialog
          isOpen={bulkShareOpen}
          onClose={() => setBulkShareOpen(false)}
          selectedFileIds={Array.from(selectedFiles)}
        />
      )}
      {renameFolder && (
        <RenameFolderDialog
          open={!!renameFolder}
          onOpenChange={(open) => !open && setRenameFolder(null)}
          folder={renameFolder}
        />
      )}
      {moveFolder && (
        <MoveFolderDialog
          open={!!moveFolder}
          onOpenChange={(open) => !open && setMoveFolder(null)}
          folder={moveFolder}
        />
      )}
      {deleteFolder && (
        <DeleteFolderToTrashDialog
          open={!!deleteFolder}
          onOpenChange={(open) => !open && setDeleteFolder(null)}
          folder={deleteFolder}
          onConfirm={async () => {
            setDeleteFolder(null);
          }}
        />
      )}
    </div>
  );
}
