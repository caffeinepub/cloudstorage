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
import { Textarea } from "@/components/ui/textarea";
import { FileText, Loader2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRecentUploads } from "../contexts/RecentUploadsContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useUploadFile } from "../hooks/useQueries";

interface NewDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFolderId?: string | null;
}

export default function NewDocumentDialog({
  open,
  onOpenChange,
  currentFolderId,
}: NewDocumentDialogProps) {
  const [fileName, setFileName] = useState("Untitled Document");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uploadFile = useUploadFile();
  const { addRecentUpload } = useRecentUploads();
  const { identity } = useInternetIdentity();

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFileName("Untitled Document");
      setContent("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = fileName.trim();
    if (!trimmedName) {
      toast.error("File name cannot be empty.");
      return;
    }

    if (!identity) {
      toast.error("You must be logged in to create documents.");
      return;
    }

    // Ensure the file name ends with .txt
    const finalName = trimmedName.endsWith(".txt")
      ? trimmedName
      : `${trimmedName}.txt`;

    setIsSubmitting(true);
    try {
      const blob = new Blob([content], { type: "text/plain" });
      const file = new File([blob], finalName, { type: "text/plain" });

      const owner = identity.getPrincipal();
      const fileId = await uploadFile.mutateAsync({
        file,
        folderId: currentFolderId ?? null,
      });

      addRecentUpload(fileId, finalName, BigInt(file.size), owner);

      toast.success(`"${finalName}" created successfully`);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to create document. Please check your storage quota.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            New Document
          </DialogTitle>
          <DialogDescription>
            Create a new text document in your storage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="doc-name">File name</Label>
            <Input
              id="doc-name"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Untitled Document"
              autoFocus
              disabled={isSubmitting}
              data-ocid="new_document.input"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="doc-content">Content</Label>
            <Textarea
              id="doc-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Start typing your document..."
              rows={8}
              disabled={isSubmitting}
              className="resize-none font-mono text-sm"
              data-ocid="new_document.textarea"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              data-ocid="new_document.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !fileName.trim()}
              data-ocid="new_document.submit_button"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create Document"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
