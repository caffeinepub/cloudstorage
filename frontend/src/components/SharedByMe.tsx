import { useState, useEffect } from 'react';
import { useGetSharesSent, useRevokeShare } from '../hooks/useQueries';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Send, FileIcon, X, Search, Shield, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';
import PaginationControls from './PaginationControls';
import { usePagination } from '../hooks/usePagination';
import type { FileShare } from '../backend';
import { Principal } from '@dfinity/principal';

export default function SharedByMe() {
  const { data: shares, isLoading } = useGetSharesSent();
  const revokeShareMutation = useRevokeShare();
  const [search, setSearch] = useState('');

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

  const handleRevoke = async (fileId: string, sharedWith: Principal) => {
    try {
      await revokeShareMutation.mutateAsync({ fileId, recipient: sharedWith });
      toast.success('Share revoked successfully');
    } catch (error) {
      toast.error('Failed to revoke share');
    }
  };

  const formatDate = (ts: bigint) =>
    new Date(Number(ts) / 1_000_000).toLocaleDateString();

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
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
      </div>

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
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
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
