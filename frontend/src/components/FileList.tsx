import React, { useState, useMemo } from 'react';
import {
  Folder, MoreVertical, Star, StarOff, Trash2,
  Eye, FolderOpen, Edit2, Move, Download,
  X, FileText, FileImage, FileVideo, FileAudio,
  FileCode, FileArchive, FileSpreadsheet, File,
  Pencil,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import FileToolbar from './FileToolbar';
import FilePreview from './FilePreview';
import DeleteFileDialog from './DeleteFileDialog';
import DeleteFolderToTrashDialog from './DeleteFolderToTrashDialog';
import RenameFolderDialog from './RenameFolderDialog';
import RenameFileDialog from './RenameFileDialog';
import MoveFolderDialog from './MoveFolderDialog';
import MoveToFolderDialog from './MoveToFolderDialog';
import {
  useListFiles, useListFolders, useAddFavorite, useRemoveFavorite,
  useIsFavorite, useGetFilesInFolder, useDeleteFile, useDeleteFolderToTrash,
  useRecordFileAccess, useDownloadFile,
} from '../hooks/useQueries';
import { useFileSearch } from '../hooks/useFileSearch';
import { useFileFilters } from '../hooks/useFileFilters';
import { useFileSorting } from '../hooks/useFileSorting';
import { usePagination } from '../hooks/usePagination';
import PaginationControls from './PaginationControls';
import type { FileMetadata, Folder as FolderType } from '../backend';
import { toast } from 'sonner';
import { useActor } from '../hooks/useActor';

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

function formatDate(ts: bigint): string {
  if (!ts || ts === 0n) return '—';
  const ms = Number(ts) / 1_000_000;
  const d = new Date(ms);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function getFileExtension(name: string): string {
  const parts = name.split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toLowerCase();
}

function getFileTypeLabel(name: string): string {
  const ext = getFileExtension(name);
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff'];
  const videoExts = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
  const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'php', 'rb', 'html', 'css', 'json', 'xml', 'yaml', 'yml', 'sh', 'bash'];
  const archiveExts = ['zip', 'tar', 'gz', 'rar', '7z', 'bz2'];
  const spreadsheetExts = ['xls', 'xlsx', 'csv', 'ods'];
  const docExts = ['doc', 'docx', 'odt', 'rtf'];

  if (ext === 'pdf') return 'PDF';
  if (imageExts.includes(ext)) return 'Image';
  if (videoExts.includes(ext)) return 'Video';
  if (audioExts.includes(ext)) return 'Audio';
  if (codeExts.includes(ext)) return 'Code';
  if (archiveExts.includes(ext)) return 'Archive';
  if (spreadsheetExts.includes(ext)) return 'Spreadsheet';
  if (docExts.includes(ext)) return 'Document';
  if (ext === 'txt') return 'Text';
  if (ext) return ext.toUpperCase();
  return 'File';
}

function FileTypeIcon({ name, className = 'h-4 w-4' }: { name: string; className?: string }) {
  const ext = getFileExtension(name);
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff'];
  const videoExts = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', 'wmv'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'];
  const codeExts = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'php', 'rb', 'html', 'css', 'json', 'xml', 'yaml', 'yml', 'sh', 'bash'];
  const archiveExts = ['zip', 'tar', 'gz', 'rar', '7z', 'bz2'];
  const spreadsheetExts = ['xls', 'xlsx', 'csv', 'ods'];

  if (imageExts.includes(ext)) return <FileImage className={`${className} text-emerald-500`} />;
  if (videoExts.includes(ext)) return <FileVideo className={`${className} text-purple-500`} />;
  if (audioExts.includes(ext)) return <FileAudio className={`${className} text-pink-500`} />;
  if (codeExts.includes(ext)) return <FileCode className={`${className} text-blue-500`} />;
  if (archiveExts.includes(ext)) return <FileArchive className={`${className} text-orange-500`} />;
  if (spreadsheetExts.includes(ext)) return <FileSpreadsheet className={`${className} text-green-600`} />;
  if (ext === 'pdf') return <FileText className={`${className} text-red-500`} />;
  if (['doc', 'docx', 'odt', 'rtf', 'txt'].includes(ext)) return <FileText className={`${className} text-blue-400`} />;
  return <File className={`${className} text-muted-foreground`} />;
}

