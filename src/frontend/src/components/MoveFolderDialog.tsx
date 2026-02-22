import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useMoveFolder } from '../hooks/useFolderQueries';
import { toast } from 'sonner';
import type { FolderMetadata } from '../backend';
import { Folder } from 'lucide-react';

interface MoveFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderMetadata;
  folders: FolderMetadata[];
}

export default function MoveFolderDialog({ open, onOpenChange, folder, folders }: MoveFolderDialogProps) {
  const [selectedParentId, setSelectedParentId] = useState<string | null>(folder.parentFolderId || null);
  const moveFolder = useMoveFolder();

  const getDescendantIds = (folderId: string): string[] => {
    const descendants: string[] = [folderId];
    const children = folders.filter((f) => f.parentFolderId === folderId);
    children.forEach((child) => {
      descendants.push(...getDescendantIds(child.id));
    });
    return descendants;
  };

  const excludedIds = getDescendantIds(folder.id);
  const availableFolders = folders.filter((f) => !excludedIds.includes(f.id));

  const handleSubmit = async () => {
    try {
      await moveFolder.mutateAsync({ folderId: folder.id, newParentFolderId: selectedParentId });
      toast.success('Folder moved successfully');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to move folder');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Move Folder</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Label>Select Destination</Label>
          <RadioGroup value={selectedParentId || 'root'} onValueChange={(value) => setSelectedParentId(value === 'root' ? null : value)}>
            <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
              <RadioGroupItem value="root" id="root" />
              <Label htmlFor="root" className="flex items-center gap-2 cursor-pointer flex-1">
                <Folder className="h-4 w-4" />
                Root (My Folders)
              </Label>
            </div>
            {availableFolders.map((f) => (
              <div key={f.id} className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                <RadioGroupItem value={f.id} id={f.id} />
                <Label htmlFor={f.id} className="flex items-center gap-2 cursor-pointer flex-1">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: f.color }} />
                  {f.name}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={moveFolder.isPending}>
            {moveFolder.isPending ? 'Moving...' : 'Move'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
