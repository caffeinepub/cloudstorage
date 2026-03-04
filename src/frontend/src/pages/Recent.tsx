import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  Copy,
  Download,
  Eye,
  FileIcon,
  MoreVertical,
  Star,
  Trash2,
  X,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { FileMetadata } from "../backend";
import DeleteFileDialog from "../components/DeleteFileDialog";
import FilePreview from "../components/FilePreview";
import FileToolbar from "../components/FileToolbar";
import PaginationControls from "../components/PaginationControls";
import { useRecentUploads } from "../contexts/RecentUploadsContext";
import { useActor } from "../hooks/useActor";
import { useFileFilters } from "../hooks/useFileFilters";
import { useFileSearch } from "../hooks/useFileSearch";
import { useFileSorting } from "../hooks/useFileSorting";
import { usePagination } from "../hooks/usePagination";
import {
  useAddFavorite,
  useDeleteFile,
  useIsFavorite,
  useRemoveFavorite,
} from "../hooks/useQueries";

export default function Recent() {
  const { recentUploads } = useRecentUploads();
  const { actor } = useActor();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();
  const deleteFileMutation = useDeleteFile();

  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [previewFileData, setPreviewFileData] = useState<Uint8Array | null>(
    null,
  );
  const [deleteFileData, setDeleteFileData] = useState<FileMetadata | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);

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
  const { resetPage: recentResetPage } = pagination;
  // biome-ignore lint/correctness/useExhaustiveDependencies: searchQuery/filters/sortBy/sortOrder trigger the reset intentionally
  useEffect(() => {
    recentResetPage();
  }, [searchQuery, filters, sortBy, sortOrder, recentResetPage]);

  const paginatedFiles = pagination.paginatedData(processedFiles);

  // Selection helpers
  const allVisibleSelected =
    paginatedFiles.length > 0 &&
    paginatedFiles.every((f) => selectedIds.has(f.id));
  const someVisibleSelected = paginatedFiles.some((f) => selectedIds.has(f.id));
  const totalSelected = selectedIds.size;

  const handleMasterCheckbox = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const f of paginatedFiles) next.delete(f.id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const f of paginatedFiles) next.add(f.id);
        return next;
      });
    }
  };

  const toggleSelection = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handlePreview = async (file: FileMetadata) => {
    setPreviewFile(file);
    setPreviewFileData(null);
    if (actor) {
      try {
        const chunks: Uint8Array[] = [];
        let chunkIndex = 0;
        while (true) {
          const chunk = await actor.downloadFileChunk(
            file.id,
            BigInt(chunkIndex),
          );
          if (!chunk) break;
          chunks.push(new Uint8Array(chunk));
          chunkIndex++;
          if (chunkIndex >= 100) break;
        }
        if (chunks.length > 0) {
          const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
          const merged = new Uint8Array(totalLength);
          let offset = 0;
          for (const c of chunks) {
            merged.set(c, offset);
            offset += c.length;
          }
          setPreviewFileData(merged);
        }
      } catch {
        /* ignore */
      }
    }
  };

  const handleDownload = async (file: FileMetadata) => {
    if (!actor) return;
    try {
      const chunks: Uint8Array[] = [];
      let chunkIndex = 0;
      while (true) {
        const chunk = await actor.downloadFileChunk(
          file.id,
          BigInt(chunkIndex),
        );
        if (!chunk) break;
        chunks.push(new Uint8Array(chunk));
        chunkIndex++;
        if (chunkIndex >= 100) break;
      }
      if (chunks.length === 0) {
        toast.error("No data found for this file");
        return;
      }
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const merged = new Uint8Array(totalLength);
      let offset = 0;
      for (const c of chunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      const blob = new Blob([merged.buffer as ArrayBuffer]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloading ${file.name}...`);
    } catch {
      toast.error("Download failed");
    }
  };

  const handleToggleFavorite = async (fileId: string, isFav: boolean) => {
    try {
      if (isFav) {
        await removeFavorite.mutateAsync(fileId);
        toast.success("Removed from favorites");
      } else {
        await addFavorite.mutateAsync(fileId);
        toast.success("Added to favorites");
      }
    } catch {
      toast.error("Failed to update favorites");
    }
  };

  const handleDeleteFile = async (customRetentionPeriod: bigint | null) => {
    if (!deleteFileData) return;
    try {
      await deleteFileMutation.mutateAsync({
        fileId: deleteFileData.id,
        originalPath: "/",
        customRetentionPeriod,
      });
      toast.success("File moved to Trash");
      setDeleteFileData(null);
      clearSelection();
    } catch {
      toast.error("Failed to delete file");
    }
  };

  const handleBulkDownload = async () => {
    setBulkDownloading(true);
    try {
      const toDownload = processedFiles.filter((f) => selectedIds.has(f.id));
      for (const file of toDownload) {
        await handleDownload(file);
      }
      toast.success(`Downloaded ${toDownload.length} file(s)`);
      clearSelection();
    } catch {
      toast.error("Bulk download failed");
    } finally {
      setBulkDownloading(false);
    }
  };

  const handleBulkDelete = () => {
    const toDelete = processedFiles.filter((f) => selectedIds.has(f.id));
    if (toDelete.length > 0) {
      setDeleteFileData(toDelete[0]);
    }
  };

  const handleBulkCopy = () => {
    const names = processedFiles
      .filter((f) => selectedIds.has(f.id))
      .map((f) => f.name)
      .join(", ");
    navigator.clipboard
      .writeText(names)
      .then(() => {
        toast.success("File names copied to clipboard");
      })
      .catch(() => {
        toast.info(`Selected: ${names}`);
      });
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

        {/* Selection header */}
        {processedFiles.length > 0 && (
          <div className="flex items-center gap-3 mt-4 mb-2">
            <Checkbox
              checked={allVisibleSelected}
              onCheckedChange={handleMasterCheckbox}
              aria-label="Select all"
              className="cursor-pointer"
              ref={(el) => {
                if (el) {
                  const input = el as unknown as HTMLInputElement;
                  if (input)
                    input.indeterminate =
                      someVisibleSelected && !allVisibleSelected;
                }
              }}
            />
            <span className="text-sm text-muted-foreground">
              {totalSelected > 0 ? (
                <span className="text-foreground font-medium">
                  {totalSelected} item{totalSelected !== 1 ? "s" : ""} selected
                </span>
              ) : (
                <span>Select all</span>
              )}
            </span>
            {totalSelected > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-7 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        )}

        {/* Bulk action bar */}
        {totalSelected > 0 && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg flex-wrap mb-4">
            <span className="text-sm font-medium text-primary mr-2">
              {totalSelected} selected
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDownload}
              disabled={bulkDownloading}
              className="h-8"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              {bulkDownloading ? "Downloading..." : "Download"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkCopy}
              className="h-8"
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              Copy Names
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDelete}
              className="h-8 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-8 ml-auto"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Cancel
            </Button>
          </div>
        )}

        {processedFiles.length === 0 ? (
          <Card className="p-6 mt-4">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileIcon className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No files match your filters
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your search or filters
              </p>
              <Button variant="outline" onClick={clearAllFilters}>
                Clear Filters
              </Button>
            </div>
          </Card>
        ) : viewMode === "grid" ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
              {paginatedFiles.map((file) => (
                <RecentFileCard
                  key={file.id}
                  file={file}
                  selected={selectedIds.has(file.id)}
                  onCheckboxClick={(e) => toggleSelection(file.id, e)}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  onDelete={setDeleteFileData}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
            <div className="mt-4">
              <PaginationControls
                totalItems={processedFiles.length}
                currentPage={pagination.currentPage}
                itemsPerPage={pagination.itemsPerPage}
                onPageChange={pagination.setPage}
                onItemsPerPageChange={pagination.setItemsPerPage}
              />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2 mt-4">
              {paginatedFiles.map((file) => (
                <RecentFileRow
                  key={file.id}
                  file={file}
                  selected={selectedIds.has(file.id)}
                  onCheckboxClick={(e) => toggleSelection(file.id, e)}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  onDelete={setDeleteFileData}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
            <div className="mt-4">
              <PaginationControls
                totalItems={processedFiles.length}
                currentPage={pagination.currentPage}
                itemsPerPage={pagination.itemsPerPage}
                onPageChange={pagination.setPage}
                onItemsPerPageChange={pagination.setItemsPerPage}
              />
            </div>
          </>
        )}
      </div>

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

      {deleteFileData && (
        <DeleteFileDialog
          open={!!deleteFileData}
          onOpenChange={(open) => {
            if (!open) setDeleteFileData(null);
          }}
          file={deleteFileData}
          onConfirm={handleDeleteFile}
        />
      )}
    </>
  );
}

// ── RecentFileCard ────────────────────────────────────────────────────────────

function RecentFileCard({
  file,
  selected,
  onCheckboxClick,
  onPreview,
  onDownload,
  onDelete,
  onToggleFavorite,
}: {
  file: FileMetadata;
  selected: boolean;
  onCheckboxClick: (e: React.MouseEvent) => void;
  onPreview: (f: FileMetadata) => void;
  onDownload: (f: FileMetadata) => void;
  onDelete: (f: FileMetadata) => void;
  onToggleFavorite: (fileId: string, isFav: boolean) => void;
}) {
  const { data: isFav } = useIsFavorite(file.id);

  return (
    <div
      className={`relative group flex flex-col rounded-xl border border-border bg-card hover:bg-accent/5 transition-colors p-3 gap-2 cursor-pointer ${selected ? "bg-primary/10 border-primary" : ""}`}
      onClick={() => onPreview(file)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onPreview(file);
      }}
      // biome-ignore lint/a11y/useSemanticElements: container holds nested interactive elements
      role="button"
      tabIndex={0}
    >
      <button
        type="button"
        className="absolute top-2 left-2 z-10 p-0 bg-transparent border-0"
        onClick={onCheckboxClick}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={() => {}}
          className="cursor-pointer opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
          aria-label={`Select ${file.name}`}
        />
      </button>
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileIcon className="h-5 w-5 text-primary" />
        </div>
        <div
          className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onToggleFavorite(file.id, !!isFav)}
          >
            {isFav ? (
              <Star className="h-3 w-3 text-yellow-500" />
            ) : (
              <Star className="h-3 w-3" />
            )}
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
              <DropdownMenuItem onClick={() => onDownload(file)}>
                <Download className="h-4 w-4 mr-2" /> Download
              </DropdownMenuItem>
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
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {(Number(file.size) / 1024).toFixed(1)} KB
        </p>
      </div>
    </div>
  );
}

// ── RecentFileRow ─────────────────────────────────────────────────────────────

function RecentFileRow({
  file,
  selected,
  onCheckboxClick,
  onPreview,
  onDownload,
  onDelete,
  onToggleFavorite,
}: {
  file: FileMetadata;
  selected: boolean;
  onCheckboxClick: (e: React.MouseEvent) => void;
  onPreview: (f: FileMetadata) => void;
  onDownload: (f: FileMetadata) => void;
  onDelete: (f: FileMetadata) => void;
  onToggleFavorite: (fileId: string, isFav: boolean) => void;
}) {
  const { data: isFav } = useIsFavorite(file.id);

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/5 group transition-colors cursor-pointer ${selected ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}
      onClick={() => onPreview(file)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onPreview(file);
      }}
      // biome-ignore lint/a11y/useSemanticElements: container holds nested interactive elements
      role="button"
      tabIndex={0}
    >
      <button
        type="button"
        className="shrink-0 p-0 bg-transparent border-0"
        onClick={onCheckboxClick}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={() => {}}
          className="cursor-pointer"
          aria-label={`Select ${file.name}`}
        />
      </button>
      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <FileIcon className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {(Number(file.size) / 1024).toFixed(1)} KB
        </p>
      </div>
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onPreview(file)}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onDownload(file)}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onToggleFavorite(file.id, !!isFav)}
        >
          <Star className={`h-3.5 w-3.5 ${isFav ? "text-yellow-500" : ""}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(file)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
