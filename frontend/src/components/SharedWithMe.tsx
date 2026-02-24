import { useState, useEffect } from 'react';
import { useGetSharesReceived, useRecordFileAccess } from '../hooks/useQueries';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Users, FileIcon, Eye, Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import FilePreview from './FilePreview';
import PaginationControls from './PaginationControls';
import { usePagination } from '../hooks/usePagination';
import type { FileMetadata, SharedFileInfo } from '../backend';

export default function SharedWithMe() {
  const { data: shares, isLoading } = useGetSharesReceived();
  const recordAccess = useRecordFileAccess();
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [search, setSearch] = useState('');

  const pagination = usePagination<SharedFileInfo>();

  const filteredShares = (shares || []).filter(
    (s) =>
      s.fileName.toLowerCase().includes(search.toLowerCase()) ||
      (s.ownerName || '').toLowerCase().includes(search.toLowerCase())
  );

  // Reset page when search changes
  useEffect(() => {
    pagination.resetPage();
  }, [search]);

  const paginatedShares = pagination.paginatedData(filteredShares);

  const handlePreview = async (fileId: string, fileName: string, owner: any) => {
    const metadata: FileMetadata = {
      id: fileId,
      name: fileName,
      size: 0n,
      owner: owner,
      uploadedAt: 0n,
    };
    setPreviewFile(metadata);
    try {
      await recordAccess.mutateAsync(fileId);
    } catch (error) {
      console.error('Failed to record file access:', error);
    }
  };

  const handleDownload = async (fileId: string, canDownload: boolean) => {
    if (!canDownload) {
      toast.error('You do not have download permission for this file');
      return;
    }
    toast.info('Download functionality coming soon');
    try {
      await recordAccess.mutateAsync(fileId);
    } catch (error) {
      console.error('Failed to record file access:', error);
    }
  };

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
          <Users className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No files shared with you yet.</p>
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
              {paginatedShares.map((share) => (
                <div
                  key={share.fileId}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileIcon className="h-8 w-8 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate" title={share.fileName}>
                        {share.fileName}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Shared by {share.ownerName || 'Unknown'}
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
                        onClick={() =>
                          handlePreview(share.fileId, share.fileName, share.owner)
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleDownload(share.fileId, share.permissions.canDownload)
                      }
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
          fileData={null}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
}
