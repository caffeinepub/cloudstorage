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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Info } from 'lucide-react';
import type { FileMetadata } from '../backend';

interface DeleteFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: FileMetadata | null;
  onConfirm: (customRetentionPeriod: bigint | null) => void;
}

export default function DeleteFileDialog({
  open,
  onOpenChange,
  file,
  onConfirm,
}: DeleteFileDialogProps) {
  const [retentionPeriod, setRetentionPeriod] = useState<string>('default');

  const handleConfirm = () => {
    let customPeriod: bigint | null = null;
    
    if (retentionPeriod !== 'default') {
      const days = parseInt(retentionPeriod);
      customPeriod = BigInt(days * 24 * 60 * 60 * 1000000000); // Convert days to nanoseconds
    }
    
    onConfirm(customPeriod);
    setRetentionPeriod('default');
  };

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move to Trash</DialogTitle>
          <DialogDescription>
            "{file.name}" will be moved to Trash and can be recovered later
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Files in Trash can be restored from the Trash page before they are automatically
              deleted after the retention period expires.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="retention">Retention Period</Label>
            <Select value={retentionPeriod} onValueChange={setRetentionPeriod}>
              <SelectTrigger id="retention">
                <SelectValue placeholder="Select retention period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (30 days)</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose how long the file will be kept in Trash before automatic deletion
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Move to Trash
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
