import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Download,
  Edit,
  Eye,
  File,
  Folder as FolderIcon,
  Lock,
  MoreVertical,
  Move,
  Share2,
  Star,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import React, { useState, useCallback } from "react";
import { toast } from "sonner";
import type { FileMetadata, Folder, FolderProtection } from "../backend";
import { useFileFilters } from "../hooks/useFileFilters";
import { useFileSearch } from "../hooks/useFileSearch";
import { useFileSorting } from "../hooks/useFileSorting";
import { usePagination } from "../hooks/usePagination";
import {
  useAddFavorite,
  useDeleteFile,
  useDownloadFile,
  useGetFavorites,
  useGetFolderProtectionStatus,
  useListFiles,
  useListFolders,
  useRemoveFavorite,
} from "../hooks/useQueries";
import BulkDeleteDialog from "./BulkDeleteDialog";
import BulkShareDialog from "./BulkShareDialog";
import DeleteFileDialog from "./DeleteFileDialog";
import DeleteFolderToTrashDialog from "./DeleteFolderToTrashDialog";
import FilePreview from "./FilePreview";
import FileToolbar from "./FileToolbar";
import FolderActionPasswordPrompt from "./FolderActionPasswordPrompt";
import FolderPasswordPrompt from "./FolderPasswordPrompt";
import FolderProtectionModal from "./FolderProtectionModal";
import MoveFolderDialog from "./MoveFolderDialog";
import MoveToFolderDialog from "./MoveToFolderDialog";
import PaginationControls from "./PaginationControls";
import RenameFileDialog from "./RenameFileDialog";
import RenameFolderDialog from "./RenameFolderDialog";

interface FileListProps {
  currentFolderId?: string | null;
  onFolderClick?: (folderId: string) => void;
}

type PendingActionType = "rename" | "move" | "delete" | null;

function formatFileSize(bytes: bigint | number): string {
  const size = typeof bytes === "bigint" ? Number(bytes) : bytes;
  if (size === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(size) / Math.log(k));
  return `${Number.parseFloat((size / k ** i).toFixed(1))} ${sizes[i]}`;
}

function getFileExtension(name: string): string {
  return name.split(".").pop()?.toUpperCase() || "FILE";
}

