import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useDeleteFolder } from '../hooks/useFolderQueries';
import { toast } from 'sonner';
import type { FolderMetadata } from '../backend';
import { AlertTriangle } from 'lucide-react';

interface DeleteFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderMetadata;
}

export default function DeleteFolderDialog({ open, onOpenChange, folder }: DeleteFolderDialogProps) {
  const [deleteOption, setDeleteOption] = useState<'delete' | 'move'>('move');
  const deleteFolder = useDeleteFolder();

  const handleSubmit = async () => {
    try {
      await deleteFolder.mutateAsync({
        folderId: folder.id,
        deleteContents: deleteOption === 'delete',
        moveContentsToParent: deleteOption === 'move',
      });
      toast.success('Folder deleted successfully');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete folder');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete Folder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            You are about to delete <strong>{folder.name}</strong>. What would you like to do with its contents?
          </p>

          <RadioGroup value={deleteOption} onValueChange={(value) => setDeleteOption(value as 'delete' | 'move')}>
            <div className="flex items-start space-x-2 p-3 rounded border">
              <RadioGroupItem value="move" id="move" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="move" className="cursor-pointer font-medium">
                  Move contents to parent folder
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Files and subfolders will be moved to the parent folder
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2 p-3 rounded border border-destructive/50">
              <RadioGroupItem value="delete" id="delete" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="delete" className="cursor-pointer font-medium text-destructive">
                  Delete all contents
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  All files and subfolders will be permanently deleted
                </p>
              </div>
            </div>
          </RadioGroup>

          <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
            <p className="text-sm text-destructive font-medium">
              ⚠️ This action cannot be undone
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={deleteFolder.isPending}>
            {deleteFolder.isPending ? 'Deleting...' : 'Delete Folder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
