import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Info, Folder } from 'lucide-react';
import type { Folder as FolderType } from '../backend';
import { toast } from 'sonner';

interface DeleteFolderToTrashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderType | null;
  onConfirm: (folderId: string, retentionPeriodNs: bigint) => Promise<void>;
}

export default function DeleteFolderToTrashDialog({
  open,
  onOpenChange,
  folder,
  onConfirm,
}: DeleteFolderToTrashDialogProps) {
  const [retentionDays, setRetentionDays] = useState<string>('30');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (!folder) return;

    setIsDeleting(true);
    try {
      const days = parseInt(retentionDays);
      const retentionPeriodNs = BigInt(days * 24 * 60 * 60 * 1_000_000_000);
      
      await onConfirm(folder.id, retentionPeriodNs);
      
      toast.success('Folder moved to Trash');
      onOpenChange(false);
      setRetentionDays('30');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to move folder to trash');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!folder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move Folder to Trash</DialogTitle>
          <DialogDescription>
            This will move "{folder.name}" and all its contents to Trash
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-900 dark:text-amber-100">
              All files and subfolders within this folder will be moved to Trash and can be
              restored from the Trash page before the retention period expires.
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 bg-muted rounded-md">
            <Folder className="h-8 w-8 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{folder.name}</p>
              <p className="text-xs text-muted-foreground">
                Created {new Date(Number(folder.createdAt) / 1000000).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Retention Period</Label>
            <RadioGroup value={retentionDays} onValueChange={setRetentionDays}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="30" id="retention-30" />
                <Label htmlFor="retention-30" className="font-normal cursor-pointer">
                  30 days
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="60" id="retention-60" />
                <Label htmlFor="retention-60" className="font-normal cursor-pointer">
                  60 days
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="90" id="retention-90" />
                <Label htmlFor="retention-90" className="font-normal cursor-pointer">
                  90 days
                </Label>
              </div>
            </RadioGroup>
            <p className="text-xs text-muted-foreground">
              Choose how long the folder will be kept in Trash before automatic deletion
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Moving to Trash...' : 'Move to Trash'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
