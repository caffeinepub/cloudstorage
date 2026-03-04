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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { File, Folder, FolderOpen } from "lucide-react";
import { useState } from "react";

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

interface RestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: UnifiedTrashItem[];
  onRestore: (newPath: string | null) => void;
}

export default function RestoreDialog({
  open,
  onOpenChange,
  selectedItems,
  onRestore,
}: RestoreDialogProps) {
  const [restoreOption, setRestoreOption] = useState<"original" | "custom">(
    "original",
  );
  const [customPath, setCustomPath] = useState("/");

  const handleRestore = () => {
    const path = restoreOption === "original" ? null : customPath;
    onRestore(path);
  };

  const hasFiles = selectedItems.some((item) => item.type === "file");
  const hasFolders = selectedItems.some((item) => item.type === "folder");
  const itemTypeLabel =
    hasFiles && hasFolders ? "item" : hasFolders ? "folder" : "file";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Restore{" "}
            {itemTypeLabel.charAt(0).toUpperCase() + itemTypeLabel.slice(1)}s
          </DialogTitle>
          <DialogDescription>
            Choose where to restore {selectedItems.length} selected{" "}
            {itemTypeLabel}(s)
            {hasFolders && " (all contents will be restored with folders)"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup
            value={restoreOption}
            onValueChange={(v) => setRestoreOption(v as any)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="original" id="original" />
              <Label htmlFor="original" className="cursor-pointer">
                Restore to original location
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom" className="cursor-pointer">
                Restore to different folder
              </Label>
            </div>
          </RadioGroup>

          {restoreOption === "original" && selectedItems.length > 0 && (
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm font-medium mb-2">Original locations:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {selectedItems.slice(0, 3).map((item) => (
                  <li key={item.id} className="flex items-center gap-2">
                    {item.type === "folder" ? (
                      <Folder className="h-3 w-3 text-yellow-500" />
                    ) : (
                      <File className="h-3 w-3" />
                    )}
                    <span className="font-medium">{item.name}</span>
                    <span>→</span>
                    <FolderOpen className="h-3 w-3" />
                    <span>{item.originalPath || "/"}</span>
                  </li>
                ))}
                {selectedItems.length > 3 && (
                  <li className="text-xs">
                    ...and {selectedItems.length - 3} more
                  </li>
                )}
              </ul>
            </div>
          )}

          {restoreOption === "custom" && (
            <div className="space-y-2">
              <Label htmlFor="customPath">Folder Path</Label>
              <Input
                id="customPath"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="/path/to/folder"
              />
              <p className="text-xs text-muted-foreground">
                Enter the folder path where {itemTypeLabel}s should be restored
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRestore}>
            Restore{" "}
            {itemTypeLabel.charAt(0).toUpperCase() + itemTypeLabel.slice(1)}s
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
