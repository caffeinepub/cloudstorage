import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Share2, Loader2 } from 'lucide-react';
import { useShareFile } from '@/hooks/useQueries';
import { toast } from 'sonner';
import { Principal } from '@icp-sdk/core/principal';

interface BulkShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFileIds: string[];
  onSuccess?: () => void;
}

export default function BulkShareDialog({
  isOpen,
  onClose,
  selectedFileIds,
  onSuccess,
}: BulkShareDialogProps) {
  const [recipient, setRecipient] = useState('');
  const [canView, setCanView] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [canDownload, setCanDownload] = useState(true);
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const shareFileMutation = useShareFile();

  const handleShare = async () => {
    if (!recipient.trim()) {
      toast.error('Please enter a recipient principal ID');
      return;
    }

    let recipientPrincipal: Principal;
    try {
      recipientPrincipal = Principal.fromText(recipient.trim());
    } catch {
      toast.error('Invalid principal ID format');
      return;
    }

    setIsSharing(true);
    const results = await Promise.allSettled(
      selectedFileIds.map((fileId) =>
        shareFileMutation.mutateAsync({
          fileId,
          recipient: recipientPrincipal,
          canView,
          canEdit,
          canDownload,
          message,
        })
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    setIsSharing(false);

    if (failed === 0) {
      toast.success(`Successfully shared ${succeeded} file${succeeded !== 1 ? 's' : ''}`);
    } else if (succeeded === 0) {
      toast.error(`Failed to share all ${failed} file${failed !== 1 ? 's' : ''}`);
    } else {
      toast.warning(`Shared ${succeeded} file${succeeded !== 1 ? 's' : ''}, ${failed} failed`);
    }

    onSuccess?.();
    handleClose();
  };

  const handleClose = () => {
    setRecipient('');
    setCanView(true);
    setCanEdit(false);
    setCanDownload(true);
    setMessage('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share {selectedFileIds.length} File{selectedFileIds.length !== 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            Share all selected files with another user. Enter their principal ID and set permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="recipient">Recipient Principal ID</Label>
            <Input
              id="recipient"
              placeholder="e.g. aaaaa-aa or 2vxsx-fae"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={isSharing}
            />
          </div>

          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canView"
                  checked={canView}
                  onCheckedChange={(checked) => setCanView(!!checked)}
                  disabled={isSharing}
                />
                <Label htmlFor="canView" className="font-normal">Can View</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canEdit"
                  checked={canEdit}
                  onCheckedChange={(checked) => setCanEdit(!!checked)}
                  disabled={isSharing}
                />
                <Label htmlFor="canEdit" className="font-normal">Can Edit</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="canDownload"
                  checked={canDownload}
                  onCheckedChange={(checked) => setCanDownload(!!checked)}
                  disabled={isSharing}
                />
                <Label htmlFor="canDownload" className="font-normal">Can Download</Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a message to the recipient..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSharing}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSharing}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={isSharing || !recipient.trim()}>
            {isSharing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4 mr-2" />
                Share Files
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
