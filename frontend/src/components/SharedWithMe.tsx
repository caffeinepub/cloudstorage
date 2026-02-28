import React, { useState } from 'react';
import { Share2, Copy, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useGetSharesReceived } from '../hooks/useQueries';
import type { SharedFileInfo } from '../hooks/useQueries';
import PaginationControls from './PaginationControls';
import { usePagination } from '../hooks/usePagination';
import { toast } from 'sonner';

export default function SharedWithMe() {
  const { data: shares, isLoading, isError } = useGetSharesReceived();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShares, setSelectedShares] = useState<Set<string>>(new Set());
  const { currentPage, itemsPerPage, setPage, setItemsPerPage, paginatedData } =
    usePagination<SharedFileInfo>();

  const filtered: SharedFileInfo[] = ((shares ?? []) as SharedFileInfo[]).filter((s) =>
    s.fileName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const paginated = paginatedData(filtered) as SharedFileInfo[];

  const handleSelect = (fileId: string, checked: boolean) => {
    setSelectedShares((prev) => {
      const next = new Set(prev);
      if (checked) next.add(fileId);
      else next.delete(fileId);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedShares(new Set(filtered.map((s) => s.fileId)));
    } else {
      setSelectedShares(new Set());
    }
  };

  const handleCopyNames = () => {
    const names = Array.from(selectedShares)
      .map((id) => filtered.find((s) => s.fileId === id)?.fileName ?? id)
      .join(', ');
    navigator.clipboard.writeText(names);
    toast.success('File names copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        Failed to load shared files
      </div>
    );
  }

  if (!shares || shares.length === 0) {
    return (
      <div className="text-center py-12">
        <Share2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground font-medium">No files shared with you</p>
        <p className="text-sm text-muted-foreground mt-1">
          Files shared with you by others will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search shared files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-xs"
        />
        {selectedShares.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">{selectedShares.size} selected</span>
            <Button size="sm" variant="outline" onClick={handleCopyNames}>
              <Copy className="w-3.5 h-3.5 mr-1" />
              Copy Names
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/30 border-b border-border">
              <th className="px-4 py-3 w-10">
                <Checkbox
                  checked={
                    filtered.length > 0 && filtered.every((s) => selectedShares.has(s.fileId))
                  }
                  onCheckedChange={handleSelectAll}
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">
                File Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">
                Shared By
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">
                Permissions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((share) => (
              <tr key={share.fileId} className="border-b border-border hover:bg-muted/20">
                <td className="px-4 py-3">
                  <Checkbox
                    checked={selectedShares.has(share.fileId)}
                    onCheckedChange={(checked) => handleSelect(share.fileId, !!checked)}
                  />
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium truncate max-w-[200px]">{share.fileName}</p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <p className="text-sm text-muted-foreground">
                    {share.ownerName || `${share.owner.toString().slice(0, 12)}...`}
                  </p>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <div className="flex gap-1">
                    {share.permissions.canView && (
                      <Badge variant="secondary" className="text-xs">
                        View
                      </Badge>
                    )}
                    {share.permissions.canEdit && (
                      <Badge variant="secondary" className="text-xs">
                        Edit
                      </Badge>
                    )}
                    {share.permissions.canDownload && (
                      <Badge variant="secondary" className="text-xs">
                        Download
                      </Badge>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > itemsPerPage && (
        <PaginationControls
          currentPage={currentPage}
          totalItems={filtered.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}
    </div>
  );
}
