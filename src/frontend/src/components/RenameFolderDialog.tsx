import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRenameFolder } from '../hooks/useFolderQueries';
import { toast } from 'sonner';
import type { FolderMetadata } from '../backend';

interface RenameFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderMetadata;
}

export default function RenameFolderDialog({ open, onOpenChange, folder }: RenameFolderDialogProps) {
  const [name, setName] = useState(folder.name);
  const [error, setError] = useState('');
  const renameFolder = useRenameFolder();

  useEffect(() => {
    setName(folder.name);
  }, [folder.name]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Folder name is required');
      return;
    }

    if (name.length > 100) {
      setError('Folder name must be less than 100 characters');
      return;
    }

    try {
      await renameFolder.mutateAsync({ folderId: folder.id, newName: name.trim() });
      toast.success('Folder renamed successfully');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to rename folder');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Folder</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">New Folder Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="Enter new folder name"
              className={error ? 'border-destructive' : ''}
            />
            {error && <p className="text-sm text-destructive mt-1">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={renameFolder.isPending}>
            {renameFolder.isPending ? 'Renaming...' : 'Rename'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
