import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FolderPlus, Upload, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FolderFABProps {
  onNewFolder: () => void;
  onUpload: () => void;
}

export default function FolderFAB({ onNewFolder, onUpload }: FolderFABProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 md:hidden z-50">
      {isOpen && (
        <div className="absolute bottom-16 right-0 flex flex-col gap-2 mb-2">
          <Button
            onClick={() => {
              onNewFolder();
              setIsOpen(false);
            }}
            className="gap-2 shadow-lg"
            size="lg"
          >
            <FolderPlus className="h-5 w-5" />
            New Folder
          </Button>
          <Button
            onClick={() => {
              onUpload();
              setIsOpen(false);
            }}
            variant="secondary"
            className="gap-2 shadow-lg"
            size="lg"
          >
            <Upload className="h-5 w-5" />
            Upload
          </Button>
        </div>
      )}

      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className={cn(
          'h-14 w-14 rounded-full shadow-lg transition-transform',
          isOpen && 'rotate-45'
        )}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>
    </div>
  );
}
