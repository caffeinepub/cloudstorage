import React, { useState, useCallback } from 'react';
import {
  File,
  Folder as FolderIcon,
  MoreVertical,
  Trash2,
  Download,
  Star,
  StarOff,
  Move,
  Pencil,
  Lock,
  LockOpen,
  Shield,
  FolderOpen,
  Eye,
  Heart,
  Share2,
  FolderInput,
  CheckSquare,
  Square,
  Loader2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { FileMetadata, Folder } from '../backend';
import {
  useListFiles,
  useListFolders,
  useDeleteFile,
  useAddFavorite,
  useRemoveFavorite,
  useIsFavorite,
  useGetFolderProtectionStatus,
  useDownloadFile,
  useMoveFilesToFolder,
} from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import FileToolbar from './FileToolbar';
import FilePreview from './FilePreview';
import DeleteFileDialog from './DeleteFileDialog';
import DeleteFolderDialog from './DeleteFolderDialog';
import MoveToFolderDialog from './MoveToFolderDialog';
import MoveFolderDialog from './MoveFolderDialog';
import RenameFolderDialog from './RenameFolderDialog';
import RenameFileDialog from './RenameFileDialog';
import FolderProtectionModal from './FolderProtectionModal';
import FolderPasswordPrompt, { isFolderLockedOut } from './FolderPasswordPrompt';
import BulkDeleteDialog from './BulkDeleteDialog';
import BulkShareDialog from './BulkShareDialog';
import { useFileSearch } from '../hooks/useFileSearch';
import { useFileFilters } from '../hooks/useFileFilters';
import { useFileSorting } from '../hooks/useFileSorting';
import { usePagination } from '../hooks/usePagination';
import PaginationControls from './PaginationControls';

interface FileListProps {
  currentFolderId?: string | null;
  onFolderClick?: (folderId: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatSize(size: bigint) {
  const bytes = Number(size);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: bigint) {
  if (!ts) return '—';
  const ms = Number(ts) / 1_000_000;
  return new Date(ms).toLocaleDateString();
}

function getFileIconColor(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    pdf: 'text-red-500',
    doc: 'text-blue-500',
    docx: 'text-blue-500',
    xls: 'text-green-500',
    xlsx: 'text-green-500',
    jpg: 'text-purple-500',
    jpeg: 'text-purple-500',
    png: 'text-purple-500',
    gif: 'text-purple-500',
    mp4: 'text-orange-500',
    txt: 'text-gray-500',
  };
  return map[ext] ?? 'text-muted-foreground';
}

// ── Protection badge ──────────────────────────────────────────────────────────

function ProtectionBadge({ isLocked }: { isLocked: boolean }) {
  return isLocked ? (
    <span title="Folder is locked">
      <Lock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
    </span>
  ) : (
    <span title="Folder is protected (unlocked)">
      <LockOpen className="h-3.5 w-3.5 text-green-500 shrink-0" />
    </span>
  );
}

// ── File row (list view) ──────────────────────────────────────────────────────

function FileRow({
  file,
  isSelected,
  onSelect,
  onPreview,
  onDelete,
  onMove,
  onRename,
}: {
  file: FileMetadata;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onPreview: (file: FileMetadata) => void;
  onDelete: (file: FileMetadata) => void;
  onMove: (file: FileMetadata) => void;
  onRename: (file: FileMetadata) => void;
}) {
  const { data: isFav } = useIsFavorite(file.id);
  const addFav = useAddFavorite();
  const removeFav = useRemoveFavorite();

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors group">
      <td className="py-3 pl-4 pr-2 w-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(file.id, !!checked)}
        />
      </td>
      <td className="py-3 px-2">
        <button
          className="flex items-center gap-2 text-left hover:text-primary transition-colors w-full"
          onClick={() => onPreview(file)}
        >
          <File className={`h-4 w-4 shrink-0 ${getFileIconColor(file.name)}`} />
          <span className="text-sm font-medium truncate max-w-xs">{file.name}</span>
        </button>
      </td>
      <td className="py-3 px-2 text-sm text-muted-foreground hidden md:table-cell">
        {formatSize(file.size)}
      </td>
      <td className="py-3 px-2 text-sm text-muted-foreground hidden lg:table-cell">
        {formatDate(file.uploadedAt)}
      </td>
      <td className="py-3 px-2 pr-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onPreview(file)}>
              <Eye className="h-4 w-4 mr-2" /> Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(file)}>
              <Pencil className="h-4 w-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(file)}>
              <Move className="h-4 w-4 mr-2" /> Move
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (isFav) removeFav.mutate(file.id);
                else addFav.mutate(file.id);
              }}
            >
              {isFav ? (
                <>
                  <StarOff className="h-4 w-4 mr-2" /> Remove Favorite
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 mr-2" /> Add to Favorites
                </>
              )}
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
      </td>
    </tr>
  );
}

