import React, { useState, useEffect } from 'react';
import { useGetSharesSent, useRevokeShare } from '../hooks/useQueries';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Send, FileIcon, X, Search, Shield, Eye, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import PaginationControls from './PaginationControls';
import { usePagination } from '../hooks/usePagination';
import type { FileShare } from '../backend';
import { Principal } from '@dfinity/principal';
import { Skeleton } from '@/components/ui/skeleton';

export default function SharedByMe() {
  const { data: shares, isLoading } = useGetSharesSent();
  const revokeShareMutation = useRevokeShare();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRevoking, setBulkRevoking] = useState(false);

  const pagination = usePagination<FileShare>();

  const filteredShares = (shares || []).filter((s) =>
    s.fileId.toLowerCase().includes(search.toLowerCase()) ||
    s.sharedWith.toString().toLowerCase().includes(search.toLowerCase())
  );

  // Reset page when search changes
  useEffect(() => {
    pagination.resetPage();
  }, [search]);

  const paginatedShares = pagination.paginatedData(filteredShares);

  // Selection helpers
  const allVisibleSelected = paginatedShares.length > 0 && paginatedShares.every(s => selectedIds.has(s.fileId));
  const someVisibleSelected = paginatedShares.some(s => selectedIds.has(s.fileId));
  const totalSelected = selectedIds.size;

  const handleMasterCheckbox = () => {
    if (allVisibleSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedShares.forEach(s => next.delete(s.fileId));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        paginatedShares.forEach(s => next.add(s.fileId));
        return next;
      });
    }
  };

  const toggleSelection = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleRevoke = async (fileId: string, sharedWith: Principal) => {
    try {
      await revokeShareMutation.mutateAsync({ fileId, recipient: sharedWith });
      toast.success('Share revoked successfully');
    } catch (error) {
      toast.error('Failed to revoke share');
    }
  };

  const handleBulkRevoke = async () => {
    setBulkRevoking(true);
    try {
      const toRevoke = filteredShares.filter(s => selectedIds.has(s.fileId));
      for (const share of toRevoke) {
        await revokeShareMutation.mutateAsync({ fileId: share.fileId, recipient: share.sharedWith });
      }
      toast.success(`Revoked ${toRevoke.length} share(s)`);
      clearSelection();
    } catch {
      toast.error('Bulk revoke failed');
    } finally {
      setBulkRevoking(false);
    }
  };

  const formatDate = (ts: bigint) =>
    new Date(Number(ts) / 1_000_000).toLocaleDateString();

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
          <Send className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            You haven't shared any files yet.
          </p>
        </div>
      </Card>
    );
  }

  return (
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
            onClick={() => setSearch('')}
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
                if (input) input.indeterminate = someVisibleSelected && !allVisibleSelected;
              }
            }}
          />
          <span className="text-sm text-muted-foreground">
            {totalSelected > 0 ? (
              <span className="text-foreground font-medium">
                {totalSelected} item{totalSelected !== 1 ? 's' : ''} selected
              </span>
            ) : (
              <span>Select all</span>
            )}
          </span>
          {totalSelected > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 px-2 text-xs">
              <X className="h-3 w-3 mr-1" />Clear
            </Button>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {totalSelected > 0 && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg flex-wrap">
          <span className="text-sm font-medium text-primary mr-2">{totalSelected} selected</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkRevoke}
            disabled={bulkRevoking}
            className="h-8 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {bulkRevoking ? 'Revoking...' : 'Revoke Shares'}
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8 ml-auto">
            <X className="h-3.5 w-3.5 mr-1" />Cancel
          </Button>
        </div>
      )}

      {filteredShares.length === 0 ? (
        <Card className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileIcon className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No files match your search.</p>
          </div>
        </Card>
      ) : (
        <Card className="p-6">
          <div className="space-y-3">
            {paginatedShares.map((share, idx) => (
              <div
                key={`${share.fileId}-${idx}`}
                className={`flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors ${selectedIds.has(share.fileId) ? 'bg-primary/5 border-primary/30' : ''}`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div onClick={(e) => toggleSelection(share.fileId, e)}>
                    <Checkbox
                      checked={selectedIds.has(share.fileId)}
                      onCheckedChange={() => {}}
                      className="cursor-pointer shrink-0"
                      aria-label={`Select share for ${share.fileId}`}
                    />
                  </div>
                  <FileIcon className="h-8 w-8 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4
                      className="font-medium text-sm truncate font-mono"
                      title={share.fileId}
                    >
                      {share.fileId.length > 30
                        ? share.fileId.slice(0, 30) + '...'
                        : share.fileId}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">
                      Shared with:{' '}
                      {share.sharedWith.toString().slice(0, 20)}...
                    </p>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {share.permissions.canView && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Eye className="h-2.5 w-2.5" /> View
                        </Badge>
                      )}
                      {share.permissions.canEdit && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Shield className="h-2.5 w-2.5" /> Edit
                        </Badge>
                      )}
                      {share.permissions.canDownload && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Download className="h-2.5 w-2.5" /> Download
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {formatDate(share.sharedAt)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive shrink-0"
                  onClick={() => handleRevoke(share.fileId, share.sharedWith)}
                  disabled={revokeShareMutation.isPending}
                  title="Revoke share"
                >
                  <X className="h-4 w-4" />
                </Button>
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
  );
}