export default function FileList({
  currentFolderId,
  onFolderClick,
}: FileListProps) {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);

  // File action states
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [previewFileData, setPreviewFileData] = useState<Uint8Array | null>(
    null,
  );
  const [deleteFileTarget, setDeleteFileTarget] = useState<FileMetadata | null>(
    null,
  );
  const [renameFileTarget, setRenameFileTarget] = useState<FileMetadata | null>(
    null,
  );
  const [moveFileTarget, setMoveFileTarget] = useState<FileMetadata | null>(
    null,
  );

  // Folder action states
  const [renameFolderTarget, setRenameFolderTarget] = useState<Folder | null>(
    null,
  );
  const [moveFolderTarget, setMoveFolderTarget] = useState<Folder | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<Folder | null>(
    null,
  );
  const [protectionFolderTarget, setProtectionFolderTarget] =
    useState<Folder | null>(null);
  const [protectionData, setProtectionData] = useState<
    FolderProtection | null | undefined
  >(null);
  const [passwordPromptFolder, setPasswordPromptFolder] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Password gating for folder actions (Rename / Move / Delete)
  const [pendingActionType, setPendingActionType] =
    useState<PendingActionType>(null);
  const [pendingFolder, setPendingFolder] = useState<Folder | null>(null);
  const [showFolderActionPassword, setShowFolderActionPassword] =
    useState(false);

  // Bulk action states
  const [showBulkShare, setShowBulkShare] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [showBulkMove, setShowBulkMove] = useState(false);

  // Folder protection status cache: folderId -> isProtected
  const [folderProtectionCache, setFolderProtectionCache] = useState<
    Record<string, boolean>
  >({});

  const { data: folders = [], isLoading: foldersLoading } = useListFolders();
  const { data: files = [], isLoading: filesLoading } = useListFiles();
  const { data: favorites = [] } = useGetFavorites();
  const downloadFile = useDownloadFile();
  const addFavoriteMutation = useAddFavorite();
  const removeFavoriteMutation = useRemoveFavorite();
  const deleteFileMutation = useDeleteFile();

  const favoriteIds = new Set(favorites.map((f) => f.fileId));

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
  const pagination = usePagination<FileMetadata>();

  // Filter folders/files by current folder
  const currentFolders = folders.filter((f) =>
    currentFolderId ? f.parentId === currentFolderId : !f.parentId,
  );
  const currentFiles = files.filter((f) =>
    currentFolderId ? f.folderId === currentFolderId : !f.folderId,
  );

  const processedFiles: FileMetadata[] = sortFiles(
    filterFiles(searchFiles(currentFiles)),
  );
  const paginatedFiles: FileMetadata[] = pagination.paginatedData(
    processedFiles,
  ) as FileMetadata[];

  // ── Protection cache helpers ───────────────────────────────────────────────

  const handleFolderProtectionLoaded = useCallback(
    (folderId: string, protection: FolderProtection | null | undefined) => {
      const isProtected = !!(protection?.hashedPassword && protection.isLocked);
      setFolderProtectionCache((prev) => {
        if (prev[folderId] === isProtected) return prev;
        return { ...prev, [folderId]: isProtected };
      });
    },
    [],
  );

  const isFolderProtected = useCallback(
    (folderId: string): boolean => folderProtectionCache[folderId] === true,
    [folderProtectionCache],
  );

  // ── Password-gated folder actions ──────────────────────────────────────────

  const openFolderActionDialog = useCallback(
    (folder: Folder, action: PendingActionType) => {
      if (action === "rename") setRenameFolderTarget(folder);
      else if (action === "move") setMoveFolderTarget(folder);
      else if (action === "delete") setDeleteFolderTarget(folder);
    },
    [],
  );

  const requestFolderAction = useCallback(
    (folder: Folder, action: PendingActionType) => {
      if (isFolderProtected(folder.id)) {
        setPendingFolder(folder);
        setPendingActionType(action);
        setShowFolderActionPassword(true);
      } else {
        openFolderActionDialog(folder, action);
      }
    },
    [isFolderProtected, openFolderActionDialog],
  );

  const handleFolderActionPasswordConfirmed = useCallback(() => {
    setShowFolderActionPassword(false);
    if (pendingFolder && pendingActionType) {
      openFolderActionDialog(pendingFolder, pendingActionType);
    }
    setPendingFolder(null);
    setPendingActionType(null);
  }, [pendingFolder, pendingActionType, openFolderActionDialog]);

  const handleFolderActionPasswordDismissed = useCallback(() => {
    setShowFolderActionPassword(false);
    setPendingFolder(null);
    setPendingActionType(null);
  }, []);

  // ── Folder click (open / unlock) ───────────────────────────────────────────

  const handleFolderClick = useCallback(
    (folder: Folder) => {
      if (isFolderProtected(folder.id)) {
        setPasswordPromptFolder({ id: folder.id, name: folder.name });
      } else {
        onFolderClick?.(folder.id);
      }
    },
    [isFolderProtected, onFolderClick],
  );

  // ── File preview ───────────────────────────────────────────────────────────

  const handlePreviewFile = useCallback(
    async (file: FileMetadata) => {
      setPreviewFile(file);
      setPreviewFileData(null);
      try {
        const result = await downloadFile.mutateAsync(file.id);
        setPreviewFileData(result.data);
      } catch {
        // preview will show loading/error state
      }
    },
    [downloadFile],
  );

  // ── Favorites ──────────────────────────────────────────────────────────────

  const handleToggleFavorite = async (fileId: string, isFav: boolean) => {
    try {
      if (isFav) {
        await removeFavoriteMutation.mutateAsync(fileId);
        toast.success("Removed from favorites");
      } else {
        await addFavoriteMutation.mutateAsync(fileId);
        toast.success("Added to favorites");
      }
    } catch {
      toast.error("Failed to update favorites");
    }
  };

  // ── Bulk download ──────────────────────────────────────────────────────────

  const handleBulkDownload = useCallback(async () => {
    for (const fileId of selectedFiles) {
      const file = files.find((f) => f.id === fileId);
      if (!file) continue;
      try {
        const result = await downloadFile.mutateAsync(fileId);
        if (result?.data) {
          const blob = new Blob([result.data]);
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.name;
          a.click();
          URL.revokeObjectURL(url);
        }
      } catch {
        // skip failed downloads
      }
    }
  }, [selectedFiles, files, downloadFile]);

  // ── Selection helpers ──────────────────────────────────────────────────────

  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId],
    );
  };

  const toggleFolderSelection = (folderId: string) => {
    setSelectedFolders((prev) =>
      prev.includes(folderId)
        ? prev.filter((id) => id !== folderId)
        : [...prev, folderId],
    );
  };

  const clearSelection = () => {
    setSelectedFiles([]);
    setSelectedFolders([]);
  };

  const totalSelected = selectedFiles.length + selectedFolders.length;

  // ── Render ─────────────────────────────────────────────────────────────────

  const isLoading = foldersLoading || filesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const hasContent = currentFolders.length > 0 || processedFiles.length > 0;

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
      {totalSelected > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20 flex-wrap">
          <span className="text-sm font-medium text-primary">
            {totalSelected} selected
          </span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={handleBulkDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBulkShare(true)}
          >
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBulkMove(true)}
          >
            <Move className="h-4 w-4 mr-1" />
            Move
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBulkDelete(true)}
            className="text-destructive border-destructive/40 hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!hasContent && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FolderIcon className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">No files or folders</p>
          <p className="text-sm">
            Upload files or create a folder to get started
          </p>
        </div>
      )}

      {/* Folders */}
      {currentFolders.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
            Folders
          </h3>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {currentFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  isSelected={selectedFolders.includes(folder.id)}
                  onSelect={() => toggleFolderSelection(folder.id)}
                  onClick={() => handleFolderClick(folder)}
                  onRename={() => requestFolderAction(folder, "rename")}
                  onMove={() => requestFolderAction(folder, "move")}
                  onDelete={() => requestFolderAction(folder, "delete")}
                  onProtection={(prot) => {
                    setProtectionFolderTarget(folder);
                    setProtectionData(prot);
                  }}
                  onProtectionLoaded={(prot) =>
                    handleFolderProtectionLoaded(folder.id, prot)
                  }
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {currentFolders.map((folder) => (
                <FolderRow
                  key={folder.id}
                  folder={folder}
                  isSelected={selectedFolders.includes(folder.id)}
                  onSelect={() => toggleFolderSelection(folder.id)}
                  onClick={() => handleFolderClick(folder)}
                  onRename={() => requestFolderAction(folder, "rename")}
                  onMove={() => requestFolderAction(folder, "move")}
                  onDelete={() => requestFolderAction(folder, "delete")}
                  onProtection={(prot) => {
                    setProtectionFolderTarget(folder);
                    setProtectionData(prot);
                  }}
                  onProtectionLoaded={(prot) =>
                    handleFolderProtectionLoaded(folder.id, prot)
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Files */}
      {processedFiles.length > 0 && (
        <div className="space-y-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
            Files
          </h3>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {paginatedFiles.map((file: FileMetadata) => (
                <FileCard
                  key={file.id}
                  file={file}
                  isFavorite={favoriteIds.has(file.id)}
                  isSelected={selectedFiles.includes(file.id)}
                  onSelect={() => toggleFileSelection(file.id)}
                  onPreview={() => handlePreviewFile(file)}
                  onRename={() => setRenameFileTarget(file)}
                  onMove={() => setMoveFileTarget(file)}
                  onDelete={() => setDeleteFileTarget(file)}
                  onToggleFavorite={() =>
                    handleToggleFavorite(file.id, favoriteIds.has(file.id))
                  }
                  onDownload={async () => {
                    try {
                      const result = await downloadFile.mutateAsync(file.id);
                      if (result?.data) {
                        const blob = new Blob([result.data]);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = file.name;
                        a.click();
                        URL.revokeObjectURL(url);
                      }
                    } catch {
                      /* ignore */
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {paginatedFiles.map((file: FileMetadata) => (
                <FileRow
                  key={file.id}
                  file={file}
                  isFavorite={favoriteIds.has(file.id)}
                  isSelected={selectedFiles.includes(file.id)}
                  onSelect={() => toggleFileSelection(file.id)}
                  onPreview={() => handlePreviewFile(file)}
                  onRename={() => setRenameFileTarget(file)}
                  onMove={() => setMoveFileTarget(file)}
                  onDelete={() => setDeleteFileTarget(file)}
                  onToggleFavorite={() =>
                    handleToggleFavorite(file.id, favoriteIds.has(file.id))
                  }
                  onDownload={async () => {
                    try {
                      const result = await downloadFile.mutateAsync(file.id);
                      if (result?.data) {
                        const blob = new Blob([result.data]);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = file.name;
                        a.click();
                        URL.revokeObjectURL(url);
                      }
                    } catch {
                      /* ignore */
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {processedFiles.length > 0 && (
        <PaginationControls
          currentPage={pagination.currentPage}
          totalItems={processedFiles.length}
          itemsPerPage={pagination.itemsPerPage}
          onPageChange={pagination.setPage}
          onItemsPerPageChange={pagination.setItemsPerPage}
        />
      )}

      {/* ── Dialogs ── */}

      {/* Password prompt for opening a locked folder */}
      {passwordPromptFolder && (
        <FolderPasswordPrompt
          open={!!passwordPromptFolder}
          onOpenChange={(open) => {
            if (!open) setPasswordPromptFolder(null);
          }}
          folderId={passwordPromptFolder.id}
          folderName={passwordPromptFolder.name}
          onSuccess={() => {
            const id = passwordPromptFolder.id;
            setPasswordPromptFolder(null);
            onFolderClick?.(id);
          }}
        />
      )}

      {/* Single FolderActionPasswordPrompt for Rename / Move / Delete */}
      {showFolderActionPassword && pendingFolder && (
        <FolderActionPasswordPrompt
          folderId={pendingFolder.id}
          folderName={pendingFolder.name}
          actionLabel={
            pendingActionType === "rename"
              ? "Rename"
              : pendingActionType === "move"
                ? "Move"
                : "Delete"
          }
          isOpen={showFolderActionPassword}
          onSuccess={handleFolderActionPasswordConfirmed}
          onClose={handleFolderActionPasswordDismissed}
        />
      )}

      {/* File preview */}
      {previewFile && (
        <FilePreview
          file={previewFile}
          fileData={previewFileData}
          onClose={() => {
            setPreviewFile(null);
            setPreviewFileData(null);
          }}
        />
      )}

      {/* Rename file */}
      {renameFileTarget && (
        <RenameFileDialog
          open={!!renameFileTarget}
          onOpenChange={(open) => {
            if (!open) setRenameFileTarget(null);
          }}
          fileId={renameFileTarget.id}
          currentName={renameFileTarget.name}
        />
      )}

      {/* Move file */}
      {moveFileTarget && (
        <MoveToFolderDialog
          open={!!moveFileTarget}
          onOpenChange={(open) => {
            if (!open) setMoveFileTarget(null);
          }}
          fileIds={[moveFileTarget.id]}
        />
      )}

      {/* Delete file */}
      {deleteFileTarget && (
        <DeleteFileDialog
          open={!!deleteFileTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteFileTarget(null);
          }}
          file={deleteFileTarget}
          onConfirm={async (customRetentionPeriod) => {
            try {
              await deleteFileMutation.mutateAsync({
                fileId: deleteFileTarget.id,
                originalPath: deleteFileTarget.folderId
                  ? `/folder/${deleteFileTarget.folderId}`
                  : "/",
                customRetentionPeriod: customRetentionPeriod ?? null,
              });
              toast.success(`"${deleteFileTarget.name}" moved to trash`);
              setDeleteFileTarget(null);
            } catch {
              toast.error("Failed to delete file");
            }
          }}
        />
      )}

      {/* Rename folder */}
      {renameFolderTarget && (
        <RenameFolderDialog
          open={!!renameFolderTarget}
          onOpenChange={(open) => {
            if (!open) setRenameFolderTarget(null);
          }}
          folder={renameFolderTarget}
        />
      )}

      {/* Move folder */}
      {moveFolderTarget && (
        <MoveFolderDialog
          open={!!moveFolderTarget}
          onOpenChange={(open) => {
            if (!open) setMoveFolderTarget(null);
          }}
          folder={moveFolderTarget}
        />
      )}

      {/* Delete folder */}
      {deleteFolderTarget && (
        <DeleteFolderToTrashDialog
          open={!!deleteFolderTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteFolderTarget(null);
          }}
          folder={deleteFolderTarget}
          onConfirm={async (_folderId, _retentionPeriodNs) => {
            // handled inside the dialog component
          }}
        />
      )}

      {/* Folder protection modal */}
      {protectionFolderTarget && (
        <FolderProtectionModal
          open={!!protectionFolderTarget}
          onOpenChange={(open) => {
            if (!open) setProtectionFolderTarget(null);
          }}
          folder={protectionFolderTarget}
          protection={protectionData}
        />
      )}

      {/* Bulk share */}
      <BulkShareDialog
        isOpen={showBulkShare}
        onClose={() => setShowBulkShare(false)}
        selectedFileIds={selectedFiles}
        onSuccess={() => {
          setShowBulkShare(false);
          clearSelection();
        }}
      />

      {/* Bulk delete */}
      <BulkDeleteDialog
        fileCount={selectedFiles.length}
        isOpen={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={async (retentionDays) => {
          for (const fileId of selectedFiles) {
            const file = files.find((f) => f.id === fileId);
            if (file) {
              try {
                await deleteFileMutation.mutateAsync({
                  fileId,
                  originalPath: file.folderId
                    ? `/folder/${file.folderId}`
                    : "/",
                  customRetentionPeriod:
                    BigInt(retentionDays * 24 * 60 * 60) *
                    BigInt(1_000_000_000),
                });
              } catch {
                toast.error(`Failed to delete ${file.name}`);
              }
            }
          }
          toast.success(`${selectedFiles.length} file(s) moved to trash`);
          clearSelection();
          setShowBulkDelete(false);
        }}
        isLoading={deleteFileMutation.isPending}
      />

      {/* Bulk move */}
      {showBulkMove && (
        <MoveToFolderDialog
          open={showBulkMove}
          onOpenChange={(open) => {
            if (!open) {
              setShowBulkMove(false);
              clearSelection();
            }
          }}
          fileIds={selectedFiles}
        />
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface FolderRowProps {
  folder: Folder;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onProtection: (prot: FolderProtection | null | undefined) => void;
  onProtectionLoaded: (prot: FolderProtection | null | undefined) => void;
}

function FolderRow({
  folder,
  isSelected,
  onSelect,
  onClick,
  onRename,
  onMove,
  onDelete,
  onProtection,
  onProtectionLoaded,
}: FolderRowProps) {
  const { data: protection } = useGetFolderProtectionStatus(folder.id);

  React.useEffect(() => {
    onProtectionLoaded(protection);
  }, [protection, onProtectionLoaded]);

  const isProtected = !!protection?.hashedPassword;
  const isLocked = protection?.isLocked ?? false;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer group transition-colors hover:bg-muted/50",
        isSelected && "bg-primary/10",
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelect}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0"
      />
      <FolderIcon className="h-5 w-5 text-amber-500 shrink-0" />
      <span className="flex-1 text-sm font-medium truncate">{folder.name}</span>

      {/* Right-side actions: lock icon BEFORE three-dot menu */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isProtected && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onProtection(protection);
            }}
            title={isLocked ? "Folder is locked" : "Folder is unlocked"}
          >
            {isLocked ? (
              <Lock className="h-4 w-4 text-amber-500" />
            ) : (
              <Unlock className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRename();
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onMove();
              }}
            >
              <Move className="h-4 w-4 mr-2" />
              Move
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onProtection(protection);
              }}
            >
              <Lock className="h-4 w-4 mr-2" />
              Protection Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Use type alias instead of empty interface to avoid @typescript-eslint/no-empty-object-type
type FolderCardProps = FolderRowProps;

function FolderCard({
  folder,
  isSelected,
  onSelect,
  onClick,
  onRename,
  onMove,
  onDelete,
  onProtection,
  onProtectionLoaded,
}: FolderCardProps) {
  const { data: protection } = useGetFolderProtectionStatus(folder.id);

  React.useEffect(() => {
    onProtectionLoaded(protection);
  }, [protection, onProtectionLoaded]);

  const isProtected = !!protection?.hashedPassword;
  const isLocked = protection?.isLocked ?? false;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center gap-2 p-4 rounded-xl border border-border cursor-pointer group transition-colors hover:bg-muted/50",
        isSelected && "bg-primary/10 border-primary/30",
      )}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelect}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-2 left-2"
      />
      <FolderIcon className="h-12 w-12 text-amber-500" />
      <span className="text-sm font-medium truncate w-full text-center">
        {folder.name}
      </span>

      {/* Right-side actions: lock icon BEFORE three-dot menu */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {isProtected && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onProtection(protection);
            }}
            title={isLocked ? "Folder is locked" : "Folder is unlocked"}
          >
            {isLocked ? (
              <Lock className="h-3 w-3 text-amber-500" />
            ) : (
              <Unlock className="h-3 w-3 text-muted-foreground" />
            )}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onRename();
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onMove();
              }}
            >
              <Move className="h-4 w-4 mr-2" />
              Move
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onProtection(protection);
              }}
            >
              <Lock className="h-4 w-4 mr-2" />
              Protection Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

interface FileRowProps {
  file: FileMetadata;
  isFavorite: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onDownload: () => void;
}

function FileRow({
  file,
  isFavorite,
  isSelected,
  onSelect,
  onPreview,
  onRename,
  onMove,
  onDelete,
  onToggleFavorite,
  onDownload,
}: FileRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg group transition-colors hover:bg-muted/50",
        isSelected && "bg-primary/10",
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelect}
        className="shrink-0"
      />
      <File className="h-5 w-5 text-muted-foreground shrink-0" />
      <span className="flex-1 text-sm truncate">{file.name}</span>
      <span className="text-xs text-muted-foreground hidden sm:block w-16 text-right">
        {formatFileSize(file.size)}
      </span>
      <Badge variant="outline" className="text-xs hidden md:flex">
        {getFileExtension(file.name)}
      </Badge>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleFavorite}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star
            className={cn(
              "h-4 w-4",
              isFavorite
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground",
            )}
          />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onPreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRename}>
              <Edit className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMove}>
              <Move className="h-4 w-4 mr-2" />
              Move
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// Use type alias instead of empty interface to avoid @typescript-eslint/no-empty-object-type
type FileCardProps = FileRowProps;

function FileCard({
  file,
  isFavorite,
  isSelected,
  onSelect,
  onPreview,
  onRename,
  onMove,
  onDelete,
  onToggleFavorite,
  onDownload,
}: FileCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 p-4 rounded-xl border border-border group transition-colors hover:bg-muted/50",
        isSelected && "bg-primary/10 border-primary/30",
      )}
    >
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelect}
        onClick={(e) => e.stopPropagation()}
        className="absolute top-2 left-2"
      />
      <div className="flex justify-center py-2">
        <File className="h-10 w-10 text-muted-foreground" />
      </div>
      <span className="text-sm font-medium truncate text-center">
        {file.name}
      </span>
      <span className="text-xs text-muted-foreground text-center">
        {formatFileSize(file.size)}
      </span>
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onToggleFavorite}
        >
          <Star
            className={cn(
              "h-3 w-3",
              isFavorite
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground",
            )}
          />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onPreview}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRename}>
              <Edit className="h-4 w-4 mr-2" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMove}>
              <Move className="h-4 w-4 mr-2" />
              Move
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
