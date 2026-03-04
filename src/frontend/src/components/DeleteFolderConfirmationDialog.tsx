import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Folder } from "lucide-react";

interface UnifiedTrashItem {
  id: string;
  type: "file" | "folder";
  name: string;
  deletedAt: bigint;
  size: bigint;
  owner: any;
  originalPath: string;
  retentionPeriod: bigint;
}

interface DeleteFolderConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: UnifiedTrashItem[];
  onConfirm: () => void;
}

export default function DeleteFolderConfirmationDialog({
  open,
  onOpenChange,
  selectedItems,
  onConfirm,
}: DeleteFolderConfirmationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Permanently Delete Folder{selectedItems.length > 1 ? "s" : ""}?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p className="font-semibold">
              This action cannot be undone. All contents will be permanently
              deleted:
            </p>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm">
                <strong>Folders:</strong> {selectedItems.length}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                All files and subfolders within{" "}
                {selectedItems.length === 1 ? "this folder" : "these folders"}{" "}
                will also be permanently deleted.
              </p>
            </div>
            {selectedItems.length <= 5 && (
              <ul className="text-sm space-y-1">
                {selectedItems.map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    <Folder className="h-3 w-3 text-yellow-500" />
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground text-xs">
                      (from {item.originalPath || "/"})
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="bg-destructive/10 border border-destructive/20 p-3 rounded-md mt-3">
              <p className="text-sm text-destructive font-medium">
                ⚠️ Warning: This will permanently delete all files and subfolders
                contained within. This action is irreversible.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete Permanently
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
