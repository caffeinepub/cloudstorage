import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertTriangle } from 'lucide-react';

interface DuplicateFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: File[];
  onResolve: (resolution: 'rename' | 'replace' | 'skip') => void;
}

export default function DuplicateFileDialog({ open, onOpenChange, files, onResolve }: DuplicateFileDialogProps) {
  const [resolution, setResolution] = useState<'rename' | 'replace' | 'skip'>('rename');

  const handleSubmit = () => {
    onResolve(resolution);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Duplicate Files Detected
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            The following files already exist in this folder:
          </p>

          <div className="bg-muted rounded p-3 max-h-32 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {files.map((file, index) => (
                <li key={index}>• {file.name}</li>
              ))}
            </ul>
          </div>

          <RadioGroup value={resolution} onValueChange={(value) => setResolution(value as any)}>
            <div className="flex items-start space-x-2 p-3 rounded border">
              <RadioGroupItem value="rename" id="rename" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="rename" className="cursor-pointer font-medium">
                  Rename new files
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Add a number suffix to the new files (e.g., file(1).txt)
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2 p-3 rounded border">
              <RadioGroupItem value="replace" id="replace" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="replace" className="cursor-pointer font-medium">
                  Replace existing files
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Overwrite the existing files with the new ones
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-2 p-3 rounded border">
              <RadioGroupItem value="skip" id="skip" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="skip" className="cursor-pointer font-medium">
                  Skip these files
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Don't upload the duplicate files
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
