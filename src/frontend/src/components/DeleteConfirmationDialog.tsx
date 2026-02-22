import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import type { TrashItem } from '../hooks/useQueries';

interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: TrashItem[];
  onConfirm: (secureWipe: boolean) => void;
  isEmptyTrash?: boolean;
}

export default function DeleteConfirmationDialog({
  open,
  onOpenChange,
  selectedItems,
  onConfirm,
  isEmptyTrash = false,
}: DeleteConfirmationDialogProps) {
  const [secureWipe, setSecureWipe] = useState(false);

  const totalSize = selectedItems.reduce((acc, item) => acc + Number(item.metadata.size), 0);
  const formatSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const handleConfirm = () => {
    onConfirm(secureWipe);
    setSecureWipe(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {isEmptyTrash ? 'Empty Trash?' : 'Permanently Delete Files?'}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p className="font-semibold">
              This action cannot be undone. The following will be permanently deleted:
            </p>
            <div className="bg-muted p-3 rounded-md">
              <p className="text-sm">
                <strong>Files:</strong> {selectedItems.length}
              </p>
              <p className="text-sm">
                <strong>Total Size:</strong> {formatSize(totalSize)}
              </p>
            </div>
            {!isEmptyTrash && selectedItems.length <= 5 && (
              <ul className="text-sm space-y-1 list-disc list-inside">
                {selectedItems.map((item) => (
                  <li key={item.fileId}>{item.metadata.name}</li>
                ))}
              </ul>
            )}
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="secureWipe"
                checked={secureWipe}
                onCheckedChange={(checked) => setSecureWipe(checked as boolean)}
              />
              <Label htmlFor="secureWipe" className="text-sm cursor-pointer">
                Secure wipe (cryptographically secure deletion for sensitive files)
              </Label>
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
