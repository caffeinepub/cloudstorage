import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Folder as FolderIcon, ChevronRight, AlertCircle } from 'lucide-react';
import { useMoveFolder, useListFolders } from '../hooks/useQueries';
import { toast } from 'sonner';
import type { Folder } from '../backend';
import { Alert, AlertDescription } from './ui/alert';

interface MoveFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: Folder | null;
}

export default function MoveFolderDialog({ open, onOpenChange, folder }: MoveFolderDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { data: folders = [] } = useListFolders();
  const moveFolder = useMoveFolder();

  if (!folder) return null;

  // Filter out the folder being moved and its descendants
  const getDescendantIds = (folderId: string): Set<string> => {
    const descendants = new Set<string>([folderId]);
    let changed = true;

    while (changed) {
      changed = false;
      for (const f of folders) {
        if (f.parentId && descendants.has(f.parentId) && !descendants.has(f.id)) {
          descendants.add(f.id);
          changed = true;
        }
      }
    }

    return descendants;
  };

  const descendantIds = getDescendantIds(folder.id);
  const availableFolders = folders.filter((f) => !descendantIds.has(f.id));

  // Count nested items (folders and files) - simplified for UI display
  const countNestedItems = (folderId: string): { folders: number; files: number } => {
    const descendants = getDescendantIds(folderId);
    return {
      folders: descendants.size - 1, // Exclude the folder itself
      files: 0, // We don't have file data in this component
    };
  };

  const nestedCounts = countNestedItems(folder.id);

  const handleSelectFolder = (folderId: string | null) => {
    setSelectedFolderId(folderId);
    setShowConfirmation(true);
  };

  const handleConfirmMove = async () => {
    try {
      await moveFolder.mutateAsync({
        folderId: folder.id,
        destFolderId: selectedFolderId,
      });

      toast.success('Folder Moved Successfully', {
        description: selectedFolderId
          ? `"${folder.name}" has been moved to the selected folder.`
          : `"${folder.name}" has been moved to the root level.`,
      });

      onOpenChange(false);
      setShowConfirmation(false);
      setSelectedFolderId(null);
    } catch (error) {
      console.error('Error moving folder:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      toast.error('Failed to Move Folder', {
        description: errorMessage,
      });
    }
  };

  const handleCancel = () => {
    if (showConfirmation) {
      setShowConfirmation(false);
      setSelectedFolderId(null);
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {showConfirmation ? 'Confirm Folder Move' : `Move "${folder.name}"`}
          </DialogTitle>
        </DialogHeader>

        {!showConfirmation ? (
          <>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select a destination folder or move to root level:
              </p>

              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-2">
                  {/* Root level option */}
                  <button
                    onClick={() => handleSelectFolder(null)}
                    className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-accent"
                  >
                    <FolderIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Root Level (My Files)</span>
                  </button>

                  {/* Available folders */}
                  {availableFolders.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No other folders available
                    </p>
                  ) : (
                    availableFolders.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => handleSelectFolder(f.id)}
                        className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-accent"
                      >
                        <FolderIcon className="h-4 w-4 text-primary" />
                        <span className="text-sm">{f.name}</span>
                        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                      </button>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  You are about to move <strong>"{folder.name}"</strong>
                  {selectedFolderId
                    ? ` into "${availableFolders.find((f) => f.id === selectedFolderId)?.name}"`
                    : ' to the root level (My Files)'}
                  .
                </AlertDescription>
              </Alert>

              {nestedCounts.folders > 0 && (
                <div className="rounded-md bg-muted p-3 text-sm">
                  <p className="font-medium">This folder contains:</p>
                  <ul className="mt-1 list-inside list-disc text-muted-foreground">
                    {nestedCounts.folders > 0 && (
                      <li>{nestedCounts.folders} nested folder(s)</li>
                    )}
                  </ul>
                  <p className="mt-2 text-xs text-muted-foreground">
                    All nested items will be moved along with this folder.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleCancel} disabled={moveFolder.isPending}>
                Back
              </Button>
              <Button onClick={handleConfirmMove} disabled={moveFolder.isPending}>
                {moveFolder.isPending ? 'Moving...' : 'Continue'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
