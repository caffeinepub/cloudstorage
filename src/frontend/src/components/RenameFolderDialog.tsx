import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Folder } from "../backend";
import { useRenameFolder } from "../hooks/useQueries";

interface RenameFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: Folder | null;
}

export default function RenameFolderDialog({
  open,
  onOpenChange,
  folder,
}: RenameFolderDialogProps) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const renameFolder = useRenameFolder();

  useEffect(() => {
    if (folder) {
      setNewName(folder.name);
      setError("");
    }
  }, [folder]);

  const handleRename = async () => {
    if (!folder) return;

    if (!newName.trim()) {
      setError("Folder name cannot be empty");
      return;
    }

    if (newName === folder.name) {
      onOpenChange(false);
      return;
    }

    try {
      await renameFolder.mutateAsync({
        folderId: folder.id,
        newName: newName.trim(),
      });
      toast.success("Folder renamed successfully");
      onOpenChange(false);
    } catch (_error) {
      toast.error("Failed to rename folder");
      setError("Failed to rename folder. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Folder</DialogTitle>
          <DialogDescription>
            Enter a new name for "{folder?.name}"
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="folderName">Folder Name</Label>
            <Input
              id="folderName"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setError("");
              }}
              placeholder="Enter folder name"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleRename();
                }
              }}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRename} disabled={renameFolder.isPending}>
            {renameFolder.isPending ? "Renaming..." : "Rename"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