// ── Table Row for File ────────────────────────────────────────────────────────

function FileTableRow({
  file,
  selected,
  onCheckboxClick,
  onPreview,
  onDelete,
  onMove,
  onRename,
}: {
  file: FileMetadata;
  selected: boolean;
  onCheckboxClick: (e: React.MouseEvent) => void;
  onPreview: (f: FileMetadata) => void;
  onDelete: (f: FileMetadata) => void;
  onMove: (fileId: string) => void;
  onRename: (f: FileMetadata) => void;
}) {
  const { data: isFav } = useIsFavorite(file.id);
  const addFav = useAddFavorite();
  const removeFav = useRemoveFavorite();

  return (
    <tr
      className={`group border-b border-border transition-colors hover:bg-accent/5 ${
        selected ? 'bg-primary/5' : ''
      }`}
    >
      <td className="w-10 px-3 py-3">
        <div onClick={onCheckboxClick} className="flex items-center justify-center">
          <Checkbox
            checked={selected}
            onCheckedChange={() => {}}
            className="cursor-pointer"
            aria-label={`Select ${file.name}`}
          />
        </div>
      </td>
      <td className="px-3 py-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <FileTypeIcon name={file.name} className="h-4 w-4" />
          </div>
          <span
            className="text-sm font-medium text-foreground truncate cursor-pointer hover:text-primary transition-colors"
            onClick={() => onPreview(file)}
            title={file.name}
          >
            {file.name}
          </span>
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">
        {formatDate(file.uploadedAt)}
      </td>
      <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">
        {getFileTypeLabel(file.name)}
      </td>
      <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">
        {formatBytes(file.size)}
      </td>
      <td className="px-3 py-3 w-28">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
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
              ? <StarOff className="h-3.5 w-3.5 text-amber-500" />
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
              <DropdownMenuItem onClick={() => onRename(file)}>
                <Pencil className="h-4 w-4 mr-2" /> Rename
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
      </td>
    </tr>
  );
}

// ── Table Row for Folder ──────────────────────────────────────────────────────

function FolderTableRow({
  folder,
  selected,
  onCheckboxClick,
  onOpen,
  onDelete,
  onRename,
  onMove,
}: {
  folder: FolderType;
  selected: boolean;
  onCheckboxClick: (e: React.MouseEvent) => void;
  onOpen: (id: string) => void;
  onDelete: (f: FolderType) => void;
  onRename: (f: FolderType) => void;
  onMove: (f: FolderType) => void;
}) {
  return (
    <tr
      className={`group border-b border-border transition-colors hover:bg-amber-50/40 dark:hover:bg-amber-900/10 ${
        selected ? 'bg-amber-50/60 dark:bg-amber-900/15' : ''
      }`}
    >
      <td className="w-10 px-3 py-3">
        <div onClick={onCheckboxClick} className="flex items-center justify-center">
          <Checkbox
            checked={selected}
            onCheckedChange={() => {}}
            className="cursor-pointer"
            aria-label={`Select ${folder.name}`}
          />
        </div>
      </td>
      <td className="px-3 py-3 min-w-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <Folder className="h-4 w-4 text-amber-500" />
          </div>
          <span
            className="text-sm font-semibold text-foreground truncate cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
            onClick={() => onOpen(folder.id)}
            title={folder.name}
          >
            {folder.name}
          </span>
        </div>
      </td>
      <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">
        {formatDate(folder.createdAt)}
      </td>
      <td className="px-3 py-3 text-sm whitespace-nowrap">
        <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium text-xs bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
          <Folder className="h-3 w-3" />
          Folder
        </span>
      </td>
      <td className="px-3 py-3 text-sm text-muted-foreground whitespace-nowrap">
        —
      </td>
      <td className="px-3 py-3 w-28">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpen(folder.id)}>
            <FolderOpen className="h-3.5 w-3.5 text-amber-500" />
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
                <Pencil className="h-4 w-4 mr-2" /> Rename
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
      </td>
    </tr>
  );
}

