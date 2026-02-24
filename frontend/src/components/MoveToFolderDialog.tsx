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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useListFolders, useMoveFilesToFolder } from '../hooks/useQueries';
import { toast } from 'sonner';
import { Folder, Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface MoveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileIds: string[];
}

export default function MoveToFolderDialog({
  open,
  onOpenChange,
  fileIds,
}: MoveToFolderDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const { data: folders, isLoading } = useListFolders();
  const moveFiles = useMoveFilesToFolder();

  const handleMove = async () => {
    if (!selectedFolderId) {
      toast.error('Please select a folder');
      return;
    }

    try {
      await moveFiles.mutateAsync({
        fileIds,
        targetFolderId: selectedFolderId,
      });
      toast.success(`Moved ${fileIds.length} file(s) to folder`);
      setSelectedFolderId('');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to move files');
      console.error('Move files error:', error);
    }
  };

  const handleClose = () => {
    setSelectedFolderId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to Folder</DialogTitle>
          <DialogDescription>
            Select a destination folder for {fileIds.length} file(s)
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !folders || folders.length === 0 ? (
            <div className="text-center py-8">
              <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No folders available. Create a folder first.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <RadioGroup value={selectedFolderId} onValueChange={setSelectedFolderId}>
                <div className="space-y-2">
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent cursor-pointer"
                      onClick={() => setSelectedFolderId(folder.id)}
                    >
                      <RadioGroupItem value={folder.id} id={folder.id} />
                      <Label
                        htmlFor={folder.id}
                        className="flex items-center gap-2 flex-1 cursor-pointer"
                      >
                        <Folder className="h-5 w-5 text-primary" />
                        <div className="flex-1">
                          <p className="font-medium">{folder.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Created {new Date(Number(folder.createdAt) / 1000000).toLocaleDateString()}
                          </p>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={moveFiles.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={moveFiles.isPending || !selectedFolderId}
          >
            {moveFiles.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Move Files
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