// ── Folder row with protection check (list view) ──────────────────────────────

function FolderRowWithProtectionCheck({
  folder,
  isSelected,
  onSelect,
  onClick,
  onNavigationCheck,
  onDelete,
  onMove,
  onRename,
  onProtect,
  pendingNavigationFolder,
}: {
  folder: Folder;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onClick: (folder: Folder) => void;
  onNavigationCheck: (
    folder: Folder,
    protection: { hashedPassword?: string; isLocked: boolean } | null | undefined,
  ) => void;
  onDelete: (folder: Folder) => void;
  onMove: (folder: Folder) => void;
  onRename: (folder: Folder) => void;
  onProtect: (folder: Folder) => void;
  pendingNavigationFolder: Folder | null;
}) {
  const { data: protection } = useGetFolderProtectionStatus(folder.id);

  React.useEffect(() => {
    if (pendingNavigationFolder?.id === folder.id) {
      onNavigationCheck(folder, protection);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNavigationFolder?.id, folder.id, protection]);

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors group">
      <td className="py-3 pl-4 pr-2 w-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(folder.id, !!checked)}
        />
      </td>
      <td className="py-3 px-2">
        <button
          className="flex items-center gap-2 text-left hover:text-primary transition-colors w-full"
          onClick={() => onClick(folder)}
        >
          <FolderIcon className="h-4 w-4 shrink-0 text-amber-400" />
          <span className="text-sm font-medium truncate max-w-xs">{folder.name}</span>
          {protection?.hashedPassword && (
            <ProtectionBadge isLocked={protection.isLocked} />
          )}
        </button>
      </td>
      <td className="py-3 px-2 text-sm text-muted-foreground hidden md:table-cell">—</td>
      <td className="py-3 px-2 text-sm text-muted-foreground hidden lg:table-cell">
        {formatDate(folder.createdAt)}
      </td>
      <td className="py-3 px-2 pr-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onClick(folder)}>
              <FolderOpen className="h-4 w-4 mr-2" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(folder)}>
              <Pencil className="h-4 w-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(folder)}>
              <Move className="h-4 w-4 mr-2" /> Move
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onProtect(folder)}>
              <Shield className="h-4 w-4 mr-2" /> Protect Folder
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
      </td>
    </tr>
  );
}

// ── Folder card with protection check (grid view) ─────────────────────────────