// ── FileCard (grid) ───────────────────────────────────────────────────────────

function FileCard({
  file,
  selected,
  onCheckboxClick,
  onPreview,
  onDelete,
  onMove,
  onRename,
}: {
  file: FileMetadata;
  selected: boolean;
  onCheckboxClick: (e: React.MouseEvent) => void;
  onPreview: (f: FileMetadata) => void;
  onDelete: (f: FileMetadata) => void;
  onMove: (fileId: string) => void;
  onRename: (f: FileMetadata) => void;
}) {
  const { data: isFav } = useIsFavorite(file.id);
  const addFav = useAddFavorite();
  const removeFav = useRemoveFavorite();

  return (
    <div className={`relative flex flex-col rounded-xl border border-border bg-card hover:bg-accent/5 group transition-colors p-3 gap-2 ${selected ? 'bg-primary/10 border-primary' : ''}`}>
      <div className="absolute top-2 left-2 z-10" onClick={onCheckboxClick}>
        <Checkbox
          checked={selected}
          onCheckedChange={() => {}}
          className="cursor-pointer opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
          aria-label={`Select ${file.name}`}
        />
      </div>
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileTypeIcon name={file.name} className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => (isFav ? removeFav.mutate(file.id) : addFav.mutate(file.id))}
          >
            {isFav
              ? <StarOff className="h-3 w-3 text-amber-500" />
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
              <DropdownMenuItem onClick={() => onRename(file)}>
                <Pencil className="h-4 w-4 mr-2" /> Rename
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

// ── FolderCard (grid) ─────────────────────────────────────────────────────────

function FolderCard({
  folder,
  selected,
  onCheckboxClick,
  onOpen,
  onDelete,
  onRename,
  onMove,
}: {
  folder: FolderType;
  selected: boolean;
  onCheckboxClick: (e: React.MouseEvent) => void;
  onOpen: (id: string) => void;
  onDelete: (f: FolderType) => void;
  onRename: (f: FolderType) => void;
  onMove: (f: FolderType) => void;
}) {
  return (
    <div className={`relative flex flex-col rounded-xl border border-border bg-card hover:bg-amber-50/40 dark:hover:bg-amber-900/10 group transition-colors p-3 gap-2 ${selected ? 'bg-amber-50/60 dark:bg-amber-900/15 border-amber-300 dark:border-amber-700' : ''}`}>
      <div className="absolute top-2 left-2 z-10" onClick={onCheckboxClick}>
        <Checkbox
          checked={selected}
          onCheckedChange={() => {}}
          className="cursor-pointer opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
          aria-label={`Select ${folder.name}`}
        />
      </div>
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
          <Folder className="h-5 w-5 text-amber-500" />
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onOpen(folder.id)}>
            <FolderOpen className="h-3 w-3 text-amber-500" />
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
                <Pencil className="h-4 w-4 mr-2" /> Rename
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
        <p className="text-sm font-semibold text-foreground truncate">{folder.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Folder</p>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function FileList({ currentFolderId, onFolderClick }: FileListProps) {
  const { data: allFiles = [], isLoading: filesLoading } = useListFiles();
  const { data: allFolders = [], isLoading: foldersLoading } = useListFolders();
  const { actor } = useActor();

  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  // Dialog state
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [previewFileData, setPreviewFileData] = useState<Uint8Array | null>(null);
  const [deleteFile, setDeleteFile] = useState<FileMetadata | null>(null);
  const [moveFileId, setMoveFileId] = useState<string | null>(null);
  const [renameFileTarget, setRenameFileTarget] = useState<FileMetadata | null>(null);
  const [renameFolderTarget, setRenameFolderTarget] = useState<FolderType | null>(null);
  const [moveFolderTarget, setMoveFolderTarget] = useState<FolderType | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<FolderType | null>(null);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);

  // Bulk rename state (single-item selection)
  const [bulkRenameFileOpen, setBulkRenameFileOpen] = useState(false);
  const [bulkRenameFolderOpen, setBulkRenameFolderOpen] = useState(false);
  const [bulkRenameTarget, setBulkRenameTarget] = useState<FileMetadata | FolderType | null>(null);

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

  // Filter by current folder
  const folderFiles = useMemo(() => {
    return allFiles.filter((f) =>
      currentFolderId
        ? f.folderId === currentFolderId
        : f.folderId == null || f.folderId === undefined
    );
  }, [allFiles, currentFolderId]);

  const folderFolders = useMemo(() => {
    return allFolders.filter((f) =>
      currentFolderId
        ? f.parentId === currentFolderId
        : f.parentId == null || f.parentId === undefined
    );
  }, [allFolders, currentFolderId]);

  // Apply search + filter + sort
  const processedFiles = useMemo(() => {
    let result = searchFiles(folderFiles);
    result = filterFiles(result);
    result = sortFiles(result);
    return result;
  }, [folderFiles, searchFiles, filterFiles, sortFiles]);

  // Pagination
  const { currentPage, itemsPerPage, setPage, setItemsPerPage, paginatedData } = usePagination<FileMetadata>();
  const paginatedFiles = paginatedData(processedFiles);

  // ── Selection helpers ──────────────────────────────────────────────────────

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allIds = [...folderFolders.map((f) => f.id), ...processedFiles.map((f) => f.id)];
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedFiles.has(id));

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (allSelected) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(allIds));
    }
  };

  // ── Preview ────────────────────────────────────────────────────────────────

  const handlePreview = async (file: FileMetadata) => {
    setPreviewFile(file);
    setPreviewFileData(null);
    if (actor) {
      try {
        const chunks: Uint8Array[] = [];
        let chunkIndex = 0;
        while (true) {
          const chunk = await actor.downloadFileChunk(file.id, BigInt(chunkIndex));
          if (!chunk) break;
          chunks.push(new Uint8Array(chunk));
          chunkIndex++;
          if (chunkIndex >= 100) break;
        }
        if (chunks.length > 0) {
          const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
          const merged = new Uint8Array(totalLength);
          let offset = 0;
          for (const c of chunks) { merged.set(c, offset); offset += c.length; }
          setPreviewFileData(merged);
        }
      } catch { /* ignore */ }
    }
  };

  // ── Delete file handler ────────────────────────────────────────────────────

  const deleteFileMutation = useDeleteFile();

  const handleDeleteConfirm = async (customRetentionPeriod: bigint | null) => {
    if (!deleteFile) return;
    try {
      await deleteFileMutation.mutateAsync({
        fileId: deleteFile.id,
        originalPath: '/',
        customRetentionPeriod,
      });
      toast.success('File moved to Trash');
      setDeleteFile(null);
      setSelectedFiles((prev) => {
        const next = new Set(prev);
        next.delete(deleteFile.id);
        return next;
      });
    } catch {
      toast.error('Failed to delete file');
    }
  };

  // ── Delete folder handler ──────────────────────────────────────────────────

  const deleteFolderMutation = useDeleteFolderToTrash();

  const handleDeleteFolderConfirm = async (folderId: string, retentionPeriodNs: bigint) => {
    const days = retentionPeriodNs / BigInt(24 * 60 * 60 * 1_000_000_000);
    await deleteFolderMutation.mutateAsync({ folderId, retentionDays: days });
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      next.delete(folderId);
      return next;
    });
  };

  // ── Bulk download ──────────────────────────────────────────────────────────

  const handleBulkDownload = async () => {
    if (!actor) return;
    const fileIds = [...selectedFiles].filter((id) => processedFiles.some((f) => f.id === id));
    for (const fileId of fileIds) {
      const file = processedFiles.find((f) => f.id === fileId);
      if (!file) continue;
      try {
        const chunks: Uint8Array[] = [];
        let chunkIndex = 0;
        while (true) {
          const chunk = await actor.downloadFileChunk(fileId, BigInt(chunkIndex));
          if (!chunk) break;
          chunks.push(new Uint8Array(chunk));
          chunkIndex++;
          if (chunkIndex >= 100) break;
        }
        if (chunks.length > 0) {
          const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
          const merged = new Uint8Array(totalLength);
          let offset = 0;
          for (const c of chunks) { merged.set(c, offset); offset += c.length; }
          const blob = new Blob([merged]);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch { /* ignore individual failures */ }
    }
    toast.success(`Downloaded ${fileIds.length} file(s)`);
  };

  // ── Bulk rename ────────────────────────────────────────────────────────────

  const handleBulkRename = () => {
    if (selectedFiles.size !== 1) {
      toast.error('Please select exactly one item to rename.');
      return;
    }
    const [selectedId] = [...selectedFiles];
    const folder = folderFolders.find((f) => f.id === selectedId);
    if (folder) {
      setBulkRenameTarget(folder);
      setBulkRenameFolderOpen(true);
      return;
    }
    const file = processedFiles.find((f) => f.id === selectedId);
    if (file) {
      setBulkRenameTarget(file);
      setBulkRenameFileOpen(true);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const isLoading = filesLoading || foldersLoading;

  return (
    <div className="space-y-4">
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

      {/* Bulk action bar */}
      {selectedFiles.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg flex-wrap">
          <span className="text-sm font-medium text-primary mr-2">
            {selectedFiles.size} selected
          </span>
          <Button variant="outline" size="sm" onClick={handleBulkDownload} className="h-8">
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkRename}
            disabled={selectedFiles.size !== 1}
            className="h-8"
            title={selectedFiles.size !== 1 ? 'Select exactly one item to rename' : 'Rename selected item'}
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Rename
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkMoveOpen(true)}
            className="h-8"
          >
            <Move className="mr-1.5 h-3.5 w-3.5" />
            Move
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info('Select individual files to delete them.')}
            className="h-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Delete
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFiles(new Set())}
            className="h-8 ml-auto"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : folderFolders.length === 0 && processedFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Folder className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">No files or folders here yet.</p>
        </div>
      ) : viewMode === 'list' ? (
        /* ── List view ── */
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                <th className="py-3 px-3 w-10">
                  <div onClick={handleSelectAll} className="flex items-center justify-center cursor-pointer">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={() => {}}
                      aria-label="Select all"
                    />
                  </div>
                </th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                <th className="py-3 px-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Size</th>
                <th className="py-3 px-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {folderFolders.map((folder) => (
                <FolderTableRow
                  key={folder.id}
                  folder={folder}
                  selected={selectedFiles.has(folder.id)}
                  onCheckboxClick={(e) => toggleSelect(folder.id, e)}
                  onOpen={(id) => onFolderClick?.(id)}
                  onRename={(f) => setRenameFolderTarget(f)}
                  onMove={(f) => setMoveFolderTarget(f)}
                  onDelete={(f) => setDeleteFolderTarget(f)}
                />
              ))}
              {paginatedFiles.map((file: FileMetadata) => (
                <FileTableRow
                  key={file.id}
                  file={file}
                  selected={selectedFiles.has(file.id)}
                  onCheckboxClick={(e) => toggleSelect(file.id, e)}
                  onPreview={handlePreview}
                  onDelete={(f) => setDeleteFile(f)}
                  onMove={(id) => setMoveFileId(id)}
                  onRename={(f) => setRenameFileTarget(f)}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Grid view ── */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {folderFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              selected={selectedFiles.has(folder.id)}
              onCheckboxClick={(e) => toggleSelect(folder.id, e)}
              onOpen={(id) => onFolderClick?.(id)}
              onRename={(f) => setRenameFolderTarget(f)}
              onMove={(f) => setMoveFolderTarget(f)}
              onDelete={(f) => setDeleteFolderTarget(f)}
            />
          ))}
          {paginatedFiles.map((file: FileMetadata) => (
            <FileCard
              key={file.id}
              file={file}
              selected={selectedFiles.has(file.id)}
              onCheckboxClick={(e) => toggleSelect(file.id, e)}
              onPreview={handlePreview}
              onDelete={(f) => setDeleteFile(f)}
              onMove={(id) => setMoveFileId(id)}
              onRename={(f) => setRenameFileTarget(f)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {processedFiles.length > itemsPerPage && (
        <PaginationControls
          currentPage={currentPage}
          totalItems={processedFiles.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}

      {/* ── Dialogs ── */}

      {/* File Preview */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          fileData={previewFileData}
          onClose={() => { setPreviewFile(null); setPreviewFileData(null); }}
        />
      )}

      {/* Delete File */}
      {deleteFile && (
        <DeleteFileDialog
          open={!!deleteFile}
          onOpenChange={(open) => { if (!open) setDeleteFile(null); }}
          file={deleteFile}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {/* Move File */}
      {moveFileId && (
        <MoveToFolderDialog
          open={!!moveFileId}
          onOpenChange={(open) => { if (!open) setMoveFileId(null); }}
          fileIds={[moveFileId]}
        />
      )}

      {/* Rename File (row action) */}
      {renameFileTarget && (
        <RenameFileDialog
          open={!!renameFileTarget}
          onOpenChange={(open) => { if (!open) setRenameFileTarget(null); }}
          fileId={renameFileTarget.id}
          currentName={renameFileTarget.name}
          onRenamed={() => setRenameFileTarget(null)}
        />
      )}

      {/* Rename Folder (row action) */}
      {renameFolderTarget && (
        <RenameFolderDialog
          open={!!renameFolderTarget}
          onOpenChange={(open) => { if (!open) setRenameFolderTarget(null); }}
          folder={renameFolderTarget}
        />
      )}

      {/* Move Folder */}
      {moveFolderTarget && (
        <MoveFolderDialog
          open={!!moveFolderTarget}
          onOpenChange={(open) => { if (!open) setMoveFolderTarget(null); }}
          folder={moveFolderTarget}
        />
      )}

      {/* Delete Folder */}
      {deleteFolderTarget && (
        <DeleteFolderToTrashDialog
          open={!!deleteFolderTarget}
          onOpenChange={(open) => { if (!open) setDeleteFolderTarget(null); }}
          folder={deleteFolderTarget}
          onConfirm={handleDeleteFolderConfirm}
        />
      )}

      {/* Bulk Move */}
      {bulkMoveOpen && (
        <MoveToFolderDialog
          open={bulkMoveOpen}
          onOpenChange={(open) => {
            setBulkMoveOpen(open);
            if (!open) setSelectedFiles(new Set());
          }}
          fileIds={[...selectedFiles].filter((id) => processedFiles.some((f) => f.id === id))}
        />
      )}

      {/* Bulk Rename — File */}
      {bulkRenameFileOpen && bulkRenameTarget && 'uploadedAt' in bulkRenameTarget && (
        <RenameFileDialog
          open={bulkRenameFileOpen}
          onOpenChange={(open) => {
            setBulkRenameFileOpen(open);
            if (!open) setBulkRenameTarget(null);
          }}
          fileId={(bulkRenameTarget as FileMetadata).id}
          currentName={(bulkRenameTarget as FileMetadata).name}
          onRenamed={() => {
            setBulkRenameFileOpen(false);
            setBulkRenameTarget(null);
            setSelectedFiles(new Set());
          }}
        />
      )}

      {/* Bulk Rename — Folder */}
      {bulkRenameFolderOpen && bulkRenameTarget && 'createdAt' in bulkRenameTarget && (
        <RenameFolderDialog
          open={bulkRenameFolderOpen}
          onOpenChange={(open) => {
            setBulkRenameFolderOpen(open);
            if (!open) setBulkRenameTarget(null);
          }}
          folder={bulkRenameTarget as FolderType}
        />
      )}
    </div>
  );
}
