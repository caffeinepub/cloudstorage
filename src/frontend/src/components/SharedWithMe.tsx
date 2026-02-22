import { useSharesReceived, useDownloadFile, useRecordFileAccess } from '../hooks/useQueries';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, FileIcon, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import FilePreview from './FilePreview';
import type { FileMetadata } from '../backend';

export default function SharedWithMe() {
  const { data: shares, isLoading } = useSharesReceived();
  const recordAccess = useRecordFileAccess();
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const { data: fileData } = useDownloadFile(previewFile?.id || null);

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
        <h3 className="text-lg font-semibold mb-4">Shared with Me</h3>
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
        <h3 className="text-lg font-semibold mb-4">Shared with Me</h3>
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
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Shared with Me
        </h3>
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {shares.map((share) => (
            <Card key={share.fileId} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <FileIcon className="h-8 w-8 text-primary shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate" title={share.fileName}>
                      {share.fileName}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {share.ownerName || 'Unknown'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {share.message || 'Shared with you'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {share.permissions.canView && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreview(share.fileId, share.fileName, share.owner)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {share.permissions.canDownload && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(share.fileId, share.permissions.canDownload)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>

      {previewFile && (
        <FilePreview
          file={previewFile}
          fileData={fileData ?? null}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </>
  );
}