function FolderCardWithProtectionCheck({
  folder,
  isSelected,
  onSelect,
  onClick,
  onNavigationCheck,
  onDelete,
  onMove,
  onRename,
  onProtect,
  pendingNavigationFolder,
}: {
  folder: Folder;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onClick: (folder: Folder) => void;
  onNavigationCheck: (
    folder: Folder,
    protection: { hashedPassword?: string; isLocked: boolean } | null | undefined,
  ) => void;
  onDelete: (folder: Folder) => void;
  onMove: (folder: Folder) => void;
  onRename: (folder: Folder) => void;
  onProtect: (folder: Folder) => void;
  pendingNavigationFolder: Folder | null;
}) {
  const { data: protection } = useGetFolderProtectionStatus(folder.id);

  React.useEffect(() => {
    if (pendingNavigationFolder?.id === folder.id) {
      onNavigationCheck(folder, protection);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNavigationFolder?.id, folder.id, protection]);

  return (
    <div
      className={`relative group rounded-xl border bg-card p-4 hover:shadow-md transition-all ${
        isSelected ? 'border-primary ring-1 ring-primary' : 'border-border'
      }`}
    >
      <div className="absolute top-3 left-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(folder.id, !!checked)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="absolute top-3 right-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onClick(folder)}>
              <FolderOpen className="h-4 w-4 mr-2" /> Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(folder)}>
              <Pencil className="h-4 w-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(folder)}>
              <Move className="h-4 w-4 mr-2" /> Move
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onProtect(folder)}>
              <Shield className="h-4 w-4 mr-2" /> Protect Folder
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

      <div
        className="flex flex-col items-center gap-2 pt-4 cursor-pointer"
        onClick={() => onClick(folder)}
      >
        <div className="relative">
          <FolderIcon className="h-12 w-12 text-amber-400" />
          {protection?.hashedPassword && (
            <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
              {protection.isLocked ? (
                <span title="Locked">
                  <Lock className="h-3.5 w-3.5 text-amber-500" />
                </span>
              ) : (
                <span title="Protected (unlocked)">
                  <LockOpen className="h-3.5 w-3.5 text-green-500" />
                </span>
              )}
            </div>
          )}
        </div>
        <span className="text-sm font-medium text-center truncate w-full">{folder.name}</span>
      </div>
    </div>
  );
}

// ── File card (grid view) ─────────────────────────────────────────────────────

function FileCard({
  file,
  isSelected,
  onSelect,
  onPreview,
  onDelete,
  onMove,
  onRename,
}: {
  file: FileMetadata;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onPreview: (file: FileMetadata) => void;
  onDelete: (file: FileMetadata) => void;
  onMove: (file: FileMetadata) => void;
  onRename: (file: FileMetadata) => void;
}) {
  const { data: isFav } = useIsFavorite(file.id);
  const addFav = useAddFavorite();
  const removeFav = useRemoveFavorite();

  return (
    <div
      className={`relative group rounded-xl border bg-card p-4 hover:shadow-md transition-all ${
        isSelected ? 'border-primary ring-1 ring-primary' : 'border-border'
      }`}
    >
      <div className="absolute top-3 left-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(file.id, !!checked)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="absolute top-3 right-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onPreview(file)}>
              <Eye className="h-4 w-4 mr-2" /> Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(file)}>
              <Pencil className="h-4 w-4 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(file)}>
              <Move className="h-4 w-4 mr-2" /> Move
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (isFav) removeFav.mutate(file.id);
                else addFav.mutate(file.id);
              }}
            >
              {isFav ? (
                <>
                  <StarOff className="h-4 w-4 mr-2" /> Remove Favorite
                </>
              ) : (
                <>
                  <Star className="h-4 w-4 mr-2" /> Add to Favorites
                </>
              )}
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

      <div
        className="flex flex-col items-center gap-2 pt-4 cursor-pointer"
        onClick={() => onPreview(file)}
      >
        <File className={`h-12 w-12 ${getFileIconColor(file.name)}`} />
        <span className="text-sm font-medium text-center truncate w-full">{file.name}</span>
        <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
      </div>
    </div>
  );
}

// ── FilePreviewWrapper ────────────────────────────────────────────────────────

