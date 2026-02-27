import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Folder, Trash2 } from 'lucide-react';
import { useDeleteFolderToTrash } from '../hooks/useQueries';
import { toast } from 'sonner';
import type { Folder as FolderType } from '../backend';

interface DeleteFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: FolderType | null;
}

export default function DeleteFolderDialog({
  open,
  onOpenChange,
  folder,
}: DeleteFolderDialogProps) {
  const deleteFolderToTrash = useDeleteFolderToTrash();

  const handleDelete = async () => {
    if (!folder) return;
    try {
      await deleteFolderToTrash.mutateAsync({ folderId: folder.id });
      toast.success(`"${folder.name}" moved to trash`);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to delete folder');
    }
  };

  if (!folder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Folder
          </DialogTitle>
          <DialogDescription>
            Move <span className="font-semibold">"{folder.name}"</span> to trash? Files inside
            will be moved to root level.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 my-2">
          <Folder className="h-5 w-5 text-amber-400 shrink-0" />
          <span className="text-sm font-medium">{folder.name}</span>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleteFolderToTrash.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteFolderToTrash.isPending}>
            {deleteFolderToTrash.isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Deleting…
              </span>
            ) : (
              'Move to Trash'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
