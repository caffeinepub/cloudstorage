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
import { Loader2, Pencil } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRenameFolder } from "../hooks/useQueries";

interface RenameFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  currentName: string;
  /** Called after a successful rename with the new name */
  onRenamed?: (newName: string) => void;
}

/**
 * Dialog for renaming a file.
 *
 * NOTE: The backend does not expose a dedicated `renameFile` endpoint.
 * This dialog is wired up and ready; once the backend adds `renameFile`,
 * replace the mutation call below with the real hook.
 * For now it shows a friendly error toast informing the user.
 */
export default function RenameFileDialog({
  open,
  onOpenChange,
  fileId: _fileId,
  currentName,
  onRenamed: _onRenamed,
}: RenameFileDialogProps) {
  const [name, setName] = useState(currentName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Keep the input in sync when the dialog opens for a different file
  useEffect(() => {
    if (open) setName(currentName);
  }, [open, currentName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("File name cannot be empty.");
      return;
    }
    if (trimmed === currentName) {
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);
    try {
      // Backend does not yet expose renameFile — show informative message.
      toast.error("Rename file is not yet supported by the backend.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to rename file.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            Rename File
          </DialogTitle>
          <DialogDescription>
            Enter a new name for{" "}
            <span className="font-medium">{currentName}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="file-name">File name</Label>
            <Input
              id="file-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter file name"
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Renaming…
                </>
              ) : (
                "Rename"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