function FilePreviewWrapper({
  file,
  onClose,
}: {
  file: FileMetadata;
  onClose: () => void;
}) {
  const [fileData, setFileData] = useState<Uint8Array | null>(null);
  const downloadFile = useDownloadFile();

  React.useEffect(() => {
    downloadFile.mutateAsync(file.id).then(({ data }) => setFileData(data)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  return <FilePreview file={file} fileData={fileData} onClose={onClose} />;
}

// ── Main FileList component ───────────────────────────────────────────────────

export default function FileList({ currentFolderId, onFolderClick }: FileListProps) {
  const { actor } = useActor();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Per-file dialog state
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [deleteFileTarget, setDeleteFileTarget] = useState<FileMetadata | null>(null);
  const [moveFileTarget, setMoveFileTarget] = useState<FileMetadata | null>(null);
  const [renameFileTarget, setRenameFileTarget] = useState<FileMetadata | null>(null);

  // Per-folder dialog state
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(null);
  const [moveFolderTarget, setMoveFolderTarget] = useState<Folder | null>(null);
  const [renameFolderTarget, setRenameFolderTarget] = useState<Folder | null>(null);
  const [protectionFolderTarget, setProtectionFolderTarget] = useState<Folder | null>(null);
  const [passwordPromptFolder, setPasswordPromptFolder] = useState<Folder | null>(null);
  const [pendingNavigationFolder, setPendingNavigationFolder] = useState<Folder | null>(null);

  // Bulk action dialog state
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkShareOpen, setIsBulkShareOpen] = useState(false);
  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkFavoriting, setIsBulkFavoriting] = useState(false);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);

  // Data hooks
  const { data: allFiles = [], isLoading: filesLoading } = useListFiles();
  const { data: allFolders = [], isLoading: foldersLoading } = useListFolders();
  const deleteFileMutation = useDeleteFile();
  const addFavMutation = useAddFavorite();
  const moveFilesToFolderMutation = useMoveFilesToFolder();

  // Filter files/folders by current folder
  const files = allFiles.filter((f) =>
    currentFolderId ? f.folderId === currentFolderId : !f.folderId,
  );
  const folders = allFolders.filter((f) =>
    currentFolderId ? f.parentId === currentFolderId : !f.parentId,
  );

  // Search / filter / sort
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

  const searched = searchFiles(files);
  const filtered = filterFiles(searched);
  const sorted = sortFiles(filtered);

  // Pagination — no arguments
  const { currentPage, itemsPerPage, setPage, setItemsPerPage, paginatedData } =
    usePagination<FileMetadata>();
  const paginated: FileMetadata[] = paginatedData(sorted);

  // Selection helpers
  const isAllSelected =
    sorted.length > 0 && sorted.every((f) => selectedItems.has(f.id));
  const isSomeSelected = selectedItems.size > 0 && !isAllSelected;
  const selectedCount = selectedItems.size;
  const isMultiSelected = selectedCount >= 2;

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const selectAll = () => setSelectedItems(new Set(sorted.map((f) => f.id)));
  const deselectAll = () => setSelectedItems(new Set());

  // ── Folder navigation with password check ────────────────────────────────

  const handleFolderClick = (folder: Folder) => {
    if (isFolderLockedOut(folder.id)) {
      toast.error('This folder is locked due to too many failed password attempts.');
      return;
    }
    setPendingNavigationFolder(folder);
  };

  const handleNavigationCheck = (
    folder: Folder,
    protection: { hashedPassword?: string; isLocked: boolean } | null | undefined,
  ) => {
    setPendingNavigationFolder(null);
    if (protection?.hashedPassword && protection.isLocked) {
      setPasswordPromptFolder(folder);
    } else {
      onFolderClick?.(folder.id);
    }
  };

  // ── Bulk action handlers ──────────────────────────────────────────────────

  const handleDownloadAll = useCallback(async () => {
    if (!actor || selectedItems.size === 0) return;
    setIsBulkDownloading(true);
    toast.info(`Starting download of ${selectedItems.size} file${selectedItems.size !== 1 ? 's' : ''}...`);

    let successCount = 0;
    let failCount = 0;

    for (const fileId of selectedItems) {
      const fileMeta = files.find((f) => f.id === fileId);
      if (!fileMeta) continue;

      try {
        const chunkSize = 1024 * 1024;
        const totalChunks = Math.max(1, Math.ceil(Number(fileMeta.size) / chunkSize));
        const chunks: Uint8Array[] = [];

        for (let i = 0; i < totalChunks; i++) {
          const chunk = await actor.downloadFileChunk(fileId, BigInt(i));
          if (chunk) {
            chunks.push(new Uint8Array(chunk));
          }
        }

        if (chunks.length === 0) {
          failCount++;
          continue;
        }

        // Cast to ArrayBuffer[] to satisfy Blob constructor typing
        const blobParts = chunks.map((c) => c.buffer as ArrayBuffer);
        const blob = new Blob(blobParts);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileMeta.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        successCount++;
      } catch {
        failCount++;
      }
    }

    setIsBulkDownloading(false);

    if (failCount === 0) {
      toast.success(`Downloaded ${successCount} file${successCount !== 1 ? 's' : ''} successfully`);
    } else if (successCount === 0) {
      toast.error(`Failed to download all ${failCount} file${failCount !== 1 ? 's' : ''}`);
    } else {
      toast.warning(`Downloaded ${successCount}, ${failCount} failed`);
    }
  }, [actor, selectedItems, files]);

  const handleFavoritesAll = useCallback(async () => {
    if (selectedItems.size === 0) return;
    setIsBulkFavoriting(true);

    const results = await Promise.allSettled(
      Array.from(selectedItems).map((fileId) => addFavMutation.mutateAsync(fileId))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    setIsBulkFavoriting(false);

    if (failed === 0) {
      toast.success(`Added ${succeeded} file${succeeded !== 1 ? 's' : ''} to Favorites`);
    } else if (succeeded === 0) {
      toast.error('Failed to add files to Favorites');
    } else {
      toast.warning(`Added ${succeeded} to Favorites, ${failed} failed`);
    }

    deselectAll();
  }, [selectedItems, addFavMutation]);

  const handleSharedAll = useCallback(() => {
    if (selectedItems.size === 0) return;
    setIsBulkShareOpen(true);
  }, [selectedItems]);

  const handleMoveAll = useCallback(() => {
    if (selectedItems.size === 0) return;
    setIsBulkMoveOpen(true);
  }, [selectedItems]);

  const handleDeleteAll = useCallback(() => {
    if (selectedItems.size === 0) return;
    setIsBulkDeleteOpen(true);
  }, [selectedItems]);

  const handleBulkDeleteConfirm = useCallback(
    async (retentionDays: number) => {
      setIsBulkDeleting(true);
      const retentionNs =
        BigInt(retentionDays) * BigInt(24 * 60 * 60) * BigInt(1_000_000_000);

      const results = await Promise.allSettled(
        Array.from(selectedItems).map((fileId) => {
          const fileMeta = files.find((f) => f.id === fileId);
          return deleteFileMutation.mutateAsync({
            fileId,
            originalPath: fileMeta?.folderId ? `/folder/${fileMeta.folderId}` : '/',
            customRetentionPeriod: retentionNs,
          });
        })
      );

      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      setIsBulkDeleting(false);
      setIsBulkDeleteOpen(false);

      if (failed === 0) {
        toast.success(`Moved ${succeeded} file${succeeded !== 1 ? 's' : ''} to Trash`);
      } else if (succeeded === 0) {
        toast.error('Failed to delete files');
      } else {
        toast.warning(`Deleted ${succeeded}, ${failed} failed`);
      }

      deselectAll();
    },
    [selectedItems, files, deleteFileMutation]
  );

  const isLoading = filesLoading || foldersLoading;

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const hasContent = sorted.length > 0 || folders.length > 0;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
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

      {/* Selection bulk action bar */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg flex-wrap">
          <span className="text-sm font-medium text-primary">
            {selectedCount} selected
          </span>

          <div className="flex items-center gap-1 ml-2 flex-wrap">
            {/* Select All / Deselect All toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={isAllSelected ? deselectAll : selectAll}
                    className="h-8 px-2"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                    <span className="ml-1 text-xs">
                      {isAllSelected ? 'Deselect All' : 'Select All'}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isAllSelected ? 'Deselect All' : 'Select All'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Clear selection */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAll}
                    className="h-8 px-2"
                  >
                    <X className="h-4 w-4" />
                    <span className="ml-1 text-xs">Clear</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Deselect All</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* ── Bulk actions: only visible when 2+ files selected ── */}
            {isMultiSelected && (
              <>
                <div className="w-px h-6 bg-border mx-1" />

                {/* Download All */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownloadAll}
                        disabled={isBulkDownloading}
                        className="h-8 px-2"
                      >
                        {isBulkDownloading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        <span className="ml-1 text-xs hidden sm:inline">Download All</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download All Selected</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Favorites All */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleFavoritesAll}
                        disabled={isBulkFavoriting}
                        className="h-8 px-2"
                      >
                        {isBulkFavoriting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Heart className="h-4 w-4" />
                        )}
                        <span className="ml-1 text-xs hidden sm:inline">Favorites All</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add All to Favorites</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Shared All */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSharedAll}
                        className="h-8 px-2"
                      >
                        <Share2 className="h-4 w-4" />
                        <span className="ml-1 text-xs hidden sm:inline">Share All</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Share All Selected</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Move All */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleMoveAll}
                        className="h-8 px-2"
                      >
                        <FolderInput className="h-4 w-4" />
                        <span className="ml-1 text-xs hidden sm:inline">Move All</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Move All to Folder</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {/* Delete All */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDeleteAll}
                        className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="ml-1 text-xs hidden sm:inline">Delete All</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete All Selected</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {!hasContent ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FolderIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No files or folders</p>
          <p className="text-sm text-muted-foreground mt-1">
            Upload files or create a folder to get started
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="py-2 pl-4 pr-2 w-10">
                    <Checkbox
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) {
                          const input = el as unknown as HTMLInputElement;
                          if (input) input.indeterminate = isSomeSelected;
                        }
                      }}
                      onCheckedChange={(checked) => {
                        if (checked) selectAll();
                        else deselectAll();
                      }}
                    />
                  </th>
                  <th className="py-2 px-2 text-left text-xs font-medium text-muted-foreground">
                    Name
                  </th>
                  <th className="py-2 px-2 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">
                    Size
                  </th>
                  <th className="py-2 px-2 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">
                    Date
                  </th>
                  <th className="py-2 px-2 pr-4 w-10" />
                </tr>
              </thead>
              <tbody>
                {folders.map((folder) => (
                  <FolderRowWithProtectionCheck
                    key={folder.id}
                    folder={folder}
                    isSelected={selectedItems.has(folder.id)}
                    onSelect={toggleSelect}
                    onClick={handleFolderClick}
                    onNavigationCheck={handleNavigationCheck}
                    onDelete={setDeleteFolderTarget}
                    onMove={setMoveFolderTarget}
                    onRename={setRenameFolderTarget}
                    onProtect={setProtectionFolderTarget}
                    pendingNavigationFolder={pendingNavigationFolder}
                  />
                ))}
                {paginated.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    isSelected={selectedItems.has(file.id)}
                    onSelect={toggleSelect}
                    onPreview={setPreviewFile}
                    onDelete={setDeleteFileTarget}
                    onMove={setMoveFileTarget}
                    onRename={setRenameFileTarget}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {sorted.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              totalItems={sorted.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {folders.map((folder) => (
              <FolderCardWithProtectionCheck
                key={folder.id}
                folder={folder}
                isSelected={selectedItems.has(folder.id)}
                onSelect={toggleSelect}
                onClick={handleFolderClick}
                onNavigationCheck={handleNavigationCheck}
                onDelete={setDeleteFolderTarget}
                onMove={setMoveFolderTarget}
                onRename={setRenameFolderTarget}
                onProtect={setProtectionFolderTarget}
                pendingNavigationFolder={pendingNavigationFolder}
              />
            ))}
            {paginated.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                isSelected={selectedItems.has(file.id)}
                onSelect={toggleSelect}
                onPreview={setPreviewFile}
                onDelete={setDeleteFileTarget}
                onMove={setMoveFileTarget}
                onRename={setRenameFileTarget}
              />
            ))}
          </div>

          {sorted.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              totalItems={sorted.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          )}
        </>
      )}

      {/* ── Per-file dialogs ── */}
      {previewFile && (
        <FilePreviewWrapper file={previewFile} onClose={() => setPreviewFile(null)} />
      )}

      <DeleteFileDialog
        open={!!deleteFileTarget}
        onOpenChange={(open) => { if (!open) setDeleteFileTarget(null); }}
        file={deleteFileTarget}
        onConfirm={async (customRetentionPeriod) => {
          if (!deleteFileTarget) return;
          try {
            await deleteFileMutation.mutateAsync({
              fileId: deleteFileTarget.id,
              originalPath: deleteFileTarget.folderId
                ? `/folder/${deleteFileTarget.folderId}`
                : '/',
              customRetentionPeriod,
            });
            toast.success(`"${deleteFileTarget.name}" moved to Trash`);
          } catch {
            toast.error('Failed to delete file');
          } finally {
            setDeleteFileTarget(null);
          }
        }}
      />

      <MoveToFolderDialog
        open={!!moveFileTarget}
        onOpenChange={(open) => { if (!open) setMoveFileTarget(null); }}
        fileIds={moveFileTarget ? [moveFileTarget.id] : []}
      />

      <RenameFileDialog
        open={!!renameFileTarget}
        onOpenChange={(open) => { if (!open) setRenameFileTarget(null); }}
        fileId={renameFileTarget?.id ?? ''}
        currentName={renameFileTarget?.name ?? ''}
      />

      {/* ── Per-folder dialogs ── */}
      <DeleteFolderDialog
        open={!!deleteFolderTarget}
        onOpenChange={(open) => { if (!open) setDeleteFolderTarget(null); }}
        folder={deleteFolderTarget}
      />

      <MoveFolderDialog
        open={!!moveFolderTarget}
        onOpenChange={(open) => { if (!open) setMoveFolderTarget(null); }}
        folder={moveFolderTarget}
      />

      <RenameFolderDialog
        open={!!renameFolderTarget}
        onOpenChange={(open) => { if (!open) setRenameFolderTarget(null); }}
        folder={renameFolderTarget}
      />

      {protectionFolderTarget && (
        <FolderProtectionModal
          open={!!protectionFolderTarget}
          onOpenChange={(open) => { if (!open) setProtectionFolderTarget(null); }}
          folder={protectionFolderTarget}
          protection={undefined}
        />
      )}

      {passwordPromptFolder && (
        <FolderPasswordPrompt
          open={!!passwordPromptFolder}
          onOpenChange={(open) => { if (!open) setPasswordPromptFolder(null); }}
          folderId={passwordPromptFolder.id}
          folderName={passwordPromptFolder.name}
          onSuccess={() => {
            const folder = passwordPromptFolder;
            setPasswordPromptFolder(null);
            onFolderClick?.(folder.id);
          }}
        />
      )}

      {/* ── Bulk action dialogs ── */}
      <BulkDeleteDialog
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleBulkDeleteConfirm}
        fileCount={selectedCount}
        isLoading={isBulkDeleting}
      />

      <BulkShareDialog
        isOpen={isBulkShareOpen}
        onClose={() => setIsBulkShareOpen(false)}
        selectedFileIds={Array.from(selectedItems)}
        onSuccess={deselectAll}
      />

      <MoveToFolderDialog
        open={isBulkMoveOpen}
        onOpenChange={(open) => { if (!open) setIsBulkMoveOpen(false); }}
        fileIds={Array.from(selectedItems)}
      />
    </div>
  );
}
