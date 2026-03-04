import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Copy, Download, Eye, FileIcon, Search, Users, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { FileMetadata, SharedFileInfo } from "../backend";
import { useActor } from "../hooks/useActor";
import { usePagination } from "../hooks/usePagination";
import { useGetSharesReceived } from "../hooks/useQueries";
import FilePreview from "./FilePreview";
import PaginationControls from "./PaginationControls";

export default function SharedWithMe() {
  const { data: shares, isLoading } = useGetSharesReceived();
  const { actor } = useActor();
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [previewFileData, setPreviewFileData] = useState<Uint8Array | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);

  const pagination = usePagination<SharedFileInfo>();

  const filteredShares = (shares || []).filter(
    (s) =>
      s.fileName.toLowerCase().includes(search.toLowerCase()) ||
      (s.ownerName || "").toLowerCase().includes(search.toLowerCase()),
  );

  // Reset page when search changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally triggered only when search changes
  useEffect(() => {
    pagination.resetPage();
  }, [search]);

  const paginatedShares = pagination.paginatedData(filteredShares);
  const _totalPages = Math.max(
    1,
    Math.ceil(filteredShares.length / pagination.itemsPerPage),
  );

  // Selection helpers
  const allVisibleSelected =
    paginatedShares.length > 0 &&
    paginatedShares.every((s) => selectedIds.has(s.fileId));
  const someVisibleSelected = paginatedShares.some((s) =>
    selectedIds.has(s.fileId),
  );
  const totalSelected = selectedIds.size;

  const handleMasterCheckbox = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const s of paginatedShares) next.delete(s.fileId);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const s of paginatedShares) next.add(s.fileId);
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

  const handlePreview = async (share: SharedFileInfo) => {
    const metadata: FileMetadata = {
      id: share.fileId,
      name: share.fileName,
      size: 0n,
      owner: share.owner,
      uploadedAt: share.sharedAt,
    };
    setPreviewFile(metadata);
    setPreviewFileData(null);
    if (actor) {
      try {
        const chunks: Uint8Array[] = [];
        let chunkIndex = 0;
        while (true) {
          const chunk = await actor.downloadFileChunk(
            share.fileId,
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

  const handleDownload = async (share: SharedFileInfo) => {
    if (!share.permissions.canDownload) {
      toast.error("You do not have download permission for this file");
      return;
    }
    if (!actor) return;
    try {
      const chunks: Uint8Array[] = [];
      let chunkIndex = 0;
      while (true) {
        const chunk = await actor.downloadFileChunk(
          share.fileId,
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
      a.download = share.fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${share.fileName}`);
    } catch {
      toast.error("Download failed");
    }
  };

  const handleBulkDownload = async () => {
    setBulkDownloading(true);
    try {
      const toDownload = filteredShares.filter((s) =>
        selectedIds.has(s.fileId),
      );
      for (const share of toDownload) {
        await handleDownload(share);
      }
      clearSelection();
    } catch {
      toast.error("Bulk download failed");
    } finally {
      setBulkDownloading(false);
    }
  };

  const handleBulkCopy = () => {
    const names = filteredShares
      .filter((s) => selectedIds.has(s.fileId))
      .map((s) => s.fileName)
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!shares || shares.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            No files shared with you yet.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search shared files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Selection header */}
        {filteredShares.length > 0 && (
          <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg flex-wrap">
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

        {filteredShares.length === 0 ? (
          <Card className="p-6">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileIcon className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">
                No files match your search.
              </p>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="space-y-3">
              {paginatedShares.map((share) => (
                <div
                  key={share.fileId}
                  className={`flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors ${selectedIds.has(share.fileId) ? "bg-primary/5 border-primary/30" : ""}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={(e) =>
                        toggleSelection(
                          share.fileId,
                          e as unknown as React.MouseEvent,
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          toggleSelection(
                            share.fileId,
                            e as unknown as React.MouseEvent,
                          );
                      }}
                    >
                      <Checkbox
                        checked={selectedIds.has(share.fileId)}
                        onCheckedChange={() => {}}
                        className="cursor-pointer shrink-0"
                        aria-label={`Select ${share.fileName}`}
                      />
                    </button>
                    <FileIcon className="h-8 w-8 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4
                        className="font-medium text-sm truncate"
                        title={share.fileName}
                      >
                        {share.fileName}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Shared by {share.ownerName || "Unknown"}
                      </p>
                      <div className="flex gap-2 mt-1">
                        {share.permissions.canView && (
                          <Badge variant="outline" className="text-xs">
                            View
                          </Badge>
                        )}
                        {share.permissions.canEdit && (
                          <Badge variant="outline" className="text-xs">
                            Edit
                          </Badge>
                        )}
                        {share.permissions.canDownload && (
                          <Badge variant="outline" className="text-xs">
                            Download
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {share.permissions.canView && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(share)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(share)}
                      disabled={!share.permissions.canDownload}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <PaginationControls
              totalItems={filteredShares.length}
              currentPage={pagination.currentPage}
              itemsPerPage={pagination.itemsPerPage}
              onPageChange={pagination.setPage}
              onItemsPerPageChange={pagination.setItemsPerPage}
            />
          </Card>
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
    </>
  );
}
