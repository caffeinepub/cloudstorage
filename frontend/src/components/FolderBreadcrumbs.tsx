import { useGetFolder } from '../hooks/useQueries';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FolderBreadcrumbsProps {
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
}

export default function FolderBreadcrumbs({ currentFolderId, onNavigate }: FolderBreadcrumbsProps) {
  const { data: currentFolder } = useGetFolder(currentFolderId);

  if (!currentFolderId) return null;

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-muted-foreground hover:text-foreground"
        onClick={() => onNavigate(null)}
      >
        <Home className="h-4 w-4 mr-1" />
        Root
      </Button>
      {currentFolder && (
        <>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-foreground px-2">{currentFolder.name}</span>
        </>
      )}
    </nav>
  );
}
