import { useGetFolder } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { ChevronRight, Home } from 'lucide-react';

interface FolderBreadcrumbsProps {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
}

export default function FolderBreadcrumbs({ currentFolderId, onNavigate }: FolderBreadcrumbsProps) {
  const { data: currentFolder } = useGetFolder(currentFolderId || '');

  if (!currentFolderId) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => onNavigate(null)}
        >
          <Home className="h-4 w-4" />
          <span>Home</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <Button
        variant="ghost"
        size="sm"
        className="flex items-center gap-2"
        onClick={() => onNavigate(null)}
      >
        <Home className="h-4 w-4" />
        <span>Home</span>
      </Button>
      {currentFolder && (
        <>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <span>{currentFolder.name}</span>
          </Button>
        </>
      )}
    </div>
  );
}
