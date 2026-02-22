import { useSharesReceived, useDownloadFile, useRecordFileAccess } from '../hooks/useQueries';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Share2, Eye, Download, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SharedWithMe() {
  const { data: sharedFiles = [] } = useSharesReceived();
  const recordAccess = useRecordFileAccess();

  if (sharedFiles.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Share2 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-medium mb-1">No shared files</h3>
          <p className="text-sm text-muted-foreground">
            Files shared with you will appear here
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Share2 className="h-5 w-5" />
        Shared With Me
      </h3>
      <ScrollArea className="h-64">
        <div className="space-y-3">
          {sharedFiles.map((share: any) => (
            <div key={share.fileId} className="flex items-start gap-3 p-3 rounded-lg border">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Share2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium truncate">{share.fileName}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{share.ownerName}</span>
                  <Badge variant="secondary" className="text-xs">
                    {share.permissions?.canEdit ? 'Edit' : 'View'}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Eye className="h-4 w-4" />
                </Button>
                {share.permissions?.canDownload && (
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
