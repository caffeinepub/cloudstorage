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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateFolder } from '../hooks/useQueries';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentFolderId?: string | null;
}

export default function CreateFolderDialog({
  open,
  onOpenChange,
  parentFolderId,
}: CreateFolderDialogProps) {
  const [folderName, setFolderName] = useState('');
  const createFolder = useCreateFolder();

  const handleCreate = async () => {
    if (!folderName.trim()) {
      toast.error('Folder Name Required', {
        description: 'Please enter a folder name',
      });
      return;
    }

    try {
      await createFolder.mutateAsync({
        name: folderName.trim(),
        parentId: parentFolderId ?? null,
      });
      
      toast.success('Folder Created Successfully', {
        description: `"${folderName.trim()}" has been created`,
      });
      
      setFolderName('');
      onOpenChange(false);
    } catch (error) {
      console.error('Create folder error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      toast.error('Failed to Create Folder', {
        description: errorMessage,
      });
    }
  };

  const handleClose = () => {
    setFolderName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Folder</DialogTitle>
          <DialogDescription>
            {parentFolderId 
              ? 'Enter a name for your new subfolder'
              : 'Enter a name for your new folder'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folderName">Folder Name</Label>
            <Input
              id="folderName"
              placeholder="Enter folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !createFolder.isPending) {
                  handleCreate();
                }
              }}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={createFolder.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={createFolder.isPending || !folderName.trim()}
          >
            {createFolder.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
