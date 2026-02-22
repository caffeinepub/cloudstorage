import { Button } from '@/components/ui/button';
import { FolderPlus, Upload } from 'lucide-react';

interface FolderToolbarProps {
  onNewFolder: () => void;
  onUpload: () => void;
}

export default function FolderToolbar({ onNewFolder, onUpload }: FolderToolbarProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">My Folders</h1>
        <p className="text-muted-foreground">Organize your files with folders</p>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={onNewFolder} className="gap-2">
          <FolderPlus className="h-4 w-4" />
          <span className="hidden sm:inline">New Folder</span>
        </Button>
        <Button onClick={onUpload} variant="secondary" className="gap-2">
          <Upload className="h-4 w-4" />
          <span className="hidden sm:inline">Upload</span>
        </Button>
      </div>
    </div>
  );
}
