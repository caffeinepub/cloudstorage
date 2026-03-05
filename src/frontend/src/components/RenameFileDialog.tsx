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
import {
  useDeleteFile,
  useDownloadFile,
  useUploadFile,
} from "../hooks/useQueries";

interface RenameFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  currentName: string;
  fileSize?: bigint;
  folderId?: string;
  /** Called after a successful rename with the new name */
  onRenamed?: (newName: string) => void;
}

/**
 * Dialog for renaming a file.
 *
 * Because the backend does not expose a dedicated `renameFile` endpoint,
 * this dialog implements rename via:
 *   1. Download file content
 *   2. Re-upload with the new name (same folder)
 *   3. Soft-delete the original file
 */
export default function RenameFileDialog({
  open,
  onOpenChange,
  fileId,
  currentName,
  folderId,
  onRenamed,
}: RenameFileDialogProps) {
  const [name, setName] = useState(currentName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const downloadFile = useDownloadFile();
  const uploadFile = useUploadFile();
  const deleteFile = useDeleteFile();

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
      // 1. Download file content
      const downloaded = await downloadFile.mutateAsync(fileId);
      if (!downloaded?.data)
        throw new Error("Could not download file to rename");

      // 2. Create a new File object with the new name and same content
      const blob = new Blob([downloaded.data]);
      const newFile = new File([blob], trimmed, {
        type: blob.type || "application/octet-stream",
      });

      // 3. Upload with new name (preserving folder association)
      await uploadFile.mutateAsync({
        file: newFile,
        folderId: folderId ?? null,
      });

      // 4. Soft-delete the original file
      await deleteFile.mutateAsync({
        fileId,
        originalPath: folderId ? `/folder/${folderId}` : "/",
      });

      toast.success(`Renamed to "${trimmed}"`);
      onRenamed?.(trimmed);
      onOpenChange(false);
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
              data-ocid="rename.input"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              data-ocid="rename.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              data-ocid="rename.submit_button"
            >
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
